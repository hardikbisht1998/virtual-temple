import { motion } from 'framer-motion';
import { IDOLS } from '../data';

interface Props {
  onAdd: (idolId: string) => void;
}

export function IdolSelector({ onAdd }: Props) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #0a0600 0%, #180c00 100%)',
        border: '1px solid rgba(180,100,0,0.28)',
      }}
    >
      <div className="p-4">
        <h3
          className="text-amber-400/90 text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          🏛️ Invite Deities
        </h3>

        <div className="grid grid-cols-4 gap-2">
          {IDOLS.map(idol => (
            <IdolTile key={idol.id} idol={idol} onAdd={onAdd} />
          ))}
        </div>

        <p className="text-center text-amber-800/50 text-[10px] mt-2.5 tracking-wide">
          Tap to invite &nbsp;•&nbsp; Tap placed idol to offer garland
        </p>
      </div>
    </div>
  );
}

function IdolTile({ idol, onAdd }: { idol: typeof IDOLS[number]; onAdd: (id: string) => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.07, y: -1 }}
      whileTap={{ scale: 0.93 }}
      onClick={() => onAdd(idol.id)}
      className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border cursor-pointer transition-colors"
      style={{
        background: 'rgba(0,0,0,0.28)',
        borderColor: 'rgba(100,50,0,0.3)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = idol.color + '14';
        el.style.borderColor = idol.color + '55';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = 'rgba(0,0,0,0.28)';
        el.style.borderColor = 'rgba(100,50,0,0.3)';
      }}
      title={`${idol.name} — ${idol.description}`}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
        style={{
          background: `radial-gradient(circle at 35% 30%, ${idol.color}22, ${idol.color}50)`,
          border: `1.5px solid ${idol.color}40`,
        }}
      >
        {idol.emoji}
      </div>
      <span className="text-amber-300/85 text-[10px] font-medium leading-tight text-center">{idol.name}</span>
    </motion.button>
  );
}
