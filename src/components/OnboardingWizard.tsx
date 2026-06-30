import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IDOLS } from '../data';
import { DeityPhoto } from './DeityPhoto';

interface Props {
  existingUser?: string;
  onComplete: (userName: string, templeName: string, idolIds: string[]) => void;
}

export function OnboardingWizard({ existingUser, onComplete }: Props) {
  const [step, setStep] = useState(existingUser ? 1 : 0);
  const [userName,    setUserName]    = useState(existingUser ?? '');
  const [templeName,  setTempleName]  = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
      style={{ background: 'radial-gradient(ellipse at top, #2d0800 0%, #0d0300 55%, #050100 100%)' }}
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
          {(existingUser ? [1, 2, 3] : [0, 1, 2, 3]).map((s, idx) => (
            <div
              key={s}
              className="rounded-full transition-all duration-300"
              style={{
                height: 6,
                width: step === s ? 28 : 10,
                background: step === s ? '#FFB347' : step > s ? '#FF8C00' : 'rgba(255,180,0,0.18)',
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
      className="rounded-2xl p-6 sm:p-8"
      style={{
        background: 'linear-gradient(160deg, #1c0900, #2e1200)',
        border: '1px solid rgba(200,100,0,0.3)',
        boxShadow: '0 0 60px rgba(200,80,0,0.06)',
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
      className="px-8 py-3 rounded-xl font-semibold text-sm transition-all"
      style={{
        fontFamily: "'Cinzel', serif",
        background: disabled ? 'rgba(80,40,0,0.3)' : 'linear-gradient(135deg, #FF8C00, #FF5500)',
        color: disabled ? '#555' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : '0 4px 20px rgba(255,100,0,0.3)',
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
      className="px-5 py-3 rounded-xl text-sm border transition-all"
      style={{ color: '#9a6520', borderColor: 'rgba(150,80,0,0.3)' }}
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
      className="w-full bg-black/35 rounded-xl px-4 py-3 text-amber-100 outline-none transition-all"
      style={{ border: '1px solid rgba(180,100,0,0.35)', fontFamily: 'system-ui' }}
      onFocus={e => (e.target.style.borderColor = 'rgba(255,180,0,0.65)')}
      onBlur={e  => (e.target.style.borderColor = 'rgba(180,100,0,0.35)')}
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
          className="text-2xl sm:text-3xl font-bold text-amber-100 mb-2"
          style={{ fontFamily: "'Cinzel Decorative', serif", textShadow: '0 0 24px rgba(255,180,0,0.3)' }}
        >
          Virtual Temple
        </h1>
        <p className="text-amber-700 text-xs tracking-widest" style={{ fontFamily: "'Cinzel', serif" }}>
          Your personal sacred space
        </p>
      </div>

      <label className="block text-amber-500/90 text-xs font-semibold tracking-widest uppercase mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
        Your Name
      </label>
      <StyledInput
        value={name}
        onChange={setName}
        placeholder="Enter your name…"
        onEnter={() => name.trim() && onNext(name)}
      />
      <p className="text-amber-800/60 text-[10px] mt-1.5">
        Returning devotee? Enter your name to restore your temple.
      </p>

      <div className="mt-6 flex justify-end">
        <PrimaryBtn onClick={() => onNext(name)} disabled={!name.trim()}>
          Begin Setup →
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
        <div className="text-4xl mb-3">🏛️</div>
        <h2 className="text-xl font-bold text-amber-100 mb-1" style={{ fontFamily: "'Cinzel', serif" }}>
          Name Your Temple
        </h2>
        <p className="text-amber-700/70 text-xs">What should your sacred space be called?</p>
      </div>

      <label className="block text-amber-500/90 text-xs font-semibold tracking-widest uppercase mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
        Temple Name
      </label>
      <StyledInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onEnter={onNext}
      />
      <p className="text-amber-800/50 text-[10px] mt-1.5">Leave blank to use "{placeholder}"</p>

      <div className="flex justify-between mt-6">
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
        <h2 className="text-xl font-bold text-amber-100 mb-1" style={{ fontFamily: "'Cinzel', serif" }}>
          Choose Your Deities
        </h2>
        <p className="text-amber-700/70 text-xs">
          {selected.length === 0 ? 'Select at least one deity for your temple' : `${selected.length} selected`}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-5">
        {IDOLS.map(idol => {
          const isSelected = selected.includes(idol.id);
          return (
            <button
              key={idol.id}
              onClick={() => onToggle(idol.id)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer"
              style={{
                background: isSelected ? `${idol.color}18` : 'rgba(0,0,0,0.28)',
                borderColor: isSelected ? idol.color : 'rgba(100,50,0,0.28)',
                boxShadow: isSelected ? `0 0 14px ${idol.color}30` : 'none',
              }}
            >
              <div className="relative">
                <DeityPhoto emoji={idol.emoji} name={idol.name} color={idol.color} size="sm" selected={isSelected} />
                {isSelected && (
                  <div
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: idol.color, boxShadow: `0 0 6px ${idol.color}` }}
                  >
                    ✓
                  </div>
                )}
              </div>
              <span
                className="text-[10px] font-medium text-center leading-tight"
                style={{ color: isSelected ? '#FFD080' : '#7a5010' }}
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
          Review →
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
        <div className="text-5xl mb-3" style={{ filter: 'drop-shadow(0 0 12px rgba(255,160,0,0.5))' }}>🛕</div>
        <h2
          className="text-xl font-bold text-amber-100 mb-1"
          style={{ fontFamily: "'Cinzel Decorative', serif", textShadow: '0 0 20px rgba(255,180,0,0.25)' }}
        >
          {templeName}
        </h2>
        <p className="text-amber-600/80 text-xs" style={{ fontFamily: "'Cinzel', serif" }}>
          Devotee: {userName}
        </p>
      </div>

      <div className="mb-6">
        <p className="text-amber-500/80 text-[10px] font-semibold tracking-[0.2em] uppercase text-center mb-3" style={{ fontFamily: "'Cinzel', serif" }}>
          Your Deities ({idols.length})
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
        className="rounded-xl p-3 mb-5 text-center text-xs border"
        style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(180,100,0,0.2)', color: '#9a6520' }}
      >
        You can add or remove deities at any time after setup.
      </div>

      <div className="flex justify-between">
        <BackBtn onClick={onBack} />
        <PrimaryBtn onClick={onDone}>
          Enter Temple 🛕
        </PrimaryBtn>
      </div>
    </Card>
  );
}
