import { motion } from 'framer-motion';
import { IDOLS } from '../data';
import { DeityPhoto } from './DeityPhoto';

interface Props {
  onAdd: (idolId: string) => void;
}

export function IdolSelector({ onAdd }: Props) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #0a0600 0%, #180c00 100%)',
        border: '1px solid rgba(180,100,0,0.25)',
      }}
    >
      <div className="p-4">
        <h3
          className="text-amber-400/85 text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          🏛️ Add More Deities
        </h3>

        <div className="grid grid-cols-4 gap-2">
          {IDOLS.map(idol => (
            <IdolTile key={idol.id} idol={idol} onAdd={onAdd} />
          ))}
        </div>

        <p className="text-center text-amber-800/45 text-[10px] mt-2.5 tracking-wide">
          Tap to add &nbsp;•&nbsp; Tap placed idol to offer garland
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
      style={{ background: 'rgba(0,0,0,0.28)', borderColor: 'rgba(100,50,0,0.28)' }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = `${idol.color}14`;
        el.style.borderColor = `${idol.color}50`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = 'rgba(0,0,0,0.28)';
        el.style.borderColor = 'rgba(100,50,0,0.28)';
      }}
      title={`Add ${idol.name} — ${idol.description}`}
    >
      <DeityPhoto emoji={idol.emoji} name={idol.name} color={idol.color} size="sm" />
      <span className="text-amber-300/80 text-[10px] font-medium leading-tight text-center">
        {idol.name}
      </span>
    </motion.button>
  );
}
