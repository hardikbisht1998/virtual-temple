/* Usage analytics.

   Two sinks, one API. Every `track()` call goes to:
     1. a local ring buffer (always) — visible in the Customize page and
        downloadable, so the app can be understood without any account;
     2. Google Analytics 4 (only when VITE_GA_ID is set and the devotee has
        not opted out).

   What is deliberately NOT sent: the devotee's name, their temple's name,
   any free text, any identifier that could single a person out. Events carry
   deity ids, feature names and durations — enough to learn which parts of the
   temple people use and for how long, and nothing that identifies who.

   Note that a deity choice is, strictly, a signal about someone's religious
   practice. It stays pseudonymous here and never leaves as PII, but that is
   why consent is honoured and why a visible opt-out exists. */

const GA_ID: string | undefined = import.meta.env.VITE_GA_ID;
const CONSENT_KEY = 'vt-analytics-consent';
const LOG_KEY = 'vt-event-log';
const LOG_CAP = 300;

export interface LoggedEvent {
  t: number;                       // epoch ms
  name: string;
  params: Record<string, string | number | boolean>;
}

let log: LoggedEvent[] = loadLog();
const logListeners = new Set<(l: LoggedEvent[]) => void>();
let started = false;

/* ── consent ─────────────────────────────────────────────────── */

export function analyticsConsent(): boolean {
  try {
    // absent = allowed; the devotee has to actively turn it off
    return localStorage.getItem(CONSENT_KEY) !== 'off';
  } catch {
    return false;
  }
}

export function setAnalyticsConsent(on: boolean): void {
  try {
    localStorage.setItem(CONSENT_KEY, on ? 'on' : 'off');
  } catch { /* storage blocked — treat as session-only */ }
  if (!on) gtag('consent', 'update', { analytics_storage: 'denied' });
  else gtag('consent', 'update', { analytics_storage: 'granted' });
}

/* ── local log ───────────────────────────────────────────────── */

function loadLog(): LoggedEvent[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(-LOG_CAP) : [];
  } catch {
    return [];
  }
}

function persistLog(): void {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-LOG_CAP)));
  } catch { /* a full store shouldn't break the app */ }
}

export function getEventLog(): LoggedEvent[] {
  return log;
}

export function clearEventLog(): void {
  log = [];
  persistLog();
  logListeners.forEach(fn => fn(log));
}

export function subscribeEventLog(fn: (l: LoggedEvent[]) => void): () => void {
  logListeners.add(fn);
  fn(log);
  return () => { logListeners.delete(fn); };
}

/* Events as newline-delimited JSON — trivially greppable, and loadable into
   a spreadsheet or BigQuery without a parser. */
export function downloadEventLog(): void {
  const body = log.map(e => JSON.stringify({ time: new Date(e.t).toISOString(), event: e.name, ...e.params })).join('\n');
  const blob = new Blob([body], { type: 'application/x-ndjson' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `virtual-temple-events-${new Date().toISOString().slice(0, 10)}.ndjson`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ── Google Analytics ────────────────────────────────────────── */

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
}

function gtag(...args: unknown[]): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

/* Load GA4 once, at startup. Without VITE_GA_ID this does nothing at all —
   the app runs identically in development with only the local log. */
export function initAnalytics(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  track('session_start', { has_ga: !!GA_ID });

  if (!GA_ID) return;

  gtag('consent', 'default', {
    analytics_storage: analyticsConsent() ? 'granted' : 'denied',
  });

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);

  gtag('js', new Date());
  gtag('config', GA_ID, {
    // the app is one page; screens are sent explicitly as events
    send_page_view: false,
    anonymize_ip: true,
  });
}

/* ── the one call sites use ──────────────────────────────────── */

export function track(name: string, params: Record<string, string | number | boolean> = {}): void {
  const entry: LoggedEvent = { t: Date.now(), name, params };
  log = [...log, entry].slice(-LOG_CAP);
  persistLog();
  logListeners.forEach(fn => fn(log));

  if (GA_ID && analyticsConsent()) gtag('event', name, params);
}

/* Durations are the whole point of "how long do people spend here", so they
   get a helper that rounds to whole seconds and drops absurd values (a laptop
   left open overnight is not engagement). */
const MAX_REASONABLE_SECONDS = 60 * 60;

export function trackDuration(name: string, startedAt: number, params: Record<string, string | number | boolean> = {}): void {
  const seconds = Math.round((Date.now() - startedAt) / 1000);
  if (seconds <= 0 || seconds > MAX_REASONABLE_SECONDS) return;
  track(name, { ...params, seconds });
}
