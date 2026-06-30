import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  incenseLit: boolean;
  diyas: number;
  onLightIncense: () => void;
  onLightDiya: () => void;
  onRingBell: () => void;
  onReset: () => void;
}

export function PujaPanel({ incenseLit, diyas, onLightIncense, onLightDiya, onRingBell, onReset }: Props) {
  const [bellRinging, setBellRinging] = useState(false);
  const [bellNote, setBellNote] = useState(false);

  function handleBell() {
    setBellRinging(true);
    setBellNote(true);
    playBellSound();
    setTimeout(() => setBellRinging(false), 600);
    setTimeout(() => setBellNote(false), 1400);
    onRingBell();
  }

  const pujaActive = incenseLit || diyas > 0;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #180800 0%, #2a1000 100%)',
        border: '1px solid rgba(180,100,0,0.28)',
      }}
    >
      <div className="p-4">
        <h3
          className="text-amber-400/90 text-xs font-semibold tracking-[0.25em] uppercase text-center mb-4"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          🪔 Daily Puja
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          <PujaButton
            emoji="🕯️"
            label={incenseLit ? 'Incense Lit' : 'Light Incense'}
            sublabel="Agarbatti"
            done={incenseLit}
            onClick={onLightIncense}
            accentColor="#FF8C00"
          />

          <PujaButton
            emoji="🪔"
            label={diyas > 0 ? `${diyas} Diya${diyas > 1 ? 's' : ''}` : 'Light Diya'}
            sublabel="Deepam"
            done={false}
            onClick={onLightDiya}
            accentColor="#FF5500"
          />

          <div className="relative">
            <AnimatePresence>
              {bellNote && (
                <motion.div
                  key="note"
                  initial={{ y: 0, opacity: 1, x: 10 }}
                  animate={{ y: -42, opacity: 0, x: 28 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2 }}
                  className="absolute -top-2 right-2 text-base pointer-events-none z-10"
                >
                  🎵
                </motion.div>
              )}
            </AnimatePresence>
            <PujaButton
              emoji="🔔"
              label="Ring Bell"
              sublabel="Ghanta"
              done={false}
              onClick={handleBell}
              accentColor="#FFD700"
              extraClass={bellRinging ? 'bell-ring-anim' : ''}
            />
          </div>

          <PujaButton
            emoji="🔄"
            label="New Puja"
            sublabel="Reset"
            done={false}
            onClick={onReset}
            accentColor="#667"
          />
        </div>

        {/* Status bar */}
        <div
          className="mt-3 py-2 px-3 rounded-lg text-center text-xs border"
          style={{
            background: pujaActive ? 'rgba(255,130,0,0.09)' : 'rgba(0,0,0,0.22)',
            borderColor: pujaActive ? 'rgba(255,130,0,0.28)' : 'rgba(80,40,0,0.3)',
            color: pujaActive ? '#FFA040' : '#6B4A18',
          }}
        >
          {pujaActive
            ? `🌟 Puja in progress — ${diyas} diya${diyas !== 1 ? 's' : ''} lit`
            : '🙏 Begin your morning puja'}
        </div>
      </div>
    </div>
  );
}

interface PujaButtonProps {
  emoji: string;
  label: string;
  sublabel: string;
  done: boolean;
  onClick: () => void;
  accentColor: string;
  extraClass?: string;
}

function PujaButton({ emoji, label, sublabel, done, onClick, accentColor, extraClass = '' }: PujaButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all duration-200 cursor-pointer active:scale-95 ${extraClass}`}
      style={{
        background: done ? `${accentColor}18` : 'rgba(0,0,0,0.25)',
        borderColor: done ? `${accentColor}50` : 'rgba(100,50,0,0.32)',
      }}
      onMouseEnter={e => {
        if (!done) {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = `${accentColor}12`;
          el.style.borderColor = `${accentColor}42`;
        }
      }}
      onMouseLeave={e => {
        if (!done) {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = 'rgba(0,0,0,0.25)';
          el.style.borderColor = 'rgba(100,50,0,0.32)';
        }
      }}
    >
      {done && (
        <span className="absolute top-1.5 right-2 text-[10px]" style={{ color: accentColor }}>✓</span>
      )}
      <span className={`text-2xl leading-none ${extraClass}`}>{emoji}</span>
      <span className="text-amber-200/85 text-[11px] font-medium leading-tight text-center mt-0.5">{label}</span>
      <span className="text-amber-700/65 text-[9px] tracking-wide">{sublabel}</span>
    </button>
  );
}

function playBellSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.5);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.8);
  } catch {}
}
