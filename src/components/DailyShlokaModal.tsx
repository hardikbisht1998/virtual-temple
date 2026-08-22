import { useState } from 'react';
import { motion } from 'framer-motion';
import { DAILY_SHLOKAS } from '../data';

const DECO_FONT    = "'Cinzel Decorative', serif";
const HEADING_FONT = "'Cinzel', serif";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pujaStreak: number;
  totalPujas: number;
  userName: string;
}

export function DailyShlokaModal({ isOpen, onClose, pujaStreak, totalPujas, userName }: Props) {
  const [index, setIndex] = useState(0);

  if (!isOpen) return null;

  const shloka = DAILY_SHLOKAS[index % DAILY_SHLOKAS.length];
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

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
          <span className="text-3xl" style={{ filter: 'drop-shadow(0 0 8px rgba(255,160,0,0.5))' }}>📜</span>
          <h2
            className="text-xl sm:text-2xl font-bold mt-1"
            style={{ fontFamily: DECO_FONT, color: '#6b5312' }}
          >
            Daily Darshan & Shloka
          </h2>
          <p className="text-[10px] tracking-[0.25em] uppercase text-amber-700/80 font-semibold" style={{ fontFamily: HEADING_FONT }}>
            {today}
          </p>
        </div>

        {/* Devotion Streak Card */}
        <div
          className="flex items-center justify-around rounded-2xl p-3 mb-5"
          style={{
            background: 'linear-gradient(135deg, rgba(255,248,230,0.9), rgba(245,230,195,0.8))',
            border: '1px solid rgba(201,162,39,0.4)',
          }}
        >
          <div className="text-center">
            <span className="text-xl">🔥</span>
            <p className="text-sm sm:text-base font-bold text-amber-950" style={{ fontFamily: DECO_FONT }}>
              {pujaStreak} {pujaStreak === 1 ? 'Day' : 'Days'}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-amber-700/80 font-semibold" style={{ fontFamily: HEADING_FONT }}>
              Devotion Streak
            </p>
          </div>
          <div className="h-8 w-px bg-amber-900/15" />
          <div className="text-center">
            <span className="text-xl">🛕</span>
            <p className="text-sm sm:text-base font-bold text-amber-950" style={{ fontFamily: DECO_FONT }}>
              {totalPujas}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-amber-700/80 font-semibold" style={{ fontFamily: HEADING_FONT }}>
              Pujas Offered
            </p>
          </div>
        </div>

        {/* Shloka Card */}
        <div
          className="rounded-2xl p-5 mb-5 text-center transition-all relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(201,162,39,0.5)',
            boxShadow: '0 4px 20px rgba(180,140,50,0.12)',
          }}
        >
          {/* Sanskrit Text */}
          <p className="text-base sm:text-lg font-extrabold text-amber-950 mb-2 leading-relaxed">
            {shloka.sanskrit}
          </p>

          {/* Transliteration */}
          <p className="text-xs sm:text-sm font-semibold italic text-amber-800/90 mb-3" style={{ fontFamily: HEADING_FONT }}>
            "{shloka.transliteration}"
          </p>

          {/* English Meaning */}
          <div className="pt-3 border-t border-amber-900/10">
            <p className="text-xs text-amber-900 leading-relaxed font-serif">
              {shloka.meaning}
            </p>
            <span className="inline-block mt-2 text-[10px] tracking-[0.2em] uppercase font-bold text-amber-700/70" style={{ fontFamily: HEADING_FONT }}>
              — {shloka.source}
            </span>
          </div>
        </div>

        {/* Shloka Navigator */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setIndex(i => (i > 0 ? i - 1 : DAILY_SHLOKAS.length - 1))}
            className="text-xs px-4 py-2 rounded-xl border transition-all cursor-pointer hover:bg-amber-100/60"
            style={{ fontFamily: HEADING_FONT, color: '#7a5a1e', borderColor: 'rgba(201,162,39,0.4)' }}
          >
            ← Previous
          </button>
          <span className="text-[10px] text-amber-700/60 font-semibold" style={{ fontFamily: HEADING_FONT }}>
            {index + 1} of {DAILY_SHLOKAS.length}
          </span>
          <button
            onClick={() => setIndex(i => i + 1)}
            className="text-xs px-4 py-2 rounded-xl border transition-all cursor-pointer hover:bg-amber-100/60"
            style={{ fontFamily: HEADING_FONT, color: '#7a5a1e', borderColor: 'rgba(201,162,39,0.4)' }}
          >
            Next →
          </button>
        </div>

        <p className="mt-4 text-[10px] text-amber-700/60" style={{ fontFamily: HEADING_FONT }}>
          May peace, light, and blessings fill your home today, {userName}. 🙏
        </p>
      </motion.div>
    </div>
  );
}
