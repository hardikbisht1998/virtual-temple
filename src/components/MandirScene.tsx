import { useMemo, useRef, Suspense, useState, useEffect } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Stars, Html, useGLTF, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, N8AO } from '@react-three/postprocessing';
import {
  Box3, Vector3, CanvasTexture, RepeatWrapping, SRGBColorSpace, AdditiveBlending, DoubleSide,
  type Object3D, type Mesh, type MeshStandardMaterial, type Group, type PointLight, type Points,
} from 'three';
import { IDOLS } from '../data';
import type { PlacedIdol, Idol } from '../types';
import { FLOOR_RADII, defaultIdolPos, type Layout3D, type DecorItem } from '../layout3d';
import { DEITY_MODELS, DEITY_MODEL_ORIENT } from '../constants/models';
import { Shell } from '../rooms/Shell';
import { MATERIALS } from '../materials/sets';

/* Decode Draco geometry from our own bundle rather than drei's default
   Google CDN — the compressed murtis then load offline and the app keeps
   no third-party runtime dependency. */
useGLTF.setDecoderPath('/draco/');

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




/* Bump maps live in linear space — no SRGB tag, mid-grey base, features
   darker/lighter. They give the marble veining and wood grain actual
   relief under the key light, which is most of what "carved" looks like. */
function paintLinearTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, repeatX = 1, repeatY = 1): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

let _marbleBump: CanvasTexture | undefined;
function marbleBumpTexture(): CanvasTexture {
  _marbleBump ??= paintLinearTexture(512, (ctx, s) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    for (let v = 0; v < 26; v++) {
      let x = Math.random() * s, y = Math.random() * s, a = Math.random() * Math.PI * 2;
      ctx.strokeStyle = `rgba(40,40,40,${0.25 + Math.random() * 0.25})`;
      ctx.lineWidth = 0.8 + Math.random() * 1.6;
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
  return _marbleBump;
}

let _woodBump: CanvasTexture | undefined;
function woodBumpTexture(): CanvasTexture {
  _woodBump ??= paintLinearTexture(512, (ctx, s) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 220; i++) {
      const x0 = Math.random() * s;
      const amp = 2 + Math.random() * 6, ph = Math.random() * Math.PI * 2;
      const deep = Math.random() > 0.5;
      ctx.strokeStyle = deep ? `rgba(30,30,30,${0.2 + Math.random() * 0.3})` : `rgba(210,210,210,${0.15 + Math.random() * 0.2})`;
      ctx.lineWidth = 0.6 + Math.random() * 2;
      ctx.beginPath();
      for (let y = 0; y <= s; y += 8) {
        const x = x0 + Math.sin(y / 46 + ph) * amp;
        if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
  return _woodBump;
}

/* Jali screen: an alpha-tested lattice of diamond piercings. Solid where
   white, pierced where black — so the panel is real carved geometry to the
   light and casts a perforated shadow instead of a wireframe's solid one. */
let _jali: CanvasTexture | undefined;
function jaliTexture(): CanvasTexture {
  if (_jali) return _jali;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  const cols = 9, rows = 12, cw = size / cols, rh = size / rows;
  ctx.fillStyle = '#000000';
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const cx = (i + 0.5) * cw, cy = (j + 0.5) * rh;
      const w = cw * 0.62, h = rh * 0.62;
      ctx.beginPath();
      ctx.moveTo(cx, cy - h / 2);
      ctx.lineTo(cx + w / 2, cy);
      ctx.lineTo(cx, cy + h / 2);
      ctx.lineTo(cx - w / 2, cy);
      ctx.closePath();
      ctx.fill();
    }
  }
  // solid border frame
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 26;
  ctx.strokeRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  _jali = tex;
  return tex;
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


/* ── Time of day ─────────────────────────────────────────────────
   Real puja happens at set times, so the scene's sky follows the actual
   clock: a morning puja looks like morning, an evening aarti like dusk.
   Set localStorage vt-debug-hour to preview a specific hour. */
interface DayPhase {
  sky: string;
  keyColor: string;
  keyIntensity: number;
  keyPos: [number, number, number];
  ambient: number;
  night: boolean;       // stars + moon
  envIntensity: number;
}

function getDayPhase(hour: number): DayPhase {
  if (hour >= 5 && hour < 8)   // dawn — rose-gold, low sun from the east
    return { sky: '#8a5f70', keyColor: '#ffc9a0', keyIntensity: 1.6, keyPos: [14, 6, 4], ambient: 0.34, night: false, envIntensity: 0.5 };
  if (hour >= 8 && hour < 17)  // day — pale lavender-blue, high neutral sun
    return { sky: '#93a0c4', keyColor: '#fff4e0', keyIntensity: 2.3, keyPos: [8, 18, 9], ambient: 0.5, night: false, envIntensity: 0.7 };
  if (hour >= 17 && hour < 20) // dusk — the warm hour of the evening aarti
    return { sky: '#5c4460', keyColor: '#ffb070', keyIntensity: 1.5, keyPos: [-13, 7, 5], ambient: 0.3, night: false, envIntensity: 0.55 };
  // night — the deep-violet devotional sky
  return { sky: '#4a3d5c', keyColor: '#ffe4b8', keyIntensity: 1.4, keyPos: [8, 14, 9], ambient: 0.3, night: true, envIntensity: 0.55 };
}

function useDayPhase(): DayPhase {
  const read = () => {
    const dbg = Number(localStorage.getItem('vt-debug-hour'));
    const hour = Number.isFinite(dbg) && localStorage.getItem('vt-debug-hour') !== null ? dbg : new Date().getHours();
    return getDayPhase(hour);
  };
  const [phase, setPhase] = useState<DayPhase>(read);
  useEffect(() => {
    const id = setInterval(() => setPhase(read()), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return phase;
}

export function MandirScene({
  layout, placedIdols, selected = null, dragId = null, showLabels = true,
  onItemDown, onFloorMove, onFloorUp,
}: MandirSceneProps) {
  const radius = FLOOR_RADII[layout.floor.size];

  // Floor marble tiled to the room size (clone shares the painted canvas)
  const floorBump = useMemo(() => {
    const t = marbleBumpTexture().clone();
    t.repeat.set(radius / 4, radius / 4);
    t.needsUpdate = true;
    return t;
  }, [radius]);

  const floorTex = useMemo(() => {
    const t = marbleTexture().clone();
    t.repeat.set(radius / 4, radius / 4);
    t.needsUpdate = true;
    return t;
  }, [radius]);

  const day = useDayPhase();

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
      <color attach="background" args={[day.sky]} />
      <fog attach="fog" args={[day.sky, 24, 75]} />

      {/* Lighting — low ambient + hemisphere so forms get modelled, one
         shadow-casting key light, warm fills */}
      <ambientLight intensity={day.ambient} color="#eef0ff" />
      <hemisphereLight args={['#b9c4f0', '#4a4038', 0.7]} />
      <directionalLight
        castShadow
        position={day.keyPos}
        intensity={day.keyIntensity}
        color={day.keyColor}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={1}
        shadow-camera-far={50}
      />
      <FlickerLight position={[0, 6, -6]} intensity={22} color="#ff9d3c" />
      <FlickerLight position={[0, 4, 6]} intensity={16} color="#ffb066" />
      {/* Cool moonlight rim from the front-left balances the firelight */}
      <directionalLight position={[-10, 8, 12]} intensity={0.75} color="#8fa0e8" />

      {/* Procedural environment map (no HDR download) — gives the copper,
         gold and marble something to reflect so they stop looking flat */}
      {/* Real HDR environment. The procedural Lightformer rig this replaced kept
         every surface in the same amber and gave metals nothing true to reflect;
         a 1k HDR costs ~1.4MB and is what makes carved stone read as carved. */}
      <Suspense fallback={null}>
        <Environment files="/hdr/dusk_1k.hdr" environmentIntensity={day.envIntensity} />
      </Suspense>

      {day.night && <Stars radius={60} depth={40} count={1400} factor={3} saturation={0.4} fade speed={0.6} />}
      {day.night && <Moon />}
      <Motes radius={radius} />

      <Shell shell={layout.shell} material={layout.material} radius={radius} shape={layout.floor.shape} />
      {layout.mandir && (layout.mandirStyle === 'marble' ? <MarbleMandir /> : <WoodenMandir />)}

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
        <meshPhysicalMaterial map={floorTex} bumpMap={floorBump} bumpScale={0.35} color={MATERIALS[layout.material].floorTint} roughness={0.32} metalness={0.04} clearcoat={0.55} clearcoatRoughness={0.35} envMapIntensity={0.7} />
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
        {/* Contact shadows in the creases — carving and drapery have no depth without it */}
        <N8AO aoRadius={0.55} distanceFalloff={0.8} intensity={2.6} quality="medium" halfRes />
        <Bloom mipmapBlur intensity={0.3} luminanceThreshold={0.97} luminanceSmoothing={0.3} />
        <Vignette eskil={false} offset={0.25} darkness={0.45} />
      </EffectComposer>
    </>
  );
}

/* ── Temple architecture ─────────────────────────────────────── */

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

/* World-space base of a placed murti — where its pedestal meets the platform.
   Exported so the darshan view can position a camera in front of a deity
   using exactly the placement maths the scene itself uses. */
export function murtiAnchor(
  layout: Layout3D,
  placedIdols: PlacedIdol[],
  instanceId: string,
): [number, number, number] | null {
  const i = placedIdols.findIndex(p => p.instanceId === instanceId);
  if (i < 0) return null;
  const [x, z] = layout.positions[instanceId] ?? defaultIdolPos(i, placedIdols.length);
  return [x, layout.mandir ? mandirLift(x, z) : 0, z];
}

/* Eye level of the murti's face above its base, and of a standing devotee. */
export const PEDESTAL_TOP = 0.56;
export const MURTI_EYE = PEDESTAL_TOP + 1.95;
export const DEVOTEE_EYE = 1.62;

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
    ? <meshStandardMaterial map={woodTexture()} bumpMap={woodBumpTexture()} bumpScale={0.18} color="#f0a860" metalness={0.6} roughness={0.3} emissive="#5a2405" emissiveIntensity={0.25} envMapIntensity={1.3} />
    : <meshStandardMaterial map={woodTexture()} bumpMap={woodBumpTexture()} bumpScale={0.18} color="#c97a3e" metalness={0.45} roughness={0.42} emissive="#3a1a05" emissiveIntensity={0.18} envMapIntensity={1.1} />;
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

      {/* Jali side screens — pierced lattice panels. alphaTest carves the
         diamond openings out of a solid plane, so light passes through the
         piercings and the shadow it casts is perforated, not a solid wall. */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * (MANDIR_HALF_W - 0.35), PLATFORM_TOP + openH / 2, 0.1]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
          <planeGeometry args={[D - 1.4, openH - 0.4]} />
          <meshStandardMaterial
            map={woodTexture()}
            color="#d98a4b"
            alphaMap={jaliTexture()}
            alphaTest={0.5}
            side={DoubleSide}
            metalness={0.35}
            roughness={0.5}
          />
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
      <FlickerLight position={[0, 3.9, 0.9]} intensity={13} distance={11} color="#ffbe80" />
    </group>
  );
}

/* Lathe-turned front pillar: base block, pot, ringed shaft, capital */

/* ── Marble home mandir ──────────────────────────────────────────
   The white-marble-and-gold cabinet found in most Indian homes: stepped
   plinth, fluted pillars, gold-ribbed onion dome with kalash, jharokha
   side chhatris. Same footprint constants as the wooden mandir, so
   murtiLift and the murti arc work unchanged. */
function MarbleMat({ bright = false }: { bright?: boolean }) {
  return bright
    ? <meshStandardMaterial map={marbleTexture()} color="#ffffff" roughness={0.28} metalness={0.06} envMapIntensity={1.0} />
    : <meshStandardMaterial map={marbleTexture()} color="#f2ecdf" roughness={0.38} metalness={0.05} envMapIntensity={0.8} />;
}
function InlayMat() {
  return <meshStandardMaterial color="#d9a441" metalness={0.8} roughness={0.25} envMapIntensity={1.2} />;
}

function MarbleMandir() {
  const W = MANDIR_HALF_W * 2, D = MANDIR_HALF_D * 2;
  const pillarX = MANDIR_HALF_W - 0.55;
  const openH = BEAM_Y - PLATFORM_TOP;

  return (
    <group position={[0, 0, MANDIR_Z]} onUpdate={enableShadows}>
      {/* stepped plinth */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[W + 0.9, 0.44, D + 0.9]} />
        <MarbleMat />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[W + 0.4, 0.36, D + 0.4]} />
        <MarbleMat bright />
      </mesh>
      {/* gold skirting line on the plinth */}
      <mesh position={[0, 0.44, (D + 0.9) / 2 + 0.005]}>
        <boxGeometry args={[W + 0.9, 0.06, 0.02]} />
        <InlayMat />
      </mesh>

      {/* deity platform */}
      <mesh position={[0, PLATFORM_TOP - 0.18, 0]}>
        <boxGeometry args={[W, 0.36, D]} />
        <MarbleMat bright />
      </mesh>
      <mesh position={[0, PLATFORM_TOP - 0.02, D / 2 - 0.02]}>
        <boxGeometry args={[W - 0.4, 0.04, 0.06]} />
        <InlayMat />
      </mesh>

      {/* back wall + low side walls */}
      <mesh position={[0, PLATFORM_TOP + openH / 2, -(MANDIR_HALF_D - 0.15)]}>
        <boxGeometry args={[W - 0.5, openH, 0.14]} />
        <MarbleMat />
      </mesh>
      {[-1, 1].map(sd => (
        <mesh key={sd} position={[sd * (MANDIR_HALF_W - 0.3), PLATFORM_TOP + openH / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[D - 0.8, openH, 0.14]} />
          <MarbleMat />
        </mesh>
      ))}

      {/* fluted front pillars with gold base + capital */}
      {[-pillarX, pillarX].map((px, i) => (
        <group key={i} position={[px, 0, MANDIR_HALF_D - 0.35]}>
          <mesh position={[0, PLATFORM_TOP + 0.14, 0]}>
            <cylinderGeometry args={[0.2, 0.24, 0.24, 12]} />
            <InlayMat />
          </mesh>
          <mesh position={[0, PLATFORM_TOP + openH / 2, 0]}>
            <cylinderGeometry args={[0.14, 0.17, openH - 0.5, 18]} />
            <MarbleMat bright />
          </mesh>
          <mesh position={[0, BEAM_Y - 0.16, 0]}>
            <cylinderGeometry args={[0.24, 0.15, 0.28, 12]} />
            <InlayMat />
          </mesh>
        </group>
      ))}

      {/* scalloped gold arch across the front opening */}
      <mesh position={[0, BEAM_Y - 0.5, MANDIR_HALF_D - 0.32]} rotation={[0, 0, 0]}>
        <torusGeometry args={[MANDIR_HALF_W - 0.9, 0.09, 10, 40, Math.PI]} />
        <InlayMat />
      </mesh>

      {/* cornice */}
      <mesh position={[0, BEAM_Y + 0.28, 0]}>
        <boxGeometry args={[W + 0.5, 0.56, D + 0.5]} />
        <MarbleMat />
      </mesh>
      <mesh position={[0, BEAM_Y + 0.02, (D + 0.5) / 2 + 0.005]}>
        <boxGeometry args={[W + 0.5, 0.05, 0.02]} />
        <InlayMat />
      </mesh>

      {/* central gold-ribbed onion dome + kalash */}
      <group position={[0, ROOF_Y, 0]}>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[1.15, 1.35, 0.36, 20]} />
          <MarbleMat bright />
        </mesh>
        <mesh position={[0, 1.05, 0]} scale={[1, 1.12, 1]}>
          <sphereGeometry args={[1.05, 24, 18]} />
          <MarbleMat bright />
        </mesh>
        {/* gold ribs */}
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={i} position={[0, 1.05, 0]} rotation={[0, (i / 8) * Math.PI, 0]} scale={[1.01, 1.13, 1.01]}>
            <torusGeometry args={[1.05, 0.022, 6, 40, Math.PI]} />
            <InlayMat />
          </mesh>
        ))}
        <mesh position={[0, 2.25, 0]}>
          <cylinderGeometry args={[0.09, 0.16, 0.22, 10]} />
          <InlayMat />
        </mesh>
        <mesh position={[0, 2.45, 0]}>
          <sphereGeometry args={[0.14, 10, 8]} />
          <InlayMat />
        </mesh>
        <mesh position={[0, 2.66, 0]}>
          <coneGeometry args={[0.06, 0.24, 8]} />
          <InlayMat />
        </mesh>
      </group>

      {/* corner chhatris */}
      {[-1, 1].map(sd => (
        <group key={`ch${sd}`} position={[sd * (MANDIR_HALF_W - 0.7), ROOF_Y, MANDIR_HALF_D - 0.7]}>
          {[0, 1, 2, 3].map(i => {
            const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.28, 0.35, Math.sin(a) * 0.28]}>
                <cylinderGeometry args={[0.035, 0.035, 0.7, 8]} />
                <MarbleMat bright />
              </mesh>
            );
          })}
          <mesh position={[0, 0.82, 0]} scale={[1, 0.75, 1]}>
            <sphereGeometry args={[0.42, 14, 10]} />
            <MarbleMat bright />
          </mesh>
          <mesh position={[0, 1.18, 0]}>
            <coneGeometry args={[0.05, 0.18, 8]} />
            <InlayMat />
          </mesh>
        </group>
      ))}
    </group>
  );
}

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
          <DeityModel url={DEITY_MODELS[idol.id]} orientY={DEITY_MODEL_ORIENT[idol.id] ?? 0} />
        </Suspense>
      ) : (
        <StatueBody idol={idol} dragging={dragging} selected={selected} />
      )}

      {/* Garland on the murti — a marigold mala draped from the shoulders */}
      {hasGarland && <GarlandMesh neckY={DEITY_MODELS[idol.id] ? 2.16 : 1.82} />}

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
  const gold  = <meshStandardMaterial color="#d9a441" metalness={0.75} roughness={0.28} />;
  const skin  = <meshStandardMaterial color="#c9a882" roughness={0.55} metalness={0.1} />;
  const cloth = (
    <meshStandardMaterial
      color={idol.color}
      roughness={0.62}
      metalness={0.08}
      emissive={idol.color}
      emissiveIntensity={dragging ? 0.22 : 0.05}
    />
  );

  /* One arm: upper arm angled out from the shoulder, forearm forward, hand at the end.
     Four arms read unmistakably as a Hindu murti where two would read as a doll. */
  const arm = (side: 1 | -1, raised: boolean) => (
    <group position={[side * 0.22, 1.6, raised ? -0.08 : 0.08]}>
      <group rotation={[0, 0, side * (raised ? -1.15 : -0.5)]}>
        {/* upper arm, angled down and out from the shoulder */}
        <mesh position={[side * 0.15, -0.11, 0]} rotation={[0, 0, side * 0.55]}>
          <capsuleGeometry args={[0.058, 0.24, 6, 12]} />
          {skin}
        </mesh>
        {/* forearm, brought forward toward the devotee */}
        <mesh position={[side * 0.29, raised ? -0.02 : -0.34, 0.07]} rotation={[0.35, 0, side * 0.15]}>
          <capsuleGeometry args={[0.05, 0.22, 6, 12]} />
          {skin}
        </mesh>
        {/* hand */}
        <mesh position={[side * 0.32, raised ? 0.12 : -0.48, 0.12]} scale={[1, 1.15, 0.7]}>
          <sphereGeometry args={[0.062, 10, 8]} />
          {skin}
        </mesh>
        {/* armlet */}
        <mesh position={[side * 0.19, -0.16, 0]} rotation={[0, 0, Math.PI / 2 + side * 0.55]}>
          <torusGeometry args={[0.062, 0.018, 6, 14]} />
          {gold}
        </mesh>
      </group>
    </group>
  );

  return (
    <group>
      {/* Lotus seat */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.62, 0.63, Math.sin(a) * 0.62]} rotation={[0.5, -a, 0]} scale={[1, 0.4, 1]}>
            <sphereGeometry args={[0.15, 8, 6]} />
            <meshStandardMaterial color="#e8d5b0" roughness={0.6} />
          </mesh>
        );
      })}

      {/* Crossed legs / lower garment — wide base is what makes it read as seated */}
      <mesh position={[0, 0.92, 0]}>
        <cylinderGeometry args={[0.44, 0.8, 0.56, 24]} />
        {cloth}
      </mesh>
      {/* Knees */}
      <mesh position={[-0.5, 0.78, 0.16]} scale={[1.25, 0.7, 1]}>
        <sphereGeometry args={[0.24, 12, 10]} />
        {cloth}
      </mesh>
      <mesh position={[0.5, 0.78, 0.16]} scale={[1.25, 0.7, 1]}>
        <sphereGeometry args={[0.24, 12, 10]} />
        {cloth}
      </mesh>
      {/* Sash across the waist */}
      <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.05, 8, 26]} />
        {gold}
      </mesh>

      {/* Torso */}
      <mesh position={[0, 1.44, 0]}>
        <cylinderGeometry args={[0.3, 0.42, 0.5, 20]} />
        {skin}
      </mesh>
      {/* Shoulders */}
      <mesh position={[0, 1.66, 0]} scale={[1.32, 0.72, 1]}>
        <sphereGeometry args={[0.26, 16, 12]} />
        {skin}
      </mesh>
      {/* Angavastram draped over one shoulder and across the chest */}
      <mesh position={[-0.16, 1.6, 0.02]} rotation={[0, 0, 0.42]} scale={[1, 1, 0.55]}>
        <capsuleGeometry args={[0.1, 0.34, 6, 12]} />
        {cloth}
      </mesh>
      <mesh position={[0.05, 1.36, 0.14]} rotation={[0, 0, -0.5]} scale={[1, 1, 0.4]}>
        <capsuleGeometry args={[0.075, 0.4, 6, 12]} />
        {cloth}
      </mesh>

      {arm(1, false)}
      {arm(-1, false)}
      {arm(1, true)}
      {arm(-1, true)}

      {/* Necklaces */}
      <mesh position={[0, 1.62, 0.04]} rotation={[0.35, 0, 0]}>
        <torusGeometry args={[0.22, 0.028, 8, 24]} />
        {gold}
      </mesh>
      <mesh position={[0, 1.52, 0.05]} rotation={[0.35, 0, 0]}>
        <torusGeometry args={[0.3, 0.022, 8, 24]} />
        {gold}
      </mesh>

      {/* Neck + head */}
      <mesh position={[0, 1.85, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.14, 12]} />
        {skin}
      </mesh>
      <mesh position={[0, 2.04, 0]} scale={[1, 1.15, 1.02]}>
        <sphereGeometry args={[0.23, 20, 16]} />
        {skin}
      </mesh>
      {/* Ears */}
      <mesh position={[-0.22, 2.03, 0]} scale={[0.5, 1, 0.6]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        {skin}
      </mesh>
      <mesh position={[0.22, 2.03, 0]} scale={[0.5, 1, 0.6]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        {skin}
      </mesh>
      {/* Tilak */}
      <mesh position={[0, 2.12, 0.215]}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshStandardMaterial color="#c4302b" roughness={0.5} />
      </mesh>

      {/* Mukut (crown): band, tapered tier, finial */}
      <mesh position={[0, 2.24, 0]}>
        <cylinderGeometry args={[0.235, 0.245, 0.1, 16]} />
        {gold}
      </mesh>
      <mesh position={[0, 2.42, 0]}>
        <cylinderGeometry args={[0.11, 0.22, 0.3, 16]} />
        {gold}
      </mesh>
      <mesh position={[0, 2.62, 0]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        {gold}
      </mesh>
      <mesh position={[0, 2.73, 0]}>
        <coneGeometry args={[0.035, 0.13, 10]} />
        {gold}
      </mesh>

      {/* Prabhavali — halo arch behind the murti, with rays */}
      <mesh position={[0, 2.0, -0.34]}>
        <torusGeometry args={[0.6, 0.035, 8, 44]} />
        <meshStandardMaterial
          color="#8a6a1f"
          metalness={0.6}
          roughness={0.35}
          emissive={idol.color}
          emissiveIntensity={selected ? 1.1 : 0.45}
        />
      </mesh>
      {Array.from({ length: 14 }).map((_, i) => {
        const a = Math.PI * (0.08 + (i / 13) * 0.84);
        return (
          <mesh
            key={`ray${i}`}
            position={[Math.cos(a) * 0.72, 2.0 + Math.sin(a) * 0.72, -0.34]}
            rotation={[0, 0, a - Math.PI / 2]}
          >
            <coneGeometry args={[0.028, 0.16, 6]} />
            {gold}
          </mesh>
        );
      })}

      <DeityEmblem id={idol.id} color={idol.color} />
    </group>
  );
}

/* Real deity model from assets, auto-scaled to murti size and seated on the pedestal */
const MODEL_HEIGHT = 2.4; // world units, matches the procedural statues

function DeityModel({ url, orientY = 0 }: { url: string; orientY?: number }) {
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

  return (
    <group rotation={[0, orientY, 0]}>
      <primitive object={model} scale={scale} position={offset} />
    </group>
  );
}

/* Small hand prop that makes each deity recognizable */

/* A haar as it actually hangs: two strands falling from the shoulders and
   meeting low on the chest in a U, strung from marigold heads with leaf
   beads between, a rose pendant at the bottom. Positioned by neck height —
   GLB murtis are normalized to MODEL_HEIGHT so one anchor per kind works. */
function GarlandMesh({ neckY }: { neckY: number }) {
  const beads = useMemo(() => {
    const pts: { p: [number, number, number]; kind: 0 | 1 | 2; s: number }[] = [];
    const N = 22;
    const shoulderW = 0.34;  // half-width at the top of the drape
    const dropDepth = 0.78;  // how far the U falls below the neck
    for (let i = 0; i <= N; i++) {
      const t = i / N;                      // 0..1 across the strand
      const xa = (t - 0.5) * 2;             // -1..1
      const x = xa * shoulderW;
      const y = neckY - dropDepth * (1 - xa * xa); // parabolic U
      const z = 0.16 + 0.1 * (1 - xa * xa);        // bows forward off the chest
      const kind = i === Math.floor(N / 2) ? 2 : i % 3 === 2 ? 1 : 0;
      pts.push({ p: [x, y, z], kind, s: kind === 2 ? 1 : 0.85 + 0.3 * Math.sin(t * Math.PI) });
    }
    return pts;
  }, [neckY]);

  return (
    <group>
      {beads.map((b, i) =>
        b.kind === 2 ? (
          /* pendant rose at the bottom of the U */
          <group key={i} position={b.p}>
            <mesh scale={[1, 0.8, 1]}>
              <sphereGeometry args={[0.085, 10, 8]} />
              <meshStandardMaterial color="#d8355f" roughness={0.6} />
            </mesh>
            <mesh position={[0, -0.07, 0]} scale={[1, 1.4, 1]}>
              <sphereGeometry args={[0.04, 8, 6]} />
              <meshStandardMaterial color="#3f7d33" roughness={0.6} />
            </mesh>
          </group>
        ) : (
          <mesh key={i} position={b.p} scale={b.s}>
            <sphereGeometry args={[b.kind === 1 ? 0.032 : 0.048, 8, 6]} />
            <meshStandardMaterial
              color={b.kind === 1 ? '#3f7d33' : i % 2 ? '#f5a623' : '#e8720a'}
              roughness={0.65}
            />
          </mesh>
        )
      )}
    </group>
  );
}

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
      {item.type === 'kalash' && <KalashMesh />}
      {item.type === 'bells' && <BellStandMesh />}
    </group>
  );
}


/* Kalash — the auspicious pot: brass body, mango leaves, coconut crown */
function KalashMesh() {
  const brass = <meshStandardMaterial color="#d9a441" metalness={0.75} roughness={0.28} envMapIntensity={1.1} />;
  return (
    <group>
      {/* pot body */}
      <mesh position={[0, 0.34, 0]} scale={[1, 0.85, 1]}>
        <sphereGeometry args={[0.34, 18, 14]} />
        {brass}
      </mesh>
      {/* foot + neck + rim */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.1, 14]} />
        {brass}
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.13, 0.2, 0.14, 14]} />
        {brass}
      </mesh>
      <mesh position={[0, 0.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.035, 8, 18]} />
        {brass}
      </mesh>
      {/* mango leaves around the rim */}
      {[0, 1, 2, 3, 4].map(i => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.17, 0.76, Math.sin(a) * 0.17]} rotation={[0.5, -a, 0]} scale={[0.5, 1, 0.16]}>
            <sphereGeometry args={[0.14, 8, 6]} />
            <meshStandardMaterial color="#3f7d33" roughness={0.6} />
          </mesh>
        );
      })}
      {/* coconut */}
      <mesh position={[0, 0.88, 0]} scale={[1, 1.15, 1]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color="#8a5a34" roughness={0.85} />
      </mesh>
      {/* kumkum swastik dot on the pot */}
      <mesh position={[0, 0.4, 0.325]} scale={[1, 1, 0.3]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#c4302b" roughness={0.5} />
      </mesh>
    </group>
  );
}

/* Bell stand — two turned posts, a crossbar, three hanging ghantas */
function BellStandMesh() {
  const brass = <meshStandardMaterial color="#d9a441" metalness={0.75} roughness={0.28} envMapIntensity={1.1} />;
  const wood = <meshStandardMaterial map={woodTexture()} color="#a5622e" roughness={0.5} metalness={0.15} />;
  return (
    <group>
      {[-1, 1].map(s => (
        <group key={s} position={[s * 0.75, 0, 0]}>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.14, 0.18, 0.12, 10]} />
            {wood}
          </mesh>
          <mesh position={[0, 0.85, 0]}>
            <cylinderGeometry args={[0.05, 0.07, 1.5, 10]} />
            {wood}
          </mesh>
          <mesh position={[0, 1.62, 0]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            {brass}
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.56, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.045, 1.6, 8]} />
        {wood}
      </mesh>
      {[-0.45, 0, 0.45].map(x => (
        <group key={x} position={[x, 1.28, 0]}>
          <mesh position={[0, 0.17, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.24, 6]} />
            {brass}
          </mesh>
          <mesh>
            <coneGeometry args={[0.11, 0.22, 14]} />
            {brass}
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <sphereGeometry args={[0.03, 8, 6]} />
            {brass}
          </mesh>
        </group>
      ))}
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
