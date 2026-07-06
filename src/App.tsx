import { useState, lazy, Suspense } from 'react';
import { useTempleStore } from './useTempleStore';
import { OnboardingWizard } from './components/OnboardingWizard';
import { TempleAltar } from './components/TempleAltar';
import { CustomizePage } from './components/CustomizePage';

const Temple3D = lazy(() =>
  import('./components/Temple3D').then(m => ({ default: m.Temple3D }))
);

const DECO_FONT    = "'Cinzel Decorative', serif";
const HEADING_FONT = "'Cinzel', serif";

type Page = 'temple' | 'mandir3d' | 'customize';

export default function App() {
  const {
    user, state, incenseLit,
    createUser, setUserName, logout, setupTemple, setTempleName,
    addIdol, removeIdol, removeIdolsOfType, offerGarland,
    lightIncense, lightDiya, resetPuja,
  } = useTempleStore();

  const [page,         setPage]         = useState<Page>('temple');
  const [customizing,  setCustomizing]  = useState(false);
  const [editingName,  setEditingName]  = useState(false);
  const [nameInput,    setNameInput]    = useState(state.templeName);

  /* ── Onboarding / Re-setup ──────────────────────────────── */
  if (!user || customizing) {
    const existingIdolIds = customizing
      ? Array.from(new Set(state.placedIdols.map(p => p.idolId)))
      : undefined;
    return (
      <OnboardingWizard
        existingUser={customizing ? user?.name : undefined}
        existingTempleName={customizing ? state.templeName : undefined}
        existingIdolIds={existingIdolIds}
        onComplete={(uName, tName, idolIds) => {
          if (!user) createUser(uName);
          setupTemple(tName, idolIds);
          setCustomizing(false);
          setPage('temple');
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
      style={{ background: 'radial-gradient(ellipse at top, #fffdf7 0%, #f6f0e2 55%, #e9dfc8 100%)' }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="relative z-20 text-center pt-5 pb-4 px-4">
        {/* Top rule */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="h-px flex-1 max-w-32 sm:max-w-48" style={{ background: 'linear-gradient(90deg, transparent, rgba(184,134,11,0.55))' }} />
          <span className="text-[10px] tracking-[0.4em]" style={{ fontFamily: HEADING_FONT, color: '#b8860b' }}>✦ OM ✦</span>
          <div className="h-px flex-1 max-w-32 sm:max-w-48" style={{ background: 'linear-gradient(270deg, transparent, rgba(184,134,11,0.55))' }} />
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
              className="bg-transparent border-b-2 text-xl sm:text-2xl font-bold text-center outline-none w-56 sm:w-72"
              style={{ fontFamily: DECO_FONT, color: '#6b5312', borderColor: '#c9a227' }}
            />
          ) : (
            <h1
              className="text-xl sm:text-2xl lg:text-3xl font-bold cursor-pointer hover:opacity-75 transition-opacity"
              style={{ fontFamily: DECO_FONT, color: '#6b5312', textShadow: '0 1px 0 #fff, 0 0 24px rgba(212,175,55,0.45)' }}
              onClick={() => { setEditingName(true); setNameInput(state.templeName); }}
              title="Click to rename"
            >
              {state.templeName}
            </h1>
          )}
          <span className="text-4xl" style={{ filter: 'drop-shadow(0 0 10px rgba(255,160,0,0.55))' }}>🛕</span>
        </div>

        {/* Mantra */}
        <p className="text-[10px] tracking-[0.3em] sm:tracking-[0.45em] uppercase" style={{ fontFamily: HEADING_FONT, color: 'rgba(161,120,42,0.8)' }}>
          Om Namah Shivaya &nbsp;•&nbsp; Jai Shri Ram &nbsp;•&nbsp; Jai Mata Di
        </p>

        {state.lastPujaDate && (
          <p className="text-[10px] mt-1" style={{ fontFamily: HEADING_FONT, color: 'rgba(139,143,152,0.9)' }}>
            Last puja: {state.lastPujaDate}
          </p>
        )}

        {/* Bottom row: nav tabs centered, user at right */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center mt-4 gap-2">
          <div className="hidden sm:flex items-center justify-start">
            <div className="h-px w-16 sm:w-24" style={{ background: 'linear-gradient(270deg, rgba(176,180,190,0.7), transparent)' }} />
          </div>

          <nav
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(176,180,190,0.6)', boxShadow: '0 2px 10px rgba(120,110,80,0.12)' }}
          >
            <TabButton icon="🛕" label="Temple"    active={page === 'temple'}    onClick={() => setPage('temple')} />
            <TabButton icon="🕉" label="3D Mandir" active={page === 'mandir3d'}  onClick={() => setPage('mandir3d')} />
            <TabButton icon="🎨" label="Customize" active={page === 'customize'} onClick={() => setPage('customize')} />
          </nav>

          <div className="flex items-center justify-end">
            <button
              onClick={logout}
              className="text-[10px] px-3 py-1.5 rounded-lg border transition-all"
              style={{
                fontFamily: HEADING_FONT,
                color: '#8a7a55',
                borderColor: 'rgba(176,180,190,0.6)',
                background: 'rgba(255,255,255,0.55)',
              }}
              title="Switch user"
            >
              👤 {user.name}
            </button>
          </div>
        </div>
      </header>

      {/* ── 3D Mandir page ─────────────────────────────────── */}
      {page === 'mandir3d' ? (
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center gap-3 py-24">
              <span className="text-5xl breathe" style={{ filter: 'drop-shadow(0 0 14px rgba(255,160,0,0.55))' }}>🕉</span>
              <p className="text-xs tracking-[0.3em] uppercase" style={{ fontFamily: HEADING_FONT, color: '#a1782a' }}>
                Building your mandir…
              </p>
            </div>
          }
        >
          <Temple3D placedIdols={state.placedIdols} onAddIdol={addIdol} onRemoveIdol={removeIdol} />
        </Suspense>
      ) : page === 'customize' ? (
        <CustomizePage
          user={user}
          state={state}
          onSetUserName={setUserName}
          onSetTempleName={setTempleName}
          onAddIdol={addIdol}
          onRemoveIdolsOfType={removeIdolsOfType}
          onGuidedSetup={() => setCustomizing(true)}
          onDone={() => setPage('temple')}
        />
      ) : (
      /* ── Main layout ────────────────────────────────────── */
      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4">
        <p
          className="text-center text-xs tracking-[0.25em] uppercase mb-4"
          style={{ fontFamily: HEADING_FONT, color: 'rgba(184,134,11,0.75)' }}
        >
          🙏 Namaste {user.name} — come, offer your prayers
        </p>
        <TempleAltar
          placedIdols={state.placedIdols}
          incenseLit={incenseLit}
          incenseLitAt={state.incenseLitAt}
          diyas={state.diyas}
          onGarland={offerGarland}
          onAddDeities={() => setPage('customize')}
          onLightIncense={lightIncense}
          onLightDiya={lightDiya}
          onReset={resetPuja}
        />
      </main>
      )}

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="text-center py-5 px-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="h-px flex-1 max-w-20" style={{ background: 'linear-gradient(90deg, transparent, rgba(176,180,190,0.6))' }} />
          <span className="text-sm" style={{ opacity: 0.7 }}>🙏</span>
          <div className="h-px flex-1 max-w-20" style={{ background: 'linear-gradient(270deg, transparent, rgba(176,180,190,0.6))' }} />
        </div>
        <p className="text-[10px] tracking-[0.3em] uppercase" style={{ fontFamily: HEADING_FONT, color: 'rgba(139,143,152,0.85)' }}>
          May Peace and Prosperity Be Upon You
        </p>
      </footer>
    </div>
  );
}

function TabButton({ icon, label, active, onClick }: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-[11px] px-4 py-1.5 rounded-lg font-semibold transition-all cursor-pointer"
      style={{
        fontFamily: HEADING_FONT,
        background: active ? 'linear-gradient(135deg, #e6c14c, #b8860b)' : 'transparent',
        color: active ? '#fff' : '#8a7a55',
        boxShadow: active ? '0 2px 14px rgba(184,134,11,0.45)' : 'none',
      }}
    >
      <span className="text-sm">{icon}</span>
      {label}
    </button>
  );
}

