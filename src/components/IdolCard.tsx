import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DeityPhoto } from './DeityPhoto';
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
      className="relative flex flex-col items-center gap-1 select-none group"
    >
      {/* Float emoji */}
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

      {/* Glow halo */}
      <div
        className="glow-anim absolute -inset-2 rounded-lg pointer-events-none"
        style={{ background: `radial-gradient(circle, ${idol.color}28 0%, transparent 68%)` }}
      />

      {/* Idol photo */}
      <div
        className="relative cursor-pointer transition-transform duration-200 hover:scale-105 hover:brightness-110"
        onClick={handleGarland}
        title={placed.hasGarland ? `${idol.name} — blessed` : `Tap to offer garland to ${idol.name}`}
      >
        <DeityPhoto
          emoji={idol.emoji}
          name={idol.name}
          color={idol.color}
          size="md"
          hasGarland={placed.hasGarland}
        />
      </div>

      {/* Mantra / name */}
      <span className="text-amber-200/90 text-[11px] font-semibold tracking-wide text-center max-w-[80px] leading-tight">
        {idol.name}
      </span>
      <span className="text-amber-600/50 text-[9px] text-center max-w-[80px] leading-tight">
        {idol.description}
      </span>

      {/* Remove button */}
      <button
        onClick={() => onRemove(placed.instanceId)}
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-red-400 text-xs leading-none transition-colors opacity-0 group-hover:opacity-100"
        style={{ background: 'rgba(80,0,0,0.92)', border: '1px solid rgba(180,0,0,0.45)' }}
        title="Remove idol"
      >
        ×
      </button>
    </motion.div>
  );
}
