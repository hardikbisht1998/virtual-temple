import { useState, useEffect, useCallback } from 'react';
import type { TempleState, UserProfile, DivaItem } from './types';

const USER_KEY  = 'vt-user-v2';
const STATE_KEY = 'vt-state-v2';
const THREE_HOURS = 3 * 60 * 60 * 1000;

const defaultState: TempleState = {
  templeName: 'My Home Temple',
  placedIdols: [],
  incenseLitAt: null,
  diyas: [],
  lastPujaDate: '',
};

function loadUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function loadState(): TempleState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch { return defaultState; }
}

function isActive(litAt: number | null): boolean {
  return litAt !== null && Date.now() - litAt < THREE_HOURS;
}

export function useTempleStore() {
  const [user,  setUserState]  = useState<UserProfile | null>(loadUser);
  const [state, setState]      = useState<TempleState>(loadState);

  // Persist user
  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else      localStorage.removeItem(USER_KEY);
  }, [user]);

  // Persist state
  useEffect(() => {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }, [state]);

  // Tick every 30 s — expire diyas and incense
  useEffect(() => {
    function tick() {
      const now = Date.now();
      setState(s => ({
        ...s,
        diyas: s.diyas.filter(d => d.expiresAt > now),
        incenseLitAt: s.incenseLitAt && now - s.incenseLitAt < THREE_HOURS
          ? s.incenseLitAt
          : null,
      }));
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const createUser = useCallback((name: string) => {
    setUserState({ id: crypto.randomUUID(), name: name.trim(), createdAt: new Date().toISOString() });
  }, []);

  const logout = useCallback(() => {
    setUserState(null);
    setState(defaultState);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(STATE_KEY);
  }, []);

  const setupTemple = useCallback((name: string, idolIds: string[]) => {
    setState(s => ({
      ...s,
      templeName: name || s.templeName,
      placedIdols: idolIds.map(idolId => ({
        instanceId: crypto.randomUUID(),
        idolId,
        hasGarland: false,
      })),
    }));
  }, []);

  const setTempleName = useCallback((name: string) => {
    setState(s => ({ ...s, templeName: name }));
  }, []);

  const addIdol = useCallback((idolId: string) => {
    setState(s => ({
      ...s,
      placedIdols: [...s.placedIdols, { instanceId: crypto.randomUUID(), idolId, hasGarland: false }],
    }));
  }, []);

  const removeIdol = useCallback((instanceId: string) => {
    setState(s => ({ ...s, placedIdols: s.placedIdols.filter(p => p.instanceId !== instanceId) }));
  }, []);

  const offerGarland = useCallback((instanceId: string) => {
    setState(s => ({
      ...s,
      placedIdols: s.placedIdols.map(p =>
        p.instanceId === instanceId ? { ...p, hasGarland: true } : p
      ),
    }));
  }, []);

  const lightIncense = useCallback(() => {
    setState(s => ({ ...s, incenseLitAt: Date.now(), lastPujaDate: new Date().toDateString() }));
  }, []);

  const lightDiya = useCallback(() => {
    const now = Date.now();
    setState(s => ({
      ...s,
      diyas: [...s.diyas, { id: crypto.randomUUID(), litAt: now, expiresAt: now + THREE_HOURS }],
      lastPujaDate: new Date().toDateString(),
    }));
  }, []);

  const resetPuja = useCallback(() => {
    setState(s => ({
      ...s,
      incenseLitAt: null,
      diyas: [],
      placedIdols: s.placedIdols.map(p => ({ ...p, hasGarland: false })),
    }));
  }, []);

  const incenseLit = isActive(state.incenseLitAt);

  return {
    user,
    state,
    incenseLit,
    createUser,
    logout,
    setupTemple,
    setTempleName,
    addIdol,
    removeIdol,
    offerGarland,
    lightIncense,
    lightDiya,
    resetPuja,
  };
}
