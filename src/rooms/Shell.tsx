/* Room shells — the composed spaces a shrine stands in.

   Users pick a shell instead of assembling walls because each shell is
   designed as architecture: proportioned bays, trim where structure meets,
   its own lamps. Any pick reads as a temple; the material set recolours it.

   All shells are parameterized by the floor radius and keep the front (+z)
   open — the camera and the devotee approach from there. The shrine's
   default arc is centred on z = -5. */

import { useMemo } from 'react';
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, DoubleSide, type Object3D, type Mesh } from 'three';
import type { ShellId, MaterialId, FloorShape } from '../layout3d';
import { MATERIALS, type MaterialSet } from '../materials/sets';

/* ── shared surface grain ───────────────────────────────────────
   One cached neutral grain texture; the material set's colour multiplies
   over it, so every set gets surface variation without its own bitmap. */
let _grain: CanvasTexture | undefined;
function grainTexture(): CanvasTexture {
  if (_grain) return _grain;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#b9b2a4';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '40,32,20'},${Math.random() * 0.05})`;
    const s = Math.random() * 14 + 2;
    ctx.fillRect(Math.random() * size, Math.random() * size, s, s * (0.3 + Math.random() * 0.6));
  }
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = SRGBColorSpace;
  _grain = tex;
  return tex;
}

/* Flip shadow flags on every mesh under the shell (used via group onUpdate).
   Lamps flag themselves userData.noShadow — light sources shouldn't cast. */
function shellShadows(root: Object3D) {
  root.traverse(o => {
    const mesh = o as Mesh;
    if (!mesh.isMesh || mesh.userData.noShadow) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

/* ── material helpers ──────────────────────────────────────────── */

function Stone({ m, tone = 'wall', side }: { m: MaterialSet; tone?: 'wall' | 'wallDeep' | 'pillar' | 'trim'; side?: typeof DoubleSide }) {
  return (
    <meshStandardMaterial
      map={grainTexture()}
      color={m[tone]}
      roughness={m.roughness}
      metalness={m.metalness}
      side={side}
    />
  );
}

function Gild({ m }: { m: MaterialSet }) {
  return <meshStandardMaterial color={m.accent} metalness={0.75} roughness={0.3} envMapIntensity={1.1} />;
}

/* A wall lamp: glowing bowl + its light. Kept dim and local — the global
   rig does the modelling, lamps add warmth where people look. */
function Lamp({ position, m, intensity = 8, distance = 10 }: {
  position: [number, number, number]; m: MaterialSet; intensity?: number; distance?: number;
}) {
  return (
    <group position={position}>
      <mesh userData={{ noShadow: true }}>
        <sphereGeometry args={[0.11, 10, 8]} />
        <meshStandardMaterial color={m.lampColor} emissive={m.lampColor} emissiveIntensity={3.2} />
      </mesh>
      <mesh position={[0, -0.14, 0]}>
        <cylinderGeometry args={[0.13, 0.06, 0.14, 10]} />
        <Gild m={m} />
      </mesh>
      <pointLight color={m.lampColor} intensity={intensity} distance={distance} decay={2} />
    </group>
  );
}

/* A proportioned column: base, shaft, gilded bands, capital, abacus. */
function Column({ x, z, h = 5.6, m }: { x: number; z: number; h?: number; m: MaterialSet }) {
  const shaftH = h - 1.35;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[1.3, 0.5, 1.3]} />
        <Stone m={m} tone="wallDeep" />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[1.05, 0.26, 1.05]} />
        <Stone m={m} tone="trim" />
      </mesh>
      <mesh position={[0, 0.75 + shaftH / 2, 0]}>
        <cylinderGeometry args={[0.36, 0.44, shaftH, 14]} />
        <Stone m={m} tone="pillar" />
      </mesh>
      {[0.28, 0.62].map(f => (
        <mesh key={f} position={[0, 0.75 + shaftH * f, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.41, 0.05, 8, 18]} />
          <Gild m={m} />
        </mesh>
      ))}
      <mesh position={[0, h - 0.42, 0]}>
        <cylinderGeometry args={[0.62, 0.38, 0.42, 14]} />
        <Stone m={m} tone="trim" />
      </mesh>
      <mesh position={[0, h - 0.08, 0]}>
        <boxGeometry args={[1.35, 0.3, 1.35]} />
        <Stone m={m} tone="wallDeep" />
      </mesh>
    </group>
  );
}

/* ── shells ─────────────────────────────────────────────────────── */

/* Open plinth: no enclosure — a rim, four lamp posts, the night sky. */
function OpenShell({ radius, m }: { radius: number; m: MaterialSet }) {
  const posts = useMemo(() => {
    const a = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    return a.map(t => [Math.cos(t) * (radius - 1.2), Math.sin(t) * (radius - 1.2)] as [number, number]);
  }, [radius]);
  return (
    <group onUpdate={shellShadows}>
      {posts.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.09, 0.13, 1.8, 10]} />
            <Stone m={m} tone="pillar" />
          </mesh>
          <Lamp position={[0, 1.95, 0]} m={m} intensity={6} distance={8} />
        </group>
      ))}
    </group>
  );
}

/* Mandir room: back + side walls with wainscot and cornice, a ceiling with
   a central skylight so the room encloses without going dark. */
function RoomShell({ radius, m }: { radius: number; m: MaterialSet }) {
  const H = 7, T = 0.35;
  const w = radius;
  return (
    <group onUpdate={shellShadows}>
      {/* back wall */}
      <mesh position={[0, H / 2, -w]}>
        <boxGeometry args={[w * 2 + T, H, T]} />
        <Stone m={m} />
      </mesh>
      {/* side walls */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * w, H / 2, 0]}>
          <boxGeometry args={[T, H, w * 2]} />
          <Stone m={m} />
        </mesh>
      ))}
      {/* wainscot band + cornice on each wall */}
      {[-1, 1].map(s => (
        <group key={`t${s}`}>
          <mesh position={[s * (w - T / 2 - 0.04), 1.1, 0]}>
            <boxGeometry args={[0.08, 0.32, w * 2 - 0.2]} />
            <Stone m={m} tone="trim" />
          </mesh>
          <mesh position={[s * (w - T / 2 - 0.04), H - 0.5, 0]}>
            <boxGeometry args={[0.14, 0.4, w * 2 - 0.2]} />
            <Stone m={m} tone="trim" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.1, -(w - T / 2 - 0.04)]}>
        <boxGeometry args={[w * 2 - 0.2, 0.32, 0.08]} />
        <Stone m={m} tone="trim" />
      </mesh>
      <mesh position={[0, H - 0.5, -(w - T / 2 - 0.04)]}>
        <boxGeometry args={[w * 2 - 0.2, 0.4, 0.14]} />
        <Stone m={m} tone="trim" />
      </mesh>
      {/* ceiling: four slabs around a central skylight */}
      {(() => {
        const open = Math.min(w * 0.75, 8);
        const slab = (w * 2 - open) / 2;
        return (
          <group>
            <mesh position={[0, H + 0.2, -(open / 2 + slab / 2)]}>
              <boxGeometry args={[w * 2, 0.4, slab]} />
              <Stone m={m} tone="wallDeep" side={DoubleSide} />
            </mesh>
            <mesh position={[0, H + 0.2, open / 2 + slab / 2]}>
              <boxGeometry args={[w * 2, 0.4, slab]} />
              <Stone m={m} tone="wallDeep" side={DoubleSide} />
            </mesh>
            {[-1, 1].map(s => (
              <mesh key={s} position={[s * (open / 2 + slab / 2), H + 0.2, 0]}>
                <boxGeometry args={[slab, 0.4, open]} />
                <Stone m={m} tone="wallDeep" side={DoubleSide} />
              </mesh>
            ))}
            {/* gilded skylight frame */}
            <mesh position={[0, H + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[open / 2 - 0.02, open / 2 + 0.22, 4]} />
              <Gild m={m} />
            </mesh>
          </group>
        );
      })()}
      {/* wall lamps flanking the shrine */}
      <Lamp position={[-w + 0.6, 3.1, -w + 3]} m={m} />
      <Lamp position={[w - 0.6, 3.1, -w + 3]} m={m} />
    </group>
  );
}

/* Wall shrine: a tall back wall with a gilded arched niche framing the
   mandir, wing walls angled forward, garland swag over the arch. */
function NicheShell({ radius, m }: { radius: number; m: MaterialSet }) {
  const H = 8.4;
  const W = Math.min(radius * 2, 17);
  const zWall = -8.6;
  const archR = 3.1;
  const archY = 5.2;
  const garland = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const a = Math.PI * (0.12 + t * 0.76);
      pts.push([Math.cos(a) * (archR + 0.55), archY + Math.sin(a) * (archR + 0.55) * 0.62, zWall + 0.45]);
    }
    return pts;
  }, [zWall]);
  return (
    <group onUpdate={shellShadows}>
      <mesh position={[0, H / 2, zWall]}>
        <boxGeometry args={[W, H, 0.5]} />
        <Stone m={m} />
      </mesh>
      {/* recessed niche panel */}
      <mesh position={[0, archY * 0.62, zWall + 0.28]}>
        <boxGeometry args={[archR * 2 - 0.3, archY + 1.4, 0.1]} />
        <Stone m={m} tone="wallDeep" />
      </mesh>
      {/* jambs + arch */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * archR, archY / 2, zWall + 0.42]}>
          <boxGeometry args={[0.42, archY, 0.5]} />
          <Gild m={m} />
        </mesh>
      ))}
      <mesh position={[0, archY, zWall + 0.42]} rotation={[0, 0, 0]}>
        <torusGeometry args={[archR, 0.22, 10, 32, Math.PI]} />
        <Gild m={m} />
      </mesh>
      {/* kalash finial above the arch */}
      <group position={[0, archY + archR + 0.75, zWall + 0.4]}>
        <mesh><sphereGeometry args={[0.34, 12, 10]} /><Gild m={m} /></mesh>
        <mesh position={[0, 0.42, 0]}><coneGeometry args={[0.16, 0.5, 10]} /><Gild m={m} /></mesh>
      </group>
      {/* cornice */}
      <mesh position={[0, H - 0.35, zWall + 0.32]}>
        <boxGeometry args={[W, 0.5, 0.35]} />
        <Stone m={m} tone="trim" />
      </mesh>
      {/* wing walls angled toward the devotee */}
      {[-1, 1].map(s => (
        <mesh key={`wing${s}`} position={[s * (W / 2 + 1.4), H / 2 - 1, zWall + 2.6]} rotation={[0, -s * 0.42, 0]}>
          <boxGeometry args={[0.4, H - 2, 6]} />
          <Stone m={m} />
        </mesh>
      ))}
      {/* marigold garland swag over the arch */}
      {garland.map((p, i) => (
        <mesh key={`g${i}`} position={p} userData={{ noShadow: true }}>
          <sphereGeometry args={[0.14, 8, 6]} />
          <meshStandardMaterial color={i % 2 ? '#f5a623' : '#e8630a'} roughness={0.7} />
        </mesh>
      ))}
      <Lamp position={[-archR - 1.3, 3.4, zWall + 0.9]} m={m} intensity={9} />
      <Lamp position={[archR + 1.3, 3.4, zWall + 0.9]} m={m} intensity={9} />
    </group>
  );
}

/* Pillared hall: two colonnade rows with architraves and arches, open to
   the sky — depth and rhythm are what make an interior read as built. */
function HallShell({ radius, m }: { radius: number; m: MaterialSet }) {
  const colX = Math.min(radius * 0.62, 8);
  const H = 5.6;
  const rows = useMemo(() => {
    const zs: number[] = [];
    const zMax = radius - 2.2;
    const n = Math.max(3, Math.floor((zMax * 2) / 4.4) + 1);
    for (let i = 0; i < n; i++) zs.push(zMax - (i * (zMax * 2)) / (n - 1));
    return zs;
  }, [radius]);
  return (
    <group onUpdate={shellShadows}>
      {rows.map(z => (
        <group key={z}>
          <Column x={-colX} z={z} h={H} m={m} />
          <Column x={colX} z={z} h={H} m={m} />
        </group>
      ))}
      {/* architrave beams down each row */}
      {[-1, 1].map(s => (
        <mesh key={`beam${s}`} position={[s * colX, H + 0.28, 0]}>
          <boxGeometry args={[1.15, 0.55, (radius - 2.2) * 2 + 1.4]} />
          <Stone m={m} tone="trim" />
        </mesh>
      ))}
      {/* arches between consecutive columns */}
      {[-1, 1].map(s =>
        rows.slice(0, -1).map((z, i) => {
          const zc = (z + rows[i + 1]) / 2;
          const half = Math.abs(z - rows[i + 1]) / 2;
          return (
            <mesh key={`arch${s}-${i}`} position={[s * colX, H - 0.05, zc]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[half - 0.35, 0.16, 8, 22, Math.PI]} />
              <Stone m={m} tone="pillar" />
            </mesh>
          );
        })
      )}
      {/* lamps on alternating columns */}
      {rows.filter((_, i) => i % 2 === 0).map(z => (
        <group key={`lamps${z}`}>
          <Lamp position={[-colX + 0.75, 3.1, z]} m={m} intensity={6} distance={8} />
          <Lamp position={[colX - 0.75, 3.1, z]} m={m} intensity={6} distance={8} />
        </group>
      ))}
    </group>
  );
}

/* Courtyard: a low perimeter wall open at the front, corner pillars with
   lamps, and a torana gate with hanging bells — puja under the open sky. */
function CourtyardShell({ radius, m }: { radius: number; m: MaterialSet }) {
  const wallR = radius - 0.6;
  const segs = useMemo(() => {
    const out: { x: number; z: number; rot: number; len: number }[] = [];
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + Math.PI / n;
      // leave the two segments nearest the front (+z) open for the gate
      if (Math.abs(Math.atan2(Math.sin(a0), Math.cos(a0)) - Math.PI / 2) < Math.PI / n) continue;
      out.push({
        x: Math.cos(a0) * wallR,
        z: Math.sin(a0) * wallR,
        rot: -a0 + Math.PI / 2,
        len: 2 * wallR * Math.tan(Math.PI / n) - 0.3,
      });
    }
    return out;
  }, [wallR]);
  const corners = useMemo(
    () => [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75].map(t =>
      [Math.cos(t) * wallR, Math.sin(t) * wallR] as [number, number]),
    [wallR]
  );
  const gateX = 2.4, gateZ = wallR;
  return (
    <group onUpdate={shellShadows}>
      {segs.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[0, s.rot, 0]}>
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[s.len, 1.5, 0.4]} />
            <Stone m={m} />
          </mesh>
          <mesh position={[0, 1.58, 0]}>
            <boxGeometry args={[s.len, 0.16, 0.55]} />
            <Stone m={m} tone="trim" />
          </mesh>
        </group>
      ))}
      {corners.map(([x, z], i) => (
        <group key={`c${i}`} position={[x, 0, z]}>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.85, 3, 0.85]} />
            <Stone m={m} tone="pillar" />
          </mesh>
          <mesh position={[0, 3.2, 0]}>
            <coneGeometry args={[0.75, 0.9, 4]} />
            <Stone m={m} tone="trim" />
          </mesh>
          <Lamp position={[0, 3.85, 0]} m={m} intensity={7} distance={9} />
        </group>
      ))}
      {/* torana gate at the open front */}
      {[-1, 1].map(s => (
        <mesh key={`post${s}`} position={[s * gateX, 1.9, gateZ]}>
          <cylinderGeometry args={[0.22, 0.28, 3.8, 12]} />
          <Stone m={m} tone="pillar" />
        </mesh>
      ))}
      <mesh position={[0, 3.9, gateZ]}>
        <boxGeometry args={[gateX * 2 + 1.4, 0.42, 0.6]} />
        <Gild m={m} />
      </mesh>
      <mesh position={[0, 4.35, gateZ]}>
        <boxGeometry args={[gateX * 2 + 0.6, 0.28, 0.5]} />
        <Stone m={m} tone="trim" />
      </mesh>
      {/* hanging bells under the lintel */}
      {[-1.4, 0, 1.4].map(x => (
        <group key={`bell${x}`} position={[x, 3.35, gateZ]}>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.36, 6]} />
            <Stone m={m} tone="wallDeep" />
          </mesh>
          <mesh>
            <coneGeometry args={[0.16, 0.3, 12]} />
            <Gild m={m} />
          </mesh>
        </group>
      ))}
      <Lamp position={[-gateX, 3.6, gateZ]} m={m} intensity={7} distance={8} />
      <Lamp position={[gateX, 3.6, gateZ]} m={m} intensity={7} distance={8} />
    </group>
  );
}

/* ── entry point ───────────────────────────────────────────────── */

export function Shell({ shell, material, radius }: {
  shell: ShellId;
  material: MaterialId;
  radius: number;
  shape: FloorShape; // reserved: shells currently enclose the bounding square
}) {
  const m = MATERIALS[material];
  switch (shell) {
    case 'open':      return <OpenShell radius={radius} m={m} />;
    case 'room':      return <RoomShell radius={radius} m={m} />;
    case 'niche':     return <NicheShell radius={radius} m={m} />;
    case 'hall':      return <HallShell radius={radius} m={m} />;
    case 'courtyard': return <CourtyardShell radius={radius} m={m} />;
  }
}
