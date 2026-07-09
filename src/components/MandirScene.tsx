import { useMemo, useRef, Suspense } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Stars, Html, useGLTF, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import {
  Box3, Vector3, DoubleSide, CanvasTexture, RepeatWrapping, SRGBColorSpace, AdditiveBlending,
  type Object3D, type Mesh, type MeshStandardMaterial, type Group, type PointLight, type Points,
} from 'three';
import { IDOLS } from '../data';
import type { PlacedIdol, Idol } from '../types';
import { FLOOR_RADII, defaultIdolPos, type Layout3D, type FloorShape, type DecorItem } from '../layout3d';
import shivaModelUrl from '../assets/shiva_-_hindu_god.glb?url';
import ganeshaModelUrl from '../assets/lord_ganesha_3d_model__hindu_god_statue.glb?url';

const HEADING_FONT = "'Cinzel', serif";

/* Flip shadow flags on every solid mesh under a group (used via onUpdate).
   Wireframe meshes (the jali lattice) are skipped — their shadow-depth pass
   would cast a solid wall — as are meshes flagged noShadow (flame glows,
   the moon halo: light sources shouldn't cast shadows). */
function enableShadows(root: Object3D) {
  root.traverse(o => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    if (mesh.userData.noShadow) return;
    if ((mesh.material as MeshStandardMaterial)?.wireframe) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

/* ── Procedural textures ─────────────────────────────────────────
   Canvas-painted maps — realism without downloading any image files.
   Cached at module level; both Canvases share the same texture (three
   uploads a per-renderer GPU copy). Seams from non-tileable painting
   read as stone joints / plank edges, which suits the materials. */
function paintTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, repeatX = 1, repeatY = 1): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

let _marble: CanvasTexture | undefined;
function marbleTexture(): CanvasTexture {
  _marble ??= paintTexture(512, (ctx, s) => {
    ctx.fillStyle = '#eae4d6';
    ctx.fillRect(0, 0, s, s);
    // soft tonal clouds
    for (let i = 0; i < 34; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = 40 + Math.random() * 110;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(201,194,178,0.16)');
      g.addColorStop(1, 'rgba(201,194,178,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // wandering veins — mostly grey, every 4th one faintly gold
    for (let v = 0; v < 26; v++) {
      let x = Math.random() * s, y = Math.random() * s, a = Math.random() * Math.PI * 2;
      ctx.strokeStyle = v % 4 === 0 ? 'rgba(168,142,96,0.10)' : `rgba(118,112,102,${0.06 + Math.random() * 0.1})`;
      ctx.lineWidth = 0.6 + Math.random() * 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 70; k++) {
        a += (Math.random() - 0.5) * 0.8;
        x += Math.cos(a) * 5;
        y += Math.sin(a) * 5;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
  return _marble;
}

let _wood: CanvasTexture | undefined;
function woodTexture(): CanvasTexture {
  // Painted in light neutral tans so the material `color` tint (copper
  // shades) multiplies through and the grain just modulates it.
  _wood ??= paintTexture(512, (ctx, s) => {
    const grad = ctx.createLinearGradient(0, 0, s, 0);
    grad.addColorStop(0, '#c8a37c');
    grad.addColorStop(0.5, '#bd9066');
    grad.addColorStop(1, '#c8a37c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    // vertical grain streaks with a slow wobble
    for (let i = 0; i < 220; i++) {
      const x0 = Math.random() * s;
      const amp = 2 + Math.random() * 6, ph = Math.random() * Math.PI * 2;
      ctx.strokeStyle = `rgba(74,42,16,${0.04 + Math.random() * 0.1})`;
      ctx.lineWidth = 0.6 + Math.random() * 2;
      ctx.beginPath();
      for (let y = 0; y <= s; y += 8) {
        const x = x0 + Math.sin(y / 46 + ph) * amp;
        if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // a few knots
    for (let k = 0; k < 5; k++) {
      const x = Math.random() * s, y = Math.random() * s;
      for (let r = 10; r > 1; r -= 2.2) {
        ctx.strokeStyle = `rgba(70,38,14,${0.16 - r * 0.01})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.6, r, 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  });
  return _wood;
}

let _plaster: CanvasTexture | undefined;
function plasterTexture(): CanvasTexture {
  _plaster ??= paintTexture(256, (ctx, s) => {
    ctx.fillStyle = '#f0ead9';
    ctx.fillRect(0, 0, s, s);
    // fine speckle
    for (let i = 0; i < 2600; i++) {
      const v = Math.floor(150 + Math.random() * 40);
      ctx.fillStyle = `rgba(${v},${v - 8},${v - 26},${0.03 + Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    // faint weathering stains
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = 30 + Math.random() * 60;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(160,148,120,0.06)');
      g.addColorStop(1, 'rgba(160,148,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, 3, 1);
  return _plaster;
}

function PlasterMat({ tint = '#efe8d9' }: { tint?: string }) {
  return <meshStandardMaterial map={plasterTexture()} color={tint} roughness={0.62} metalness={0.03} />;
}

/* ── Living light ────────────────────────────────────────────────
   Real flames never hold still — every flame in the scene is this
   component: a flickering emissive core + additive outer glow whose
   scale dances per-frame, with an optional flickering point light.
   The base of the flame sits at the group origin. */
function Flame({ scale = 1, light = 0, distance = 4 }: { scale?: number; light?: number; distance?: number }) {
  const grp = useRef<Group>(null);
  const pt = useRef<PointLight>(null);
  const seed = useMemo(() => Math.random() * 100, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed;
    const w = 1 + Math.sin(t * 11) * 0.06 + Math.sin(t * 23 + 1.7) * 0.05;
    const h = 1 + Math.sin(t * 15) * 0.12 + Math.sin(t * 29 + 0.6) * 0.06;
    grp.current?.scale.set(w * scale, h * scale, w * scale);
    if (pt.current) pt.current.intensity = light * (0.85 + 0.1 * Math.sin(t * 13) + 0.08 * Math.sin(t * 7.3));
  });
  return (
    <group ref={grp}>
      <mesh position={[0, 0.13, 0]} userData={{ noShadow: true }}>
        <coneGeometry args={[0.07, 0.26, 10]} />
        <meshStandardMaterial color="#ffe9a8" emissive="#ffa726" emissiveIntensity={3.4} />
      </mesh>
      <mesh position={[0, 0.15, 0]} scale={[1.8, 1.5, 1.8]} userData={{ noShadow: true }}>
        <coneGeometry args={[0.07, 0.26, 10]} />
        <meshStandardMaterial color="#ff7a1a" emissive="#ff6a00" emissiveIntensity={1.6} transparent opacity={0.3} depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      {light > 0 && <pointLight ref={pt} position={[0, 0.35, 0]} intensity={light} distance={distance} color="#ff9d3c" />}
    </group>
  );
}

/* Point light with a slow candle-like flicker — used for the warm
   interior lights so the whole room breathes with the flames. */
function FlickerLight({ position, intensity, distance, color }: {
  position: [number, number, number]; intensity: number; distance?: number; color: string;
}) {
  const ref = useRef<PointLight>(null);
  const seed = useMemo(() => Math.random() * 100, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed;
    if (ref.current) ref.current.intensity = intensity * (0.9 + 0.06 * Math.sin(t * 9) + 0.04 * Math.sin(t * 23));
  });
  return <pointLight ref={ref} position={position} intensity={intensity} distance={distance} color={color} />;
}

/* Warm dust motes / embers drifting up through the lamplight */
function Motes({ radius }: { radius: number }) {
  const ref = useRef<Points>(null);
  const data = useMemo(() => {
    const n = 130;
    const base = new Float32Array(n * 3);
    const speed = new Float32Array(n);
    const phase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      base[i * 3]     = (Math.random() - 0.5) * radius * 1.7;
      base[i * 3 + 1] = Math.random() * 6;
      base[i * 3 + 2] = (Math.random() - 0.5) * radius * 1.7;
      speed[i] = 0.12 + Math.random() * 0.3;
      phase[i] = Math.random() * Math.PI * 2;
    }
    return { n, base, speed, phase, positions: base.slice() };
  }, [radius]);
  useFrame(({ clock }) => {
    const pts = ref.current;
    if (!pts) return;
    const attr = pts.geometry.attributes.position;
    const arr = attr.array as Float32Array;
    const t = clock.elapsedTime;
    for (let i = 0; i < data.n; i++) {
      const i3 = i * 3;
      arr[i3]     = data.base[i3] + Math.sin(t * 0.4 + data.phase[i]) * 0.35;
      arr[i3 + 1] = (data.base[i3 + 1] + t * data.speed[i]) % 6.5;
      arr[i3 + 2] = data.base[i3 + 2] + Math.cos(t * 0.33 + data.phase[i]) * 0.35;
    }
    attr.needsUpdate = true;
  });
  return (
    <points ref={ref} key={radius} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.055} color="#ffd9a0" transparent opacity={0.4} blending={AdditiveBlending} depthWrite={false} />
    </points>
  );
}

/* Full moon low over the horizon — exempt from fog, haloed by bloom */
function Moon() {
  return (
    <group position={[-17, 21, -38]}>
      <mesh userData={{ noShadow: true }}>
        <sphereGeometry args={[1.8, 24, 24]} />
        <meshBasicMaterial color="#fff5dc" fog={false} />
      </mesh>
      <mesh scale={1.35} userData={{ noShadow: true }}>
        <sphereGeometry args={[1.8, 24, 24]} />
        <meshBasicMaterial color="#ffedc4" transparent opacity={0.16} fog={false} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

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
  showLabels?: boolean; // murti name chips — off in the presentation front view
  onItemDown?: (id: string, e: ThreeEvent<PointerEvent>) => void; // murti instanceId or decor:<id>
  onFloorMove?: (x: number, z: number) => void;
  onFloorUp?: () => void;
}

export function MandirScene({
  layout, placedIdols, selected = null, dragId = null, showLabels = true,
  onItemDown, onFloorMove, onFloorUp,
}: MandirSceneProps) {
  const radius = FLOOR_RADII[layout.floor.size];

  // Floor marble tiled to the room size (clone shares the painted canvas)
  const floorTex = useMemo(() => {
    const t = marbleTexture().clone();
    t.repeat.set(radius / 4, radius / 4);
    t.needsUpdate = true;
    return t;
  }, [radius]);

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

      {/* Lighting — low ambient + hemisphere so forms get modelled, one
         shadow-casting key light, warm fills */}
      <ambientLight intensity={0.22} color="#ffd9a0" />
      <hemisphereLight args={['#8f7cc9', '#4a3520', 0.45]} />
      <directionalLight
        castShadow
        position={[8, 14, 9]}
        intensity={1.4}
        color="#ffe4b8"
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={1}
        shadow-camera-far={50}
      />
      <FlickerLight position={[0, 6, -6]} intensity={34} color="#ff9d3c" />
      <FlickerLight position={[0, 4, 6]} intensity={16} color="#ffb066" />
      {/* Cool moonlight rim from the front-left balances the firelight */}
      <directionalLight position={[-10, 8, 12]} intensity={0.4} color="#8a94d8" />

      {/* Procedural environment map (no HDR download) — gives the copper,
         gold and marble something to reflect so they stop looking flat */}
      <Environment resolution={64}>
        <Lightformer intensity={2.4} position={[0, 7, -9]} scale={[12, 5, 1]} color="#ffb066" />
        <Lightformer intensity={1.2} position={[-9, 4, 2]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} color="#8f7cc9" />
        <Lightformer intensity={1.2} position={[9, 4, 2]} rotation-y={-Math.PI / 2} scale={[8, 4, 1]} color="#c9b27c" />
        <Lightformer intensity={1.6} position={[0, 10, 4]} rotation-x={Math.PI / 2} scale={[10, 8, 1]} color="#fff1d6" />
      </Environment>

      <Stars radius={60} depth={40} count={1400} factor={3} saturation={0.4} fade speed={0.6} />
      <Moon />
      <Motes radius={radius} />

      {layout.room && <Sanctum radius={radius} shape={layout.floor.shape} />}
      {layout.hall && <TempleHall radius={radius} />}
      {layout.mandir && <WoodenMandir />}

      {/* Floor — also the drag surface */}
      <mesh
        key={`floor-${layout.floor.shape}-${layout.floor.size}`}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onPointerMove={onFloorMove ? e => onFloorMove(e.point.x, e.point.z) : undefined}
        onPointerUp={onFloorUp}
      >
        {layout.floor.shape === 'square'
          ? <planeGeometry args={[radius * 2, radius * 2]} />
          : <circleGeometry args={[radius, layout.floor.shape === 'hex' ? 6 : 64]} />}
        <meshPhysicalMaterial map={floorTex} color="#e6dfd0" roughness={0.32} metalness={0.04} clearcoat={0.55} clearcoatRoughness={0.35} envMapIntensity={0.7} />
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
            baseY={layout.mandir ? mandirLift(pos[0], pos[1]) : 0}
            showLabel={showLabels}
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

      {/* Post-processing: bloom makes flames/gold genuinely glow; a soft
         vignette frames the night scene */}
      <EffectComposer>
        <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.9} luminanceSmoothing={0.2} />
        <Vignette eskil={false} offset={0.25} darkness={0.45} />
      </EffectComposer>
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
    <group onUpdate={enableShadows}>
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
      <FlickerLight position={[0, WALL_H - 1.2, 0]} intensity={35} distance={radius * 2.5} color="#ffb066" />
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
        <PlasterMat />
      </mesh>
      {/* Side walls */}
      <mesh position={[-half - T / 2, H / 2, 0]}>
        <boxGeometry args={[T, H, W]} />
        <PlasterMat tint="#e6dfcf" />
      </mesh>
      <mesh position={[half + T / 2, H / 2, 0]}>
        <boxGeometry args={[T, H, W]} />
        <PlasterMat tint="#e6dfcf" />
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
            <PlasterMat tint="#e9e2d2" />
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
        <meshStandardMaterial map={plasterTexture()} color="#e9e2d2" roughness={0.62} metalness={0.03} side={DoubleSide} />
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
    <group onUpdate={enableShadows}>
      {columns.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.55, 0.65, 0.3, 16]} />
            <meshStandardMaterial color="#b6ae9c" roughness={0.65} />
          </mesh>
          <mesh position={[0, 2.4, 0]}>
            <cylinderGeometry args={[0.38, 0.44, 4.5, 16]} />
            <meshStandardMaterial map={marbleTexture()} color="#e9e2d2" roughness={0.45} metalness={0.08} />
          </mesh>
          <mesh position={[0, 4.75, 0]}>
            <boxGeometry args={[1.1, 0.35, 1.1]} />
            <meshStandardMaterial color="#d8b23a" roughness={0.4} metalness={0.5} />
          </mesh>
          {/* Column flame sconce */}
          <group position={[0, 4.95, 0]}>
            <Flame scale={1.2} />
          </group>
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
        <group position={[0, 7.05, 0]}>
          <Flame />
        </group>
        <Html center position={[0, 3.4, 0.2]} zIndexRange={[0, 0]}>
          <div style={{ fontSize: 34, color: '#ffcf70', textShadow: '0 0 18px rgba(255,150,0,0.9)', fontFamily: 'serif', userSelect: 'none', pointerEvents: 'none' }}>
            ॐ
          </div>
        </Html>
      </group>
    </group>
  );
}

/* ── Carved wooden mandir ────────────────────────────────────────
   Modelled on assets/templestructure.jpg: a copper-toned carved
   cabinet shrine — legs + drawer base, raised deity platform, turned
   front pillars with jali side lattices, scalloped arch, cornice and
   three domed shikharas with kalash finials. Murtis whose position
   falls on the platform footprint stand on top of it (mandirLift). */
const MANDIR_Z = -5;        // scene z of the mandir centre (murti default arc)
const MANDIR_HALF_W = 5.5;  // outer half-width
const MANDIR_HALF_D = 3;    // outer half-depth
const PLATFORM_TOP = 1.14;  // deity platform height
const BEAM_Y = 5.35;        // underside of the cornice
const ROOF_Y = BEAM_Y + 0.56; // top of the cornice — domes sit here

function mandirLift(x: number, z: number): number {
  const inside =
    Math.abs(x) <= MANDIR_HALF_W - 0.9 &&
    Math.abs(z - MANDIR_Z) <= MANDIR_HALF_D - 0.6;
  return inside ? PLATFORM_TOP : 0;
}

/* Carved-copper wood finish from the photo — the painted grain map
   multiplies under the copper tint so it reads as lacquered carved wood */
function CopperMat({ bright = false }: { bright?: boolean }) {
  return bright
    ? <meshStandardMaterial map={woodTexture()} color="#f0a860" metalness={0.6} roughness={0.3} emissive="#5a2405" emissiveIntensity={0.25} envMapIntensity={1.3} />
    : <meshStandardMaterial map={woodTexture()} color="#c97a3e" metalness={0.45} roughness={0.42} emissive="#3a1a05" emissiveIntensity={0.18} envMapIntensity={1.1} />;
}

function WoodenMandir() {
  const W = MANDIR_HALF_W * 2, D = MANDIR_HALF_D * 2;
  const legX = MANDIR_HALF_W - 0.45, legZ = MANDIR_HALF_D - 0.45;
  const pillarX = MANDIR_HALF_W - 0.55;
  const openH = BEAM_Y - PLATFORM_TOP;

  return (
    <group position={[0, 0, MANDIR_Z]} onUpdate={enableShadows}>
      {/* Carved legs */}
      {[[-legX, -legZ], [legX, -legZ], [-legX, legZ], [legX, legZ]].map(([lx, lz], i) => (
        <group key={i} position={[lx, 0, lz]}>
          <mesh position={[0, 0.26, 0]}>
            <cylinderGeometry args={[0.13, 0.2, 0.36, 10]} />
            <CopperMat />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <sphereGeometry args={[0.14, 10, 8]} />
            <CopperMat bright />
          </mesh>
        </group>
      ))}

      {/* Drawer cabinet base */}
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[W, 0.62, D]} />
        <CopperMat />
      </mesh>
      {/* Drawer fronts with knobs */}
      {[[-3.7, 2.4], [0, 2.9], [3.7, 2.4]].map(([dx, dw], i) => (
        <group key={i} position={[dx, 0.72, MANDIR_HALF_D + 0.035]}>
          <mesh>
            <boxGeometry args={[dw, 0.42, 0.07]} />
            <CopperMat bright />
          </mesh>
          <mesh position={[0, 0, 0.06]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial color="#5c2c10" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* Deity platform with carved front lip */}
      <mesh position={[0, PLATFORM_TOP - 0.07, 0]}>
        <boxGeometry args={[W + 0.5, 0.14, D + 0.5]} />
        <CopperMat bright />
      </mesh>
      <mesh position={[0, PLATFORM_TOP - 0.28, MANDIR_HALF_D + 0.18]}>
        <boxGeometry args={[W + 0.5, 0.3, 0.14]} />
        <CopperMat />
      </mesh>

      {/* Turned front pillars + plain rear posts */}
      <TurnedPillar x={-pillarX} z={MANDIR_HALF_D - 0.35} />
      <TurnedPillar x={pillarX} z={MANDIR_HALF_D - 0.35} />
      {[-pillarX, pillarX].map((px, i) => (
        <mesh key={i} position={[px, PLATFORM_TOP + openH / 2, -(MANDIR_HALF_D - 0.35)]}>
          <cylinderGeometry args={[0.16, 0.2, openH, 10]} />
          <CopperMat />
        </mesh>
      ))}

      {/* Jali lattice side panels (wireframe grid reads as carved screen) */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * (MANDIR_HALF_W - 0.35), PLATFORM_TOP + openH / 2, 0.1]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[D - 1.4, openH - 0.4, 5, 7]} />
          <meshStandardMaterial color="#d98a4b" wireframe metalness={0.5} roughness={0.4} />
        </mesh>
      ))}

      {/* Back wall */}
      <mesh position={[0, PLATFORM_TOP + openH / 2, -(MANDIR_HALF_D - 0.15)]}>
        <boxGeometry args={[W - 0.5, openH, 0.12]} />
        <meshStandardMaterial map={woodTexture()} color="#dd8f52" metalness={0.4} roughness={0.45} emissive="#3a1a05" emissiveIntensity={0.2} />
      </mesh>

      {/* Scalloped arch across the front opening */}
      <mesh position={[0, BEAM_Y - 1.1, MANDIR_HALF_D - 0.3]}>
        <torusGeometry args={[2.7, 0.13, 10, 40, Math.PI]} />
        <CopperMat bright />
      </mesh>

      {/* Cornice */}
      <mesh position={[0, BEAM_Y + 0.22, 0]}>
        <boxGeometry args={[W + 0.7, 0.44, D + 0.7]} />
        <CopperMat />
      </mesh>
      <mesh position={[0, BEAM_Y + 0.5, 0]}>
        <boxGeometry args={[W + 0.9, 0.12, D + 0.9]} />
        <CopperMat bright />
      </mesh>

      {/* Peacock-fan crest over the centre front */}
      <group position={[0, ROOF_Y + 0.1, MANDIR_HALF_D + 0.2]}>
        {[-3, -2, -1, 0, 1, 2, 3].map(k => (
          <mesh key={k} position={[k * 0.28, 0.55 - Math.abs(k) * 0.09, 0]} rotation={[0, 0, -k * 0.28]}>
            <coneGeometry args={[0.09, 0.9 - Math.abs(k) * 0.12, 8]} />
            <CopperMat bright />
          </mesh>
        ))}
        <mesh position={[0, 0.15, 0.05]}>
          <sphereGeometry args={[0.18, 12, 10]} />
          <CopperMat />
        </mesh>
      </group>

      {/* Three domed shikharas — centre one taller */}
      <Shikhara x={-3.6} scale={0.85} />
      <Shikhara x={0} scale={1.15} />
      <Shikhara x={3.6} scale={0.85} />

      {/* Warm light inside the sanctum */}
      <FlickerLight position={[0, 3.6, 0.5]} intensity={26} distance={12} color="#ffb066" />
    </group>
  );
}

/* Lathe-turned front pillar: base block, pot, ringed shaft, capital */
function TurnedPillar({ x, z }: { x: number; z: number }) {
  const H = BEAM_Y - PLATFORM_TOP;
  return (
    <group position={[x, PLATFORM_TOP, z]}>
      <mesh position={[0, 0.14, 0]}>
        <boxGeometry args={[0.72, 0.28, 0.72]} />
        <CopperMat />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.3, 12, 10]} />
        <CopperMat bright />
      </mesh>
      <mesh position={[0, H / 2 + 0.35, 0]}>
        <cylinderGeometry args={[0.17, 0.24, H - 1.3, 20]} />
        <CopperMat />
      </mesh>
      {[0.3, 0.55, 0.8].map((t, i) => (
        <mesh key={i} position={[0, 0.7 + t * (H - 1.3), 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.21, 0.045, 10, 28]} />
          <CopperMat bright />
        </mesh>
      ))}
      <mesh position={[0, H - 0.35, 0]}>
        <sphereGeometry args={[0.26, 12, 10]} />
        <CopperMat bright />
      </mesh>
      <mesh position={[0, H - 0.1, 0]}>
        <boxGeometry args={[0.66, 0.2, 0.66]} />
        <CopperMat />
      </mesh>
    </group>
  );
}

/* Ribbed dome + kalash finial, sitting on the cornice */
function Shikhara({ x, scale = 1 }: { x: number; scale?: number }) {
  return (
    <group position={[x, ROOF_Y, 0]} scale={scale}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.72, 0.82, 0.6, 8]} />
        <CopperMat />
      </mesh>
      <mesh position={[0, 1.05, 0]} scale={[1, 0.85, 1]}>
        <sphereGeometry args={[0.85, 24, 18]} />
        <CopperMat bright />
      </mesh>
      <mesh position={[0, 1.95, 0]}>
        <coneGeometry args={[0.42, 0.75, 18]} />
        <CopperMat />
      </mesh>
      <mesh position={[0, 2.45, 0]}>
        <sphereGeometry args={[0.17, 10, 8]} />
        <CopperMat bright />
      </mesh>
      <mesh position={[0, 2.62, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <CopperMat bright />
      </mesh>
      <mesh position={[0, 2.82, 0]}>
        <coneGeometry args={[0.05, 0.24, 8]} />
        <CopperMat bright />
      </mesh>
    </group>
  );
}

/* ── Deity murti (statue) ────────────────────────────────────── */

function Murti({ idol, hasGarland, position, baseY = 0, showLabel = true, rotationY, selected, dragging, onPointerDown }: {
  idol: Idol;
  hasGarland: boolean;
  position: [number, number];
  baseY?: number; // lifted onto the wooden mandir platform when standing on it
  showLabel?: boolean;
  rotationY: number;
  selected: boolean;
  dragging: boolean;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const [x, z] = position;
  return (
    <group position={[x, baseY, z]} rotation={[0, rotationY, 0]} onPointerDown={onPointerDown} onUpdate={enableShadows}>
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
        <meshStandardMaterial map={marbleTexture()} color="#ddd6c4" roughness={0.45} metalness={0.08} />
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
      {showLabel && (
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
      )}
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
    enableShadows(model);
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
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]} onPointerDown={onPointerDown} onUpdate={enableShadows}>
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
      <group position={[0, 0.18, 0]}>
        <Flame scale={0.85} light={lit ? 4.5 : 0} distance={4.5} />
      </group>
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
        <meshStandardMaterial map={marbleTexture()} color="#e9e2d2" roughness={0.45} metalness={0.08} />
      </mesh>
      <mesh position={[0, 2.9, 0]}>
        <boxGeometry args={[0.75, 0.24, 0.75]} />
        <meshStandardMaterial color="#d8b23a" roughness={0.4} metalness={0.5} />
      </mesh>
      <group position={[0, 3.0, 0]}>
        <Flame />
      </group>
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
