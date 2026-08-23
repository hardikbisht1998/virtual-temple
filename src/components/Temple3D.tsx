import { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { IDOLS } from '../data';
import type { PlacedIdol } from '../types';
import {
  LAYOUT_KEY, DEFAULT_LAYOUT, FLOOR_RADII, loadLayout, snap, PRESETS, MAX_VIEWS,
  type Layout3D, type FloorConfig, type FloorShape, type DecorType, type DecorItem,
  type ShellId, type MaterialId, type MandirStyle, type Preset,
} from '../layout3d';
import { MATERIALS } from '../materials/sets';
import { MandirScene } from './MandirScene';
import { DEITY_MODELS } from '../constants/models';

const HEADING_FONT = "'Cinzel', serif";

function clampToFloor(x: number, z: number, radius: number, shape: FloorShape): [number, number] {
  const margin = radius - 1;
  if (shape === 'square') {
    return [
      Math.max(-margin, Math.min(margin, x)),
      Math.max(-margin, Math.min(margin, z)),
    ];
  }
  const r = Math.hypot(x, z);
  if (r <= margin) return [x, z];
  const s = margin / r;
  return [x * s, z * s];
}

/* Mirrors the live orbit camera into a ref so the toolbar can snapshot it.
   The devotee frames their temple here; the Temple page then stands there. */
function CameraProbe({ out }: { out: React.MutableRefObject<[number, number, number]> }) {
  useFrame(({ camera }) => {
    out.current = [
      Math.round(camera.position.x * 100) / 100,
      Math.round(camera.position.y * 100) / 100,
      Math.round(camera.position.z * 100) / 100,
    ];
  });
  return null;
}

/* ── Main component ──────────────────────────────────────────── */

interface Props {
  placedIdols: PlacedIdol[];
  onAddIdol: (idolId: string) => void;
  onRemoveIdol: (instanceId: string) => void;
}

export function Temple3D({ placedIdols, onAddIdol, onRemoveIdol }: Props) {
  const [layout,     setLayout]     = useState<Layout3D>(loadLayout);
  const [dragId,     setDragId]     = useState<string | null>(null);
  const [selected,   setSelected]   = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  }, [layout]);

  const moveTo = useCallback((id: string, x: number, z: number) => {
    setLayout(l => {
      const [cx, cz] = clampToFloor(snap(x), snap(z), FLOOR_RADII[l.floor.size], l.floor.shape);
      if (id.startsWith('decor:')) {
        const decorId = id.slice(6);
        return { ...l, decor: l.decor.map(d => d.id === decorId ? { ...d, pos: [cx, cz] } : d) };
      }
      return { ...l, positions: { ...l.positions, [id]: [cx, cz] } };
    });
  }, []);

  const setFloor = useCallback((patch: Partial<FloorConfig>) => {
    setLayout(l => {
      const floor = { ...l.floor, ...patch };
      const r = FLOOR_RADII[floor.size];
      const clamp = ([x, z]: [number, number]): [number, number] => clampToFloor(x, z, r, floor.shape);
      return {
        ...l,
        floor,
        positions: Object.fromEntries(Object.entries(l.positions).map(([k, p]) => [k, clamp(p)])),
        decor: l.decor.map(d => ({ ...d, pos: clamp(d.pos) })),
      };
    });
  }, []);

  const setShell = useCallback((shell: ShellId) => {
    setLayout(l => ({ ...l, shell, views: [] }));
  }, []);

  const setMaterial = useCallback((material: MaterialId) => {
    setLayout(l => ({ ...l, material }));
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    // A preset restyles the space; the devotee's murtis and decor stay put.
    setLayout(l => {
      const next = { ...l, ...preset.patch, views: [] };
      const r = FLOOR_RADII[next.floor.size];
      const clamp = ([x, z]: [number, number]): [number, number] => clampToFloor(x, z, r, next.floor.shape);
      return {
        ...next,
        positions: Object.fromEntries(Object.entries(l.positions).map(([k, p]) => [k, clamp(p)])),
        decor: l.decor.map(d => ({ ...d, pos: clamp(d.pos) })),
      };
    });
  }, []);

  /* Clicking the active style turns the cabinet off; clicking the other
     switches style (turning it on if needed). */
  const pickMandir = useCallback((style: MandirStyle) => {
    setLayout(l =>
      l.mandir && l.mandirStyle === style
        ? { ...l, mandir: false }
        : { ...l, mandir: true, mandirStyle: style }
    );
  }, []);

  const camPos = useRef<[number, number, number]>([0, 5, 11.5]);

  const saveView = useCallback(() => {
    setLayout(l => {
      if (l.views.length >= MAX_VIEWS) return l;
      const n = l.views.length + 1;
      return {
        ...l,
        views: [
          ...l.views,
          { id: crypto.randomUUID(), label: `View ${n}`, pos: camPos.current, look: [0, 1.6, 0] as [number, number, number] },
        ],
      };
    });
  }, []);

  const removeView = useCallback((id: string) => {
    setLayout(l => ({
      ...l,
      // renumber so the labels stay 1..n after a deletion
      views: l.views.filter(v => v.id !== id).map((v, i) => ({ ...v, label: `View ${i + 1}` })),
    }));
  }, []);

  const addDecor = useCallback((type: DecorType) => {
    const item: DecorItem = {
      id: crypto.randomUUID(),
      type,
      pos: [(Math.random() - 0.5) * 6, 1.5 + Math.random() * 3],
    };
    setLayout(l => ({ ...l, decor: [...l.decor, item] }));
    setSelected(`decor:${item.id}`);
  }, []);

  const rotateSelected = useCallback((delta: number) => {
    if (!selected) return;
    setLayout(l => ({
      ...l,
      rotations: { ...l.rotations, [selected]: (l.rotations[selected] ?? 0) + delta },
    }));
  }, [selected]);

  const removeSelected = useCallback(() => {
    if (!selected) return;
    if (selected.startsWith('decor:')) {
      const decorId = selected.slice(6);
      setLayout(l => ({ ...l, decor: l.decor.filter(d => d.id !== decorId) }));
    } else {
      onRemoveIdol(selected);
      setLayout(l => {
        const positions = { ...l.positions };
        const rotations = { ...l.rotations };
        delete positions[selected];
        delete rotations[selected];
        return { ...l, positions, rotations };
      });
    }
    setSelected(null);
  }, [selected, onRemoveIdol]);

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    setSelected(null);
  }, []);

  const radius = FLOOR_RADII[layout.floor.size];

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-3">
      {/* ── Base toolbar: choose your temple's foundation ──── */}
      <div
        className="flex flex-wrap items-center gap-2 rounded-xl p-2.5"
        style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(176,180,190,0.6)', boxShadow: '0 2px 10px rgba(120,110,80,0.12)' }}
      >
        <span className="text-[10px] tracking-[0.2em] uppercase px-1" style={{ fontFamily: HEADING_FONT, color: '#b8860b' }}>
          Base:
        </span>
        <ToolBtn icon="⚪" label="Circle" active={layout.floor.shape === 'circle'} onClick={() => setFloor({ shape: 'circle' })} />
        <ToolBtn icon="⬛" label="Square" active={layout.floor.shape === 'square'} onClick={() => setFloor({ shape: 'square' })} />
        <ToolBtn icon="⬡"  label="Hex"    active={layout.floor.shape === 'hex'}    onClick={() => setFloor({ shape: 'hex' })} />
        <span className="w-px h-5 mx-1" style={{ background: 'rgba(176,180,190,0.6)' }} />
        <ToolBtn icon="▫️" label="Small"  active={layout.floor.size === 'small'}  onClick={() => setFloor({ size: 'small' })} />
        <ToolBtn icon="◻️" label="Medium" active={layout.floor.size === 'medium'} onClick={() => setFloor({ size: 'medium' })} />
        <ToolBtn icon="⬜" label="Large"  active={layout.floor.size === 'large'}  onClick={() => setFloor({ size: 'large' })} />
        <div className="flex-1" />
        <ToolBtn icon="🛕" label="Wood Mandir" active={layout.mandir && layout.mandirStyle === 'wood'} onClick={() => pickMandir('wood')} />
        <ToolBtn icon="🕌" label="Marble Mandir" active={layout.mandir && layout.mandirStyle === 'marble'} onClick={() => pickMandir('marble')} />
      </div>

      {/* ── Shell + material: the composed space and its stone ── */}
      <div
        className="flex flex-wrap items-center gap-2 rounded-xl p-2.5"
        style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(176,180,190,0.6)', boxShadow: '0 2px 10px rgba(120,110,80,0.12)' }}
      >
        <span className="text-[10px] tracking-[0.2em] uppercase px-1" style={{ fontFamily: HEADING_FONT, color: '#b8860b' }}>
          Shell:
        </span>
        <ToolBtn icon="🌌" label="Open"      active={layout.shell === 'open'}      onClick={() => setShell('open')} />
        <ToolBtn icon="🚪" label="Room"      active={layout.shell === 'room'}      onClick={() => setShell('room')} />
        <ToolBtn icon="🕯️" label="Niche"     active={layout.shell === 'niche'}     onClick={() => setShell('niche')} />
        <ToolBtn icon="🏛️" label="Hall"      active={layout.shell === 'hall'}      onClick={() => setShell('hall')} />
        <ToolBtn icon="🌙" label="Courtyard" active={layout.shell === 'courtyard'} onClick={() => setShell('courtyard')} />
        <ToolBtn icon="⛰️" label="Shikhara"  active={layout.shell === 'nagara'}    onClick={() => setShell('nagara')} />
        <ToolBtn icon="🪷" label="South"     active={layout.shell === 'dravidian'} onClick={() => setShell('dravidian')} />
        <ToolBtn icon="🌴" label="Kerala"    active={layout.shell === 'kerala'}    onClick={() => setShell('kerala')} />
        <span className="w-px h-5 mx-1" style={{ background: 'rgba(176,180,190,0.6)' }} />
        {(Object.keys(MATERIALS) as MaterialId[]).map(id => (
          <ToolBtn
            key={id}
            icon={MATERIALS[id].icon}
            label={MATERIALS[id].label}
            active={layout.material === id}
            onClick={() => setMaterial(id)}
          />
        ))}
      </div>

      {/* ── Presets: something beautiful in one tap, then customise ── */}
      <div
        className="flex flex-wrap items-center gap-2 rounded-xl p-2.5"
        style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(176,180,190,0.6)', boxShadow: '0 2px 10px rgba(120,110,80,0.12)' }}
      >
        <span className="text-[10px] tracking-[0.2em] uppercase px-1" style={{ fontFamily: HEADING_FONT, color: '#b8860b' }}>
          Presets:
        </span>
        {PRESETS.map(preset => (
          <ToolBtn key={preset.id} icon={preset.icon} label={preset.label} onClick={() => applyPreset(preset)} />
        ))}
        <div className="flex-1" />
        <ToolBtn
          icon="📷"
          label={layout.views.length >= MAX_VIEWS ? 'Views Full' : 'Save View'}
          disabled={layout.views.length >= MAX_VIEWS}
          onClick={saveView}
        />
        {layout.views.map(v => (
          <button
            key={v.id}
            onClick={() => removeView(v.id)}
            title={`${v.label} — click to delete`}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer"
            style={{
              fontFamily: HEADING_FONT,
              color: '#8a7a55',
              borderColor: 'rgba(184,134,11,0.55)',
              background: 'rgba(255,250,235,0.9)',
            }}
          >
            👁 {v.label} <span style={{ opacity: 0.55 }}>✕</span>
          </button>
        ))}
      </div>

      {/* ── Decor toolbar ──────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-2 rounded-xl p-2.5"
        style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(176,180,190,0.6)', boxShadow: '0 2px 10px rgba(120,110,80,0.12)' }}
      >
        <span className="text-[10px] tracking-[0.2em] uppercase px-1" style={{ fontFamily: HEADING_FONT, color: '#b8860b' }}>
          Decorate:
        </span>
        <ToolBtn icon="🪔" label="Diya"    onClick={() => addDecor('diya')} />
        <ToolBtn icon="🏛️" label="Pillar"  onClick={() => addDecor('pillar')} />
        <ToolBtn icon="🌸" label="Flowers" onClick={() => addDecor('flowers')} />
        <ToolBtn icon="🌀" label="Rangoli" onClick={() => addDecor('rangoli')} />
        <ToolBtn icon="🏺" label="Kalash"  onClick={() => addDecor('kalash')} />
        <ToolBtn icon="🔔" label="Bells"   onClick={() => addDecor('bells')} />
        <ToolBtn icon="🕉" label="Murtis"  onClick={() => setShowPicker(p => !p)} />
        <div className="flex-1" />
        <ToolBtn icon="⟲" label="Rotate" onClick={() => rotateSelected(Math.PI / 6)}  disabled={!selected} />
        <ToolBtn icon="⟳" label="Rotate" onClick={() => rotateSelected(-Math.PI / 6)} disabled={!selected} />
        <ToolBtn
          icon="✕" label="Remove"
          onClick={removeSelected}
          disabled={!selected}
          danger
        />
        <ToolBtn icon="↺" label="Reset Layout" onClick={resetLayout} danger />
      </div>

      {/* ── Murti picker: choose a deity and it comes to the temple ── */}
      {showPicker && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-xl p-2.5"
          style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(176,180,190,0.6)', boxShadow: '0 2px 10px rgba(120,110,80,0.12)' }}
        >
          <span className="text-[10px] tracking-[0.2em] uppercase px-1" style={{ fontFamily: HEADING_FONT, color: '#b8860b' }}>
            Invite a deity:
          </span>
          {IDOLS.map(idol => (
            <button
              key={idol.id}
              onClick={() => { onAddIdol(idol.id); setShowPicker(false); }}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-all cursor-pointer hover:scale-105"
              style={{
                fontFamily: HEADING_FONT,
                color: '#6b5312',
                borderColor: `${idol.color}55`,
                background: 'rgba(255,255,255,0.65)',
              }}
              title={idol.description}
            >
              <span>{idol.emoji}</span>{idol.name}
              {DEITY_MODELS[idol.id] && (
                <span
                  className="text-[9px] px-1.5 py-px rounded-full"
                  style={{ background: 'rgba(184,134,11,0.14)', color: '#b8860b', border: '1px solid rgba(184,134,11,0.4)' }}
                >
                  3D
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── 3D canvas ──────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ height: '68vh', minHeight: 420, border: '2px solid rgba(201,162,39,0.6)', boxShadow: '0 0 35px rgba(184,134,11,0.2), 0 8px 26px rgba(110,95,60,0.35)' }}
      >
        <Canvas
          shadows="soft"
          dpr={[1, 2]}
          camera={{ position: [0, 5, 11.5], fov: 45 }}
          onPointerMissed={() => setSelected(null)}
        >
          <MandirScene
            layout={layout}
            placedIdols={placedIdols}
            selected={selected}
            dragId={dragId}
            onItemDown={(id, e) => {
              e.stopPropagation();
              setDragId(id);
              setSelected(id);
            }}
            onFloorMove={dragId ? (x, z) => moveTo(dragId, x, z) : undefined}
            onFloorUp={() => setDragId(null)}
          />

          <CameraProbe out={camPos} />
          <OrbitControls
            enabled={!dragId}
            target={[0, 1.6, 0]}
            minDistance={4}
            maxDistance={radius * 2.2}
            maxPolarAngle={Math.PI / 2.05}
            enablePan={false}
          />
        </Canvas>

        {/* Hint overlay */}
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] px-3 py-1.5 rounded-full pointer-events-none whitespace-nowrap"
          style={{ background: 'rgba(255,255,255,0.88)', color: '#8a7a55', fontFamily: HEADING_FONT, border: '1px solid rgba(176,180,190,0.6)' }}
        >
          🖱 Drag to move &nbsp;•&nbsp; click to select, then ⟲ ⟳ rotate or ✕ remove &nbsp;•&nbsp; drag empty space to orbit
        </div>
      </div>

      {placedIdols.length === 0 && (
        <p
          className="text-center text-xs rounded-xl px-4 py-3 border"
          style={{ color: '#a1782a', background: 'rgba(255,255,255,0.55)', borderColor: 'rgba(176,180,190,0.5)' }}
        >
          Your 3D mandir is empty — add deities from the Customize tab and they will appear here. 🙏
        </p>
      )}
    </div>
  );
}

function ToolBtn({ icon, label, onClick, disabled = false, danger = false, active = false }: {
  icon: string; label: string; onClick: () => void; disabled?: boolean; danger?: boolean; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-all"
      style={{
        fontFamily: HEADING_FONT,
        color: disabled ? '#c5bda8' : danger ? '#c0392b' : active ? '#ffffff' : '#8a7a55',
        borderColor: disabled ? 'rgba(176,180,190,0.35)' : danger ? 'rgba(192,57,43,0.45)' : active ? 'rgba(184,134,11,0.9)' : 'rgba(176,180,190,0.6)',
        background: active ? 'linear-gradient(135deg, #e6c14c, #b8860b)' : 'rgba(255,255,255,0.6)',
        boxShadow: active ? '0 2px 10px rgba(184,134,11,0.4)' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span>{icon}</span>{label}
    </button>
  );
}
