import { useState, useEffect, lazy, Suspense } from 'react';
import type { PlacedIdol, DivaItem } from '../types';

/* The live 3D front view is heavy (three.js + models), so it loads lazily */
const MandirViewport = lazy(() => import('./MandirViewport'));

interface Props {
  placedIdols: PlacedIdol[];
  incenseLit: boolean;
  incenseLitAt: number | null;
  diyas: DivaItem[];
  onGarland: (id: string) => void;
  onAddDeities?: () => void;
  onLightIncense: () => void;
  onLightDiya: () => void;
  onReset: () => void;
}

const THREE_HOURS = 3 * 60 * 60 * 1000;

export function TempleAltar({
  placedIdols, incenseLit, incenseLitAt, diyas,
  onGarland, onAddDeities, onLightIncense, onLightDiya, onReset,
}: Props) {
  const [ringing,      setRinging]      = useState<'L' | 'R' | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function ringBell(side: 'L' | 'R') {
    playBellSound();
    setRinging(side);
    setTimeout(() => setRinging(null), 700);
  }

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 2500);
      return;
    }
    setConfirmReset(false);
    onReset();
  }

  const incenseRemaining = incenseLit && incenseLitAt
    ? Math.max(0, incenseLitAt + THREE_HOURS - Date.now())
    : 0;
  const incenseH = Math.floor(incenseRemaining / 3_600_000);
  const incenseM = Math.floor((incenseRemaining % 3_600_000) / 60_000);
  const pujaActive = incenseLit || diyas.length > 0;

  return (
    <div className="relative w-full select-none">
      <div
        className="relative mx-auto rounded-t-[50%] overflow-visible"
        style={{
          width: '97%',
          minHeight: 340,
          border: '3px solid rgba(201,162,39,0.65)',
          background: [
            'linear-gradient(115deg, transparent 40%, rgba(160,165,178,0.16) 43%, transparent 47%)',
            'linear-gradient(62deg, transparent 58%, rgba(160,165,178,0.12) 61%, transparent 66%)',
            'linear-gradient(150deg, transparent 20%, rgba(190,175,140,0.10) 23%, transparent 27%)',
            'radial-gradient(ellipse 95% 75% at 50% 20%, #ffffff 0%, #f1ebdd 80%)',
          ].join(', '),
          boxShadow: [
            'inset 0 0 90px rgba(212,175,55,0.12)',
            'inset 0 50px 80px rgba(255,255,255,0.6)',
            '0 0 45px rgba(184,134,11,0.20)',
            '0 6px 24px rgba(110,95,60,0.30)',
          ].join(', '),
        }}
      >
        {/* Inner arch ring */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: 10, left: 10, right: 10, bottom: 0,
            borderTop: '1px solid rgba(176,180,190,0.55)',
            borderLeft: '1px solid rgba(176,180,190,0.55)',
            borderRight: '1px solid rgba(176,180,190,0.55)',
            borderRadius: 'inherit',
          }}
        />

        {/* Toran — marigold garland across the arch */}
        <div className="absolute top-4 left-[12%] right-[12%] flex justify-between items-start pointer-events-none">
          {Array.from({ length: 13 }).map((_, i) => (
            <span
              key={i}
              className="leading-none"
              style={{
                fontSize: i % 2 === 0 ? 13 : 9,
                marginTop: Math.sin((i / 12) * Math.PI) * 14,
                filter: 'drop-shadow(0 0 4px rgba(255,160,0,0.45))',
                opacity: 0.9,
              }}
            >
              🌼
            </span>
          ))}
        </div>

        {/* Hanging bells — tap to ring */}
        <button
          onClick={() => ringBell('L')}
          className={`absolute top-[18%] left-[9%] text-xl cursor-pointer z-10 transition-transform hover:scale-110 ${ringing === 'L' ? 'bell-ring-anim' : 'drift'}`}
          style={{ opacity: 0.85, filter: 'drop-shadow(0 0 6px rgba(255,180,0,0.4))', background: 'none', border: 'none', padding: 0 }}
          title="Ring the ghanta"
        >
          🔔
        </button>
        <button
          onClick={() => ringBell('R')}
          className={`absolute top-[18%] right-[9%] text-xl cursor-pointer z-10 transition-transform hover:scale-110 ${ringing === 'R' ? 'bell-ring-anim' : 'drift'}`}
          style={{ opacity: 0.85, filter: 'drop-shadow(0 0 6px rgba(255,180,0,0.4))', animationDelay: ringing === 'R' ? undefined : '1.2s', background: 'none', border: 'none', padding: 0 }}
          title="Ring the ghanta"
        >
          🔔
        </button>

        {/* Side shadow bands */}
        <div className="absolute left-0 top-[12%] bottom-0 w-8 opacity-60 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, rgba(150,155,168,0.4), transparent)' }} />
        <div className="absolute right-0 top-[12%] bottom-0 w-8 opacity-60 pointer-events-none"
          style={{ background: 'linear-gradient(270deg, rgba(150,155,168,0.4), transparent)' }} />

        {/* Incense */}
        {incenseLit && (
          <div className="absolute top-6 right-8 flex gap-4 z-10 pointer-events-none">
            {[0, 1, 2].map(i => <SmokeColumn key={i} delay={i * 0.45} />)}
          </div>
        )}

        {/* Mandir view — live front view of the 3D mandir */}
        <div
          className="relative mx-4 sm:mx-10 rounded-xl overflow-hidden"
          style={{ marginTop: 52, marginBottom: 86, height: 320, border: '1px solid rgba(201,162,39,0.5)', boxShadow: '0 6px 20px rgba(110,95,60,0.3)' }}
        >
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center" style={{ background: '#4a3d5c' }}>
                <span className="text-4xl breathe" style={{ filter: 'drop-shadow(0 0 12px rgba(255,180,0,0.6))' }}>🕉</span>
              </div>
            }
          >
            <MandirViewport placedIdols={placedIdols} onGarland={onGarland} />
          </Suspense>
          <span
            className="absolute top-2 left-3 text-[9px] uppercase tracking-[0.2em] pointer-events-none"
            style={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'Cinzel', serif" }}
          >
            front view · 3D mandir · tap a murti to offer garland
          </span>
          {placedIdols.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(245,240,228,0.85)' }}>
              <EmptyAltarState onAddDeities={onAddDeities} />
            </div>
          )}
        </div>

        {/* Wooden shelf */}
        <div
          className="absolute left-3 right-3 h-4 rounded-sm"
          style={{
            bottom: 52,
            background: 'linear-gradient(90deg, #b9bcc4 0%, #e9e6df 15%, #ffffff 50%, #e9e6df 85%, #b9bcc4 100%)',
            boxShadow: '0 3px 14px rgba(90,90,105,0.4), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(184,134,11,0.55)',
          }}
        />

        {/* Diyas with countdown */}
        {diyas.length > 0 && (
          <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-3 flex-wrap px-2">
            {diyas.slice(0, 9).map(d => <Diya key={d.id} diya={d} />)}
          </div>
        )}

        {/* Bottom decorative */}
        <div
          className="absolute bottom-0 left-0 right-0 h-12 flex items-end justify-center pb-1 pointer-events-none"
          style={{ color: 'rgba(184,134,11,0.5)', fontSize: 11, letterSpacing: '0.4em' }}
        >
          ✦ ॐ ✦ ॐ ✦ ॐ ✦
        </div>
      </div>

      {/* ── Puja table — offer like at home ─────────────────── */}
      <div className="relative mx-auto" style={{ width: '90%' }}>
        <div
          className="h-12 rounded-b-2xl"
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #ede8da 40%, #cfc8b4 100%)',
            boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.95), inset 0 3px 0 rgba(201,162,39,0.45), inset 0 -6px 12px rgba(150,140,110,0.35), 0 10px 22px rgba(110,95,60,0.35)',
            borderLeft: '1px solid rgba(176,180,190,0.7)',
            borderRight: '1px solid rgba(176,180,190,0.7)',
          }}
        />
        <div className="absolute inset-x-0 -top-8 flex justify-center items-end gap-10 sm:gap-16">
          <PujaItem
            emoji="🕯️"
            caption={incenseLit ? `${incenseH}h ${String(incenseM).padStart(2, '0')}m` : 'Agarbatti'}
            title={incenseLit ? 'Agarbatti is burning' : 'Light the agarbatti'}
            active={incenseLit}
            onClick={onLightIncense}
          />
          <PujaItem
            emoji="🪔"
            caption={diyas.length > 0 ? `${diyas.length} lit` : 'Deepam'}
            title="Light a deepam"
            active={diyas.length > 0}
            onClick={onLightDiya}
          />
          <PujaItem
            emoji="🌸"
            caption="Pushpam"
            title="Offer flowers to the deities"
            active={placedIdols.some(p => p.hasGarland)}
            onClick={() => {
              const next = placedIdols.find(p => !p.hasGarland);
              if (next) onGarland(next.instanceId);
            }}
          />
        </div>
      </div>

      {/* Guidance / status */}
      <p
        className="text-center mt-3 text-[11px] tracking-[0.14em]"
        style={{ fontFamily: "'Cinzel', serif", color: pujaActive ? '#b8860b' : '#8b8f98' }}
      >
        {pujaActive
          ? `🌟 Puja in progress${diyas.length > 0 ? ` — ${diyas.length} deepam glowing` : ''}${incenseLit ? ` • agarbatti ${incenseH}h ${String(incenseM).padStart(2, '0')}m` : ''}`
          : 'Light the deepam & agarbatti • ring the bells • tap a deity to offer flowers'}
      </p>
      {pujaActive && (
        <button
          onClick={handleReset}
          className="block mx-auto mt-1.5 text-[10px] tracking-[0.14em] uppercase cursor-pointer transition-colors"
          style={{
            fontFamily: "'Cinzel', serif",
            color: confirmReset ? '#c0392b' : '#8b8f98',
            background: 'none', border: 'none',
          }}
        >
          {confirmReset ? 'tap again to end this puja' : '↺ begin a new puja'}
        </button>
      )}
    </div>
  );
}

/* An item resting on the puja table */
function PujaItem({ emoji, caption, title, active, onClick }: {
  emoji: string;
  caption: string;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-110 active:scale-95"
      style={{ background: 'none', border: 'none', padding: 0 }}
    >
      <span
        className={`text-3xl leading-none ${active ? 'breathe' : ''}`}
        style={{
          filter: active
            ? 'drop-shadow(0 0 12px rgba(255,160,0,0.85))'
            : 'drop-shadow(0 3px 5px rgba(110,95,60,0.5)) saturate(70%)',
          opacity: active ? 1 : 0.85,
        }}
      >
        {emoji}
      </span>
      <span
        className="text-[9px] tracking-[0.18em] uppercase leading-none"
        style={{ fontFamily: "'Cinzel', serif", color: active ? '#b8860b' : '#8b8f98' }}
      >
        {caption}
      </span>
    </button>
  );
}

function playBellSound() {
  try {
    const ctx  = new AudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.5);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.8);
  } catch { /* audio not available */ }
}

function EmptyAltarState({ onAddDeities }: { onAddDeities?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <span className="text-7xl opacity-30 drift">🏛️</span>
      <p className="text-sm text-center" style={{ color: '#a1782a' }}>Your sacred space awaits</p>
      {onAddDeities && (
        <button
          onClick={onAddDeities}
          className="text-xs px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer active:scale-95"
          style={{
            fontFamily: "'Cinzel', serif",
            background: 'linear-gradient(135deg, #e6c14c, #b8860b)',
            color: '#fff',
            boxShadow: '0 2px 14px rgba(184,134,11,0.45)',
          }}
        >
          ➕ Invite Deities
        </button>
      )}
    </div>
  );
}

function SmokeColumn({ delay }: { delay: number }) {
  return (
    <div className="relative w-2 h-20">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-amber-950 h-14 w-0.5 rounded-full" />
      <div className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-500 glow-anim" style={{ bottom: 56 }} />
      {[0, 1, 2].map(j => (
        <div
          key={j}
          className="smoke-particle w-2.5 h-2.5 rounded-full bg-gray-500/30"
          style={{ bottom: 60, animationDelay: `${delay + j * 0.65}s`, animationIterationCount: 'infinite' }}
        />
      ))}
    </div>
  );
}

function Diya({ diya }: { diya: DivaItem }) {
  const [remaining, setRemaining] = useState(Math.max(0, diya.expiresAt - Date.now()));

  useEffect(() => {
    const id = setInterval(() => setRemaining(Math.max(0, diya.expiresAt - Date.now())), 10_000);
    return () => clearInterval(id);
  }, [diya.expiresAt]);

  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);

  return (
    <div className="flex flex-col items-center gap-0">
      {/* Flame */}
      <div
        className="flame w-2 h-3 rounded-full"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,210,0.9) 0%, #FFA500 45%, #FF4500 100%)' }}
      />
      {/* Wick */}
      <div className="w-px h-2 bg-gray-600" />
      {/* Body */}
      <div
        className="w-6 h-3 rounded-b-full"
        style={{ background: 'linear-gradient(180deg, #C26820, #8B4513)', boxShadow: '0 0 9px rgba(255,140,0,0.65)' }}
      />
      {/* Countdown */}
      <span className="text-amber-600/55 mt-0.5" style={{ fontSize: 8 }}>
        {h}h{String(m).padStart(2, '0')}m
      </span>
    </div>
  );
}
