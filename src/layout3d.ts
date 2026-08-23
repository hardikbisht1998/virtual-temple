/* Shared model of the user-built 3D mandir layout (persisted under vt-3d-v1).
   Temple3D edits it; TempleAltar reads it to draw the 2D front view. */

export type DecorType = 'diya' | 'pillar' | 'flowers' | 'rangoli' | 'kalash' | 'bells';
export type FloorShape = 'circle' | 'square' | 'hex';
export type FloorSize  = 'small' | 'medium' | 'large';

/* The room shell is the composed space the shrine stands in. Users pick a
   shell rather than assembling walls, because the shells are designed as
   architecture — any pick reads as a temple. */
export type ShellId = 'open' | 'room' | 'niche' | 'hall' | 'courtyard' | 'nagara' | 'dravidian' | 'kerala';

/* One material choice restyles the whole build — walls, pillars, trim,
   floor — so a mandir stays coherent no matter how it was assembled. */
export type MaterialId = 'marble' | 'sandstone' | 'teak' | 'granite';

/* The shrine cabinet itself: carved wood or white marble with gold inlay. */
export type MandirStyle = 'wood' | 'marble';

export const FLOOR_RADII: Record<FloorSize, number> = { small: 9, medium: 14, large: 20 };

/* Placement snaps to this grid: fine enough to feel free-handed, coarse
   enough that murtis and decor line up instead of landing crooked. */
export const SNAP = 0.25;
export const snap = (v: number) => Math.round(v / SNAP) * SNAP;

export interface FloorConfig {
  shape: FloorShape;
  size: FloorSize;
}

export interface DecorItem {
  id: string;
  type: DecorType;
  pos: [number, number];
}

/* A camera framing the user chose in the 3D editor. When set, the Temple
   page's altar view uses it instead of the automatic front framing — so a
   gopuram or roof beam never hides the murtis: the devotee decides where
   they stand. */
export interface SavedView {
  pos: [number, number, number];
  look: [number, number, number];
}

export interface Layout3D {
  positions: Record<string, [number, number]>; // instanceId -> [x, z]
  rotations: Record<string, number>;           // instanceId / decor:<id> -> Y angle (rad)
  decor: DecorItem[];
  floor: FloorConfig;
  shell: ShellId;
  material: MaterialId;
  mandir: boolean; // shrine cabinet on/off
  mandirStyle: MandirStyle; // carved wood (modelled on assets/templestructure.jpg) or marble+gold
  view: SavedView | null; // null = automatic framing
}

export const LAYOUT_KEY = 'vt-3d-v1';

export const DEFAULT_LAYOUT: Layout3D = {
  positions: {},
  rotations: {},
  decor: [],
  floor: { shape: 'circle', size: 'medium' },
  shell: 'room',
  material: 'marble',
  mandir: true,
  mandirStyle: 'wood',
  view: null,
};

/* One-tap starting points. A newcomer should have something beautiful in
   ten seconds and customise from there — starting from an empty room is
   how you end up with an empty room. */
export interface Preset {
  id: string;
  label: string;
  icon: string;
  patch: Pick<Layout3D, 'floor' | 'shell' | 'material' | 'mandir'>;
}

export const PRESETS: Preset[] = [
  {
    id: 'home',
    label: 'Home Mandir',
    icon: '🏠',
    patch: { floor: { shape: 'square', size: 'small' }, shell: 'room', material: 'teak', mandir: true },
  },
  {
    id: 'templehall',
    label: 'Temple Hall',
    icon: '🏛️',
    patch: { floor: { shape: 'circle', size: 'large' }, shell: 'hall', material: 'sandstone', mandir: true },
  },
  {
    id: 'niche',
    label: 'Wall Shrine',
    icon: '🕯️',
    patch: { floor: { shape: 'square', size: 'medium' }, shell: 'niche', material: 'marble', mandir: true },
  },
  {
    id: 'courtyard',
    label: 'Courtyard',
    icon: '🌙',
    patch: { floor: { shape: 'hex', size: 'large' }, shell: 'courtyard', material: 'granite', mandir: true },
  },
  {
    id: 'nagara',
    label: 'Shikhara Temple',
    icon: '⛰️',
    patch: { floor: { shape: 'square', size: 'medium' }, shell: 'nagara', material: 'sandstone', mandir: true },
  },
  {
    id: 'dravidian',
    label: 'South Temple',
    icon: '🪷',
    patch: { floor: { shape: 'square', size: 'large' }, shell: 'dravidian', material: 'granite', mandir: true },
  },
  {
    id: 'kerala',
    label: 'Sreekovil',
    icon: '🌴',
    patch: { floor: { shape: 'square', size: 'medium' }, shell: 'kerala', material: 'teak', mandir: true },
  },
];

export function loadLayout(): Layout3D {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Layout3D> & { hall?: boolean; room?: boolean };
      const merged: Layout3D = { ...DEFAULT_LAYOUT, ...parsed };
      // Migrate pre-shell saves: the old hall/room booleans map onto shells.
      if (!parsed.shell) {
        merged.shell = parsed.hall ? 'hall' : parsed.room ? 'room' : 'open';
      }
      if (!parsed.material) merged.material = 'marble';
      if (!parsed.mandirStyle) merged.mandirStyle = 'wood';
      if (parsed.view === undefined) merged.view = null;
      return merged;
    }
  } catch { /* corrupt layout falls back to default */ }
  return DEFAULT_LAYOUT;
}

/* Default murti arrangement: arc across the back of the hall */
export function defaultIdolPos(i: number, n: number): [number, number] {
  return [(i - (n - 1) / 2) * 2.6, -5];
}
