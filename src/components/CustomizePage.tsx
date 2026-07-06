import { useState } from 'react';
import { motion } from 'framer-motion';
import { IDOLS } from '../data';
import { DeityPhoto } from './DeityPhoto';
import type { TempleState, UserProfile } from '../types';

const DECO_FONT    = "'Cinzel Decorative', serif";
const HEADING_FONT = "'Cinzel', serif";

interface Props {
  user: UserProfile;
  state: TempleState;
  onSetUserName: (name: string) => void;
  onSetTempleName: (name: string) => void;
  onAddIdol: (idolId: string) => void;
  onRemoveIdolsOfType: (idolId: string) => void;
  onGuidedSetup: () => void;
  onDone: () => void;
}

export function CustomizePage({
  user, state,
  onSetUserName, onSetTempleName,
  onAddIdol, onRemoveIdolsOfType,
  onGuidedSetup, onDone,
}: Props) {
  const placedIdolIds = new Set(state.placedIdols.map(p => p.idolId));

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 space-y-5 pb-10">
      {/* ── Page intro ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="text-center pt-2"
      >
        <h2
          className="text-lg sm:text-xl font-bold text-amber-100"
          style={{ fontFamily: DECO_FONT, textShadow: '0 0 24px rgba(255,180,0,0.25)' }}
        >
          Customize Your Temple
        </h2>
        <p className="text-amber-700/75 text-[11px] mt-1 tracking-widest uppercase" style={{ fontFamily: HEADING_FONT }}>
          Shape your sacred space
        </p>
      </motion.div>

      <NamesCard
        user={user}
        templeName={state.templeName}
        onSetUserName={onSetUserName}
        onSetTempleName={onSetTempleName}
      />

      <DeitiesCard
        placedIdolIds={placedIdolIds}
        onAdd={onAddIdol}
        onRemove={onRemoveIdolsOfType}
      />

      {/* ── Footer actions ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1"
      >
        <button
          onClick={onGuidedSetup}
          className="text-[11px] px-4 py-2.5 rounded-xl border transition-all hover:border-amber-600/50"
          style={{ fontFamily: HEADING_FONT, color: '#9a6520', borderColor: 'rgba(150,80,0,0.3)', background: 'rgba(0,0,0,0.2)' }}
          title="Start the step-by-step setup again"
        >
          ✨ Re-run Guided Setup
        </button>
        <button
          onClick={onDone}
          className="px-8 py-2.5 rounded-xl font-semibold text-sm transition-all"
          style={{
            fontFamily: HEADING_FONT,
            background: 'linear-gradient(135deg, #FF8C00, #FF5500)',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(255,100,0,0.3)',
          }}
        >
          Return to Temple 🛕
        </button>
      </motion.div>
    </div>
  );
}

/* ── Shared section card ─────────────────────────────────────── */

function SectionCard({ icon, title, subtitle, delay, children }: {
  icon: string;
  title: string;
  subtitle: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-2xl p-5 sm:p-6"
      style={{
        background: 'linear-gradient(160deg, #1c0900, #2e1200)',
        border: '1px solid rgba(200,100,0,0.3)',
        boxShadow: '0 0 60px rgba(200,80,0,0.06)',
      }}
    >
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px rgba(255,160,0,0.4))' }}>{icon}</span>
        <div>
          <h3 className="text-amber-100 text-sm font-bold tracking-[0.15em] uppercase" style={{ fontFamily: HEADING_FONT }}>
            {title}
          </h3>
          <p className="text-amber-800/70 text-[10px] mt-0.5">{subtitle}</p>
        </div>
      </div>
      {children}
    </motion.section>
  );
}

/* ── Names (devotee + temple) ───────────────────────────────── */

function NamesCard({ user, templeName, onSetUserName, onSetTempleName }: {
  user: UserProfile;
  templeName: string;
  onSetUserName: (name: string) => void;
  onSetTempleName: (name: string) => void;
}) {
  const [devotee, setDevotee] = useState(user.name);
  const [temple,  setTemple]  = useState(templeName);
  const [saved,   setSaved]   = useState(false);

  const dirty =
    (devotee.trim() !== user.name && devotee.trim() !== '') ||
    (temple.trim() !== templeName && temple.trim() !== '');

  function save() {
    if (devotee.trim() && devotee.trim() !== user.name) onSetUserName(devotee);
    if (temple.trim()  && temple.trim()  !== templeName) onSetTempleName(temple.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <SectionCard icon="📿" title="Names" subtitle="Who worships here, and what this place is called" delay={0.05}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Devotee Name" value={devotee} onChange={setDevotee} placeholder="Your name…" onEnter={save} />
        <Field label="Temple Name"  value={temple}  onChange={setTemple}  placeholder="My Home Temple" onEnter={save} />
      </div>

      {/* Live preview */}
      <div
        className="mt-4 rounded-xl px-4 py-3 text-center"
        style={{ background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(180,100,0,0.25)' }}
      >
        <p className="text-amber-800/60 text-[9px] tracking-[0.3em] uppercase mb-1" style={{ fontFamily: HEADING_FONT }}>
          Preview
        </p>
        <p className="text-amber-100 text-base font-bold" style={{ fontFamily: DECO_FONT, textShadow: '0 0 18px rgba(255,180,0,0.25)' }}>
          🛕 {temple.trim() || templeName} 🛕
        </p>
        <p className="text-amber-600/80 text-[10px] mt-0.5" style={{ fontFamily: HEADING_FONT }}>
          Devotee: {devotee.trim() || user.name}
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 mt-4">
        {saved && (
          <motion.span
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-emerald-400/90 text-xs"
            style={{ fontFamily: HEADING_FONT }}
          >
            ✓ Saved
          </motion.span>
        )}
        <button
          onClick={save}
          disabled={!dirty}
          className="px-6 py-2.5 rounded-xl font-semibold text-xs transition-all"
          style={{
            fontFamily: HEADING_FONT,
            background: dirty ? 'linear-gradient(135deg, #FF8C00, #FF5500)' : 'rgba(80,40,0,0.3)',
            color: dirty ? '#fff' : '#555',
            cursor: dirty ? 'pointer' : 'not-allowed',
            boxShadow: dirty ? '0 4px 16px rgba(255,100,0,0.3)' : 'none',
          }}
        >
          Save Changes
        </button>
      </div>
    </SectionCard>
  );
}

function Field({ label, value, onChange, placeholder, onEnter }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onEnter?: () => void;
}) {
  return (
    <div>
      <label className="block text-amber-500/90 text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ fontFamily: HEADING_FONT }}>
        {label}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        placeholder={placeholder}
        className="w-full bg-black/35 rounded-xl px-4 py-2.5 text-amber-100 text-sm outline-none transition-all"
        style={{ border: '1px solid rgba(180,100,0,0.35)' }}
        onFocus={e => (e.target.style.borderColor = 'rgba(255,180,0,0.65)')}
        onBlur={e  => (e.target.style.borderColor = 'rgba(180,100,0,0.35)')}
      />
    </div>
  );
}

/* ── Deities ─────────────────────────────────────────────────── */

function DeitiesCard({ placedIdolIds, onAdd, onRemove }: {
  placedIdolIds: Set<string>;
  onAdd: (idolId: string) => void;
  onRemove: (idolId: string) => void;
}) {
  return (
    <SectionCard
      icon="🛕"
      title="Deities on Your Altar"
      subtitle={`${placedIdolIds.size} of ${IDOLS.length} deities enshrined — tap to add or remove`}
      delay={0.12}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {IDOLS.map(idol => {
          const placed = placedIdolIds.has(idol.id);
          return (
            <button
              key={idol.id}
              onClick={() => (placed ? onRemove(idol.id) : onAdd(idol.id))}
              className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group"
              style={{
                background: placed ? `${idol.color}14` : 'rgba(0,0,0,0.28)',
                borderColor: placed ? `${idol.color}AA` : 'rgba(100,50,0,0.28)',
                boxShadow: placed ? `0 0 16px ${idol.color}28` : 'none',
              }}
              title={placed ? `Remove ${idol.name} from altar` : `Add ${idol.name} to altar`}
            >
              <DeityPhoto emoji={idol.emoji} name={idol.name} color={idol.color} size="sm" selected={placed} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold truncate" style={{ fontFamily: HEADING_FONT, color: placed ? '#FFD080' : '#b07a2a' }}>
                    {idol.name}
                  </span>
                  {placed && (
                    <span
                      className="text-[8px] px-1.5 py-0.5 rounded-full font-bold tracking-wider uppercase flex-shrink-0"
                      style={{ background: `${idol.color}30`, color: idol.color, border: `1px solid ${idol.color}60` }}
                    >
                      On Altar
                    </span>
                  )}
                </div>
                <p className="text-[10px] truncate" style={{ color: placed ? '#c89050' : '#7a5010' }}>
                  {idol.description}
                </p>
                <p className="text-[9px] italic truncate mt-0.5" style={{ color: placed ? `${idol.color}CC` : '#5f3d0c' }}>
                  {idol.mantra}
                </p>
              </div>

              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all"
                style={{
                  background: placed ? 'rgba(0,0,0,0.4)' : `${idol.color}22`,
                  color: placed ? '#c05030' : idol.color,
                  border: `1px solid ${placed ? 'rgba(190,80,40,0.5)' : idol.color + '55'}`,
                }}
              >
                {placed ? '−' : '+'}
              </span>
            </button>
          );
        })}
      </div>

      {placedIdolIds.size === 0 && (
        <p
          className="mt-4 text-center text-xs rounded-xl px-4 py-3 border"
          style={{ color: '#b07a2a', background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(180,100,0,0.2)' }}
        >
          Your altar is empty — add at least one deity to begin your puja. 🙏
        </p>
      )}
    </SectionCard>
  );
}
