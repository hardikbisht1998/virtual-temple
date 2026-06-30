import { useState, useEffect, useCallback } from 'react';
import type { TempleState } from './types';

const STORAGE_KEY = 'virtual-temple-state';

const defaultState: TempleState = {
  templeName: 'My Home Temple',
  placedIdols: [],
  incenseLit: false,
  diyas: 0,
  lastPujaDate: '',
};

function load(): TempleState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState, ...JSON.parse(raw) };
  } catch {}
  return defaultState;
}

function save(state: TempleState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useTempleStore() {
  const [state, setState] = useState<TempleState>(load);

  useEffect(() => { save(state); }, [state]);

  const setTempleName = useCallback((name: string) => {
    setState(s => ({ ...s, templeName: name }));
  }, []);

  const addIdol = useCallback((idolId: string) => {
    setState(s => ({
      ...s,
      placedIdols: [
        ...s.placedIdols,
        { instanceId: crypto.randomUUID(), idolId, hasGarland: false },
      ],
    }));
  }, []);

  const removeIdol = useCallback((instanceId: string) => {
    setState(s => ({
      ...s,
      placedIdols: s.placedIdols.filter(p => p.instanceId !== instanceId),
    }));
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
    setState(s => ({ ...s, incenseLit: true, lastPujaDate: new Date().toDateString() }));
  }, []);

  const lightDiya = useCallback(() => {
    setState(s => ({ ...s, diyas: s.diyas + 1 }));
  }, []);

  const resetPuja = useCallback(() => {
    setState(s => ({
      ...s,
      incenseLit: false,
      diyas: 0,
      placedIdols: s.placedIdols.map(p => ({ ...p, hasGarland: false })),
    }));
  }, []);

  return {
    state,
    setTempleName,
    addIdol,
    removeIdol,
    offerGarland,
    lightIncense,
    lightDiya,
    resetPuja,
  };
}
