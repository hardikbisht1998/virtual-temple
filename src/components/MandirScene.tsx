import { useMemo, Suspense } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Stars, Html, useGLTF } from '@react-three/drei';
import { Box3, Vector3, DoubleSide } from 'three';
import { IDOLS } from '../data';
import type { PlacedIdol, Idol } from '../types';
import { FLOOR_RADII, defaultIdolPos, type Layout3D, type FloorShape, type DecorItem } from '../layout3d';
import shivaModelUrl from '../assets/shiva_-_hindu_god.glb?url';
import ganeshaModelUrl from '../assets/lord_ganesha_3d_model__hindu_god_statue.glb?url';

const HEADING_FONT = "'Cinzel', serif";

/* Deities with a real 3D model in assets — everyone else gets the procedural statue */
export const DEITY_MODELS: Record<string, string> = {
  shiva: shivaModelUrl,
  ganesha: ganeshaModelUrl,
};

/* ── Shared mandir scene ─────────────────────────────────────────
   Everything inside the Canvas: sky, lights, architecture, murtis,
   decorations. Temple3D wraps it with OrbitControls + drag editing;
   the Temple tab embeds it as a fixed front view. */

export interface MandirSceneProps {
  layout: Layout3D;
  placedIdols: PlacedIdol[];
  selected?: string | null;
  dragId?: string | null;
  onItemDown?: (id: string, e: ThreeEvent<PointerEvent>) => void; // murti instanceId or decor:<id>
  onFloorMove?: (x: number, z: number) => void;
  onFloorUp?: () => void;
}

export function MandirScene({
  layout, placedIdols, selected = null, dragId = null,
  onItemDown, onFloorMove, onFloorUp,
}: MandirSceneProps) {
  const radius = FLOOR_RADII[layout.floor.size];

  const idolEntries = useMemo(() => {
    const n = placedIdols.length;
    return placedIdols.map((placed, i) => {
      const idol = IDOLS.find(d => d.id === placed.idolId);
      const stored = layout.positions[placed.instanceId];
      const pos: [number, number] = stored ?? defaultIdolPos(i, n);
      return { placed, idol, pos };
    });
  }, [placedIdols, layout.positions]);

  return (
    <>
      <color attach="background" args={['#4a3d5c']} />
      <fog attach="fog" args={['#4a3d5c', 24, 75]} />

      {/* Lighting */}
      <ambientLight intensity={0.5} color="#ffd9a0" />
      <directionalLight position={[6, 12, 8]} intensity={1.1} color="#ffe4b8" />
      <pointLight position={[0, 6, -6]} intensity={40} color="#ff9d3c" />
      <pointLight position={[0, 4, 6]} intensity={18} color="#ffb066" />

      <Stars radius={60} depth={40} count={1400} factor={3} saturation={0.4} fade speed={0.6} />

      {layout.room && <Sanctum radius={radius} shape={layout.floor.shape} />}
      {layout.hall && <TempleHall radius={radius} />}

      {/* Floor — also the drag surface */}
      <mesh
        key={`floor-${layout.floor.shape}-${layout.floor.size}`}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onPointerMove={onFloorMove ? e => onFloorMove(e.point.x, e.point.z) : undefined}
        onPointerUp={onFloorUp}
      >
        {layout.floor.shape === 'square'
          ? <planeGeometry args={[radius * 2, radius * 2]} />
          : <circleGeometry args={[radius, layout.floor.shape === 'hex' ? 6 : 64]} />}
        <meshStandardMaterial color="#d9d2c0" roughness={0.65} metalness={0.05} />
      </mesh>
      {layout.floor.shape === 'square' ? (
        <mesh key={`border-sq-${layout.floor.size}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[radius * 2 + 0.5, radius * 2 + 0.5]} />
          <meshStandardMaterial color="#c9a227" emissive="#ff8c00" emissiveIntensity={0.22} roughness={0.5} metalness={0.35} />
        </mesh>
      ) : (
        <mesh key={`border-${layout.floor.shape}-${layout.floor.size}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <ringGeometry args={[radius - 0.5, radius - 0.25, layout.floor.shape === 'hex' ? 6 : 64]} />
          <meshStandardMaterial color="#c9a227" emissive="#ff8c00" emissiveIntensity={0.22} roughness={0.5} metalness={0.35} />
        </mesh>
      )}

      {/* Idols */}
      {idolEntries.map(({ placed, idol, pos }) =>
        idol ? (
          <Murti
            key={placed.instanceId}
            idol={idol}
            hasGarland={placed.hasGarland}
            position={pos}
            rotationY={layout.rotations[placed.instanceId] ?? 0}
            selected={selected === placed.instanceId}
            dragging={dragId === placed.instanceId}
            onPointerDown={e => onItemDown?.(placed.instanceId, e)}
          />
        ) : null
      )}

      {/* Decorations */}
      {layout.decor.map((d, i) => (
        <Decor
          key={d.id}
          item={d}
          lit={i < 4}
          rotationY={layout.rotations[`decor:${d.id}`] ?? 0}
          selected={selected === `decor:${d.id}`}
          onPointerDown={e => onItemDown?.(`decor:${d.id}`, e)}
        />
      ))}
    </>
  );
}

/* ── Temple architecture ─────────────────────────────────────── */

/* Enclosure that follows the floor shape, top always open:
   square → back + side walls, front open
   hex    → walls on the 3 rear edges, 3 front edges open
   circle → curved wall around the back half of the circumference */
const WALL_H = 7;
const WALL_T = 0.3;

function Sanctum({ radius, shape }: { radius: number; shape: FloorShape }) {
  return (
    <group>
      {/* Base plinth under the whole room */}
      {shape === 'square' ? (
        <mesh position={[0, -0.17, 0]}>
          <boxGeometry args={[radius * 2 + 1.4, 0.3, radius * 2 + 1.4]} />
          <meshStandardMaterial color="#8f887a" roughness={0.8} />
        </mesh>
      ) : (
        <mesh position={[0, -0.17, 0]} rotation={[0, shape === 'hex' ? Math.PI / 2 : 0, 0]}>
          <cylinderGeometry args={[radius + 0.7, radius + 0.7, 0.3, shape === 'hex' ? 6 : 48]} />
          <meshStandardMaterial color="#8f887a" roughness={0.8} />
        </mesh>
      )}

      {shape === 'square' && <SquareWalls half={radius} />}
      {shape === 'hex'    && <HexWalls radius={radius} />}
      {shape === 'circle' && <CircleWall radius={radius} />}

      {/* Warm light high in the room so the interior stays inviting */}
      <pointLight position={[0, WALL_H - 1.2, 0]} intensity={35} distance={radius * 2.5} color="#ffb066" />
    </group>
  );
}

function GoldMat() {
  return <meshStandardMaterial color="#e9b438" metalness={0.6} roughness={0.35} emissive="#7a4500" emissiveIntensity={0.4} />;
}

function SquareWalls({ half }: { half: number }) {
  const H = WALL_H, T = WALL_T;
  const W = half * 2 + 0.6;
  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, H / 2, -half - T / 2]}>
        <boxGeometry args={[W, H, T]} />
        <meshStandardMaterial color="#efe8d9" roughness={0.55} metalness={0.05} />
      </mesh>
      {/* Side walls */}
      <mesh position={[-half - T / 2, H / 2, 0]}>
        <boxGeometry args={[T, H, W]} />
        <meshStandardMaterial color="#e6dfcf" roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[half + T / 2, H / 2, 0]}>
        <boxGeometry args={[T, H, W]} />
        <meshStandardMaterial color="#e6dfcf" roughness={0.55} metalness={0.05} />
      </mesh>

      {/* Open top — gold rim capping the walls */}
      <mesh position={[0, H + 0.08, -half - T / 2]}>
        <boxGeometry args={[W, 0.16, T + 0.14]} />
        <GoldMat />
      </mesh>
      <mesh position={[-half - T / 2, H + 0.08, 0]}>
        <boxGeometry args={[T + 0.14, 0.16, W]} />
        <GoldMat />
      </mesh>
      <mesh position={[half + T / 2, H + 0.08, 0]}>
        <boxGeometry args={[T + 0.14, 0.16, W]} />
        <GoldMat />
      </mesh>

      {/* Gold trim where the walls meet the floor */}
      <mesh position={[0, 0.12, -half + 0.1]}>
        <boxGeometry args={[half * 2, 0.24, 0.12]} />
        <GoldMat />
      </mesh>
      <mesh position={[-half + 0.1, 0.12, 0]}>
        <boxGeometry args={[0.12, 0.24, half * 2]} />
        <GoldMat />
      </mesh>
      <mesh position={[half - 0.1, 0.12, 0]}>
        <boxGeometry args={[0.12, 0.24, half * 2]} />
        <GoldMat />
      </mesh>
    </group>
  );
}

/* Hexagon: floor corners sit at 0°, 60°, …; the 3 rear edges (midpoints at
   30°, 90°, 150° in floor-plane angle, i.e. world z < 0) get walls. */
function HexWalls({ radius }: { radius: number }) {
  const H = WALL_H, T = WALL_T;
  const apothem = radius * Math.cos(Math.PI / 6);
  const edges = [30, 90, 150].map(deg => {
    const th = (deg * Math.PI) / 180;
    const d = apothem + T / 2;
    return { x: d * Math.cos(th), z: -d * Math.sin(th), rotY: th - Math.PI / 2 };
  });
  return (
    <group>
      {edges.map((e, i) => (
        <group key={i} position={[e.x, 0, e.z]} rotation={[0, e.rotY, 0]}>
          <mesh position={[0, H / 2, 0]}>
            <boxGeometry args={[radius * 1.04, H, T]} />
            <meshStandardMaterial color="#e9e2d2" roughness={0.55} metalness={0.05} />
          </mesh>
          {/* Gold rim on top */}
          <mesh position={[0, H + 0.08, 0]}>
            <boxGeometry args={[radius * 1.04, 0.16, T + 0.14]} />
            <GoldMat />
          </mesh>
          {/* Gold trim at the base */}
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[radius * 1.02, 0.24, T + 0.1]} />
            <GoldMat />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Circle: one curved wall covering the rear half of the circumference */
function CircleWall({ radius }: { radius: number }) {
  const H = WALL_H;
  const r = radius + 0.15;
  return (
    <group>
      <mesh position={[0, H / 2, 0]}>
        <cylinderGeometry args={[r, r, H, 48, 1, true, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#e9e2d2" roughness={0.55} metalness={0.05} side={DoubleSide} />
      </mesh>
      {/* Gold rim on top */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, H + 0.08, 0]}>
        <torusGeometry args={[r, 0.1, 8, 48, Math.PI]} />
        <GoldMat />
      </mesh>
      {/* Gold trim at the base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <torusGeometry args={[r - 0.1, 0.08, 8, 48, Math.PI]} />
        <GoldMat />
      </mesh>
    </group>
  );
}

function TempleHall({ radius }: { radius: number }) {
  const columns = useMemo(() => {
    const arr: [number, number][] = [];
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.12 + (0.76 * i) / 6) + Math.PI; // rear semicircle
      arr.push([Math.cos(a) * (radius - 1.2), Math.sin(a) * -(radius - 1.2)]);
    }
    return arr;
  }, [radius]);

  return (
    <group>
      {columns.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.55, 0.65, 0.3, 16]} />
            <meshStandardMaterial color="#b6ae9c" roughness={0.65} />
          </mesh>
          <mesh position={[0, 2.4, 0]}>
            <cylinderGeometry args={[0.38, 0.44, 4.5, 16]} />
            <meshStandardMaterial color="#e9e2d2" roughness={0.5} metalness={0.08} />
          </mesh>
          <mesh position={[0, 4.75, 0]}>
            <boxGeometry args={[1.1, 0.35, 1.1]} />
            <meshStandardMaterial color="#d8b23a" roughness={0.4} metalness={0.5} />
          </mesh>
          {/* Column flame sconce */}
          <mesh position={[0, 5.15, 0]}>
            <coneGeometry args={[0.12, 0.35, 8]} />
            <meshStandardMaterial color="#ffb347" emissive="#ff8c00" emissiveIntensity={2.2} />
          </mesh>
        </group>
      ))}

      {/* Grand arch behind the altar */}
      <group position={[0, 0, -(radius - 1.5)]}>
        <mesh position={[0, 3.2, 0]}>
          <torusGeometry args={[3.4, 0.16, 12, 48, Math.PI]} />
          <meshStandardMaterial color="#e9b438" roughness={0.35} metalness={0.6} emissive="#7a4500" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[-3.4, 1.6, 0]}>
          <cylinderGeometry args={[0.16, 0.2, 3.2, 12]} />
          <meshStandardMaterial color="#e9b438" roughness={0.35} metalness={0.6} />
        </mesh>
        <mesh position={[3.4, 1.6, 0]}>
          <cylinderGeometry args={[0.16, 0.2, 3.2, 12]} />
          <meshStandardMaterial color="#e9b438" roughness={0.35} metalness={0.6} />
        </mesh>
        {/* Kalash on top */}
        <mesh position={[0, 6.85, 0]}>
          <sphereGeometry args={[0.3, 16, 12]} />
          <meshStandardMaterial color="#e9b438" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 7.2, 0]}>
          <coneGeometry args={[0.12, 0.3, 8]} />
          <meshStandardMaterial color="#ffde8c" emissive="#ff8c00" emissiveIntensity={1} />
        </mesh>
        <Html center position={[0, 3.4, 0.2]} zIndexRange={[0, 0]}>
          <div style={{ fontSize: 34, color: '#ffcf70', textShadow: '0 0 18px rgba(255,150,0,0.9)', fontFamily: 'serif', userSelect: 'none', pointerEvents: 'none' }}>
            ॐ
          </div>
        </Html>
      </group>
    </group>
  );
}

/* ── Deity murti (statue) ────────────────────────────────────── */

function Murti({ idol, hasGarland, position, rotationY, selected, dragging, onPointerDown }: {
  idol: Idol;
  hasGarland: boolean;
  position: [number, number];
  rotationY: number;
  selected: boolean;
  dragging: boolean;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const [x, z] = position;
  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]} onPointerDown={onPointerDown}>
      {/* Selection ring */}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[1.05, 1.25, 32]} />
          <meshStandardMaterial color="#ffb347" emissive="#ff8c00" emissiveIntensity={1.4} transparent opacity={0.9} />
        </mesh>
      )}

      {/* Pedestal */}
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.78, 0.95, 0.56, 24]} />
        <meshStandardMaterial color="#ddd6c4" roughness={0.55} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.56, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.78, 0.05, 8, 32]} />
        <meshStandardMaterial color="#e9b438" metalness={0.6} roughness={0.35} />
      </mesh>

      {/* Statue — real 3D model when we have one, procedural otherwise */}
      {DEITY_MODELS[idol.id] ? (
        <Suspense fallback={<StatueBody idol={idol} dragging={dragging} selected={selected} />}>
          <DeityModel url={DEITY_MODELS[idol.id]} />
        </Suspense>
      ) : (
        <StatueBody idol={idol} dragging={dragging} selected={selected} />
      )}

      {/* Garland on the murti */}
      {hasGarland && (
        <mesh position={[0, 1.62, 0.12]} rotation={[0.5, 0, 0]}>
          <torusGeometry args={[0.4, 0.07, 8, 24]} />
          <meshStandardMaterial color="#f58bb4" emissive="#e8447a" emissiveIntensity={0.5} roughness={0.7} />
        </mesh>
      )}

      {/* Name label */}
      <Html center position={[0, 3.35, 0]} zIndexRange={[0, 0]}>
        <div
          style={{
            fontFamily: HEADING_FONT,
            fontSize: 11,
            fontWeight: 700,
            color: selected ? '#FFD080' : 'rgba(255,208,128,0.75)',
            background: 'rgba(10,4,0,0.65)',
            border: `1px solid ${idol.color}66`,
            padding: '2px 8px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
            userSelect: 'none',
            pointerEvents: 'none',
            textShadow: '0 0 8px rgba(255,150,0,0.5)',
          }}
        >
          {idol.name}
        </div>
      </Html>
    </group>
  );
}

/* Procedural statue used for deities without a real 3D model */
function StatueBody({ idol, dragging, selected }: { idol: Idol; dragging: boolean; selected: boolean }) {
  return (
    <group>
      {/* Body (robe) */}
      <mesh position={[0, 1.28, 0]}>
        <capsuleGeometry args={[0.44, 0.85, 8, 20]} />
        <meshStandardMaterial color={idol.color} roughness={0.5} metalness={0.18} emissive={idol.color} emissiveIntensity={dragging ? 0.35 : 0.12} />
      </mesh>

      {/* Necklace */}
      <mesh position={[0, 1.85, 0.05]} rotation={[0.4, 0, 0]}>
        <torusGeometry args={[0.26, 0.035, 8, 24]} />
        <meshStandardMaterial color="#e9b438" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 2.18, 0]}>
        <sphereGeometry args={[0.31, 20, 16]} />
        <meshStandardMaterial color="#e8b46a" roughness={0.45} metalness={0.25} />
      </mesh>

      {/* Crown */}
      <mesh position={[0, 2.6, 0]}>
        <coneGeometry args={[0.24, 0.45, 12]} />
        <meshStandardMaterial color="#e9b438" metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.85, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#d8332a" emissive="#d8332a" emissiveIntensity={0.8} />
      </mesh>

      {/* Halo */}
      <mesh position={[0, 2.25, -0.32]}>
        <torusGeometry args={[0.5, 0.035, 8, 40]} />
        <meshStandardMaterial color="#1a0a00" emissive={idol.color} emissiveIntensity={selected ? 3 : 1.8} />
      </mesh>

      <DeityEmblem id={idol.id} color={idol.color} />
    </group>
  );
}

/* Real deity model from assets, auto-scaled to murti size and seated on the pedestal */
const MODEL_HEIGHT = 2.4; // world units, matches the procedural statues
const PEDESTAL_TOP = 0.56;

function DeityModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const { model, scale, offset } = useMemo(() => {
    const model = scene.clone(true);
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = MODEL_HEIGHT / (size.y || 1);
    const offset: [number, number, number] = [
      -center.x * scale,
      PEDESTAL_TOP - box.min.y * scale,
      -center.z * scale,
    ];
    return { model, scale, offset };
  }, [scene]);

  return <primitive object={model} scale={scale} position={offset} />;
}

/* Small hand prop that makes each deity recognizable */
function DeityEmblem({ id, color }: { id: string; color: string }) {
  const gold = <meshStandardMaterial color="#e9b438" metalness={0.65} roughness={0.3} />;
  switch (id) {
    case 'shiva':
    case 'durga':
      return (
        <group position={[0.7, 1.5, 0.15]}>
          <mesh><cylinderGeometry args={[0.028, 0.028, 1.5, 8]} />{gold}</mesh>
          <mesh position={[0, 0.85, 0]}><coneGeometry args={[0.05, 0.28, 8]} />{gold}</mesh>
          <mesh position={[-0.13, 0.8, 0]} rotation={[0, 0, 0.25]}><coneGeometry args={[0.045, 0.24, 8]} />{gold}</mesh>
          <mesh position={[0.13, 0.8, 0]} rotation={[0, 0, -0.25]}><coneGeometry args={[0.045, 0.24, 8]} />{gold}</mesh>
        </group>
      );
    case 'krishna':
      return (
        <mesh position={[0.55, 1.55, 0.3]} rotation={[0, 0, -1.0]}>
          <cylinderGeometry args={[0.035, 0.035, 1.05, 10]} />
          {gold}
        </mesh>
      );
    case 'saraswati':
      return (
        <group position={[0.55, 1.35, 0.3]} rotation={[0, 0, -0.85]}>
          <mesh><cylinderGeometry args={[0.04, 0.04, 1.25, 10]} /><meshStandardMaterial color="#8b5a2b" roughness={0.6} /></mesh>
          <mesh position={[0, -0.62, 0]}><sphereGeometry args={[0.16, 12, 10]} /><meshStandardMaterial color="#a0642f" roughness={0.6} /></mesh>
          <mesh position={[0, 0.6, 0]}><sphereGeometry args={[0.09, 10, 8]} /><meshStandardMaterial color="#a0642f" roughness={0.6} /></mesh>
        </group>
      );
    case 'hanuman':
      return (
        <group position={[0.72, 1.35, 0.15]}>
          <mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.035, 0.045, 0.9, 8]} />{gold}</mesh>
          <mesh position={[0, 0.45, 0]}><sphereGeometry args={[0.22, 14, 12]} />{gold}</mesh>
        </group>
      );
    case 'ram':
      return (
        <group position={[0.72, 1.5, 0.15]} rotation={[0, 0, 0.1]}>
          <mesh><torusGeometry args={[0.55, 0.028, 8, 32, Math.PI]} /><meshStandardMaterial color="#8b5a2b" roughness={0.55} /></mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 1.1, 6]} />
            <meshStandardMaterial color="#e4d6a8" />
          </mesh>
        </group>
      );
    case 'lakshmi':
      return (
        <group position={[0.62, 1.35, 0.3]}>
          <mesh><sphereGeometry args={[0.09, 10, 8]} />{gold}</mesh>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <mesh key={i} position={[Math.cos((i / 6) * Math.PI * 2) * 0.12, 0.06, Math.sin((i / 6) * Math.PI * 2) * 0.12]} rotation={[Math.cos((i / 6) * Math.PI * 2) * 0.5, 0, -Math.sin((i / 6) * Math.PI * 2) * 0.5]}>
              <coneGeometry args={[0.06, 0.22, 8]} />
              <meshStandardMaterial color="#f06fa0" roughness={0.6} />
            </mesh>
          ))}
        </group>
      );
    case 'ganesha':
      return (
        <group position={[0.62, 1.15, 0.32]}>
          <mesh position={[0, -0.06, 0]}><cylinderGeometry args={[0.16, 0.18, 0.06, 12]} />{gold}</mesh>
          <mesh position={[0, 0.1, 0]}><coneGeometry args={[0.13, 0.26, 10]} /><meshStandardMaterial color="#f2e4c0" roughness={0.55} /></mesh>
        </group>
      );
    default:
      return <mesh position={[0.6, 1.4, 0.3]}><sphereGeometry args={[0.08, 8, 8]} /><meshStandardMaterial color={color} /></mesh>;
  }
}

/* ── Decorations ─────────────────────────────────────────────── */

function Decor({ item, lit, rotationY, selected, onPointerDown }: {
  item: DecorItem;
  lit: boolean;
  rotationY: number;
  selected: boolean;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const [x, z] = item.pos;
  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]} onPointerDown={onPointerDown}>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <ringGeometry args={[0.6, 0.75, 32]} />
          <meshStandardMaterial color="#ffb347" emissive="#ff8c00" emissiveIntensity={1.2} transparent opacity={0.85} />
        </mesh>
      )}
      {item.type === 'diya' && <DiyaMesh lit={lit} />}
      {item.type === 'pillar' && <PillarMesh />}
      {item.type === 'flowers' && <FlowersMesh />}
      {item.type === 'rangoli' && <RangoliMesh />}
    </group>
  );
}

function DiyaMesh({ lit }: { lit: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.26, 0.32, 0.18, 16]} />
        <meshStandardMaterial color="#8b4513" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <coneGeometry args={[0.08, 0.26, 8]} />
        <meshStandardMaterial color="#ffcf70" emissive="#ff9500" emissiveIntensity={3} />
      </mesh>
      {lit && <pointLight position={[0, 0.6, 0]} intensity={4} distance={4} color="#ff9d3c" />}
    </group>
  );
}

function PillarMesh() {
  return (
    <group>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.42, 0.5, 0.24, 14]} />
        <meshStandardMaterial color="#b6ae9c" roughness={0.65} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.26, 0.32, 2.6, 14]} />
        <meshStandardMaterial color="#e9e2d2" roughness={0.5} metalness={0.08} />
      </mesh>
      <mesh position={[0, 2.9, 0]}>
        <boxGeometry args={[0.75, 0.24, 0.75]} />
        <meshStandardMaterial color="#d8b23a" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0, 3.15, 0]}>
        <coneGeometry args={[0.1, 0.3, 8]} />
        <meshStandardMaterial color="#ffb347" emissive="#ff8c00" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

function FlowersMesh() {
  const petals = [
    { p: [0.14, 0.34, 0.05], c: '#f06fa0' },
    { p: [-0.13, 0.32, 0.1], c: '#ff8c42' },
    { p: [0.02, 0.4, -0.1], c: '#ffd23e' },
    { p: [-0.05, 0.3, 0.16], c: '#f58bb4' },
    { p: [0.1, 0.3, -0.14], c: '#ff6b6b' },
  ] as const;
  return (
    <group>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.16, 0.22, 0.2, 12]} />
        <meshStandardMaterial color="#7a4a22" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <sphereGeometry args={[0.18, 12, 10]} />
        <meshStandardMaterial color="#3e8e5a" roughness={0.8} />
      </mesh>
      {petals.map(({ p, c }, i) => (
        <mesh key={i} position={p as unknown as [number, number, number]}>
          <sphereGeometry args={[0.09, 10, 8]} />
          <meshStandardMaterial color={c} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function RangoliMesh() {
  const rings = [
    { r: [0.75, 0.95] as [number, number], c: '#e8447a' },
    { r: [0.45, 0.65] as [number, number], c: '#f5c542' },
    { r: [0.15, 0.35] as [number, number], c: '#2e9e5b' },
  ];
  return (
    <group>
      {rings.map(({ r, c }, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012 + i * 0.004, 0]}>
          <ringGeometry args={[r[0], r[1], 32]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.35} roughness={0.7} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.028, 0]}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial color="#ffcf70" emissive="#ff9500" emissiveIntensity={1} />
      </mesh>
    </group>
  );
}
