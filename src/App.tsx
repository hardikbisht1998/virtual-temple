import { useState, lazy, Suspense } from 'react';
import { useTempleStore } from './useTempleStore';
import { OnboardingWizard } from './components/OnboardingWizard';
import { TempleAltar } from './components/TempleAltar';
import { CustomizePage } from './components/CustomizePage';
import { JapaMalaModal } from './components/JapaMalaModal';
import { DailyShlokaModal } from './components/DailyShlokaModal';
import { DarshanShareModal } from './components/DarshanShareModal';
import { startOmDrone, stopOmDrone, isOmDronePlaying } from './audio/templeAudio';

const Temple3D = lazy(() =>
  import('./components/Temple3D').then(m => ({ default: m.Temple3D }))
);

const DECO_FONT    = "'Cinzel Decorative', serif";
const HEADING_FONT = "'Cinzel', serif";

type Page = 'temple' | 'mandir3d' | 'customize';

export default function App() {
  const {
    user, state, incenseLit, abhishekamActive,
    createUser, setUserName, logout, setupTemple, setTempleName,
    addIdol, setIdolModel, removeIdol, removeIdolsOfType, offerGarland,
    applyTilak, performAbhishekam, offerPrasad,
    lightIncense, lightDiya, incrementJapa, resetPuja,
  } = useTempleStore();

  const [page,               setPage]               = useState<Page>('temple');
  const [customizing,        setCustomizing]        = useState(false);
  const [editingName,        setEditingName]        = useState(false);
  const [nameInput,          setNameInput]          = useState(state.templeName);
  const [omDroneActive,      setOmDroneActive]      = useState(isOmDronePlaying);
  const [showJapaModal,      setShowJapaModal]      = useState(false);
  const [showShlokaModal,    setShowShlokaModal]    = useState(false);
  const [showDarshanModal,   setShowDarshanModal]   = useState(false);

  function toggleOmAudio() {
    if (omDroneActive) {
      stopOmDrone();
      setOmDroneActive(false);
    } else {
      startOmDrone();
      setOmDroneActive(true);
    }
  }

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
      <header className="relative z-20 text-center pt-5 pb-3 px-4">
        {/* Top rule */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="h-px flex-1 max-w-32 sm:max-w-48" style={{ background: 'linear-gradient(90deg, transparent, rgba(184,134,11,0.55))' }} />
          <span className="text-[10px] tracking-[0.4em]" style={{ fontFamily: HEADING_FONT, color: '#b8860b' }}>✦ OM ✦</span>
          <div className="h-px flex-1 max-w-32 sm:max-w-48" style={{ background: 'linear-gradient(270deg, transparent, rgba(184,134,11,0.55))' }} />
        </div>

        {/* Title row */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 mb-1">
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
        <p className="text-[10px] tracking-[0.3em] sm:tracking-[0.45em] uppercase font-semibold" style={{ fontFamily: HEADING_FONT, color: 'rgba(161,120,42,0.85)' }}>
          Om Namah Shivaya &nbsp;•&nbsp; Jai Shri Ram &nbsp;•&nbsp; Jai Mata Di
        </p>

        {/* Secondary Quick Action Bar (Mala, Shloka, Share, Om Drone, Streak) */}
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          {/* 108 Japa Mala button */}
          <button
            onClick={() => setShowJapaModal(true)}
            className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-xl border font-semibold transition-all cursor-pointer hover:scale-105"
            style={{
              fontFamily: HEADING_FONT,
              background: 'rgba(255,255,255,0.85)',
              borderColor: 'rgba(201,162,39,0.5)',
              color: '#6b5312',
              boxShadow: '0 2px 8px rgba(184,134,11,0.15)',
            }}
          >
            <span>📿</span> 108 Mala
          </button>

          {/* Daily Shloka button */}
          <button
            onClick={() => setShowShlokaModal(true)}
            className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-xl border font-semibold transition-all cursor-pointer hover:scale-105"
            style={{
              fontFamily: HEADING_FONT,
              background: 'rgba(255,255,255,0.85)',
              borderColor: 'rgba(201,162,39,0.5)',
              color: '#6b5312',
              boxShadow: '0 2px 8px rgba(184,134,11,0.15)',
            }}
          >
            <span>📜</span> Daily Shloka
          </button>

          {/* Share Darshan button */}
          <button
            onClick={() => setShowDarshanModal(true)}
            className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-xl border font-semibold transition-all cursor-pointer hover:scale-105"
            style={{
              fontFamily: HEADING_FONT,
              background: 'rgba(255,255,255,0.85)',
              borderColor: 'rgba(201,162,39,0.5)',
              color: '#6b5312',
              boxShadow: '0 2px 8px rgba(184,134,11,0.15)',
            }}
          >
            <span>📤</span> Share Darshan
          </button>

          {/* Om Drone Toggle button */}
          <button
            onClick={toggleOmAudio}
            className={`flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-xl border font-semibold transition-all cursor-pointer hover:scale-105 ${omDroneActive ? 'breathe' : ''}`}
            style={{
              fontFamily: HEADING_FONT,
              background: omDroneActive ? 'linear-gradient(135deg, #e6c14c, #b8860b)' : 'rgba(255,255,255,0.85)',
              borderColor: omDroneActive ? '#b8860b' : 'rgba(201,162,39,0.5)',
              color: omDroneActive ? '#ffffff' : '#6b5312',
              boxShadow: omDroneActive ? '0 2px 12px rgba(184,134,11,0.45)' : 'none',
            }}
            title={omDroneActive ? 'Mute Om Drone' : 'Play Meditative Om Tanpura Drone'}
          >
            <span>🕉</span> {omDroneActive ? 'Om Drone: ON' : 'Om Sound'}
          </button>

          {/* Puja Streak Badge */}
          {state.pujaStreak > 0 && (
            <div
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl border font-bold text-amber-950 shadow-sm"
              style={{
                fontFamily: HEADING_FONT,
                background: 'linear-gradient(135deg, #fff2cc, #ffe082)',
                borderColor: '#e6c14c',
              }}
              title="Consecutive daily devotion streak"
            >
              <span>🔥</span> {state.pujaStreak}d Streak
            </div>
          )}
        </div>

        {/* Bottom row: nav tabs centered, user at right */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center mt-3.5 gap-2">
          <div className="hidden sm:flex items-center justify-start">
            <div className="h-px w-16 sm:w-24" style={{ background: 'linear-gradient(270deg, rgba(176,180,190,0.7), transparent)' }} />
          </div>

          <nav
            className="flex items-center gap-1 p-1 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(176,180,190,0.6)', boxShadow: '0 2px 10px rgba(120,110,80,0.12)' }}
          >
            <TabButton icon="🛕" label="Temple"    active={page === 'temple'}    onClick={() => setPage('temple')} />
            <TabButton icon="🕉" label="3D Mandir" active={page === 'mandir3d'}  onClick={() => setPage('mandir3d')} />
            <TabButton icon="🎨" label="Customize" active={page === 'customize'} onClick={() => setPage('customize')} />
          </nav>

          <div className="flex items-center justify-end">
            <button
              onClick={logout}
              className="text-[10px] px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-bold"
              style={{
                fontFamily: HEADING_FONT,
                color: '#7a5a1e',
                borderColor: 'rgba(201,162,39,0.45)',
                background: 'rgba(255,255,255,0.75)',
              }}
              title="Switch user"
            >
              👤 {user.name}
            </button>
          </div>
        </div>
      </header>

      {/* ── Modals ─────────────────────────────────────────── */}
      <JapaMalaModal
        isOpen={showJapaModal}
        onClose={() => setShowJapaModal(false)}
        japaCounts={state.japaCounts}
        onIncrementJapa={incrementJapa}
      />

      <DailyShlokaModal
        isOpen={showShlokaModal}
        onClose={() => setShowShlokaModal(false)}
        pujaStreak={state.pujaStreak}
        totalPujas={state.totalPujas}
        userName={user.name}
      />

      <DarshanShareModal
        isOpen={showDarshanModal}
        onClose={() => setShowDarshanModal(false)}
        templeName={state.templeName}
        devoteeName={user.name}
        placedIdols={state.placedIdols}
        incenseLit={incenseLit}
        diyasCount={state.diyas.length}
        prasad={state.prasad}
        pujaStreak={state.pujaStreak}
      />

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
          <Temple3D placedIdols={state.placedIdols} onAddIdol={addIdol} onRemoveIdol={removeIdol} onSetIdolModel={setIdolModel} />
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
          className="text-center text-xs tracking-[0.25em] uppercase mb-4 font-bold"
          style={{ fontFamily: HEADING_FONT, color: 'rgba(184,134,11,0.85)' }}
        >
          🙏 Namaste {user.name} — come, offer your sacred prayers
        </p>
        <TempleAltar
          placedIdols={state.placedIdols}
          incenseLit={incenseLit}
          incenseLitAt={state.incenseLitAt}
          diyas={state.diyas}
          prasad={state.prasad}
          abhishekamActive={abhishekamActive}
          onGarland={offerGarland}
          onApplyTilak={applyTilak}
          onPerformAbhishekam={performAbhishekam}
          onOfferPrasad={offerPrasad}
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
        <p className="text-[10px] tracking-[0.3em] uppercase font-bold" style={{ fontFamily: HEADING_FONT, color: 'rgba(139,143,152,0.85)' }}>
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
      className="flex items-center gap-1.5 text-[11px] px-4 py-1.5 rounded-xl font-bold transition-all cursor-pointer"
      style={{
        fontFamily: HEADING_FONT,
        background: active ? 'linear-gradient(135deg, #e6c14c, #b8860b)' : 'transparent',
        color: active ? '#fff' : '#7a5a1e',
        boxShadow: active ? '0 2px 14px rgba(184,134,11,0.45)' : 'none',
      }}
    >
      <span className="text-sm">{icon}</span>
      {label}
    </button>
  );
}
