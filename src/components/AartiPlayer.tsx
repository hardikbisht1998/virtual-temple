import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IDOLS } from '../data';
import {
  AARTIS, aartiFor, subscribeAarti, getAartiState, toggleAarti, playAarti,
  pauseAarti, stopAarti, seekAarti, formatTime, type AartiState,
} from '../audio/aarti';
import { track as trackEvent } from '../analytics';

const HEADING_FONT = "'Cinzel', serif";

/* Subscribe a component to the shared player. */
export function useAarti(): AartiState {
  const [s, setS] = useState<AartiState>(getAartiState);
  useEffect(() => subscribeAarti(setS), []);
  return s;
}

/* ── Now-playing bar ─────────────────────────────────────────────
   Appears once an aarti is loaded and stays until it is closed, so the
   devotee can pause or seek without hunting for the picker again. */
export function AartiBar() {
  const s = useAarti();
  if (!s.deity) return null;

  const track = aartiFor(s.deity);
  const idol = IDOLS.find(i => i.id === s.deity);
  if (!track) return null;

  const pct = s.duration > 0 ? (s.position / s.duration) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      className="mx-auto mt-4 rounded-2xl px-4 py-3"
      style={{
        maxWidth: 560,
        background: 'linear-gradient(165deg, #ffffff 0%, #faf6ec 60%, #f2e8d4 100%)',
        border: '1px solid rgba(201,162,39,0.6)',
        boxShadow: '0 6px 22px rgba(110,95,60,0.18)',
      }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => (s.playing ? pauseAarti() : playAarti(s.deity!))}
          className="flex items-center justify-center rounded-full cursor-pointer active:scale-95 transition-transform flex-shrink-0"
          style={{
            width: 38, height: 38, border: 'none',
            background: 'linear-gradient(135deg, #e6c14c, #b8860b)',
            color: '#fff', fontSize: 15,
            boxShadow: '0 2px 10px rgba(184,134,11,0.45)',
          }}
          title={s.playing ? 'Pause aarti' : 'Play aarti'}
        >
          {s.loading ? '⋯' : s.playing ? '❚❚' : '▶'}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className="text-[12px] font-bold text-amber-950 truncate"
            style={{ fontFamily: HEADING_FONT }}
          >
            {idol?.emoji} {track.title}
          </p>
          <p className="text-[10px] text-amber-700/75 truncate">
            {idol?.name} &middot; {track.artist}
          </p>
        </div>

        <span
          className="text-[10px] text-amber-700/70 flex-shrink-0"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {formatTime(s.position)} / {formatTime(s.duration)}
        </span>

        <button
          onClick={stopAarti}
          className="text-[13px] cursor-pointer flex-shrink-0"
          style={{ background: 'none', border: 'none', color: '#8b8f98', lineHeight: 1 }}
          title="Stop and close"
        >
          ✕
        </button>
      </div>

      {/* seek */}
      <div
        className="relative mt-2.5 rounded-full overflow-hidden cursor-pointer"
        style={{ height: 6, background: 'rgba(184,134,11,0.18)' }}
        onClick={e => {
          const r = e.currentTarget.getBoundingClientRect();
          seekAarti(((e.clientX - r.left) / r.width) * s.duration);
        }}
        title="Seek"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#e6c14c,#b8860b)' }}
        />
      </div>

      {s.error && (
        <p className="text-[10px] mt-1.5" style={{ color: '#a3421f' }}>{s.error}</p>
      )}
    </motion.div>
  );
}

/* ── Picker ──────────────────────────────────────────────────────
   Every aarti in the app, with the ones enshrined in this temple first. */
export function AartiPicker({ open, onClose, placedDeityIds }: {
  open: boolean;
  onClose: () => void;
  placedDeityIds: Set<string>;
}) {
  const s = useAarti();
  if (!open) return null;

  const ordered = [...AARTIS].sort((a, b) => {
    const ap = placedDeityIds.has(a.deity) ? 0 : 1;
    const bp = placedDeityIds.has(b.deity) ? 0 : 1;
    return ap - bp;
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(30,20,8,0.55)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, y: 14 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, y: 14 }}
          className="rounded-3xl p-5 w-full max-h-[80vh] overflow-y-auto"
          style={{
            maxWidth: 460,
            background: 'linear-gradient(165deg, #ffffff 0%, #faf6ec 50%, #f2e8d4 100%)',
            border: '2px solid rgba(201,162,39,0.6)',
            boxShadow: '0 18px 50px rgba(0,0,0,0.3)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                className="text-amber-950 text-sm font-bold tracking-[0.15em] uppercase"
                style={{ fontFamily: HEADING_FONT }}
              >
                🎵 Aarti
              </h3>
              <p className="text-[10px] text-amber-700/80 mt-0.5">
                Choose an aarti to fill your temple
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-lg cursor-pointer"
              style={{ background: 'none', border: 'none', color: '#8b8f98', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            {ordered.map(track => {
              const idol = IDOLS.find(i => i.id === track.deity);
              const isCurrent = s.deity === track.deity;
              const enshrined = placedDeityIds.has(track.deity);
              return (
                <button
                  key={track.deity}
                  onClick={() => { trackEvent('aarti_toggle', { deity: track.deity, from: 'picker' }); toggleAarti(track.deity); }}
                  className="flex items-center gap-3 p-2.5 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.01]"
                  style={{
                    borderColor: isCurrent ? '#b8860b' : 'rgba(201,162,39,0.35)',
                    background: isCurrent ? 'rgba(255,243,209,0.9)' : 'rgba(255,255,255,0.65)',
                  }}
                >
                  <span
                    className={`flex items-center justify-center rounded-full flex-shrink-0 ${isCurrent && s.playing ? 'breathe' : ''}`}
                    style={{
                      width: 32, height: 32, fontSize: 13,
                      background: isCurrent
                        ? 'linear-gradient(135deg, #e6c14c, #b8860b)'
                        : 'rgba(201,162,39,0.15)',
                      color: isCurrent ? '#fff' : '#7a5a1e',
                    }}
                  >
                    {isCurrent && s.playing ? '❚❚' : '▶'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[12px] font-bold text-amber-950 truncate" style={{ fontFamily: HEADING_FONT }}>
                        {idol?.emoji} {track.title}
                      </span>
                      {enshrined && (
                        <span
                          className="text-[8px] px-1.5 py-px rounded-full flex-shrink-0"
                          style={{ background: 'rgba(184,134,11,0.14)', color: '#b8860b', border: '1px solid rgba(184,134,11,0.35)' }}
                        >
                          IN TEMPLE
                        </span>
                      )}
                    </span>
                    <span className="block text-[10px] text-amber-700/75 truncate">
                      {idol?.name ?? track.deity} &middot; {track.artist}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
