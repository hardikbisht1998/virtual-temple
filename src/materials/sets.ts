/* Global material sets. One choice restyles every architectural surface —
   wall, pillar, trim, floor — so the whole build stays coherent however it
   was assembled. Murtis, the wooden mandir cabinet and decor keep their own
   finishes; the set governs the architecture around them. */

import type { MaterialId } from '../layout3d';

export interface MaterialSet {
  label: string;
  icon: string;
  /* architecture surfaces */
  wall: string;        // large wall planes
  wallDeep: string;    // recesses, niches, shadowed faces
  pillar: string;      // column shafts
  trim: string;        // capitals, bands, cornices, gate lintels
  accent: string;      // gilded detail: always metallic
  floorTint: string;   // multiplies the marble floor texture
  /* finish */
  roughness: number;
  metalness: number;
  /* per-set lamp colour so the light suits the stone */
  lampColor: string;
}

export const MATERIALS: Record<MaterialId, MaterialSet> = {
  marble: {
    label: 'Marble', icon: '🤍',
    wall: '#e8e2d4', wallDeep: '#cfc7b4', pillar: '#efe9dc', trim: '#d9cfb8',
    accent: '#d9a441', floorTint: '#e6dfd0',
    roughness: 0.42, metalness: 0.06,
    lampColor: '#ffd9a0',
  },
  sandstone: {
    label: 'Sandstone', icon: '🏜️',
    wall: '#d2a878', wallDeep: '#b08956', pillar: '#dbb384', trim: '#c19a63',
    accent: '#e0b04e', floorTint: '#dcc4a0',
    roughness: 0.72, metalness: 0.03,
    lampColor: '#ffc98a',
  },
  teak: {
    label: 'Teak', icon: '🪵',
    wall: '#8a5a30', wallDeep: '#6b4322', pillar: '#9c6636', trim: '#b5763a',
    accent: '#d9a441', floorTint: '#caa87e',
    roughness: 0.55, metalness: 0.08,
    lampColor: '#ffb877',
  },
  granite: {
    label: 'Granite', icon: '🪨',
    wall: '#8d8d93', wallDeep: '#6e6e75', pillar: '#9a9aa0', trim: '#7d7d84',
    accent: '#c9a227', floorTint: '#c9c9cd',
    roughness: 0.6, metalness: 0.1,
    lampColor: '#ffd0a0',
  },
};
