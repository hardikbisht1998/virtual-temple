import { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Vector3, type PerspectiveCamera } from 'three';
import { loadLayout, FLOOR_RADII } from '../layout3d';
import { MandirScene, murtiAnchor, MURTI_EYE, DEVOTEE_EYE } from './MandirScene';
import { IDOLS } from '../data';
import type { PlacedIdol } from '../types';

/* How far in front of the murti the devotee stands, and how long the
   approach takes. Slow on purpose — walking up to a deity is not a cut. */
const STAND_BACK = 4.3;
const APPROACH = 1.6;
/* The shrine sits above standing height, so darshan genuinely looks upward.
   Aim at the chest rather than the eyes so the whole figure stays in frame. */
const GAZE_DROP = 0.6;
const WIDE_FOV = 42;
const DARSHAN_FOV = 34;

/* Drives the camera between the wide shrine framing and a darshan view
   standing before one murti. Lives inside the Canvas so it can useFrame. */
function CameraRig({ from, lookFrom, to, lookTo, active }: {
  from: [number, number, number];
  lookFrom: [number, number, number];
  to: [number, number, number] | null;
  lookTo: [number, number, number] | null;
  active: boolean;
}) {
  const { camera } = useThree() as { camera: PerspectiveCamera };
  const t = useRef(0);
  const pos = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(), []);
  const a = useMemo(() => new Vector3(), []);
  const b = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    const target = active && to ? 1 : 0;
    // ease toward the target state rather than snapping
    t.current += Math.sign(target - t.current) * Math.min(delta / APPROACH, Math.abs(target - t.current));
    const k = t.current * t.current * (3 - 2 * t.current); // smoothstep

    a.set(...from);
    b.set(...(to ?? from));
    pos.lerpVectors(a, b, k);

    a.set(...lookFrom);
    b.set(...(lookTo ?? lookFrom));
    look.lerpVectors(a, b, k);

    camera.position.copy(pos);
    camera.lookAt(look);

    // narrow the lens on approach — less wide-angle distortion up close
    const fov = WIDE_FOV + (DARSHAN_FOV - WIDE_FOV) * k;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

/* Front view of the user's 3D mandir, embedded in the Temple tab.
   Tapping a murti walks the camera up to it for darshan; tapping again
   from there offers a garland. */
export default function MandirViewport({ placedIdols, onGarland }: {
  placedIdols: PlacedIdol[];
  onGarland: (instanceId: string) => void;
}) {
  // Fresh read per mount: the layout only changes on the 3D Mandir page,
  // and switching tabs remounts this component.
  const [layout] = useState(loadLayout);
  const [darshanId, setDarshanId] = useState<string | null>(null);
  const radius = FLOOR_RADII[layout.floor.size];

  // Wide framing: the shrine rather than the whole floor — when the wooden
  // mandir is up, move in close so it fills the view.
  const camZ = layout.mandir ? Math.max(11, radius * 0.8) : radius * 1.45;
  const lookY = layout.mandir ? 3.4 : 1.8;
  const wide: [number, number, number] = [0, 4.4, camZ];
  const wideLook: [number, number, number] = [0, lookY, 0];

  // Darshan framing: eye level, a pace in front, looking up into the face.
  const { standing, facing, deity } = useMemo(() => {
    if (!darshanId) return { standing: null, facing: null, deity: null };
    const anchor = murtiAnchor(layout, placedIdols, darshanId);
    if (!anchor) return { standing: null, facing: null, deity: null };
    const [x, baseY, z] = anchor;
    const placed = placedIdols.find(p => p.instanceId === darshanId);
    return {
      standing: [x, DEVOTEE_EYE, z + STAND_BACK] as [number, number, number],
      facing: [x, baseY + MURTI_EYE - GAZE_DROP, z] as [number, number, number],
      deity: IDOLS.find(d => d.id === placed?.idolId) ?? null,
    };
  }, [darshanId, layout, placedIdols]);

  const inDarshan = darshanId !== null && standing !== null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas shadows="soft" dpr={[1, 2]} camera={{ position: wide, fov: 42 }}>
        <CameraRig
          from={wide}
          lookFrom={wideLook}
          to={standing}
          lookTo={facing}
          active={inDarshan}
        />
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
