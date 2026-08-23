import { useState, useEffect, useCallback } from 'react';
import type { TempleState, UserProfile, PrasadType, PrasadItem } from './types';
import { defaultModelId } from './constants/models';

const USER_KEY  = 'vt-user-v2';
const STATE_KEY = 'vt-state-v2';
const THREE_HOURS = 3 * 60 * 60 * 1000;

const defaultState: TempleState = {
  templeName: 'My Home Temple',
  placedIdols: [],
  incenseLitAt: null,
  diyas: [],
  prasad: [],
  abhishekamAt: null,
  lastPujaDate: '',
  lastPujaTimestamp: null,
  pujaStreak: 0,
  totalPujas: 0,
  japaCounts: {},
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
    return {
      ...defaultState,
      ...parsed,
      prasad: parsed.prasad || [],
      japaCounts: parsed.japaCounts || {},
      pujaStreak: parsed.pujaStreak || 0,
      totalPujas: parsed.totalPujas || 0,
    };
  } catch { return defaultState; }
}

function isActive(litAt: number | null): boolean {
  return litAt !== null && Date.now() - litAt < THREE_HOURS;
}

function calculateStreak(lastTimestamp: number | null, currentStreak: number): number {
  if (!lastTimestamp) return 1;
  const now = new Date();
  const last = new Date(lastTimestamp);

  // Strip time for day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate()).getTime();
  const diffDays = Math.round((today - lastDay) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Already did puja today; streak unchanged
    return Math.max(1, currentStreak);
  } else if (diffDays === 1) {
    // Consecutive day; streak increments
    return (currentStreak || 0) + 1;
  } else {
    // Missed a day; reset to 1
    return 1;
  }
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

  // Tick every 30 s — expire diyas, incense, and prasad
  useEffect(() => {
    function tick() {
      const now = Date.now();
      setState(s => ({
        ...s,
        diyas: s.diyas.filter(d => d.expiresAt > now),
        prasad: s.prasad.filter(p => now - p.offeredAt < THREE_HOURS),
        incenseLitAt: s.incenseLitAt && now - s.incenseLitAt < THREE_HOURS
          ? s.incenseLitAt
          : null,
        abhishekamAt: s.abhishekamAt && now - s.abhishekamAt < THREE_HOURS
          ? s.abhishekamAt
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

  const setUserName = useCallback((name: string) => {
    setUserState(u => (u ? { ...u, name: name.trim() } : u));
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
        modelId: defaultModelId(idolId),
        hasGarland: false,
        hasTilak: false,
      })),
    }));
  }, []);

  const setTempleName = useCallback((name: string) => {
    setState(s => ({ ...s, templeName: name }));
  }, []);

  const addIdol = useCallback((idolId: string) => {
    setState(s => ({
      ...s,
      placedIdols: [
        ...s.placedIdols,
        {
          instanceId: crypto.randomUUID(),
          idolId,
          modelId: defaultModelId(idolId),
          hasGarland: false,
          hasTilak: false,
        },
      ],
    }));
  }, []);

  /* Swap which form of the deity is enshrined, keeping its offerings. */
  const setIdolModel = useCallback((instanceId: string, modelId: string) => {
    setState(s => ({
      ...s,
      placedIdols: s.placedIdols.map(p =>
        p.instanceId === instanceId ? { ...p, modelId } : p
      ),
    }));
  }, []);

  const removeIdol = useCallback((instanceId: string) => {
    setState(s => ({ ...s, placedIdols: s.placedIdols.filter(p => p.instanceId !== instanceId) }));
  }, []);

  const removeIdolsOfType = useCallback((idolId: string) => {
    setState(s => ({ ...s, placedIdols: s.placedIdols.filter(p => p.idolId !== idolId) }));
  }, []);

  const offerGarland = useCallback((instanceId: string) => {
    setState(s => {
      const now = Date.now();
      const newStreak = calculateStreak(s.lastPujaTimestamp, s.pujaStreak);
      return {
        ...s,
        placedIdols: s.placedIdols.map(p =>
          p.instanceId === instanceId ? { ...p, hasGarland: true } : p
        ),
        lastPujaDate: new Date().toDateString(),
        lastPujaTimestamp: now,
        pujaStreak: newStreak,
        totalPujas: s.totalPujas + 1,
      };
    });
  }, []);

  const applyTilak = useCallback((instanceId?: string) => {
    setState(s => {
      const now = Date.now();
      const newStreak = calculateStreak(s.lastPujaTimestamp, s.pujaStreak);
      const updatedPlaced = instanceId
        ? s.placedIdols.map(p => p.instanceId === instanceId ? { ...p, hasTilak: true } : p)
        : s.placedIdols.map(p => ({ ...p, hasTilak: true }));
      return {
        ...s,
        placedIdols: updatedPlaced,
        lastPujaDate: new Date().toDateString(),
        lastPujaTimestamp: now,
        pujaStreak: newStreak,
        totalPujas: s.totalPujas + 1,
      };
    });
  }, []);

  const performAbhishekam = useCallback(() => {
    setState(s => {
      const now = Date.now();
      const newStreak = calculateStreak(s.lastPujaTimestamp, s.pujaStreak);
      return {
        ...s,
        abhishekamAt: now,
        lastPujaDate: new Date().toDateString(),
        lastPujaTimestamp: now,
        pujaStreak: newStreak,
        totalPujas: s.totalPujas + 1,
      };
    });
  }, []);

  const offerPrasad = useCallback((type: PrasadType) => {
    const prasadMap: Record<PrasadType, { name: string; emoji: string }> = {
      modak: { name: 'Modak', emoji: '🥟' },
      laddoo: { name: 'Motichoor Laddoo', emoji: '🟡' },
      fruits: { name: 'Panchamrit & Fresh Fruits', emoji: '🍎' },
      panchamrit: { name: 'Maha Naivedyam', emoji: '🍯' },
    };
    const now = Date.now();
    const item: PrasadItem = {
      id: crypto.randomUUID(),
      type,
      name: prasadMap[type].name,
      emoji: prasadMap[type].emoji,
      offeredAt: now,
    };
    setState(s => {
      const newStreak = calculateStreak(s.lastPujaTimestamp, s.pujaStreak);
      return {
        ...s,
        prasad: [item, ...s.prasad.filter(p => p.type !== type)],
        lastPujaDate: new Date().toDateString(),
        lastPujaTimestamp: now,
        pujaStreak: newStreak,
        totalPujas: s.totalPujas + 1,
      };
    });
  }, []);

  const lightIncense = useCallback(() => {
    setState(s => {
      const now = Date.now();
      const newStreak = calculateStreak(s.lastPujaTimestamp, s.pujaStreak);
      return {
        ...s,
        incenseLitAt: now,
        lastPujaDate: new Date().toDateString(),
        lastPujaTimestamp: now,
        pujaStreak: newStreak,
        totalPujas: s.totalPujas + 1,
      };
    });
  }, []);

  const lightDiya = useCallback(() => {
    const now = Date.now();
    setState(s => {
      const newStreak = calculateStreak(s.lastPujaTimestamp, s.pujaStreak);
      return {
        ...s,
        diyas: [...s.diyas, { id: crypto.randomUUID(), litAt: now, expiresAt: now + THREE_HOURS }],
        lastPujaDate: new Date().toDateString(),
        lastPujaTimestamp: now,
        pujaStreak: newStreak,
        totalPujas: s.totalPujas + 1,
      };
    });
  }, []);

  const incrementJapa = useCallback((idolId: string) => {
    setState(s => ({
      ...s,
      japaCounts: {
        ...s.japaCounts,
        [idolId]: (s.japaCounts[idolId] || 0) + 1,
      },
    }));
  }, []);

  const resetPuja = useCallback(() => {
    setState(s => ({
      ...s,
      incenseLitAt: null,
      abhishekamAt: null,
      diyas: [],
      prasad: [],
      placedIdols: s.placedIdols.map(p => ({ ...p, hasGarland: false, hasTilak: false })),
    }));
  }, []);

  const incenseLit = isActive(state.incenseLitAt);
  const abhishekamActive = isActive(state.abhishekamAt);

  return {
    user,
    state,
    incenseLit,
    abhishekamActive,
    createUser,
    setUserName,
    logout,
    setupTemple,
    setTempleName,
    addIdol,
    setIdolModel,
    removeIdol,
    removeIdolsOfType,
    offerGarland,
    applyTilak,
    performAbhishekam,
    offerPrasad,
    lightIncense,
    lightDiya,
    incrementJapa,
    resetPuja,
  };
}
