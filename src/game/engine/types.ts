export type Lang = 'fr' | 'en';

export type GuessResult =
  | { known: false; word: string }
  | { known: true; word: string; temperature: number; rank: number | null; found: boolean };

/** Ce dont le jeu a besoin pour une partie de Mot du jour, quelle que soit la source (locale ou Supabase). */
export interface TemperatureEngine {
  /** Numéro du mot du jour (1, 2, 3…) pour une date donnée. */
  dayNumber(date: Date): number;
  /** Température d'un essai par rapport au mot secret du jour. */
  guess(lang: Lang, day: number, word: string): Promise<GuessResult>;
  /** Un mot plus chaud que `above` °C, pour un indice (jamais le mot secret). */
  hint(lang: Lang, day: number, above: number, exclude: string[]): Promise<{ word: string; temperature: number } | null>;
  /** Les mots les plus proches du mot secret (montrés seulement une fois le mot trouvé). */
  /** `proof` : le mot trouvé ; le serveur ne révèle le classement du jour qu'à celui qui l'a trouvé. */
  closest(lang: Lang, day: number, count: number, proof?: string): Promise<{ word: string; temperature: number }[]>;
  /** Le mot secret, révélé uniquement après la victoire. */
  reveal(lang: Lang, day: number, proof?: string): Promise<string>;
}

/** 1er janvier 2026 = mot n°1. Calcul en jours locaux pour que le mot change à minuit. */
export function dayNumberFrom(date: Date, origin = new Date(2026, 0, 1)): number {
  const a = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const b = Date.UTC(origin.getFullYear(), origin.getMonth(), origin.getDate());
  return Math.floor((a - b) / 86400000) + 1;
}
