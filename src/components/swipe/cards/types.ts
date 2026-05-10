// src/components/swipe/cards/types.ts
export interface ExpeditionCardData {
  id: string;
  name: string;
  architect: string;
  difficulty: string;
  days: number;
  distanceKm: string;
  rating: number;
  tags: string[];
  imageUrl?: string;
  // full Pro-Path data for clone action
  proPath: object;
}

export interface SpotCardData {
  id: string;
  name: string;
  category: string;
  rating: number | null;
  distanceFromLegKm?: number;
  tags: string[];
  imageUrl?: string;
}

export interface FilteredCardData extends SpotCardData {
  matchReasons: string[];
}
