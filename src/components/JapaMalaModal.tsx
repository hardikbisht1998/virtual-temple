import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IDOLS } from '../data';
import { playBeadClickSound, playGhantaSound } from '../audio/templeAudio';

const DECO_FONT    = "'Cinzel Decorative', serif";
const HEADING_FONT = "'Cinzel', serif";
const TOTAL_BEADS  = 108;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  japaCounts: Record<string, number>;
  onIncrementJapa: (idolId: string) => void;
}

export function JapaMalaModal({ isOpen, onClose, japaCounts, onIncrementJapa }: Props) {
  const [selectedIdolId, setSelectedIdolId] = useState<string>('ganesha');
  const [currentBead, setCurrentBead]       = useState(0);
  const [malasCompleted, setMalasCompleted] = useState(0);
  const [justCompleted, setJustCompleted]   = useState(false);

  const idol = IDOLS.find(i => i.id === selectedIdolId) || IDOLS[0];
  const totalLifetimeBeads = japaCounts[selectedIdolId] || 0;

  const countBead = useCallback(() => {
    playBeadClickSound();
    onIncrementJapa(selectedIdolId);

    const next = currentBead + 1;
    if (next >= TOTAL_BEADS) {
      setCurrentBead(0);
      setMalasCompleted(m => m + 1);
      setJustCompleted(true);
      playGhantaSound();
      setTimeout(() => setJustCompleted(false), 3000);
    } else {
      setCurrentBead(next);
    }
  }, [currentBead, selectedIdolId, onIncrementJapa]);

  // Keyboard shortcut: Spacebar to count
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space') {
        e.preventDefault();
        countBead();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, countBead]);

  function resetCurrentMala() {
    setCurrentBead(0);
  }

  if (!isOpen) return null;

  const progressPercent = ((currentBead / TOTAL_BEADS) * 100).toFixed(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 15 }}
        transition={{ duration: 0.28 }}
        className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-7 text-center"
        style={{
          background: 'linear-gradient(165deg, #ffffff 0%, #faf6ec 45%, #f2e8d4 100%)',
          border: '2px solid rgba(201,162,39,0.7)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35), 0 0 40px rgba(212,175,55,0.25)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-lg w-8 h-8 rounded-full flex items-center justify-center bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-4">
          <span className="text-3xl" style={{ filter: 'drop-shadow(0 0 8px rgba(255,160,0,0.5))' }}>📿</span>
          <h2
            className="text-xl sm:text-2xl font-bold mt-1"
            style={{ fontFamily: DECO_FONT, color: '#6b5312' }}
          >
            108 Japa Mala
          </h2>
          <p className="text-[10px] tracking-[0.25em] uppercase text-amber-700/80 font-semibold" style={{ fontFamily: HEADING_FONT }}>
            Sacred Mantra Meditation
          </p>
        </div>

        {/* Deity Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none justify-start sm:justify-center">
          {IDOLS.map(d => {
            const active = d.id === selectedIdolId;
            return (
              <button
                key={d.id}
                onClick={() => {
                  setSelectedIdolId(d.id);
                  setCurrentBead(0);
                }}
                className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-xl border transition-all flex-shrink-0 cursor-pointer"
                style={{
                  fontFamily: HEADING_FONT,
                  background: active ? 'linear-gradient(135deg, #e6c14c, #b8860b)' : 'rgba(255,255,255,0.8)',
                  color: active ? '#ffffff' : '#7a5a1e',
                  borderColor: active ? '#b8860b' : 'rgba(201,162,39,0.35)',
                  boxShadow: active ? '0 2px 10px rgba(184,134,11,0.35)' : 'none',
                }}
              >
                <span>{d.emoji}</span>
                <span>{d.name}</span>
              </button>
            );
          })}
        </div>

        {/* Mantra Card */}
        <div
          className="rounded-2xl p-4 mb-5 text-center transition-all"
          style={{
            background: 'rgba(255,255,255,0.75)',
            border: '1px solid rgba(201,162,39,0.4)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 15px rgba(180,140,50,0.1)',
          }}
        >
          {idol.mantraDevanagari && (
            <p className="text-base sm:text-lg font-bold text-amber-950 mb-1 leading-snug">
              {idol.mantraDevanagari}
            </p>
          )}
          <p className="text-xs sm:text-sm font-semibold italic text-amber-800" style={{ fontFamily: HEADING_FONT }}>
            "{idol.mantra}"
          </p>
          {idol.mantraMeaning && (
            <p className="text-[10px] text-amber-700/80 mt-1.5 leading-tight">
              {idol.mantraMeaning}
            </p>
          )}
        </div>

        {/* Circular Interactive Mala Bead Counter */}
        <div className="relative flex flex-col items-center justify-center my-2">
          <button
            onClick={countBead}
            className="relative w-40 h-40 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer select-none group"
            style={{
              background: 'radial-gradient(circle, #fff9ee 0%, #f4e7c7 60%, #dfc382 100%)',
              border: '4px solid #b8860b',
              boxShadow: '0 0 30px rgba(212,175,55,0.45), inset 0 0 20px rgba(255,255,255,0.8)',
            }}
          >
            {/* SVG Ring Progress */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="44"
                fill="none"
                stroke="rgba(201,162,39,0.2)"
                strokeWidth="4"
              />
              <circle
                cx="50" cy="50" r="44"
                fill="none"
                stroke="url(#mala-grad)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="276.46"
                strokeDashoffset={276.46 - (276.46 * currentBead) / TOTAL_BEADS}
                className="transition-all duration-150"
              />
              <defs>
                <linearGradient id="mala-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e6c14c" />
                  <stop offset="100%" stopColor="#FF4500" />
                </linearGradient>
              </defs>
            </svg>

            <span className="text-3xl sm:text-4xl font-extrabold text-amber-950 leading-none mb-0.5" style={{ fontFamily: DECO_FONT }}>
              {currentBead}
            </span>
            <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-amber-800" style={{ fontFamily: HEADING_FONT }}>
              / {TOTAL_BEADS} beads
            </span>
            <span className="text-[9px] text-amber-700/70 mt-1 uppercase tracking-widest group-hover:text-amber-900 transition-colors">
              Tap or Space ✦
            </span>
          </button>

          {/* Mala completion announcement banner */}
          <AnimatePresence>
            {justCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                className="absolute -top-3 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-600 to-yellow-500 text-white text-xs font-bold shadow-lg"
                style={{ fontFamily: HEADING_FONT }}
              >
                ✨ 1 Mala (108 Japa) Completed! Haraye Namah ✨
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-amber-900/10 text-center">
          <div className="rounded-xl p-2 bg-white/60">
            <span className="block text-xs font-bold text-amber-900" style={{ fontFamily: DECO_FONT }}>
              {progressPercent}%
            </span>
            <span className="text-[9px] uppercase tracking-wider text-amber-700/75" style={{ fontFamily: HEADING_FONT }}>
              Mala Progress
            </span>
          </div>
          <div className="rounded-xl p-2 bg-white/60">
            <span className="block text-xs font-bold text-amber-900" style={{ fontFamily: DECO_FONT }}>
              {malasCompleted}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-amber-700/75" style={{ fontFamily: HEADING_FONT }}>
              Malas Today
            </span>
          </div>
          <div className="rounded-xl p-2 bg-white/60">
            <span className="block text-xs font-bold text-amber-900" style={{ fontFamily: DECO_FONT }}>
              {totalLifetimeBeads}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-amber-700/75" style={{ fontFamily: HEADING_FONT }}>
              Total Japas
            </span>
          </div>
        </div>

        {/* Reset Mala button */}
        {currentBead > 0 && (
          <button
            onClick={resetCurrentMala}
            className="mt-3 text-[10px] tracking-[0.15em] uppercase text-amber-700/60 hover:text-amber-800 transition-colors cursor-pointer"
            style={{ fontFamily: HEADING_FONT }}
          >
            ↺ Restart Current Mala
          </button>
        )}
      </motion.div>
    </div>
  );
}
