import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlacedIdol, DivaItem, PrasadItem, PrasadType } from '../types';
import { playGhantaSound, playShankhSound, playAbhishekamSound, playBeadClickSound } from '../audio/templeAudio';
import { VIDHI, ritesDoneFromState, nextRite, type RiteId } from '../ritual/vidhi';
import { track } from '../analytics';

/* The live 3D front view is heavy (three.js + models), so it loads lazily */
const MandirViewport = lazy(() => import('./MandirViewport'));

interface Props {
  placedIdols: PlacedIdol[];
  incenseLit: boolean;
  incenseLitAt: number | null;
  diyas: DivaItem[];
  prasad: PrasadItem[];
  abhishekamActive: boolean;
  onGarland: (id: string) => void;
  onApplyTilak: (id?: string) => void;
  onPerformAbhishekam: () => void;
  onOfferPrasad: (type: PrasadType) => void;
  onAddDeities?: () => void;
  onLightIncense: () => void;
  onLightDiya: () => void;
  onReset: () => void;
}

const THREE_HOURS = 3 * 60 * 60 * 1000;
const HEADING_FONT = "'Cinzel', serif";

export function TempleAltar({
  placedIdols,
  incenseLit,
  incenseLitAt,
  diyas,
  prasad,
  abhishekamActive,
  onGarland,
  onApplyTilak,
  onPerformAbhishekam,
  onOfferPrasad,
  onAddDeities,
  onLightIncense,
  onLightDiya,
  onReset,
}: Props) {
  const [ringing,        setRinging]        = useState<'L' | 'R' | null>(null);
  const [blowingShankh,  setBlowingShankh]  = useState(false);
  const [aartiActive,    setAartiActive]    = useState(false);
  /* Transient rites (shankh, ghanta, aarti) are gestures of this sitting —
     they reset with the page, unlike the offerings which persist. */
  const [sessionRites,   setSessionRites]   = useState<Set<RiteId>>(() => new Set());
  const [showPrasadMenu, setShowPrasadMenu] = useState(false);
  const [splashingJal,   setSplashingJal]   = useState(false);
  const [confirmReset,   setConfirmReset]   = useState(false);

  /* The rites completed this sitting, mirrored in a ref. Sound and analytics
     are side effects and must not live inside a state updater — React invokes
     updaters twice in development, which rang the bead twice and double-counted
     every rite. */
  const ritesRef = useRef<Set<RiteId>>(new Set());
  const completeRite = useCallback((id: RiteId) => {
    if (ritesRef.current.has(id)) return;
    ritesRef.current.add(id);
    playBeadClickSound();
    track('rite', { rite: id });
    setSessionRites(new Set(ritesRef.current));
  }, []);

  function ringBell(side: 'L' | 'R') {
    playGhantaSound();
    setRinging(side);
    completeRite('ghanta');
    setTimeout(() => setRinging(null), 1200);
  }

  function blowShankh() {
    playShankhSound();
    setBlowingShankh(true);
    completeRite('shankh');
    setTimeout(() => setBlowingShankh(false), 3800);
  }

  function triggerAbhishekam() {
    playAbhishekamSound();
    setSplashingJal(true);
    onPerformAbhishekam();
    setTimeout(() => setSplashingJal(false), 2400);
  }

  /* Aarti is a circling motion, not a button. Starting it opens the gesture
     overlay on the shrine; completing three circles completes the rite. */
  function startAarti() {
    if (aartiActive) return;
    setAartiActive(true);
    playGhantaSound();
  }

  const finishAarti = useCallback((completed: boolean) => {
    setAartiActive(false);
    if (completed) {
      track('aarti_gesture_complete', {});
      completeRite('aarti');
      playShankhSound();
    }
  }, [completeRite]);

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 2500);
      return;
    }
    setConfirmReset(false);
    ritesRef.current = new Set();
    setSessionRites(new Set());
    onReset();
  }

  const incenseRemaining = incenseLit && incenseLitAt
    ? Math.max(0, incenseLitAt + THREE_HOURS - Date.now())
    : 0;
  const incenseH = Math.floor(incenseRemaining / 3_600_000);
  const incenseM = Math.floor((incenseRemaining % 3_600_000) / 60_000);
  const pujaActive = incenseLit || diyas.length > 0 || prasad.length > 0 || abhishekamActive || placedIdols.some(p => p.hasGarland || p.hasTilak);

  const ritesDone = (() => {
    const done = ritesDoneFromState({ placedIdols, incenseLit, diyas, prasad, abhishekamActive });
    sessionRites.forEach(r => done.add(r));
    return done;
  })();
  const upNext = nextRite(ritesDone);
  const sampurna = upNext === null && placedIdols.length > 0;

  /* Fires once when the ninth rite lands — the completion rate of the vidhi
     is the clearest signal of whether the ritual flow actually works. */
  const sampurnaSent = useRef(false);
  useEffect(() => {
    if (sampurna && !sampurnaSent.current) {
      sampurnaSent.current = true;
      track('puja_complete', { rites: VIDHI.length });
    }
    if (!sampurna) sampurnaSent.current = false;
  }, [sampurna]);

  return (
    <div className="relative w-full select-none">
      {/* ── Shankh Radiance Glow Overlay ── */}
      <AnimatePresence>
        {blowingShankh && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.45, scale: 1.1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0 pointer-events-none rounded-3xl z-30"
            style={{
              background: 'radial-gradient(circle at center, rgba(255,215,0,0.6) 0%, rgba(255,140,0,0.3) 50%, transparent 80%)',
              mixBlendMode: 'screen',
            }}
          />
        )}
      </AnimatePresence>

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
        <div className="absolute top-4 left-[12%] right-[12%] flex justify-between items-start pointer-events-none z-10">
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
          className={`absolute top-[18%] left-[9%] text-2xl cursor-pointer z-20 transition-transform hover:scale-125 ${ringing === 'L' ? 'bell-ring-anim' : 'drift'}`}
          style={{ opacity: 0.9, filter: 'drop-shadow(0 0 8px rgba(255,180,0,0.5))', background: 'none', border: 'none', padding: 0 }}
          title="Ring the Sacred Ghanta (Bell)"
        >
          🔔
        </button>
        <button
          onClick={() => ringBell('R')}
          className={`absolute top-[18%] right-[9%] text-2xl cursor-pointer z-20 transition-transform hover:scale-125 ${ringing === 'R' ? 'bell-ring-anim' : 'drift'}`}
          style={{ opacity: 0.9, filter: 'drop-shadow(0 0 8px rgba(255,180,0,0.5))', animationDelay: ringing === 'R' ? undefined : '1.2s', background: 'none', border: 'none', padding: 0 }}
          title="Ring the Sacred Ghanta (Bell)"
        >
          🔔
        </button>

        {/* Incense Smoke */}
        {incenseLit && (
          <div className="absolute top-6 right-8 flex gap-4 z-20 pointer-events-none">
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

          {/* Abhishekam Water Splash Animation */}
          <AnimatePresence>
            {splashingJal && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
              >
                <div className="text-center">
                  <span className="text-5xl animate-bounce">💧</span>
                  <p className="text-xs text-white font-bold tracking-widest uppercase mt-1 drop-shadow-md" style={{ fontFamily: HEADING_FONT }}>
                    ✨ Sacred Ganga Jal Abhishekam ✨
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Aarti gesture — the devotee circles the flame by hand */}
          <AnimatePresence>
            {aartiActive && <AartiGesture onDone={finishAarti} />}
          </AnimatePresence>


          {placedIdols.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: 'rgba(245,240,228,0.85)' }}>
              <EmptyAltarState onAddDeities={onAddDeities} />
            </div>
          )}
        </div>

        {/* Wooden / Marble shelf */}
        <div
          className="absolute left-3 right-3 h-4 rounded-sm"
          style={{
            bottom: 52,
            background: 'linear-gradient(90deg, #b9bcc4 0%, #e9e6df 15%, #ffffff 50%, #e9e6df 85%, #b9bcc4 100%)',
            boxShadow: '0 3px 14px rgba(90,90,105,0.4), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(184,134,11,0.55)',
          }}
        />

        {/* Prasad & Diyas on the Altar */}
        <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-3 px-4 flex-wrap z-10">
          {prasad.map(p => (
            <div
              key={p.id}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-amber-950 shadow-md border"
              style={{
                background: 'linear-gradient(135deg, #fff3d1, #fcedc2)',
                borderColor: '#e5b842',
              }}
              title={`Offered: ${p.name}`}
            >
              <span>{p.emoji}</span>
              <span style={{ fontFamily: HEADING_FONT }}>{p.name}</span>
            </div>
          ))}

          {diyas.slice(0, 7).map(d => (
            <Diya key={d.id} diya={d} />
          ))}
        </div>
      </div>

      {/* ── Vidhi rail: where you are in the ceremony ── */}
      {placedIdols.length > 0 && (
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 mt-4 mb-12 px-2 flex-wrap">
          {VIDHI.map((rite, i) => {
            const done = ritesDone.has(rite.id);
            const isNext = upNext?.id === rite.id;
            return (
              <div key={rite.id} className="flex items-center gap-1 sm:gap-1.5">
                {i > 0 && (
                  <span
                    className="block w-3 sm:w-5 h-px"
                    style={{ background: done || isNext ? 'rgba(184,134,11,0.55)' : 'rgba(176,180,190,0.45)' }}
                  />
                )}
                <span
                  title={`${rite.name}${done ? ' — done' : isNext ? ' — next' : ''}`}
                  className={`flex items-center justify-center rounded-full leading-none ${isNext ? 'breathe' : ''}`}
                  style={{
                    width: 24, height: 24, fontSize: 12,
                    border: `1.5px solid ${done ? 'rgba(184,134,11,0.9)' : isNext ? 'rgba(184,134,11,0.7)' : 'rgba(176,180,190,0.5)'}`,
                    background: done ? 'linear-gradient(135deg,#f3dc9a,#d9a441)' : 'rgba(255,255,255,0.75)',
                    boxShadow: isNext ? '0 0 10px rgba(255,170,0,0.55)' : 'none',
                    filter: done || isNext ? 'none' : 'saturate(45%) opacity(0.75)',
                  }}
                >
                  {done ? '✓' : rite.emoji}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sacred Puja Table (Offerings Bar) ────────────────────────── */}
      <div className="relative mx-auto mt-1" style={{ width: '92%' }}>
        <div
          className="h-14 rounded-b-2xl"
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #ede8da 40%, #cfc8b4 100%)',
            boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.95), inset 0 3px 0 rgba(201,162,39,0.45), inset 0 -6px 12px rgba(150,140,110,0.35), 0 10px 22px rgba(110,95,60,0.35)',
            borderLeft: '1px solid rgba(176,180,190,0.7)',
            borderRight: '1px solid rgba(176,180,190,0.7)',
          }}
        />

        <div className="absolute inset-x-0 -top-9 flex justify-center items-end gap-5 sm:gap-9 flex-wrap px-2">
          {/* Shankhnaad */}
          <PujaItem
            emoji="🐚"
            caption={blowingShankh ? 'Blowing…' : 'Shankh'}
            title="Blow the Sacred Conch Shell"
            active={blowingShankh}
            next={upNext?.id === 'shankh'}
            onClick={blowShankh}
          />

          {/* Agarbatti */}
          <PujaItem
            emoji="🕯️"
            caption={incenseLit ? `${incenseH}h ${String(incenseM).padStart(2, '0')}m` : 'Agarbatti'}
            title={incenseLit ? 'Agarbatti is burning' : 'Light the agarbatti'}
            active={incenseLit}
            next={upNext?.id === 'agarbatti'}
            onClick={onLightIncense}
          />

          {/* Deepam */}
          <PujaItem
            emoji="🪔"
            caption={diyas.length > 0 ? `${diyas.length} lit` : 'Deepam'}
            title="Light a deepam"
            active={diyas.length > 0}
            next={upNext?.id === 'deepam'}
            onClick={onLightDiya}
          />

          {/* Aarti */}
          <PujaItem
            emoji="✨"
            caption={aartiActive ? 'In Aarti' : ritesDone.has('aarti') ? 'Aarti ✓' : 'Aarti'}
            title="Perform Aarti — circle the flame with your hand"
            active={aartiActive || ritesDone.has('aarti')}
            next={upNext?.id === 'aarti'}
            onClick={startAarti}
          />

          {/* Pushpam */}
          <PujaItem
            emoji="🌸"
            caption="Pushpam"
            title="Offer garland to deities"
            active={placedIdols.some(p => p.hasGarland)}
            next={upNext?.id === 'pushpam'}
            onClick={() => {
              const next = placedIdols.find(p => !p.hasGarland);
              if (next) onGarland(next.instanceId);
            }}
          />

          {/* Abhishekam */}
          <PujaItem
            emoji="💧"
            caption={abhishekamActive ? 'Blessed' : 'Ganga Jal'}
            title="Perform Holy Water Abhishekam"
            active={abhishekamActive}
            next={upNext?.id === 'abhishekam'}
            onClick={triggerAbhishekam}
          />

          {/* Tilak */}
          <PujaItem
            emoji="🔴"
            caption={placedIdols.some(p => p.hasTilak) ? 'Tilak' : 'Chandan'}
            title="Apply sacred Chandan & Kumkum Tilak"
            active={placedIdols.some(p => p.hasTilak)}
            next={upNext?.id === 'chandan'}
            onClick={() => onApplyTilak()}
          />

          {/* Naivedyam / Prasad */}
          <div className="relative">
            <PujaItem
              emoji="🥟"
              caption={prasad.length > 0 ? `${prasad.length} Prasad` : 'Naivedyam'}
              title="Offer Prasad & Naivedyam"
              active={prasad.length > 0}
              next={upNext?.id === 'naivedyam'}
              onClick={() => setShowPrasadMenu(p => !p)}
            />

            {/* Prasad selection popup */}
            {showPrasadMenu && (
              <div
                className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-2 rounded-2xl shadow-xl border bg-white/95 backdrop-blur-md whitespace-nowrap"
                style={{ borderColor: 'rgba(201,162,39,0.6)', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}
              >
                <button
                  onClick={() => { onOfferPrasad('modak'); setShowPrasadMenu(false); }}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-xl hover:bg-amber-100/70 cursor-pointer text-amber-900 font-semibold"
                  style={{ fontFamily: HEADING_FONT }}
                >
                  <span>🥟</span> Modak
                </button>
                <button
                  onClick={() => { onOfferPrasad('laddoo'); setShowPrasadMenu(false); }}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-xl hover:bg-amber-100/70 cursor-pointer text-amber-900 font-semibold"
                  style={{ fontFamily: HEADING_FONT }}
                >
                  <span>🟡</span> Laddoo
                </button>
                <button
                  onClick={() => { onOfferPrasad('fruits'); setShowPrasadMenu(false); }}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-xl hover:bg-amber-100/70 cursor-pointer text-amber-900 font-semibold"
                  style={{ fontFamily: HEADING_FONT }}
                >
                  <span>🍎</span> Fruits
                </button>
                <button
                  onClick={() => { onOfferPrasad('panchamrit'); setShowPrasadMenu(false); }}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-xl hover:bg-amber-100/70 cursor-pointer text-amber-900 font-semibold"
                  style={{ fontFamily: HEADING_FONT }}
                >
                  <span>🍯</span> Naivedyam
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guidance / status */}
      <p
        className="text-center mt-4 text-[11px] tracking-[0.14em]"
        style={{ fontFamily: HEADING_FONT, color: pujaActive ? '#b8860b' : '#8b8f98' }}
      >
        {sampurna
          ? '🙏 Puja Sampurna — may peace and prosperity be upon this house'
          : upNext && placedIdols.length > 0
          ? `${upNext.emoji} ${upNext.invitation}`
          : pujaActive
          ? `🌟 Divine Puja in Progress${diyas.length > 0 ? ` • ${diyas.length} deepam lit` : ''}${incenseLit ? ` • agarbatti ${incenseH}h ${String(incenseM).padStart(2, '0')}m` : ''}`
          : 'Blow the Shankh • light deepam & agarbatti • ring the bells • offer prasad & flowers'}
      </p>

      {pujaActive && (
        <button
          onClick={handleReset}
          className="block mx-auto mt-2 text-[10px] tracking-[0.14em] uppercase cursor-pointer transition-colors"
          style={{
            fontFamily: HEADING_FONT,
            color: confirmReset ? '#c0392b' : '#8b8f98',
            background: 'none', border: 'none',
          }}
        >
          {confirmReset ? 'tap again to conclude this puja' : '↺ begin a new puja'}
        </button>
      )}
    </div>
  );
}


/* ── Aarti gesture ────────────────────────────────────────────────
   Aarti is a circling motion, so it is performed as one: hold and move
   the flame in circles before the deity. Three full circles complete the
   rite. The flame follows the hand; a ring fills as the circles build.
   Embodiment is most of what separates ritual from UI. */
const AARTI_CIRCLES = 3;

function AartiGesture({ onDone }: { onDone: (completed: boolean) => void }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [flame, setFlame] = useState<{ x: number; y: number } | null>(null);
  const [progress, setProgress] = useState(0); // 0..1
  const angleRef = useRef<{ last: number | null; acc: number }>({ last: null, acc: 0 });
  const doneRef = useRef(false);
  const bellsRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Slow bells while the aarti is in motion
  useEffect(() => {
    bellsRef.current = setInterval(() => playGhantaSound(), 2100);
    return () => { if (bellsRef.current) clearInterval(bellsRef.current); };
  }, []);

  const handleMove = useCallback((e: React.PointerEvent) => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return; // hold to wave
    const el = areaRef.current;
    if (!el || doneRef.current) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    setFlame({ x, y });
    const cx = r.width / 2, cy = r.height / 2;
    const a = Math.atan2(y - cy, x - cx);
    const st = angleRef.current;
    if (st.last !== null) {
      let d = a - st.last;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      // ignore wild jumps (pointer re-entering)
      if (Math.abs(d) < Math.PI / 2) st.acc += d;
    }
    st.last = a;
    const p = Math.min(1, Math.abs(st.acc) / (AARTI_CIRCLES * Math.PI * 2));
    setProgress(p);
    if (p >= 1 && !doneRef.current) {
      doneRef.current = true;
      setTimeout(() => onDone(true), 550);
    }
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      ref={areaRef}
      className="absolute inset-0 z-30 cursor-none touch-none"
      style={{ background: 'radial-gradient(ellipse at center, rgba(20,10,2,0.25) 0%, rgba(20,10,2,0.62) 100%)' }}
      onPointerMove={handleMove}
      onPointerDown={handleMove}
      onPointerLeave={() => { angleRef.current.last = null; }}
    >
      {/* progress ring */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
        <div
          className="rounded-full"
          style={{
            width: 30, height: 30,
            background: `conic-gradient(#ffc24d ${progress * 360}deg, rgba(255,255,255,0.18) 0deg)`,
            boxShadow: '0 0 12px rgba(255,170,0,0.5)',
            mask: 'radial-gradient(circle, transparent 8px, black 9px)',
            WebkitMask: 'radial-gradient(circle, transparent 8px, black 9px)',
          }}
        />
        <span
          className="text-[10px] tracking-[0.22em] uppercase font-bold"
          style={{ fontFamily: HEADING_FONT, color: '#ffe2aa', textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}
        >
          {progress >= 1 ? 'Aarti complete' : `circle the flame · ${Math.min(AARTI_CIRCLES, Math.floor(progress * AARTI_CIRCLES) + 1)} of ${AARTI_CIRCLES}`}
        </span>
      </div>

      {/* the flame follows the hand */}
      {flame && (
        <div
          className="absolute pointer-events-none"
          style={{ left: flame.x, top: flame.y, transform: 'translate(-50%, -62%)', filter: 'drop-shadow(0 0 20px #FF8C00)' }}
        >
          <span style={{ fontSize: 36 }}>🪔</span>
        </div>
      )}
      {!flame && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className="text-[11px] tracking-[0.2em] uppercase font-bold breathe"
            style={{ fontFamily: HEADING_FONT, color: '#ffe2aa', textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}
          >
            {'\u{1FA94} hold & move in circles before the deity'}
          </span>
        </div>
      )}

      <button
        onClick={() => onDone(false)}
        className="absolute bottom-2.5 right-3 text-[10px] tracking-[0.16em] uppercase cursor-pointer px-3 py-1.5 rounded-full"
        style={{
          fontFamily: HEADING_FONT, color: '#f3e4c2',
          background: 'rgba(40,24,10,0.6)', border: '1px solid rgba(243,228,194,0.35)',
        }}
      >
        set down
      </button>
    </motion.div>
  );
}

/* An item resting on the puja table. `next` marks the rite the vidhi
   invites now — a gentle pulse, never a lock: every rite stays tappable. */
function PujaItem({ emoji, caption, title, active, next = false, onClick }: {
  emoji: string;
  caption: string;
  title: string;
  active: boolean;
  next?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex flex-col items-center gap-0.5 cursor-pointer transition-transform hover:scale-115 active:scale-95"
      style={{ background: 'none', border: 'none', padding: 0 }}
    >
      <span
        className={`text-2xl sm:text-3xl leading-none ${active || next ? 'breathe' : ''}`}
        style={{
          filter: active
            ? 'drop-shadow(0 0 12px rgba(255,160,0,0.85))'
            : next
            ? 'drop-shadow(0 0 10px rgba(255,170,0,0.7))'
            : 'drop-shadow(0 3px 5px rgba(110,95,60,0.5)) saturate(70%)',
          opacity: active || next ? 1 : 0.85,
        }}
      >
        {emoji}
      </span>
      <span
        className="text-[9px] tracking-[0.14em] uppercase leading-none font-semibold"
        style={{ fontFamily: HEADING_FONT, color: active ? '#b8860b' : next ? '#d98e04' : '#8b8f98' }}
      >
        {caption}
      </span>
    </button>
  );
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
            fontFamily: HEADING_FONT,
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
      <div
        className="flame w-2 h-3 rounded-full"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,210,0.9) 0%, #FFA500 45%, #FF4500 100%)' }}
      />
      <div className="w-px h-2 bg-gray-600" />
      <div
        className="w-6 h-3 rounded-b-full"
        style={{ background: 'linear-gradient(180deg, #C26820, #8B4513)', boxShadow: '0 0 9px rgba(255,140,0,0.65)' }}
      />
      <span className="text-amber-600/55 mt-0.5" style={{ fontSize: 8 }}>
        {h}h{String(m).padStart(2, '0')}m
      </span>
    </div>
  );
}
