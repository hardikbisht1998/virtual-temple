/* Small hooks over the aarti player, kept apart from AartiPlayer.tsx so the
   3D viewport can use them without pulling in the player's UI. */

import { useState, useEffect } from 'react';
import { subscribeAarti } from '../audio/aarti';

export { aartiFor, toggleAarti, hasAarti } from '../audio/aarti';

/* True only while THIS deity's own aarti is the one playing — the darshan
   button should never light up for someone else's song. */
export function useAartiPlaying(deityId: string | undefined): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!deityId) { setOn(false); return; }
    return subscribeAarti(s => setOn(s.playing && s.deity === deityId));
  }, [deityId]);
  return on;
}
