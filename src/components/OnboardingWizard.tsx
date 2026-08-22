import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IDOLS } from '../data';
import { DeityPhoto } from './DeityPhoto';

const DECO_FONT    = "'Cinzel Decorative', serif";
const HEADING_FONT = "'Cinzel', serif";

interface Props {
  existingUser?: string;
  existingTempleName?: string;
  existingIdolIds?: string[];
  onComplete: (userName: string, templeName: string, idolIds: string[]) => void;
}

export function OnboardingWizard({ existingUser, existingTempleName, existingIdolIds, onComplete }: Props) {
  const [step, setStep] = useState(existingUser ? 1 : 0);
  const [userName,    setUserName]    = useState(existingUser ?? '');
  const [templeName,  setTempleName]  = useState(existingTempleName ?? '');
  const [selectedIds, setSelectedIds] = useState<string[]>(existingIdolIds ?? []);

  function toggleIdol(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function finish() {
    onComplete(
      userName.trim(),
      templeName.trim() || `${userName.trim()}'s Temple`,
      selectedIds,
    );
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'radial-gradient(ellipse at top, #fffdf7 0%, #f6f0e2 55%, #e9dfc8 100%)' }}
    >
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepLogin key="s0" onNext={name => { setUserName(name); setStep(1); }} />
          )}
          {step === 1 && (
            <StepTempleName
              key="s1"
              userName={userName}
              value={templeName}
              onChange={setTempleName}
              onBack={existingUser ? undefined : () => setStep(0)}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <StepChooseIdols
              key="s2"
              selected={selectedIds}
              onToggle={toggleIdol}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <StepReview
              key="s3"
              userName={userName}
              templeName={templeName.trim() || `${userName}'s Temple`}
              selectedIds={selectedIds}
              onBack={() => setStep(2)}
              onDone={finish}
            />
          )}
        </AnimatePresence>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mt-6 justify-center">
          {(existingUser ? [1, 2, 3] : [0, 1, 2, 3]).map(s => (
            <div
              key={s}
              className="rounded-full transition-all duration-300"
              style={{
                height: 6,
                width: step === s ? 28 : 10,
                background: step === s ? 'linear-gradient(90deg, #e6c14c, #b8860b)' : step > s ? '#b8860b' : 'rgba(201,162,39,0.3)',
                boxShadow: step === s ? '0 0 10px rgba(184,134,11,0.5)' : 'none',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Shared card wrapper ───────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl p-6 sm:p-8"
      style={{
        background: 'linear-gradient(165deg, #ffffff 0%, #faf6ec 45%, #f2e8d4 100%)',
        border: '2px solid rgba(201,162,39,0.65)',
        boxShadow: '0 20px 50px rgba(110,95,60,0.18), 0 0 40px rgba(212,175,55,0.15)',
      }}
    >
      {children}
    </motion.div>
  );
}

function PrimaryBtn({ children, onClick, disabled = false }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-7 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-98"
      style={{
        fontFamily: HEADING_FONT,
        background: disabled ? 'rgba(180,180,180,0.3)' : 'linear-gradient(135deg, #e6c14c, #b8860b)',
        color: disabled ? '#999' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : '0 4px 16px rgba(184,134,11,0.35)',
      }}
    >
      {children}
    </button>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-5 py-3 rounded-xl text-sm border font-semibold transition-all cursor-pointer hover:bg-amber-100/50"
      style={{
        fontFamily: HEADING_FONT,
        color: '#7a5a1e',
        borderColor: 'rgba(201,162,39,0.4)',
        background: 'rgba(255,255,255,0.6)',
      }}
    >
      ← Back
    </button>
  );
}

function StyledInput({ value, onChange, placeholder, onEnter }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onEnter?: () => void;
}) {
  return (
    <input
      autoFocus
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && onEnter?.()}
      placeholder={placeholder}
      className="w-full bg-white/80 rounded-xl px-4 py-3 text-amber-950 font-semibold outline-none transition-all"
      style={{
        border: '1.5px solid rgba(201,162,39,0.45)',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)',
      }}
      onFocus={e => (e.target.style.borderColor = '#b8860b')}
      onBlur={e  => (e.target.style.borderColor = 'rgba(201,162,39,0.45)')}
    />
  );
}

/* ── Step 0: Login ─────────────────────────────────────────── */

function StepLogin({ onNext }: { onNext: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <Card>
      <div className="text-center mb-8">
        <div className="text-6xl mb-4 breathe" style={{ filter: 'drop-shadow(0 0 14px rgba(255,160,0,0.55))' }}>
          🛕
        </div>
        <h1
          className="text-2xl sm:text-3xl font-bold mb-1"
          style={{ fontFamily: DECO_FONT, color: '#6b5312', textShadow: '0 0 24px rgba(255,180,0,0.2)' }}
        >
          Virtual Temple
        </h1>
        <p className="text-[11px] tracking-[0.3em] uppercase font-bold text-amber-700/80" style={{ fontFamily: HEADING_FONT }}>
          Your Personal Sacred Home Altar
        </p>
      </div>

      <label className="block text-amber-900 text-xs font-bold tracking-widest uppercase mb-2" style={{ fontFamily: HEADING_FONT }}>
        Your Name / Devotee
      </label>
      <StyledInput
        value={name}
        onChange={setName}
        placeholder="Enter your name…"
        onEnter={() => name.trim() && onNext(name)}
      />
      <p className="text-amber-800/60 text-[10px] mt-1.5" style={{ fontFamily: HEADING_FONT }}>
        Returning devotee? Enter your name to enter your temple.
      </p>

      <div className="mt-7 flex justify-end">
        <PrimaryBtn onClick={() => onNext(name)} disabled={!name.trim()}>
          Begin Sacred Setup →
        </PrimaryBtn>
      </div>
    </Card>
  );
}

/* ── Step 1: Temple name ───────────────────────────────────── */

function StepTempleName({ userName, value, onChange, onBack, onNext }: {
  userName: string;
  value: string;
  onChange: (v: string) => void;
  onBack?: () => void;
  onNext: () => void;
}) {
  const placeholder = `${userName}'s Temple`;
  return (
    <Card>
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🏛️</div>
        <h2 className="text-xl font-bold text-amber-950 mb-1" style={{ fontFamily: DECO_FONT }}>
          Name Your Mandir
        </h2>
        <p className="text-amber-700/80 text-xs font-semibold" style={{ fontFamily: HEADING_FONT }}>
          What should your sacred space be called?
        </p>
      </div>

      <label className="block text-amber-900 text-xs font-bold tracking-widest uppercase mb-2" style={{ fontFamily: HEADING_FONT }}>
        Temple Name
      </label>
      <StyledInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onEnter={onNext}
      />
      <p className="text-amber-800/60 text-[10px] mt-1.5" style={{ fontFamily: HEADING_FONT }}>
        Leave blank to use "{placeholder}"
      </p>

      <div className="flex justify-between mt-7">
        {onBack ? <BackBtn onClick={onBack} /> : <div />}
        <PrimaryBtn onClick={onNext}>Choose Deities →</PrimaryBtn>
      </div>
    </Card>
  );
}

/* ── Step 2: Choose idols ──────────────────────────────────── */

function StepChooseIdols({ selected, onToggle, onBack, onNext }: {
  selected: string[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <Card>
      <div className="text-center mb-5">
        <h2 className="text-xl font-bold text-amber-950 mb-1" style={{ fontFamily: DECO_FONT }}>
          Choose Your Deities
        </h2>
        <p className="text-amber-700/80 text-xs font-semibold" style={{ fontFamily: HEADING_FONT }}>
          {selected.length === 0 ? 'Select at least one deity for your mandir' : `${selected.length} deities selected`}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-5">
        {IDOLS.map(idol => {
          const isSelected = selected.includes(idol.id);
          return (
            <button
              key={idol.id}
              onClick={() => onToggle(idol.id)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all cursor-pointer hover:scale-105"
              style={{
                background: isSelected ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
                borderColor: isSelected ? '#b8860b' : 'rgba(201,162,39,0.3)',
                boxShadow: isSelected ? '0 4px 15px rgba(184,134,11,0.25)' : 'none',
              }}
            >
              <div className="relative">
                <DeityPhoto emoji={idol.emoji} name={idol.name} color={idol.color} size="sm" selected={isSelected} />
                {isSelected && (
                  <div
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow"
                    style={{ background: '#b8860b' }}
                  >
                    ✓
                  </div>
                )}
              </div>
              <span
                className="text-[10px] font-bold text-center leading-tight truncate w-full"
                style={{ fontFamily: HEADING_FONT, color: isSelected ? '#6b5312' : '#8a7a55' }}
              >
                {idol.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <BackBtn onClick={onBack} />
        <PrimaryBtn onClick={onNext} disabled={selected.length === 0}>
          Review & Enshrine →
        </PrimaryBtn>
      </div>
    </Card>
  );
}

/* ── Step 3: Review ────────────────────────────────────────── */

function StepReview({ userName, templeName, selectedIds, onBack, onDone }: {
  userName: string;
  templeName: string;
  selectedIds: string[];
  onBack: () => void;
  onDone: () => void;
}) {
  const idols = selectedIds.map(id => IDOLS.find(i => i.id === id)!).filter(Boolean);
  return (
    <Card>
      <div className="text-center mb-6">
        <div className="text-5xl mb-2" style={{ filter: 'drop-shadow(0 0 12px rgba(255,160,0,0.5))' }}>🛕</div>
        <h2
          className="text-xl sm:text-2xl font-bold text-amber-950 mb-1"
          style={{ fontFamily: DECO_FONT }}
        >
          {templeName}
        </h2>
        <p className="text-amber-700/80 text-xs font-semibold" style={{ fontFamily: HEADING_FONT }}>
          Devotee: {userName}
        </p>
      </div>

      <div className="mb-6">
        <p className="text-amber-900 text-[10px] font-bold tracking-[0.2em] uppercase text-center mb-3" style={{ fontFamily: HEADING_FONT }}>
          Enshrined Deities ({idols.length})
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {idols.map(idol => (
            <div key={idol.id} className="flex flex-col items-center gap-1">
              <DeityPhoto emoji={idol.emoji} name={idol.name} color={idol.color} size="sm" showName />
            </div>
          ))}
        </div>
      </div>

      <div
        className="rounded-xl p-3 mb-6 text-center text-xs border bg-white/60"
        style={{ borderColor: 'rgba(201,162,39,0.35)', color: '#7a5a1e', fontFamily: HEADING_FONT }}
      >
        You can always add more deities or customize your 3D mandir anytime. 🙏
      </div>

      <div className="flex justify-between">
        <BackBtn onClick={onBack} />
        <PrimaryBtn onClick={onDone}>
          Enter Mandir 🛕
        </PrimaryBtn>
      </div>
    </Card>
  );
}
