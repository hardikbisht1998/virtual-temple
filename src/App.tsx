import { useState } from 'react';
import { useTempleStore } from './useTempleStore';
import { OnboardingWizard } from './components/OnboardingWizard';
import { TempleAltar } from './components/TempleAltar';
import { IdolSelector } from './components/IdolSelector';
import { PujaPanel } from './components/PujaPanel';
import { BhajanPlayer } from './components/BhajanPlayer';

const DECO_FONT    = "'Cinzel Decorative', serif";
const HEADING_FONT = "'Cinzel', serif";

export default function App() {
  const {
    user, state, incenseLit,
    createUser, logout, setupTemple, setTempleName,
    addIdol, removeIdol, offerGarland,
    lightIncense, lightDiya, resetPuja,
  } = useTempleStore();

  const [customizing,  setCustomizing]  = useState(false);
  const [editingName,  setEditingName]  = useState(false);
  const [nameInput,    setNameInput]    = useState(state.templeName);

  /* ── Onboarding / Re-setup ──────────────────────────────── */
  if (!user || customizing) {
    return (
      <OnboardingWizard
        existingUser={customizing ? user?.name : undefined}
        onComplete={(uName, tName, idolIds) => {
          if (!user) createUser(uName);
          setupTemple(tName, idolIds);
          setCustomizing(false);
        }}
      />
    );
  }

  /* ── Temple name editing ────────────────────────────────── */
  function submitName() {
    if (nameInput.trim()) setTempleName(nameInput.trim());
    setEditingName(false);
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: 'radial-gradient(ellipse at top, #2d0800 0%, #0d0300 55%, #050100 100%)' }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="relative text-center pt-5 pb-4 px-4">
        {/* Top rule */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="h-px flex-1 max-w-32 sm:max-w-48" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,180,0,0.4))' }} />
          <span className="text-amber-600/65 text-[10px] tracking-[0.4em]" style={{ fontFamily: HEADING_FONT }}>✦ OM ✦</span>
          <div className="h-px flex-1 max-w-32 sm:max-w-48" style={{ background: 'linear-gradient(270deg, transparent, rgba(255,180,0,0.4))' }} />
        </div>

        {/* Title row */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 mb-1.5">
          <span className="text-4xl" style={{ filter: 'drop-shadow(0 0 10px rgba(255,160,0,0.55))' }}>🛕</span>
          {editingName ? (
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={submitName}
              onKeyDown={e => e.key === 'Enter' && submitName()}
              className="bg-transparent border-b-2 border-amber-500 text-amber-100 text-xl sm:text-2xl font-bold text-center outline-none w-56 sm:w-72"
              style={{ fontFamily: DECO_FONT }}
            />
          ) : (
            <h1
              className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-100 cursor-pointer hover:text-amber-300 transition-colors"
              style={{ fontFamily: DECO_FONT, textShadow: '0 0 30px rgba(255,180,0,0.3)' }}
              onClick={() => { setEditingName(true); setNameInput(state.templeName); }}
              title="Click to rename"
            >
              {state.templeName}
            </h1>
          )}
          <span className="text-4xl" style={{ filter: 'drop-shadow(0 0 10px rgba(255,160,0,0.55))' }}>🛕</span>
        </div>

        {/* Mantra */}
        <p className="text-amber-600/65 text-[10px] tracking-[0.3em] sm:tracking-[0.45em] uppercase" style={{ fontFamily: HEADING_FONT }}>
          Om Namah Shivaya &nbsp;•&nbsp; Jai Shri Ram &nbsp;•&nbsp; Jai Mata Di
        </p>

        {state.lastPujaDate && (
          <p className="text-amber-800/55 text-[10px] mt-1" style={{ fontFamily: HEADING_FONT }}>
            Last puja: {state.lastPujaDate}
          </p>
        )}

        {/* Bottom rule + action buttons */}
        <div className="flex items-center justify-between mt-3 gap-2">
          <button
            onClick={() => setCustomizing(true)}
            className="text-[10px] px-3 py-1.5 rounded-lg border transition-all"
            style={{
              fontFamily: HEADING_FONT,
              color: '#9a6520',
              borderColor: 'rgba(150,80,0,0.3)',
              background: 'rgba(0,0,0,0.2)',
            }}
            title="Re-design your temple"
          >
            ⚙ Customize
          </button>

          <div className="flex items-center gap-2">
            <div className="h-px w-16 sm:w-24" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,180,0,0.25))' }} />
            <span className="text-amber-800/40 text-[10px] tracking-[0.5em]">✦ ✦ ✦</span>
            <div className="h-px w-16 sm:w-24" style={{ background: 'linear-gradient(270deg, transparent, rgba(255,180,0,0.25))' }} />
          </div>

          <button
            onClick={logout}
            className="text-[10px] px-3 py-1.5 rounded-lg border transition-all"
            style={{
              fontFamily: HEADING_FONT,
              color: '#9a6520',
              borderColor: 'rgba(150,80,0,0.3)',
              background: 'rgba(0,0,0,0.2)',
            }}
            title="Switch user"
          >
            👤 {user.name}
          </button>
        </div>
      </header>

      {/* ── Main layout ────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Altar + selector */}
        <div className="lg:col-span-2 space-y-4">
          <TempleAltar
            placedIdols={state.placedIdols}
            incenseLit={incenseLit}
            incenseLitAt={state.incenseLitAt}
            diyas={state.diyas}
            onRemove={removeIdol}
            onGarland={offerGarland}
          />
          <IdolSelector onAdd={addIdol} />
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <PujaPanel
            incenseLit={incenseLit}
            incenseLitAt={state.incenseLitAt}
            diyas={state.diyas}
            onLightIncense={lightIncense}
            onLightDiya={lightDiya}
            onRingBell={() => {}}
            onReset={resetPuja}
          />
          <BhajanPlayer />

          {/* Stats */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #0d0700, #1c0d00)', border: '1px solid rgba(180,100,0,0.25)' }}
          >
            <div className="p-4">
              <h3 className="text-amber-500/85 text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3" style={{ fontFamily: HEADING_FONT }}>
                Temple Blessings
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Stat icon="🏛️" label="Idols"    value={state.placedIdols.length} />
                <Stat icon="🌸" label="Garlands" value={state.placedIdols.filter(p => p.hasGarland).length} />
                <Stat icon="🪔" label="Diyas"    value={state.diyas.length} />
                <Stat icon="🕯️" label="Incense"  value={incenseLit ? 'Lit' : '—'} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="text-center py-5 px-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="h-px flex-1 max-w-20" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,180,0,0.15))' }} />
          <span className="text-amber-900/60 text-sm">🙏</span>
          <div className="h-px flex-1 max-w-20" style={{ background: 'linear-gradient(270deg, transparent, rgba(255,180,0,0.15))' }} />
        </div>
        <p className="text-amber-900/45 text-[10px] tracking-[0.3em] uppercase" style={{ fontFamily: HEADING_FONT }}>
          May Peace and Prosperity Be Upon You
        </p>
      </footer>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div
      className="rounded-lg p-2.5 text-center"
      style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(120,60,0,0.22)' }}
    >
      <div className="text-base leading-tight mb-0.5">{icon}</div>
      <div className="text-amber-300 text-base font-bold leading-tight">{value}</div>
      <div className="text-amber-700/75 text-[10px] tracking-wide uppercase mt-0.5">{label}</div>
    </div>
  );
}
