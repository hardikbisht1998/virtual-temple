export interface Idol {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

export interface PlacedIdol {
  instanceId: string;
  idolId: string;
  hasGarland: boolean;
}

export interface TempleState {
  templeName: string;
  placedIdols: PlacedIdol[];
  incenseLit: boolean;
  diyas: number;
  lastPujaDate: string;
}

export interface BhajanTrack {
  id: string;
  title: string;
  deity: string;
  url: string;
}
