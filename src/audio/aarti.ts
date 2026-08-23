/* Aarti playback.

   One aarti plays at a time, from a single shared <audio> element — a temple
   with two songs going at once is not a temple. Files are served from
   public/aarti/ rather than imported, so the browser streams a track only
   when it is actually asked for instead of bundling ~50MB into the app. */

import { stopOmDrone, isOmDronePlaying } from './templeAudio';

export interface AartiTrack {
  deity: string;   // IDOLS id
  title: string;
  artist: string;
  url: string;
}

export const AARTIS: AartiTrack[] = [
  { deity: 'ganesha',   title: 'Jai Ganesh Deva',        artist: 'Anuradha Paudwal', url: '/aarti/ganesha.mp3' },
  { deity: 'shiva',     title: 'Om Jai Shiv Omkara',     artist: 'Anuradha Paudwal', url: '/aarti/shiva.mp3' },
  { deity: 'lakshmi',   title: 'Om Jai Lakshmi Mata',    artist: 'Alka Yagnik',      url: '/aarti/lakshmi.mp3' },
  { deity: 'durga',     title: 'Jai Ambe Gauri',         artist: 'Traditional',      url: '/aarti/durga.mp3' },
  { deity: 'kali',      title: 'Ambe Tu Hai Jagdambe',   artist: 'Traditional',      url: '/aarti/kali.mp3' },
  { deity: 'krishna',   title: 'Aarti Kunj Bihari Ki',   artist: 'Hariharan',        url: '/aarti/krishna.mp3' },
  { deity: 'ram',       title: 'Aarti Shree Ram Ji Ki',  artist: 'Satya Adhikari',   url: '/aarti/ram.mp3' },
  { deity: 'hanuman',   title: 'Shree Hanuman Chalisa',  artist: 'Hariharan',        url: '/aarti/hanuman.mp3' },
  { deity: 'saraswati', title: 'Jai Saraswati Mata',     artist: 'Traditional',      url: '/aarti/saraswati.mp3' },
  { deity: 'jagannath', title: 'Shri Jagannath Aarti',   artist: 'Traditional',      url: '/aarti/jagannath.mp3' },
];

const BY_DEITY = new Map(AARTIS.map(a => [a.deity, a]));

export function aartiFor(deityId: string | undefined): AartiTrack | undefined {
  return deityId ? BY_DEITY.get(deityId) : undefined;
}

export function hasAarti(deityId: string): boolean {
  return BY_DEITY.has(deityId);
}

export interface AartiState {
  deity: string | null;   // which aarti is loaded
  playing: boolean;
  position: number;       // seconds
  duration: number;       // seconds, 0 until metadata arrives
  loading: boolean;
  error: string | null;
}

let audio: HTMLAudioElement | null = null;
let state: AartiState = { deity: null, playing: false, position: 0, duration: 0, loading: false, error: null };
const listeners = new Set<(s: AartiState) => void>();

function emit(patch: Partial<AartiState>) {
  state = { ...state, ...patch };
  listeners.forEach(fn => fn(state));
}

function element(): HTMLAudioElement {
  if (audio) return audio;
  const el = new Audio();
  el.preload = 'metadata';
  // kept in the document (hidden) rather than detached — some mobile
  // browsers are happier about resuming playback that way
  el.setAttribute('data-aarti', '');
  el.style.display = 'none';
  el.addEventListener('loadedmetadata', () => emit({ duration: el.duration || 0, loading: false }));
  el.addEventListener('timeupdate', () => emit({ position: el.currentTime }));
  el.addEventListener('ended', () => emit({ playing: false, position: 0 }));
  el.addEventListener('play', () => emit({ playing: true }));
  el.addEventListener('pause', () => emit({ playing: false }));
  el.addEventListener('error', () => emit({ playing: false, loading: false, error: 'This aarti could not be played.' }));
  if (typeof document !== 'undefined') document.body.appendChild(el);
  audio = el;
  return el;
}

export function subscribeAarti(fn: (s: AartiState) => void): () => void {
  listeners.add(fn);
  fn(state);
  return () => { listeners.delete(fn); };
}

export function getAartiState(): AartiState {
  return state;
}

/* Play a deity's aarti. Starting one silences the Om drone — they occupy the
   same air. Returns false when that deity has no aarti. */
export function playAarti(deityId: string): boolean {
  const track = aartiFor(deityId);
  if (!track) return false;
  const el = element();
  if (state.deity !== deityId) {
    el.src = track.url;
    el.currentTime = 0;
    emit({ deity: deityId, position: 0, duration: 0, loading: true, error: null });
  }
  if (isOmDronePlaying()) stopOmDrone();
  void el.play().catch(() => emit({ playing: false, loading: false, error: 'Playback was blocked — tap again.' }));
  return true;
}

export function pauseAarti(): void {
  audio?.pause();
}

/* The play button next to a deity: start theirs, or pause if it is already
   the one playing. */
export function toggleAarti(deityId: string): void {
  if (state.deity === deityId && state.playing) pauseAarti();
  else playAarti(deityId);
}

export function stopAarti(): void {
  if (!audio) return;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  emit({ deity: null, playing: false, position: 0, duration: 0, loading: false, error: null });
}

export function seekAarti(seconds: number): void {
  if (!audio || !Number.isFinite(seconds)) return;
  audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || 0));
  emit({ position: audio.currentTime });
}

export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
