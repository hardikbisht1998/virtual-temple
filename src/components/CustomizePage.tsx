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
          className="text-xl sm:text-2xl font-bold text-amber-950"
          style={{ fontFamily: DECO_FONT, textShadow: '0 1px 0 #fff' }}
        >
          Customize Your Sacred Mandir
        </h2>
        <p className="text-amber-700/80 text-[11px] mt-1 tracking-widest uppercase font-bold" style={{ fontFamily: HEADING_FONT }}>
          Shape your sacred space & devotion
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
        className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2"
      >
        <button
          onClick={onGuidedSetup}
          className="text-[11px] px-4 py-2.5 rounded-xl border transition-all cursor-pointer hover:bg-amber-100/50"
          style={{
            fontFamily: HEADING_FONT,
            color: '#7a5a1e',
            borderColor: 'rgba(201,162,39,0.4)',
            background: 'rgba(255,255,255,0.7)',
          }}
          title="Start the step-by-step setup again"
        >
          ✨ Re-run Guided Setup
        </button>
        <button
          onClick={onDone}
          className="px-8 py-2.5 rounded-xl font-bold text-sm text-white transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
          style={{
            fontFamily: HEADING_FONT,
            background: 'linear-gradient(135deg, #e6c14c, #b8860b)',
            boxShadow: '0 4px 16px rgba(184,134,11,0.35)',
          }}
        >
          Return to Altar 🛕
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
      className="rounded-3xl p-5 sm:p-6"
      style={{
        background: 'linear-gradient(165deg, #ffffff 0%, #faf6ec 50%, #f2e8d4 100%)',
        border: '2px solid rgba(201,162,39,0.6)',
        boxShadow: '0 12px 35px rgba(110,95,60,0.14)',
      }}
    >
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px rgba(255,160,0,0.4))' }}>{icon}</span>
        <div>
          <h3 className="text-amber-950 text-sm font-bold tracking-[0.15em] uppercase" style={{ fontFamily: HEADING_FONT }}>
            {title}
          </h3>
          <p className="text-amber-700/75 text-[10px] mt-0.5 font-semibold" style={{ fontFamily: HEADING_FONT }}>{subtitle}</p>
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
    <SectionCard icon="📿" title="Mandir & Devotee Names" subtitle="Who worships here, and what this place is called" delay={0.05}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Devotee Name" value={devotee} onChange={setDevotee} placeholder="Your name…" onEnter={save} />
        <Field label="Temple Name"  value={temple}  onChange={setTemple}  placeholder="My Home Temple" onEnter={save} />
      </div>

      {/* Live preview */}
      <div
        className="mt-4 rounded-2xl px-4 py-3 text-center bg-white/70"
        style={{ border: '1px dashed rgba(201,162,39,0.5)' }}
      >
        <p className="text-amber-700/70 text-[9px] tracking-[0.3em] uppercase mb-1 font-bold" style={{ fontFamily: HEADING_FONT }}>
          Preview
        </p>
        <p className="text-amber-950 text-base font-bold" style={{ fontFamily: DECO_FONT }}>
          🛕 {temple.trim() || templeName} 🛕
        </p>
        <p className="text-amber-700 text-[10px] mt-0.5 font-semibold" style={{ fontFamily: HEADING_FONT }}>
          Devotee: {devotee.trim() || user.name}
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 mt-4">
        {saved && (
          <motion.span
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-emerald-700 font-bold text-xs"
            style={{ fontFamily: HEADING_FONT }}
          >
            ✓ Saved Successfully
          </motion.span>
        )}
        <button
          onClick={save}
          disabled={!dirty}
          className="px-6 py-2.5 rounded-xl font-bold text-xs transition-all"
          style={{
            fontFamily: HEADING_FONT,
            background: dirty ? 'linear-gradient(135deg, #e6c14c, #b8860b)' : 'rgba(180,180,180,0.3)',
            color: dirty ? '#fff' : '#999',
            cursor: dirty ? 'pointer' : 'not-allowed',
            boxShadow: dirty ? '0 4px 16px rgba(184,134,11,0.35)' : 'none',
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
      <label className="block text-amber-900 text-[10px] font-bold tracking-widest uppercase mb-1.5" style={{ fontFamily: HEADING_FONT }}>
        {label}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        placeholder={placeholder}
        className="w-full bg-white/85 rounded-xl px-4 py-2.5 text-amber-950 font-semibold text-sm outline-none transition-all"
        style={{ border: '1.5px solid rgba(201,162,39,0.4)' }}
        onFocus={e => (e.target.style.borderColor = '#b8860b')}
        onBlur={e  => (e.target.style.borderColor = 'rgba(201,162,39,0.4)')}
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
      title="Enshrined Deities"
      subtitle={`${placedIdolIds.size} of ${IDOLS.length} deities enshrined — tap to invite or remove`}
      delay={0.12}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {IDOLS.map(idol => {
          const placed = placedIdolIds.has(idol.id);
          return (
            <button
              key={idol.id}
              onClick={() => (placed ? onRemove(idol.id) : onAdd(idol.id))}
              className="flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer group hover:scale-[1.02]"
              style={{
                background: placed ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
                borderColor: placed ? '#b8860b' : 'rgba(201,162,39,0.3)',
                boxShadow: placed ? '0 4px 16px rgba(184,134,11,0.2)' : 'none',
              }}
              title={placed ? `Remove ${idol.name} from altar` : `Add ${idol.name} to altar`}
            >
              <DeityPhoto emoji={idol.emoji} name={idol.name} color={idol.color} size="sm" selected={placed} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold truncate text-amber-950" style={{ fontFamily: HEADING_FONT }}>
                    {idol.name}
                  </span>
                  {placed && (
                    <span
                      className="text-[8px] px-1.5 py-0.5 rounded-full font-bold tracking-wider uppercase flex-shrink-0 bg-amber-100 text-amber-900 border border-amber-400/50"
                    >
                      Enshrined
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-amber-700/80 truncate">
                  {idol.description}
                </p>
                <p className="text-[9px] italic truncate mt-0.5 text-amber-900/60 font-serif">
                  {idol.mantra}
                </p>
              </div>

              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all"
                style={{
                  background: placed ? '#b8860b' : 'rgba(201,162,39,0.15)',
                  color: placed ? '#ffffff' : '#7a5a1e',
                  border: `1px solid ${placed ? '#b8860b' : 'rgba(201,162,39,0.4)'}`,
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
          className="mt-4 text-center text-xs rounded-xl px-4 py-3 border bg-white/60"
          style={{ color: '#7a5a1e', borderColor: 'rgba(201,162,39,0.35)', fontFamily: HEADING_FONT }}
        >
          Your mandir is currently empty — add at least one deity to begin your prayers. 🙏
        </p>
      )}
    </SectionCard>
  );
}
