import { useState, useRef, useEffect } from 'react';
import { BHAJANS } from '../data';

const YOUTUBE_LINKS: Record<string, string> = {
  'om-namah': 'https://www.youtube.com/results?search_query=om+namah+shivaya+bhajan',
  'jai-ganesha': 'https://www.youtube.com/results?search_query=jai+ganesha+bhajan',
  'hare-krishna': 'https://www.youtube.com/results?search_query=hare+krishna+mahamantra',
  'jai-ambe': 'https://www.youtube.com/results?search_query=jai+ambe+gauri+bhajan',
  'hanuman-chalisa': 'https://www.youtube.com/results?search_query=hanuman+chalisa+bhajan',
  'lakshmi-aarti': 'https://www.youtube.com/results?search_query=lakshmi+aarti+bhajan',
};

const DEITY_COLORS: Record<string, string> = {
  Shiva: '#4169E1',
  Ganesha: '#FF8C00',
  Krishna: '#8B30D0',
  Durga: '#DC143C',
  Hanuman: '#FF4500',
  Lakshmi: '#FF69B4',
};

function createAmbience(ctx: AudioContext) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.frequency.value = 136.1;
  osc2.frequency.value = 272.2;
  gain.gain.value = 0.05;
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc1.start();
  osc2.start();
  return { stop: () => { try { osc1.stop(); osc2.stop(); } catch {} } };
}

export function BhajanPlayer() {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<{ stop: () => void } | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  function toggleAmbience() {
    if (playing) {
      audioRef.current?.stop();
      setPlaying(false);
    } else {
      ctxRef.current = new AudioContext();
      audioRef.current = createAmbience(ctxRef.current);
      setPlaying(true);
    }
  }

  useEffect(() => { return () => { audioRef.current?.stop(); }; }, []);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #0a0600 0%, #180c00 100%)',
        border: '1px solid rgba(180,100,0,0.28)',
      }}
    >
      <div className="p-4">
        <h3
          className="text-amber-400/90 text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          🎶 Bhajan Sangeet
        </h3>

        {/* Om ambience toggle */}
        <button
          onClick={toggleAmbience}
          className="w-full mb-3 py-2.5 px-3 rounded-xl text-xs font-medium transition-all border"
          style={{
            background: playing ? 'rgba(255,140,0,0.14)' : 'rgba(0,0,0,0.25)',
            borderColor: playing ? 'rgba(255,140,0,0.45)' : 'rgba(100,50,0,0.32)',
            color: playing ? '#FFB347' : '#7a5012',
          }}
        >
          {playing ? '⏸ Stop Om Meditation Tone' : '▶ Play Om Tone (136 Hz)'}
        </button>

        {/* Bhajan list */}
        <div className="space-y-1.5">
          {BHAJANS.map(b => {
            const color = DEITY_COLORS[b.deity] ?? '#FF8C00';
            return (
              <a
                key={b.id}
                href={YOUTUBE_LINKS[b.id]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-colors group"
                style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(100,50,0,0.28)' }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = `${color}12`;
                  el.style.borderColor = `${color}40`;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = 'rgba(0,0,0,0.2)';
                  el.style.borderColor = 'rgba(100,50,0,0.28)';
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: `${color}22`, border: `1px solid ${color}40` }}
                >
                  🎵
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-amber-200/85 text-xs font-medium truncate">{b.title}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: `${color}AA` }}>{b.deity}</div>
                </div>
                <span className="text-amber-800/55 text-[10px] group-hover:text-amber-500/80 transition-colors flex-shrink-0">▶ YT</span>
              </a>
            );
          })}
        </div>

        <p className="text-center text-amber-900/45 text-[10px] mt-2.5">
          Opens on YouTube in a new tab
        </p>
      </div>
    </div>
  );
}
