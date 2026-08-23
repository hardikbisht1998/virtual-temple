/* Backup and restore the whole temple.

   Everything a devotee builds lives in three localStorage keys, which means
   it lives in one browser on one device — a cleared cache or a new phone
   loses it. This bundles all three into a single file they can keep, and
   reads it back. No server, no account. */

import { LAYOUT_KEY } from './layout3d';

const USER_KEY = 'vt-user-v2';
const STATE_KEY = 'vt-state-v2';

/* Bump when the shape changes in a way an older app couldn't read. */
export const BACKUP_VERSION = 1;

export interface TempleBackup {
  format: 'virtual-temple-backup';
  version: number;
  savedAt: string;
  user: unknown;
  state: unknown;
  layout: unknown;
}

function readKey(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function buildBackup(): TempleBackup {
  return {
    format: 'virtual-temple-backup',
    version: BACKUP_VERSION,
    savedAt: new Date().toISOString(),
    user: readKey(USER_KEY),
    state: readKey(STATE_KEY),
    layout: readKey(LAYOUT_KEY),
  };
}

/* Filename carries the temple's name and the date, so a folder of backups
   stays readable: "bisht-parivar-mandir-2026-08-23.temple.json" */
export function backupFilename(templeName: string): string {
  const slug = (templeName || 'my-temple')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'my-temple';
  return `${slug}-${new Date().toISOString().slice(0, 10)}.temple.json`;
}

export function downloadBackup(templeName: string): void {
  const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFilename(templeName);
  document.body.appendChild(a);
  a.click();
  a.remove();
  // give the browser a moment to start the download before revoking
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface RestoreResult {
  ok: boolean;
  message: string;
  /* what the file contains, for a confirmation prompt */
  summary?: { devotee: string; temple: string; murtis: number; savedAt: string };
}

/* Parse and sanity-check a backup without applying it, so the devotee can be
   told what they are about to overwrite. */
export function inspectBackup(text: string): RestoreResult {
  let parsed: Partial<TempleBackup>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: 'That file is not readable — is it a temple backup?' };
  }
  if (!parsed || parsed.format !== 'virtual-temple-backup') {
    return { ok: false, message: 'That file is not a Virtual Temple backup.' };
  }
  if (typeof parsed.version === 'number' && parsed.version > BACKUP_VERSION) {
    return { ok: false, message: 'That backup was made by a newer version of the app.' };
  }
  const user = parsed.user as { name?: string } | null;
  const state = parsed.state as { templeName?: string; placedIdols?: unknown[] } | null;
  if (!user && !state) {
    return { ok: false, message: 'That backup is empty.' };
  }
  return {
    ok: true,
    message: 'ready',
    summary: {
      devotee: user?.name ?? 'unnamed devotee',
      temple: state?.templeName ?? 'unnamed temple',
      murtis: Array.isArray(state?.placedIdols) ? state.placedIdols.length : 0,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt.slice(0, 10) : 'unknown date',
    },
  };
}

/* Write a checked backup into storage. The caller reloads afterwards so every
   hook re-reads from scratch rather than half the app holding stale state. */
export function applyBackup(text: string): RestoreResult {
  const check = inspectBackup(text);
  if (!check.ok) return check;
  const parsed = JSON.parse(text) as TempleBackup;
  try {
    if (parsed.user) localStorage.setItem(USER_KEY, JSON.stringify(parsed.user));
    else localStorage.removeItem(USER_KEY);
    if (parsed.state) localStorage.setItem(STATE_KEY, JSON.stringify(parsed.state));
    else localStorage.removeItem(STATE_KEY);
    if (parsed.layout) localStorage.setItem(LAYOUT_KEY, JSON.stringify(parsed.layout));
    else localStorage.removeItem(LAYOUT_KEY);
  } catch {
    return { ok: false, message: 'Could not write to this browser’s storage.' };
  }
  return { ok: true, message: 'restored', summary: check.summary };
}
