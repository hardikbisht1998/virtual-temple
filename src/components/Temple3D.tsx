import { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { IDOLS } from '../data';
import type { PlacedIdol } from '../types';
import {
  LAYOUT_KEY, DEFAULT_LAYOUT, FLOOR_RADII, loadLayout,
  type Layout3D, type FloorConfig, type FloorShape, type DecorType, type DecorItem,
} from '../layout3d';
import { MandirScene, DEITY_MODELS } from './MandirScene';

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
      const [cx, cz] = clampToFloor(x, z, FLOOR_RADII[l.floor.size], l.floor.shape);
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

  const toggleHall = useCallback(() => {
    setLayout(l => ({ ...l, hall: !l.hall }));
  }, []);

  const toggleRoom = useCallback(() => {
    setLayout(l => ({ ...l, room: !l.room }));
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
        <ToolBtn icon="📦" label="Cover" active={layout.room} onClick={toggleRoom} />
        <ToolBtn icon="🏛️" label="Temple Hall" active={layout.hall} onClick={toggleHall} />
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
