import { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Vector3, type PerspectiveCamera } from 'three';
import { loadLayout, FLOOR_RADII } from '../layout3d';
import { MandirScene, murtiAnchor, MURTI_EYE, DEVOTEE_EYE } from './MandirScene';
import { IDOLS } from '../data';
import type { PlacedIdol } from '../types';

/* How far in front of the murti the devotee stands. */
const STAND_BACK = 4.3;
/* Time constant of the camera's approach, in seconds. Deliberately unhurried
   — walking up to a deity, or crossing to another spot, is not a cut. */
const EASE = 0.55;
/* The shrine sits above standing height, so darshan genuinely looks upward.
   Aim at the chest rather than the eyes so the whole figure stays in frame. */
const GAZE_DROP = 0.6;
const WIDE_FOV = 42;
const DARSHAN_FOV = 34;

type Vec3 = [number, number, number];

/* Eases the camera toward whatever position/look/lens it is given, framerate
   independently. One damped target handles every transition the page makes —
   switching between saved viewpoints and stepping up for darshan alike. */
function CameraRig({ pos, look, fov }: { pos: Vec3; look: Vec3; fov: number }) {
  const { camera } = useThree() as { camera: PerspectiveCamera };
  const current = useRef<Vector3 | null>(null);
  const tPos = useMemo(() => new Vector3(), []);
  const tLook = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    tPos.set(...pos);
    tLook.set(...look);

    if (current.current === null) {
      // first frame: start already framed rather than flying in
      camera.position.copy(tPos);
      current.current = tLook.clone();
      camera.fov = fov;
      camera.updateProjectionMatrix();
    } else {
      const k = 1 - Math.exp(-delta / EASE);
      camera.position.lerp(tPos, k);
      current.current.lerp(tLook, k);
      const nextFov = camera.fov + (fov - camera.fov) * k;
      if (Math.abs(nextFov - camera.fov) > 0.01) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
    }
    camera.lookAt(current.current);
  });

  return null;
}

/* Live view of the user's 3D mandir, embedded in the Temple tab.
   Viewpoints saved in the 3D editor appear as a switcher; tapping a murti
   walks the camera up to it for darshan, and tapping again offers a garland. */
export default function MandirViewport({ placedIdols, onGarland }: {
  placedIdols: PlacedIdol[];
  onGarland: (instanceId: string) => void;
}) {
  // Fresh read per mount: the layout only changes on the 3D Mandir page,
  // and switching tabs remounts this component.
  const [layout] = useState(loadLayout);
  const [darshanId, setDarshanId] = useState<string | null>(null);
  // index into layout.views, or null for the automatic framing
  const [viewIdx, setViewIdx] = useState<number | null>(layout.views.length ? 0 : null);
  const radius = FLOOR_RADII[layout.floor.size];

  // Automatic framing: the shrine rather than the whole floor — when the
  // mandir cabinet is up, move in close so it fills the view.
  const auto = useMemo(() => {
    const camZ = layout.mandir ? Math.max(11, radius * 0.8) : radius * 1.45;
    const lookY = layout.mandir ? 3.4 : 1.8;
    return { pos: [0, 4.4, camZ] as Vec3, look: [0, lookY, 0] as Vec3 };
  }, [layout.mandir, radius]);

  const chosen = viewIdx !== null ? layout.views[viewIdx] : undefined;
  const wide = chosen ? chosen.pos : auto.pos;
  const wideLook = chosen ? chosen.look : auto.look;

  // Darshan framing: eye level, a pace in front, looking up into the face.
  const { standing, facing, deity } = useMemo(() => {
    if (!darshanId) return { standing: null, facing: null, deity: null };
    const anchor = murtiAnchor(layout, placedIdols, darshanId);
    if (!anchor) return { standing: null, facing: null, deity: null };
    const [x, baseY, z] = anchor;
    const placed = placedIdols.find(p => p.instanceId === darshanId);
    return {
      standing: [x, DEVOTEE_EYE, z + STAND_BACK] as Vec3,
      facing: [x, baseY + MURTI_EYE - GAZE_DROP, z] as Vec3,
      deity: IDOLS.find(d => d.id === placed?.idolId) ?? null,
    };
  }, [darshanId, layout, placedIdols]);

  const inDarshan = darshanId !== null && standing !== null;
  const camPos = inDarshan ? standing! : wide;
  const camLook = inDarshan ? facing! : wideLook;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas shadows="soft" dpr={[1, 2]} camera={{ position: wide, fov: WIDE_FOV }}>
        <CameraRig pos={camPos} look={camLook} fov={inDarshan ? DARSHAN_FOV : WIDE_FOV} />
        <MandirScene
          layout={layout}
          placedIdols={placedIdols}
          showLabels={false}
          onItemDown={(id, e) => {
            e.stopPropagation();
            if (id.startsWith('decor:')) return;
            // first tap approaches the deity; from darshan, tapping offers
            if (darshanId === id) onGarland(id);
            else setDarshanId(id);
          }}
        />
      </Canvas>

      {/* Viewpoint switcher — the spots the devotee saved in the 3D editor.
          Hidden during darshan, where the deity should have the frame. */}
      {!inDarshan && layout.views.length > 0 && (
        <div
          style={{
            position: 'absolute', top: 8, left: 8,
            display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: '70%',
          }}
        >
          <ViewPill label="Auto" active={viewIdx === null} onClick={() => setViewIdx(null)} />
          {layout.views.map((v, i) => (
            <ViewPill
              key={v.id}
              label={String(i + 1)}
              title={v.label}
              active={viewIdx === i}
              onClick={() => setViewIdx(i)}
            />
          ))}
        </div>
      )}

      {/* Darshan chrome — kept to the edges so nothing sits between the
          devotee and the deity */}
      {inDarshan && (
        <>
          <div
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              display: 'flex', justifyContent: 'center', gap: 10,
              padding: '14px 12px 16px',
              background: 'linear-gradient(to top, rgba(26,14,4,0.55), rgba(26,14,4,0))',
              pointerEvents: 'none',
            }}
          >
            <button
              onClick={() => darshanId && onGarland(darshanId)}
              style={{
                pointerEvents: 'auto',
                fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 700,
                letterSpacing: '0.08em', color: '#3a2a08', cursor: 'pointer',
                padding: '8px 18px', borderRadius: 999,
                border: '1px solid rgba(255,225,160,0.7)',
                background: 'linear-gradient(180deg,#f5d98a,#d8a93f)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
              }}
            >
              Offer Garland
            </button>
            <button
              onClick={() => setDarshanId(null)}
              style={{
                pointerEvents: 'auto',
                fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 700,
                letterSpacing: '0.08em', color: '#f3e4c2', cursor: 'pointer',
                padding: '8px 18px', borderRadius: 999,
                border: '1px solid rgba(243,228,194,0.35)',
                background: 'rgba(40,24,10,0.55)',
              }}
            >
              Step Back
            </button>
          </div>

          {deity && (
            <div
              style={{
                position: 'absolute', top: 10, left: 0, right: 0,
                textAlign: 'center', pointerEvents: 'none',
                fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700,
                letterSpacing: '0.28em', textTransform: 'uppercase',
                color: 'rgba(255,226,170,0.85)',
                textShadow: '0 1px 6px rgba(0,0,0,0.6)',
              }}
            >
              {deity.mantra}
            </div>
          )}
        </>
      )}

      {!inDarshan && (
        <div
          style={{
            position: 'absolute', bottom: 10, left: 0, right: 0,
            textAlign: 'center', pointerEvents: 'none',
            fontFamily: "'Cinzel', serif", fontSize: 10, fontWeight: 600,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: 'rgba(255,226,170,0.6)',
            textShadow: '0 1px 5px rgba(0,0,0,0.55)',
          }}
        >
          Tap a murti for darshan
        </div>
      )}
    </div>
  );
}

function ViewPill({ label, title, active, onClick }: {
  label: string;
  title?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title ?? label}
      style={{
        cursor: 'pointer',
        fontFamily: "'Cinzel', serif", fontSize: 10, fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        padding: '4px 10px', borderRadius: 999, lineHeight: 1.4,
        color: active ? '#3a2a08' : 'rgba(255,226,170,0.9)',
        background: active ? 'linear-gradient(180deg,#f5d98a,#d8a93f)' : 'rgba(30,18,6,0.5)',
        border: `1px solid ${active ? 'rgba(255,225,160,0.8)' : 'rgba(243,228,194,0.3)'}`,
        boxShadow: active ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
        backdropFilter: 'blur(3px)',
      }}
    >
      {label}
    </button>
  );
}
