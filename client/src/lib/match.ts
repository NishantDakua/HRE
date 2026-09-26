import type { MatchScore } from "./types";

export const MATCH_SIGNALS: { key: keyof MatchScore; label: string }[] = [
  { key: "price", label: "Price" },
  { key: "distance", label: "Distance" },
  { key: "availability", label: "Availability" },
  { key: "capacity", label: "Capacity" },
  { key: "reliability", label: "Reliability" },
];

/** How much each signal contributes to the match total. Sums to 1. */
export const MATCH_WEIGHTS: Record<keyof MatchScore, number> = {
  price: 0.25,
  distance: 0.2,
  availability: 0.15,
  capacity: 0.2,
  reliability: 0.2,
};

/** Urgent requests trade price for proximity and reliability. */
export const URGENT_WEIGHTS: Record<keyof MatchScore, number> = {
  price: 0.1,
  distance: 0.3,
  availability: 0.2,
  capacity: 0.15,
  reliability: 0.25,
};

export function weightedTotal(score: MatchScore, urgent = false): number {
  const w = urgent ? URGENT_WEIGHTS : MATCH_WEIGHTS;
  return Math.round(MATCH_SIGNALS.reduce((sum, s) => sum + score[s.key] * w[s.key], 0) * 100);
}
