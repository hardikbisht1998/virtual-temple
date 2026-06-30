import { useState } from 'react';
import { useTempleStore } from './useTempleStore';
import { TempleAltar } from './components/TempleAltar';
import { IdolSelector } from './components/IdolSelector';
import { PujaPanel } from './components/PujaPanel';
import { BhajanPlayer } from './components/BhajanPlayer';

const DECO_FONT = "'Cinzel Decorative', 'Cinzel', serif";
const HEADING_FONT = "'Cinzel', serif";

export default function App() {
  const { state, setTempleName, addIdol, removeIdol, offerGarland, lightIncense, lightDiya, resetPuja } = useTempleStore();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(state.templeName);

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
      <header className="relative text-center pt-6 pb-4 px-4">
        {/* Top ornamental line */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="h-px flex-1 max-w-32 sm:max-w-48" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,180,0,0.45))' }} />
          <span className="text-amber-600/70 text-xs tracking-[0.4em]" style={{ fontFamily: HEADING_FONT }}>✦ OM ✦</span>
          <div className="h-px flex-1 max-w-32 sm:max-w-48" style={{ background: 'linear-gradient(270deg, transparent, rgba(255,180,0,0.45))' }} />
        </div>

        {/* Temple name row */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 mb-2">
          <span className="text-4xl drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 8px rgba(255,160,0,0.5))' }}>🛕</span>
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
              style={{ fontFamily: DECO_FONT, textShadow: '0 0 32px rgba(255,180,0,0.35)' }}
              onClick={() => { setEditingName(true); setNameInput(state.templeName); }}
              title="Click to rename your temple"
            >
              {state.templeName}
            </h1>
          )}
          <span className="text-4xl drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 8px rgba(255,160,0,0.5))' }}>🛕</span>
        </div>

        {/* Mantra */}
        <p className="text-amber-600/70 text-[10px] sm:text-xs tracking-[0.3em] sm:tracking-[0.45em] uppercase" style={{ fontFamily: HEADING_FONT }}>
          Om Namah Shivaya &nbsp;•&nbsp; Jai Shri Ram &nbsp;•&nbsp; Jai Mata Di
        </p>

        {state.lastPujaDate && (
          <p className="text-amber-800/60 text-[10px] mt-1.5" style={{ fontFamily: HEADING_FONT }}>
            Last puja: {state.lastPujaDate}
          </p>
        )}

        {/* Bottom ornamental line */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <div className="h-px flex-1 max-w-36 sm:max-w-56" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,180,0,0.3))' }} />
          <span className="text-amber-800/50 text-[10px] tracking-[0.6em]">✦ ✦ ✦</span>
          <div className="h-px flex-1 max-w-36 sm:max-w-56" style={{ background: 'linear-gradient(270deg, transparent, rgba(255,180,0,0.3))' }} />
        </div>
      </header>

      {/* ── Main layout ────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Altar + selector */}
        <div className="lg:col-span-2 space-y-4">
          <TempleAltar
            placedIdols={state.placedIdols}
            incenseLit={state.incenseLit}
            diyas={state.diyas}
            onRemove={removeIdol}
            onGarland={offerGarland}
          />
          <IdolSelector onAdd={addIdol} />
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <PujaPanel
            incenseLit={state.incenseLit}
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
            style={{ background: 'linear-gradient(160deg, #0d0700, #1c0d00)', border: '1px solid rgba(180,100,0,0.28)' }}
          >
            <div className="p-4">
              <h3
                className="text-amber-500/90 text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3"
                style={{ fontFamily: HEADING_FONT }}
              >
                Temple Blessings
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Idols" value={state.placedIdols.length} icon="🏛️" />
                <Stat label="Garlands" value={state.placedIdols.filter(p => p.hasGarland).length} icon="🌸" />
                <Stat label="Diyas" value={state.diyas} icon="🪔" />
                <Stat label="Incense" value={state.incenseLit ? 'Lit' : '—'} icon="🕯️" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="text-center py-5 px-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="h-px flex-1 max-w-20" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,180,0,0.18))' }} />
          <span className="text-amber-900/70 text-sm">🙏</span>
          <div className="h-px flex-1 max-w-20" style={{ background: 'linear-gradient(270deg, transparent, rgba(255,180,0,0.18))' }} />
        </div>
        <p className="text-amber-900/50 text-[10px] tracking-[0.3em] uppercase" style={{ fontFamily: HEADING_FONT }}>
          May Peace and Prosperity Be Upon You
        </p>
      </footer>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div
      className="rounded-lg p-2.5 text-center"
      style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(120,60,0,0.25)' }}
    >
      <div className="text-base leading-tight mb-0.5">{icon}</div>
      <div className="text-amber-300 text-base font-bold leading-tight">{value}</div>
      <div className="text-amber-700/80 text-[10px] tracking-wide uppercase mt-0.5">{label}</div>
    </div>
  );
}
