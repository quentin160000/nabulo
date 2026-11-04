/** Température d'un mot : similarité cosinus × 100, en °C. 100 °C = mot trouvé. */
export type Mood = 'glacial' | 'froid' | 'tiede' | 'chaud' | 'brulant' | 'trouve';

export function toTemperature(similarity: number, exact: boolean): number {
  if (exact) return 100;
  // un mot différent ne peut jamais afficher 100 °C, même si les vecteurs sont identiques
  return Math.min(99.9, Math.round(similarity * 1000) / 10);
}

export function moodOf(t: number): Mood {
  if (t >= 100) return 'trouve';
  if (t >= 60) return 'brulant';
  if (t >= 40) return 'chaud';
  if (t >= 20) return 'tiede';
  if (t >= 0) return 'froid';
  return 'glacial';
}

/** Couleur d'une température, reprise de la maquette (thermomètre). */
export function tempColor(t: number): string {
  if (t >= 100) return '#FFD23F';
  if (t >= 60) return '#FF5A36';
  if (t >= 40) return '#FF9A3C';
  if (t >= 20) return '#7CCDEF';
  if (t >= 0) return '#A9C6F2';
  return '#5B8DEF';
}

export const moodLabel: Record<Mood, string> = {
  glacial: 'Glacial', froid: 'Froid', tiede: 'Tiède', chaud: 'Chaud', brulant: 'Brûlant', trouve: 'Trouvé !',
};

export function formatTemp(t: number): string {
  return t.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' °C';
}

/** Mise en forme d'une saisie : minuscules, espaces retirés, apostrophes droites. */
export function normalizeWord(raw: string): string {
  return raw.trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ');
}
