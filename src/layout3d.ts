/* Shared model of the user-built 3D mandir layout (persisted under vt-3d-v1).
   Temple3D edits it; TempleAltar reads it to draw the 2D front view. */

export type DecorType = 'diya' | 'pillar' | 'flowers' | 'rangoli';
export type FloorShape = 'circle' | 'square' | 'hex';
export type FloorSize  = 'small' | 'medium' | 'large';

export const FLOOR_RADII: Record<FloorSize, number> = { small: 9, medium: 14, large: 20 };

export interface FloorConfig {
  shape: FloorShape;
  size: FloorSize;
}

export interface DecorItem {
  id: string;
  type: DecorType;
  pos: [number, number];
}

export interface Layout3D {
  positions: Record<string, [number, number]>; // instanceId -> [x, z]
  rotations: Record<string, number>;           // instanceId / decor:<id> -> Y angle (rad)
  decor: DecorItem[];
  floor: FloorConfig;
  hall: boolean; // classic pillared hall + grand arch preset
  room: boolean; // box enclosure: three walls, front and top open
}

export const LAYOUT_KEY = 'vt-3d-v1';

export const DEFAULT_LAYOUT: Layout3D = {
  positions: {},
  rotations: {},
  decor: [],
  floor: { shape: 'circle', size: 'medium' },
  hall: false,
  room: true,
};

export function loadLayout(): Layout3D {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) return { ...DEFAULT_LAYOUT, ...JSON.parse(raw) };
  } catch { /* corrupt layout falls back to default */ }
  return DEFAULT_LAYOUT;
}

/* Default murti arrangement: arc across the back of the hall */
export function defaultIdolPos(i: number, n: number): [number, number] {
  return [(i - (n - 1) / 2) * 2.6, -5];
}
