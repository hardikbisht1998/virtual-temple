import { useState } from 'react';
import { motion } from 'framer-motion';
import { IDOLS, DAILY_SHLOKAS } from '../data';
import type { PlacedIdol, PrasadItem } from '../types';

const DECO_FONT    = "'Cinzel Decorative', serif";
const HEADING_FONT = "'Cinzel', serif";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  templeName: string;
  devoteeName: string;
  placedIdols: PlacedIdol[];
  incenseLit: boolean;
  diyasCount: number;
  prasad: PrasadItem[];
  pujaStreak: number;
}

export function DarshanShareModal({
  isOpen,
  onClose,
  templeName,
  devoteeName,
  placedIdols,
  incenseLit,
  diyasCount,
  prasad,
  pujaStreak,
}: Props) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const shloka = DAILY_SHLOKAS[0];
  const placedDeityNames = placedIdols
    .map(p => IDOLS.find(i => i.id === p.idolId)?.name)
    .filter(Boolean);

  function handleCopy() {
    const text = `🛕 *${templeName}* 🛕\n🙏 Daily Darshan & Blessings for ${today}\nDevotee: ${devoteeName}\n\nEnshrined Deities: ${placedDeityNames.join(', ')}\n${incenseLit ? '🕯️ Agarbatti is burning | ' : ''}${diyasCount > 0 ? `🪔 ${diyasCount} Deepam lit | ` : ''}${prasad.length > 0 ? '🍬 Prasad offered' : ''}\n🔥 Devotion Streak: ${pujaStreak} days\n\n📜 *Daily Shloka:*\n${shloka.sanskrit}\n"${shloka.transliteration}"\n_${shloka.meaning}_\n\nMay the divine light illuminate your life with peace and prosperity! 🌸✨`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 15 }}
        transition={{ duration: 0.28 }}
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-7 text-center"
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

        {/* Shareable Darshan Card */}
        <div
          id="darshan-card"
          className="rounded-2xl p-5 mb-5 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #fffdf8 0%, #f7f1e1 60%, #eee1c4 100%)',
            border: '2px solid #c9a227',
            boxShadow: 'inset 0 0 30px rgba(212,175,55,0.15), 0 8px 24px rgba(110,95,60,0.25)',
          }}
        >
          {/* Top Om Emblem */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-px w-8 bg-amber-600/40" />
            <span className="text-xs tracking-[0.3em] font-bold text-amber-700" style={{ fontFamily: HEADING_FONT }}>
              ✦ OM ✦
            </span>
            <span className="h-px w-8 bg-amber-600/40" />
          </div>

          <span className="text-3xl" style={{ filter: 'drop-shadow(0 0 8px rgba(255,160,0,0.5))' }}>🛕</span>
          <h3
            className="text-lg sm:text-xl font-bold text-amber-950 mt-1"
            style={{ fontFamily: DECO_FONT }}
          >
            {templeName}
          </h3>
          <p className="text-[10px] tracking-[0.2em] uppercase font-bold text-amber-700/80 mt-0.5" style={{ fontFamily: HEADING_FONT }}>
            Devotee: {devoteeName}
          </p>

          <p className="text-[9px] text-gray-500 mt-1 mb-3">{today}</p>

          {/* Deity Icons Enshrined */}
          <div className="flex items-center justify-center gap-2 flex-wrap mb-3 py-2 px-3 rounded-xl bg-white/70 border border-amber-600/20">
            {placedIdols.map(p => {
              const idol = IDOLS.find(i => i.id === p.idolId);
              if (!idol) return null;
              return (
                <div key={p.instanceId} className="flex items-center gap-1 text-[11px] font-semibold text-amber-900" style={{ fontFamily: HEADING_FONT }}>
                  <span>{idol.emoji}</span>
                  <span>{idol.name}</span>
                  {p.hasGarland && <span>🌸</span>}
                  {p.hasTilak && <span>🔴</span>}
                </div>
              );
            })}
          </div>

          {/* Offerings status */}
          <div className="flex items-center justify-center gap-3 text-[10px] text-amber-800/80 mb-3" style={{ fontFamily: HEADING_FONT }}>
            {incenseLit && <span>🕯️ Agarbatti</span>}
            {diyasCount > 0 && <span>🪔 {diyasCount} Deepam</span>}
            {prasad.length > 0 && <span>🥟 Naivedyam</span>}
            <span>🔥 {pujaStreak}d Streak</span>
          </div>

          {/* Shloka snippet */}
          <div className="pt-2 border-t border-amber-600/20 text-center">
            <p className="text-xs font-bold text-amber-950 mb-0.5">
              {shloka.sanskrit}
            </p>
            <p className="text-[9px] italic text-amber-800 leading-tight">
              "{shloka.meaning}"
            </p>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={handleCopy}
          className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all cursor-pointer shadow-lg hover:scale-[1.02] active:scale-98"
          style={{
            fontFamily: HEADING_FONT,
            background: 'linear-gradient(135deg, #e6c14c, #b8860b)',
            boxShadow: '0 4px 16px rgba(184,134,11,0.4)',
          }}
        >
          {copied ? '✓ Darshan Message Copied to Clipboard!' : '📤 Share Darshan Blessing'}
        </button>

        <p className="text-[10px] text-gray-500 mt-2.5" style={{ fontFamily: HEADING_FONT }}>
          Share today's temple darshan and prayers with family & friends. 🙏
        </p>
      </motion.div>
    </div>
  );
}
