import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { IDOLS } from '../data';
import { IdolCard } from './IdolCard';
import type { PlacedIdol, DivaItem } from '../types';

interface Props {
  placedIdols: PlacedIdol[];
  incenseLit: boolean;
  incenseLitAt: number | null;
  diyas: DivaItem[];
  onRemove: (id: string) => void;
  onGarland: (id: string) => void;
}

export function TempleAltar({ placedIdols, incenseLit, diyas, onRemove, onGarland }: Props) {
  return (
    <div className="relative w-full select-none">
      <div
        className="relative mx-auto rounded-t-[50%] overflow-visible"
        style={{
          width: '97%',
          minHeight: 340,
          border: '3px solid rgba(200,110,0,0.42)',
          background: 'radial-gradient(ellipse 95% 75% at 50% 20%, rgba(55,18,0,0.96) 0%, rgba(14,5,0,1) 80%)',
          boxShadow: [
            'inset 0 0 90px rgba(200,80,0,0.07)',
            'inset 0 50px 80px rgba(255,120,0,0.04)',
            '0 0 45px rgba(180,70,0,0.16)',
            '0 6px 24px rgba(0,0,0,0.85)',
          ].join(', '),
        }}
      >
        {/* Inner arch ring */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: 10, left: 10, right: 10, bottom: 0,
            borderTop: '1px solid rgba(200,100,0,0.18)',
            borderLeft: '1px solid rgba(200,100,0,0.18)',
            borderRight: '1px solid rgba(200,100,0,0.18)',
            borderRadius: 'inherit',
          }}
        />

        {/* Top kalash */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
          <span className="text-3xl leading-none" style={{ filter: 'drop-shadow(0 0 8px rgba(255,180,0,0.6))' }}>🪔</span>
          <div className="w-24 h-px mt-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,180,0,0.5), transparent)' }} />
        </div>

        {/* Side shadow bands */}
        <div className="absolute left-0 top-[12%] bottom-0 w-8 opacity-55 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, rgba(100,35,0,0.7), transparent)' }} />
        <div className="absolute right-0 top-[12%] bottom-0 w-8 opacity-55 pointer-events-none"
          style={{ background: 'linear-gradient(270deg, rgba(100,35,0,0.7), transparent)' }} />

        {/* Incense */}
        {incenseLit && (
          <div className="absolute top-6 right-8 flex gap-4">
            {[0, 1, 2].map(i => <SmokeColumn key={i} delay={i * 0.45} />)}
          </div>
        )}

        {/* Idol shelf area */}
        <div className="flex flex-wrap justify-center items-end gap-3 sm:gap-5 px-10 pt-12 pb-[76px] min-h-[300px]">
          {placedIdols.length === 0 ? (
            <EmptyAltarState />
          ) : (
            <AnimatePresence>
              {placedIdols.map(placed => {
                const idol = IDOLS.find(i => i.id === placed.idolId);
                if (!idol) return null;
                return (
                  <div key={placed.instanceId} className="group relative">
                    <IdolCard placed={placed} idol={idol} onRemove={onRemove} onGarland={onGarland} />
                  </div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Wooden shelf */}
        <div
          className="absolute left-3 right-3 h-4 rounded-sm"
          style={{
            bottom: 52,
            background: 'linear-gradient(90deg, #3d1800 0%, #7a3200 15%, #c05c18 50%, #7a3200 85%, #3d1800 100%)',
            boxShadow: '0 3px 14px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,160,0,0.2)',
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
          style={{ color: 'rgba(200,120,0,0.32)', fontSize: 11, letterSpacing: '0.4em' }}
        >
          ✦ ॐ ✦ ॐ ✦ ॐ ✦
        </div>
      </div>
    </div>
  );
}

function EmptyAltarState() {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <span className="text-7xl opacity-25 drift">🏛️</span>
      <p className="text-sm text-amber-800/45 text-center">Your sacred space awaits</p>
      <p className="text-xs text-amber-900/30 text-center">Invite divine deities from below</p>
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
          className="smoke-particle w-2.5 h-2.5 rounded-full bg-gray-300/20"
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
