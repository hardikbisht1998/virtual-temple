/* The puja vidhi — the traditional order of rites. The altar guides this
   sequence rather than enforcing it: every rite stays tappable, but the rail
   shows where you are and what comes next, which is what turns a row of
   buttons into a ceremony. */

import type { PlacedIdol, DivaItem, PrasadItem } from '../types';

export type RiteId =
  | 'shankh'      // invocation — the conch opens the puja
  | 'ghanta'      // the bell wakes the deity
  | 'abhishekam'  // bathing with ganga jal
  | 'chandan'     // sandal & kumkum tilak
  | 'pushpam'     // flowers and garland
  | 'agarbatti'   // incense
  | 'deepam'      // the lamp
  | 'naivedyam'   // food offering
  | 'aarti';      // the circling flame closes the puja

export interface Rite {
  id: RiteId;
  emoji: string;
  name: string;
  /* one line shown while this rite is the next one */
  invitation: string;
}

export const VIDHI: Rite[] = [
  { id: 'shankh',     emoji: '🐚', name: 'Shankhnaad',  invitation: 'Blow the shankh to begin the puja' },
  { id: 'ghanta',     emoji: '🔔', name: 'Ghanta',      invitation: 'Ring the bell to awaken the deity' },
  { id: 'abhishekam', emoji: '💧', name: 'Abhishekam',  invitation: 'Bathe the murti with ganga jal' },
  { id: 'chandan',    emoji: '🔴', name: 'Chandan',     invitation: 'Apply the chandan & kumkum tilak' },
  { id: 'pushpam',    emoji: '🌸', name: 'Pushpam',     invitation: 'Offer flowers and garland' },
  { id: 'agarbatti',  emoji: '🕯️', name: 'Agarbatti',   invitation: 'Light the agarbatti' },
  { id: 'deepam',     emoji: '🪔', name: 'Deepam',      invitation: 'Light the deepam' },
  { id: 'naivedyam',  emoji: '🥟', name: 'Naivedyam',   invitation: 'Offer prasad to the deity' },
  { id: 'aarti',      emoji: '✨', name: 'Aarti',       invitation: 'Circle the aarti flame to complete the puja' },
];

/* Rites whose completion lives in persisted temple state. The transient ones
   (shankh, ghanta, aarti) are session gestures, tracked by the altar. */
export function ritesDoneFromState(args: {
  placedIdols: PlacedIdol[];
  incenseLit: boolean;
  diyas: DivaItem[];
  prasad: PrasadItem[];
  abhishekamActive: boolean;
}): Set<RiteId> {
  const done = new Set<RiteId>();
  if (args.abhishekamActive) done.add('abhishekam');
  if (args.placedIdols.some(p => p.hasTilak)) done.add('chandan');
  if (args.placedIdols.some(p => p.hasGarland)) done.add('pushpam');
  if (args.incenseLit) done.add('agarbatti');
  if (args.diyas.length > 0) done.add('deepam');
  if (args.prasad.length > 0) done.add('naivedyam');
  return done;
}

/* The next rite in vidhi order that isn't done yet — what the altar invites. */
export function nextRite(done: Set<RiteId>): Rite | null {
  return VIDHI.find(r => !done.has(r.id)) ?? null;
}
