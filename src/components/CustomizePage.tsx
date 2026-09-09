import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IDOLS } from '../data';
import { DeityPhoto } from './DeityPhoto';
import type { TempleState, UserProfile } from '../types';
import { downloadBackup, inspectBackup, applyBackup } from '../backup';
import {
  subscribeEventLog, clearEventLog, downloadEventLog,
  analyticsConsent, setAnalyticsConsent, track, type LoggedEvent,
} from '../analytics';

const DECO_FONT    = "'Cinzel Decorative', serif";
const HEADING_FONT = "'Cinzel', serif";

interface Props {
  user: UserProfile;
  state: TempleState;
  onSetUserName: (name: string) => void;
  onSetTempleName: (name: string) => void;
  onAddIdol: (idolId: string) => void;
  onRemoveIdolsOfType: (idolId: string) => void;
  onGuidedSetup: () => void;
  onDone: () => void;
}

export function CustomizePage({
  user, state,
  onSetUserName, onSetTempleName,
  onAddIdol, onRemoveIdolsOfType,
  onGuidedSetup, onDone,
}: Props) {
  const placedIdolIds = new Set(state.placedIdols.map(p => p.idolId));

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 space-y-5 pb-10">
      {/* ── Page intro ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="text-center pt-2"
      >
        <h2
          className="text-xl sm:text-2xl font-bold text-amber-950"
          style={{ fontFamily: DECO_FONT, textShadow: '0 1px 0 #fff' }}
        >
          Customize Your Sacred Mandir
        </h2>
        <p className="text-amber-700/80 text-[11px] mt-1 tracking-widest uppercase font-bold" style={{ fontFamily: HEADING_FONT }}>
          Shape your sacred space & devotion
        </p>
      </motion.div>

      <NamesCard
        user={user}
        templeName={state.templeName}
        onSetUserName={onSetUserName}
        onSetTempleName={onSetTempleName}
      />

      <DeitiesCard
        placedIdolIds={placedIdolIds}
        onAdd={onAddIdol}
        onRemove={onRemoveIdolsOfType}
      />

      <BackupCard templeName={state.templeName} />

      <AnalyticsCard />

      {/* ── Footer actions ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2"
      >
        <button
          onClick={onGuidedSetup}
          className="text-[11px] px-4 py-2.5 rounded-xl border transition-all cursor-pointer hover:bg-amber-100/50"
          style={{
            fontFamily: HEADING_FONT,
            color: '#7a5a1e',
            borderColor: 'rgba(201,162,39,0.4)',
            background: 'rgba(255,255,255,0.7)',
          }}
          title="Start the step-by-step setup again"
        >
          ✨ Re-run Guided Setup
        </button>
        <button
          onClick={onDone}
          className="px-8 py-2.5 rounded-xl font-bold text-sm text-white transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
          style={{
            fontFamily: HEADING_FONT,
            background: 'linear-gradient(135deg, #e6c14c, #b8860b)',
            boxShadow: '0 4px 16px rgba(184,134,11,0.35)',
          }}
        >
          Return to Altar 🛕
        </button>
      </motion.div>
    </div>
  );
}

/* ── Shared section card ─────────────────────────────────────── */


/* ── Backup & restore ────────────────────────────────────────────
   A temple lives in this browser alone. This is how a devotee keeps a copy
   of theirs and carries it to another device. */
function BackupCard({ templeName }: { templeName: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ text: string; summary: NonNullable<ReturnType<typeof inspectBackup>['summary']> } | null>(null);
  const [note, setNote] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  function chooseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be picked again after a cancel
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const check = inspectBackup(text);
      if (!check.ok || !check.summary) {
        setPending(null);
        setNote({ kind: 'err', text: check.message });
        return;
      }
      setNote(null);
      setPending({ text, summary: check.summary });
    };
    reader.onerror = () => setNote({ kind: 'err', text: 'That file could not be read.' });
    reader.readAsText(file);
  }

  function confirmRestore() {
    if (!pending) return;
    const res = applyBackup(pending.text);
    if (!res.ok) {
      setPending(null);
      setNote({ kind: 'err', text: res.message });
      return;
    }
    track('backup_restore', {});
    // reload so every hook re-reads storage rather than holding stale state
    window.location.reload();
  }

  return (
    <SectionCard
      icon="🗝️"
      title="Backup & Restore"
      subtitle="Keep a copy of your temple, or bring it to another device"
      delay={0.18}
    >
      <p className="text-[11px] text-amber-800/80 mb-4 leading-relaxed">
        Your mandir is saved in this browser only — clearing site data or switching
        device would lose it. Save a backup file to keep it safe.
      </p>

      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={() => { setNote(null); track('backup_save', {}); downloadBackup(templeName); }}
          className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl font-bold cursor-pointer transition-all active:scale-95"
          style={{
            fontFamily: HEADING_FONT,
            background: 'linear-gradient(135deg, #e6c14c, #b8860b)',
            color: '#fff',
            boxShadow: '0 2px 14px rgba(184,134,11,0.4)',
            border: 'none',
          }}
        >
          ⬇ Save Backup
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl font-bold cursor-pointer transition-all active:scale-95"
          style={{
            fontFamily: HEADING_FONT,
            background: 'rgba(255,255,255,0.75)',
            color: '#7a5a1e',
            border: '1px solid rgba(201,162,39,0.6)',
          }}
        >
          ⬆ Restore Backup
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={chooseFile}
          style={{ display: 'none' }}
        />
      </div>

      {/* Restoring replaces the current temple, so name what is in the file
          and make the devotee agree before anything is overwritten. */}
      {pending && (
        <div
          className="mt-4 rounded-2xl p-4"
          style={{ background: 'rgba(255,247,230,0.9)', border: '1px solid rgba(201,162,39,0.55)' }}
        >
          <p className="text-[11px] text-amber-950 leading-relaxed">
            This backup holds <b>{pending.summary.temple}</b> — {pending.summary.devotee}&rsquo;s
            temple with <b>{pending.summary.murtis}</b> {pending.summary.murtis === 1 ? 'murti' : 'murtis'},
            saved {pending.summary.savedAt}.
          </p>
          <p className="text-[11px] mt-1.5 mb-3" style={{ color: '#a3421f' }}>
            Restoring replaces the temple currently in this browser.
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmRestore}
              className="text-xs px-4 py-2 rounded-xl font-bold cursor-pointer active:scale-95"
              style={{ fontFamily: HEADING_FONT, background: 'linear-gradient(135deg, #e6c14c, #b8860b)', color: '#fff', border: 'none' }}
            >
              Restore this temple
            </button>
            <button
              onClick={() => setPending(null)}
              className="text-xs px-4 py-2 rounded-xl font-semibold cursor-pointer active:scale-95"
              style={{ fontFamily: HEADING_FONT, background: 'transparent', color: '#8a7a55', border: '1px solid rgba(176,180,190,0.7)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {note && (
        <p
          className="mt-3 text-[11px]"
          style={{ color: note.kind === 'err' ? '#a3421f' : '#4a7a3a', fontFamily: HEADING_FONT }}
        >
          {note.text}
        </p>
      )}
    </SectionCard>
  );
}


/* ── Usage log ───────────────────────────────────────────────────
   Every tracked event is kept locally so the app can be understood without
   any analytics account, and so it is obvious what would be sent if one is
   configured. Nothing here identifies a person. */
function AnalyticsCard() {
  const [events, setEvents] = useState<LoggedEvent[]>([]);
  const [consent, setConsent] = useState(analyticsConsent);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => subscribeEventLog(setEvents), []);

  /* A quick read on where attention actually went, computed from the same
     events GA would receive. */
  const summary = (() => {
    const secondsBy = new Map<string, number>();
    const counts = new Map<string, number>();
    for (const e of events) {
      counts.set(e.name, (counts.get(e.name) ?? 0) + 1);
      const secs = typeof e.params.seconds === 'number' ? e.params.seconds : 0;
      if (!secs) continue;
      const key =
        e.name === 'screen_time' ? `screen:${e.params.screen}` :
        e.name === 'darshan_time' ? `darshan:${e.params.deity}` :
        e.name === 'aarti_listen' ? `aarti:${e.params.deity}` : e.name;
      secondsBy.set(key, (secondsBy.get(key) ?? 0) + secs);
    }
    return {
      top: [...secondsBy.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      rites: counts.get('rite') ?? 0,
      darshans: counts.get('darshan_enter') ?? 0,
      pujas: counts.get('puja_complete') ?? 0,
    };
  })();

  const fmt = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);

  return (
    <SectionCard
      icon="📊"
      title="Usage & Analytics"
      subtitle="What gets used, and for how long"
      delay={0.22}
    >
      <div className="flex flex-wrap gap-4 mb-4">
        <Stat label="Events" value={String(events.length)} />
        <Stat label="Darshans" value={String(summary.darshans)} />
        <Stat label="Rites" value={String(summary.rites)} />
        <Stat label="Pujas completed" value={String(summary.pujas)} />
      </div>

      {summary.top.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] tracking-[0.18em] uppercase font-bold mb-2" style={{ fontFamily: HEADING_FONT, color: '#b8860b' }}>
            Where the time went
          </p>
          <div className="flex flex-col gap-1">
            {summary.top.map(([key, secs]) => {
              const max = summary.top[0][1] || 1;
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-900/80 w-40 truncate">{key}</span>
                  <div className="flex-1 rounded-full overflow-hidden" style={{ height: 8, background: 'rgba(184,134,11,0.14)' }}>
                    <div style={{ width: `${(secs / max) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#e6c14c,#b8860b)' }} />
                  </div>
                  <span className="text-[10px] text-amber-700/80 w-14 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(secs)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <label className="flex items-start gap-2.5 mb-3 cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={e => { setAnalyticsConsent(e.target.checked); setConsent(e.target.checked); }}
          style={{ marginTop: 2, accentColor: '#b8860b' }}
        />
        <span className="text-[11px] text-amber-800/85 leading-relaxed">
          Share anonymous usage data. Events record which features are used and for
          how long — never your name, your temple&rsquo;s name, or anything that
          identifies you. The log below is exactly what would be sent.
        </span>
      </label>

      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={() => setExpanded(x => !x)}
          className="text-xs px-4 py-2 rounded-xl font-bold cursor-pointer active:scale-95"
          style={{ fontFamily: HEADING_FONT, background: 'rgba(255,255,255,0.75)', color: '#7a5a1e', border: '1px solid rgba(201,162,39,0.6)' }}
        >
          {expanded ? 'Hide log' : `View log (${events.length})`}
        </button>
        <button
          onClick={downloadEventLog}
          disabled={events.length === 0}
          className="text-xs px-4 py-2 rounded-xl font-bold cursor-pointer active:scale-95"
          style={{
            fontFamily: HEADING_FONT,
            background: events.length ? 'linear-gradient(135deg, #e6c14c, #b8860b)' : 'rgba(220,215,200,0.6)',
            color: events.length ? '#fff' : '#a9a294', border: 'none',
          }}
        >
          ⬇ Export log
        </button>
        <button
          onClick={() => { clearEventLog(); track('log_cleared', {}); }}
          className="text-xs px-4 py-2 rounded-xl font-semibold cursor-pointer active:scale-95"
          style={{ fontFamily: HEADING_FONT, background: 'transparent', color: '#8a7a55', border: '1px solid rgba(176,180,190,0.7)' }}
        >
          Clear
        </button>
      </div>

      {expanded && (
        <div
          className="mt-3 rounded-2xl p-3 overflow-y-auto"
          style={{ maxHeight: 260, background: 'rgba(40,32,18,0.05)', border: '1px solid rgba(201,162,39,0.35)' }}
        >
          {events.length === 0 ? (
            <p className="text-[11px] text-amber-700/70">No events yet — use the temple and they will appear here.</p>
          ) : (
            [...events].reverse().map((e, i) => (
              <div key={i} className="text-[10px] font-mono leading-relaxed" style={{ color: '#5a4a2a' }}>
                <span style={{ opacity: 0.55 }}>{new Date(e.t).toLocaleTimeString()}</span>{' '}
                <span style={{ color: '#b8860b', fontWeight: 700 }}>{e.name}</span>{' '}
                <span style={{ opacity: 0.8 }}>
                  {Object.entries(e.params).map(([k, v]) => `${k}=${v}`).join(' ')}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </SectionCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-bold text-amber-950 leading-none" style={{ fontFamily: HEADING_FONT, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      <p className="text-[9px] tracking-[0.14em] uppercase text-amber-700/75 mt-1">{label}</p>
    </div>
  );
}

function SectionCard({ icon, title, subtitle, delay, children }: {
  icon: string;
  title: string;
  subtitle: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-3xl p-5 sm:p-6"
      style={{
        background: 'linear-gradient(165deg, #ffffff 0%, #faf6ec 50%, #f2e8d4 100%)',
        border: '2px solid rgba(201,162,39,0.6)',
        boxShadow: '0 12px 35px rgba(110,95,60,0.14)',
      }}
    >
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px rgba(255,160,0,0.4))' }}>{icon}</span>
        <div>
          <h3 className="text-amber-950 text-sm font-bold tracking-[0.15em] uppercase" style={{ fontFamily: HEADING_FONT }}>
            {title}
          </h3>
          <p className="text-amber-700/75 text-[10px] mt-0.5 font-semibold" style={{ fontFamily: HEADING_FONT }}>{subtitle}</p>
        </div>
      </div>
      {children}
    </motion.section>
  );
}

/* ── Names (devotee + temple) ───────────────────────────────── */

function NamesCard({ user, templeName, onSetUserName, onSetTempleName }: {
  user: UserProfile;
  templeName: string;
  onSetUserName: (name: string) => void;
  onSetTempleName: (name: string) => void;
}) {
  const [devotee, setDevotee] = useState(user.name);
  const [temple,  setTemple]  = useState(templeName);
  const [saved,   setSaved]   = useState(false);

  const dirty =
    (devotee.trim() !== user.name && devotee.trim() !== '') ||
    (temple.trim() !== templeName && temple.trim() !== '');

  function save() {
    if (devotee.trim() && devotee.trim() !== user.name) onSetUserName(devotee);
    if (temple.trim()  && temple.trim()  !== templeName) onSetTempleName(temple.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <SectionCard icon="📿" title="Mandir & Devotee Names" subtitle="Who worships here, and what this place is called" delay={0.05}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Devotee Name" value={devotee} onChange={setDevotee} placeholder="Your name…" onEnter={save} />
        <Field label="Temple Name"  value={temple}  onChange={setTemple}  placeholder="My Home Temple" onEnter={save} />
      </div>

      {/* Live preview */}
      <div
        className="mt-4 rounded-2xl px-4 py-3 text-center bg-white/70"
        style={{ border: '1px dashed rgba(201,162,39,0.5)' }}
      >
        <p className="text-amber-700/70 text-[9px] tracking-[0.3em] uppercase mb-1 font-bold" style={{ fontFamily: HEADING_FONT }}>
          Preview
        </p>
        <p className="text-amber-950 text-base font-bold" style={{ fontFamily: DECO_FONT }}>
          🛕 {temple.trim() || templeName} 🛕
        </p>
        <p className="text-amber-700 text-[10px] mt-0.5 font-semibold" style={{ fontFamily: HEADING_FONT }}>
          Devotee: {devotee.trim() || user.name}
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 mt-4">
        {saved && (
          <motion.span
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-emerald-700 font-bold text-xs"
            style={{ fontFamily: HEADING_FONT }}
          >
            ✓ Saved Successfully
          </motion.span>
        )}
        <button
          onClick={save}
          disabled={!dirty}
          className="px-6 py-2.5 rounded-xl font-bold text-xs transition-all"
          style={{
            fontFamily: HEADING_FONT,
            background: dirty ? 'linear-gradient(135deg, #e6c14c, #b8860b)' : 'rgba(180,180,180,0.3)',
            color: dirty ? '#fff' : '#999',
            cursor: dirty ? 'pointer' : 'not-allowed',
            boxShadow: dirty ? '0 4px 16px rgba(184,134,11,0.35)' : 'none',
          }}
        >
          Save Changes
        </button>
      </div>
    </SectionCard>
  );
}

function Field({ label, value, onChange, placeholder, onEnter }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onEnter?: () => void;
}) {
  return (
    <div>
      <label className="block text-amber-900 text-[10px] font-bold tracking-widest uppercase mb-1.5" style={{ fontFamily: HEADING_FONT }}>
        {label}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        placeholder={placeholder}
        className="w-full bg-white/85 rounded-xl px-4 py-2.5 text-amber-950 font-semibold text-sm outline-none transition-all"
        style={{ border: '1.5px solid rgba(201,162,39,0.4)' }}
        onFocus={e => (e.target.style.borderColor = '#b8860b')}
        onBlur={e  => (e.target.style.borderColor = 'rgba(201,162,39,0.4)')}
      />
    </div>
  );
}

/* ── Deities ─────────────────────────────────────────────────── */

function DeitiesCard({ placedIdolIds, onAdd, onRemove }: {
  placedIdolIds: Set<string>;
  onAdd: (idolId: string) => void;
  onRemove: (idolId: string) => void;
}) {
  return (
    <SectionCard
      icon="🛕"
      title="Enshrined Deities"
      subtitle={`${placedIdolIds.size} of ${IDOLS.length} deities enshrined — tap to invite or remove`}
      delay={0.12}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {IDOLS.map(idol => {
          const placed = placedIdolIds.has(idol.id);
          return (
            <button
              key={idol.id}
              onClick={() => (placed ? onRemove(idol.id) : onAdd(idol.id))}
              className="flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer group hover:scale-[1.02]"
              style={{
                background: placed ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
                borderColor: placed ? '#b8860b' : 'rgba(201,162,39,0.3)',
                boxShadow: placed ? '0 4px 16px rgba(184,134,11,0.2)' : 'none',
              }}
              title={placed ? `Remove ${idol.name} from altar` : `Add ${idol.name} to altar`}
            >
              <DeityPhoto emoji={idol.emoji} name={idol.name} color={idol.color} size="sm" selected={placed} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold truncate text-amber-950" style={{ fontFamily: HEADING_FONT }}>
                    {idol.name}
                  </span>
                  {placed && (
                    <span
                      className="text-[8px] px-1.5 py-0.5 rounded-full font-bold tracking-wider uppercase flex-shrink-0 bg-amber-100 text-amber-900 border border-amber-400/50"
                    >
                      Enshrined
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-amber-700/80 truncate">
                  {idol.description}
                </p>
                <p className="text-[9px] italic truncate mt-0.5 text-amber-900/60 font-serif">
                  {idol.mantra}
                </p>
              </div>

              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all"
                style={{
                  background: placed ? '#b8860b' : 'rgba(201,162,39,0.15)',
                  color: placed ? '#ffffff' : '#7a5a1e',
                  border: `1px solid ${placed ? '#b8860b' : 'rgba(201,162,39,0.4)'}`,
                }}
              >
                {placed ? '−' : '+'}
              </span>
            </button>
          );
        })}
      </div>

      {placedIdolIds.size === 0 && (
        <p
          className="mt-4 text-center text-xs rounded-xl px-4 py-3 border bg-white/60"
          style={{ color: '#7a5a1e', borderColor: 'rgba(201,162,39,0.35)', fontFamily: HEADING_FONT }}
        >
          Your mandir is currently empty — add at least one deity to begin your prayers. 🙏
        </p>
      )}
    </SectionCard>
  );
}
