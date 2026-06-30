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
}

export interface PlacedIdol {
  instanceId: string;
  idolId: string;
  hasGarland: boolean;
}

export interface DivaItem {
  id: string;
  litAt: number;
  expiresAt: number;
}

export interface TempleState {
  templeName: string;
  placedIdols: PlacedIdol[];
  incenseLitAt: number | null;
  diyas: DivaItem[];
  lastPujaDate: string;
}

export interface BhajanTrack {
  id: string;
  title: string;
  deity: string;
  url: string;
}
