export interface UserProfile {
  id: string;
  name: string;
  createdAt: string;
}

export interface Idol {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  mantra: string;
  mantraDevanagari?: string;
  mantraMeaning?: string;
}

export interface PlacedIdol {
  instanceId: string;
  idolId: string;
  hasGarland: boolean;
  hasTilak?: boolean;
}

export interface DivaItem {
  id: string;
  litAt: number;
  expiresAt: number;
}

export type PrasadType = 'modak' | 'laddoo' | 'fruits' | 'panchamrit';

export interface PrasadItem {
  id: string;
  type: PrasadType;
  name: string;
  emoji: string;
  offeredAt: number;
}

export interface TempleState {
  templeName: string;
  placedIdols: PlacedIdol[];
  incenseLitAt: number | null;
  diyas: DivaItem[];
  prasad: PrasadItem[];
  abhishekamAt: number | null;
  lastPujaDate: string;
  lastPujaTimestamp: number | null;
  pujaStreak: number;
  totalPujas: number;
  japaCounts: Record<string, number>;
}

export interface Shloka {
  id: string;
  sanskrit: string;
  transliteration: string;
  meaning: string;
  source: string;
  deity?: string;
}
