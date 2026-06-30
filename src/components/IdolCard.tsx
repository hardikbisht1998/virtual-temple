import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlacedIdol, Idol } from '../types';

interface Props {
  placed: PlacedIdol;
  idol: Idol;
  onRemove: (id: string) => void;
  onGarland: (id: string) => void;
}

export function IdolCard({ placed, idol, onRemove, onGarland }: Props) {
  const [floatEmoji, setFloatEmoji] = useState<string | null>(null);

  function handleGarland() {
    if (placed.hasGarland) return;
    onGarland(placed.instanceId);
    setFloatEmoji('🌸');
    setTimeout(() => setFloatEmoji(null), 1600);
  }

  return (
    <motion.div
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="relative flex flex-col items-center gap-1.5 select-none"
    >
      <AnimatePresence>
        {floatEmoji && (
          <motion.span
            key="float"
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: -80, opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute text-2xl pointer-events-none z-20"
            style={{ top: 0 }}
          >
            {floatEmoji}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Idol circle */}
      <div
        className="relative cursor-pointer group"
        onClick={handleGarland}
        title={placed.hasGarland ? `${idol.name} — blessed` : `Offer garland to ${idol.name}`}
      >
        {/* Glow halo */}
        <div
          className="glow-anim absolute -inset-2 rounded-full"
          style={{ background: `radial-gradient(circle, ${idol.color}40 0%, transparent 70%)` }}
        />

        {/* Main circle */}
        <div
          className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center text-3xl border-2 transition-transform duration-200 group-hover:scale-110 group-hover:brightness-110"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${idol.color}28 0%, ${idol.color}70 100%)`,
            borderColor: idol.color,
            boxShadow: `0 0 14px ${idol.color}55, inset 0 1px 0 rgba(255,255,255,0.12)`,
          }}
        >
          {idol.emoji}

          {/* Garland overlay */}
          {placed.hasGarland && (
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 320 }}
              className="absolute -bottom-1 left-0 right-0 text-center leading-none"
              style={{ fontSize: 11 }}
            >
              🌸🌼🌸
            </motion.div>
          )}
        </div>

        {/* Pedestal shadow */}
        <div
          className="mx-auto mt-0.5 h-1 rounded-full"
          style={{
            width: '65%',
            background: `radial-gradient(ellipse, ${idol.color}35, transparent)`,
          }}
        />
      </div>

      {/* Labels */}
      <span className="text-amber-200/95 text-[11px] font-semibold tracking-wide leading-tight text-center max-w-[80px]">
        {idol.name}
      </span>
      <span className="text-amber-600/55 text-[9px] leading-tight text-center max-w-[80px]">
        {idol.description}
      </span>

      {/* Remove button */}
      <button
        onClick={() => onRemove(placed.instanceId)}
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-red-400 text-xs leading-none transition-colors opacity-0 group-hover:opacity-100"
        style={{ background: 'rgba(80,0,0,0.9)', border: '1px solid rgba(180,0,0,0.5)' }}
        title="Remove"
      >
        ×
      </button>
    </motion.div>
  );
}
