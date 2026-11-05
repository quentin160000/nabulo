/** Règles chiffrées du Mot du jour. */
export const START_BRAISES = 240;
export const HINT_COST = 60;
export const FREE_AD_HINTS_PER_DAY = 3;

/** Braises gagnées selon le nombre d'essais (barème de l'écran de victoire). */
export function braisesFor(essais: number): number {
  if (essais <= 10) return 50;
  if (essais <= 25) return 30;
  if (essais <= 50) return 20;
  if (essais <= 100) return 10;
  return 5;
}

export type Guess = { word: string; temperature: number; rank: number | null; order: number; hint?: boolean };

/** Essais triés du plus chaud au plus froid ; à température égale, le plus récent d'abord. */
export function sortGuesses(gs: Guess[]): Guess[] {
  return [...gs].sort((a, b) => b.temperature - a.temperature || b.order - a.order);
}

export function bestTemperature(gs: Guess[]): number {
  return gs.reduce((m, g) => Math.max(m, g.temperature), -100);
}
