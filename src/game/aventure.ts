/**
 * Mode Aventure (V2) : 30 niveaux répartis en 5 mondes de 6, le 6e de chaque monde étant le niveau de fin (couronne).
 * Données des niveaux, règles de victoire, progression (`nabulo:aventure`) et vies (`nabulo:vies`, 5 au plus, +1 toutes les 30 min).
 * Tout ce qui est ici est pur (sauf les fonctions de stockage) pour être testé avec vitest.
 */
import { neighbors, temperature } from './lexicon';
import { cleanNeighbors } from './libres-manches';
import { load, save } from './storage';
import type { Mood } from './temperature';

/* ---------- Mondes ---------- */
export type Monde = { n: number; nom: string; heure: string; couleur: string; mascotte: Mood; fond: readonly [string, string, string]; froid: Mood };
export const MONDES: readonly Monde[] = [
  { n: 1, nom: 'Banquise', heure: 'nuit', couleur: '#5B8DEF', mascotte: 'glacial', fond: ['#1E2559', '#2F3E8A', '#41539E'], froid: 'glacial' },
  { n: 2, nom: 'Toundra', heure: 'matin', couleur: '#7CCDEF', mascotte: 'froid', fond: ['#5E8FD6', '#7FA9E6', '#9CC3F0'], froid: 'glacial' },
  { n: 3, nom: 'Forêt tiède', heure: 'jour', couleur: '#7CE0B5', mascotte: 'tiede', fond: ['#3FA6E8', '#62BDF0', '#8FD3F7'], froid: 'froid' },
  { n: 4, nom: 'Désert', heure: 'après-midi', couleur: '#FFB35C', mascotte: 'chaud', fond: ['#F2A14A', '#F7B866', '#FFD08A'], froid: 'froid' },
  { n: 5, nom: 'Volcan', heure: 'crépuscule', couleur: '#FF5A36', mascotte: 'brulant', fond: ['#5A2452', '#9C4468', '#E07A5F'], froid: 'froid' },
];

/* ---------- Niveaux ---------- */
export type TypeNiveau = 'secret' | 'seuil' | 'plus-chaud' | 'intrus' | 'lier' | 'chrono' | 'points';
export type Niveau =
  | { n: number; type: 'secret'; mot: string; essais: number }
  | { n: number; type: 'seuil'; mot: string; seuil: number; essais: number }
  | { n: number; type: 'plus-chaud'; bonnes: number; erreurs: number; serie: number }
  | { n: number; type: 'intrus'; series: number; erreurs: number }
  | { n: number; type: 'lier'; depart: string; arrivee: string; max: number }
  | { n: number; type: 'chrono'; mot: string; mots: number; duree: number }
  | { n: number; type: 'points'; mot: string; depart: number; cout: number; minimum: number };

export const NOMS_TYPES: Record<TypeNiveau, string> = {
  secret: 'Mot secret', seuil: 'Seuil', 'plus-chaud': 'Plus chaud ?', intrus: 'L’intrus', lier: 'Lier', chrono: 'Contre-la-montre', points: 'Mot secret à points',
};

/** Seuil d'un mot au contre-la-montre et lien minimal de Lier (mêmes valeurs que les mini-jeux). */
export const CHRONO_MIN = 50, LIEN_MIN = 40;

export const NIVEAUX: readonly Niveau[] = [
  // Monde 1 · Banquise
  { n: 1, type: 'secret', mot: 'neige', essais: 30 },
  { n: 2, type: 'seuil', mot: 'hiver', seuil: 72, essais: 20 },
  { n: 3, type: 'secret', mot: 'lune', essais: 30 },
  { n: 4, type: 'plus-chaud', bonnes: 8, erreurs: 3, serie: 0 },
  { n: 5, type: 'seuil', mot: 'lac', seuil: 74, essais: 18 },
  { n: 6, type: 'secret', mot: 'ours', essais: 25 },
  // Monde 2 · Toundra
  { n: 7, type: 'intrus', series: 4, erreurs: 2 },
  { n: 8, type: 'seuil', mot: 'loup', seuil: 72, essais: 18 },
  { n: 9, type: 'intrus', series: 5, erreurs: 2 },
  { n: 10, type: 'secret', mot: 'renard', essais: 28 },
  { n: 11, type: 'plus-chaud', bonnes: 10, erreurs: 3, serie: 4 },
  { n: 12, type: 'seuil', mot: 'montagne', seuil: 74, essais: 15 },
  // Monde 3 · Forêt tiède
  { n: 13, type: 'secret', mot: 'fleur', essais: 28 },
  { n: 14, type: 'lier', depart: 'plage', arrivee: 'ordinateur', max: 5 },
  { n: 15, type: 'plus-chaud', bonnes: 10, erreurs: 2, serie: 8 },
  { n: 16, type: 'chrono', mot: 'cuisine', mots: 6, duree: 60 },
  { n: 17, type: 'intrus', series: 6, erreurs: 2 },
  { n: 18, type: 'lier', depart: 'forêt', arrivee: 'téléphone', max: 5 },
  // Monde 4 · Désert
  { n: 19, type: 'chrono', mot: 'chaleur', mots: 7, duree: 60 },
  { n: 20, type: 'seuil', mot: 'sable', seuil: 72, essais: 15 },
  { n: 21, type: 'secret', mot: 'pyramide', essais: 25 },
  { n: 22, type: 'lier', depart: 'sable', arrivee: 'horloge', max: 4 },
  { n: 23, type: 'points', mot: 'soleil', depart: 1000, cout: 40, minimum: 500 },
  { n: 24, type: 'points', mot: 'désert', depart: 1000, cout: 40, minimum: 500 },
  // Monde 5 · Volcan
  { n: 25, type: 'chrono', mot: 'dragon', mots: 8, duree: 60 },
  { n: 26, type: 'intrus', series: 7, erreurs: 1 },
  { n: 27, type: 'lier', depart: 'feu', arrivee: 'poème', max: 5 },
  { n: 28, type: 'plus-chaud', bonnes: 12, erreurs: 2, serie: 12 },
  { n: 29, type: 'points', mot: 'fumée', depart: 1000, cout: 50, minimum: 500 },
  { n: 30, type: 'secret', mot: 'volcan', essais: 25 },
];

export const TOTAL = NIVEAUX.length;
export const niveau = (n: number): Niveau | null => NIVEAUX[n - 1] ?? null;
export const mondeDe = (n: number): Monde => MONDES[Math.min(MONDES.length, Math.max(1, Math.ceil(n / 6))) - 1];
export const estFinDeMonde = (n: number) => n % 6 === 0;

/** Les 5 voisins montrés à la fin d'un niveau. */
export const voisinsDe = (mot: string) => cleanNeighbors(mot, 5).map(v => v.word);

/* ---------- Mot secret : rang façon Cémantix ---------- */
const rangs = new Map<string, Map<string, number>>();
/** Rang d'un mot parmi les 1 000 plus proches du mot secret (1 = le plus proche), ou null. */
export function rang(secret: string, mot: string): number | null {
  let r = rangs.get(secret);
  if (!r) { r = new Map(neighbors(secret, 999).map((v, i) => [v.word, i + 2])); rangs.set(secret, r); }
  if (mot === secret) return 1;
  return r.get(mot) ?? null;
}
export const temp = (a: string, b: string) => temperature(a, b) ?? -100;

/* ---------- Étoiles (1 à 3) selon la part du budget utilisée ---------- */
export function etoiles(utilise: number, budget: number): 1 | 2 | 3 {
  const f = budget > 0 ? utilise / budget : 1;
  return f <= 0.5 ? 3 : f <= 0.75 ? 2 : 1;
}

/** Braises gagnées la première fois qu'un niveau est réussi. */
export const recompense = (n: number) => (20 + 5 * (mondeDe(n).n - 1)) * (estFinDeMonde(n) ? 2 : 1);

/** Option payante proposée après une défaite (null : aucune). */
export function relance(nv: Niveau): { label: string; prix: number } | null {
  switch (nv.type) {
    case 'secret': case 'seuil': return { label: '+5 essais', prix: 40 };
    case 'plus-chaud': return { label: '+1 erreur', prix: 30 };
    case 'intrus': return { label: 'Annuler', prix: 40 };
    case 'lier': return { label: '+1 étape', prix: 30 };
    case 'chrono': return { label: '+15 s', prix: 30 };
    case 'points': return null;
  }
}

/* ---------- Progression ---------- */
export type Progression = { atteint: number; etoiles: Record<number, number>; scores: Record<number, number> };
export const CLE_AVENTURE = 'nabulo:aventure';
export const PROGRESSION_VIDE: Progression = { atteint: 1, etoiles: {}, scores: {} };

/** Enregistre une victoire : débloque le niveau suivant, garde la meilleure note. */
export function gagner(p: Progression, n: number, note: number, score: number): Progression {
  return {
    atteint: Math.min(TOTAL, Math.max(p.atteint, n + 1)),
    etoiles: { ...p.etoiles, [n]: Math.max(p.etoiles[n] ?? 0, note) },
    scores: { ...p.scores, [n]: Math.max(p.scores[n] ?? 0, score) },
  };
}
/** Le niveau est-il déjà réussi ? (le dernier niveau compte dès qu'il a une note) */
export const reussi = (p: Progression, n: number) => (p.etoiles[n] ?? 0) > 0;

export async function lireProgression(): Promise<Progression> {
  const p = await load<Progression>(CLE_AVENTURE, PROGRESSION_VIDE);
  return { ...PROGRESSION_VIDE, ...p, atteint: Math.min(TOTAL, Math.max(1, p.atteint || 1)) };
}
export const ecrireProgression = (p: Progression) => save(CLE_AVENTURE, p);

/* ---------- Vies ---------- */
export const VIES_MAX = 5, RECHARGE_MS = 30 * 60 * 1000;
export type Vies = { n: number; depuis: number };
export const CLE_VIES = 'nabulo:vies';

/** Vies réelles à l'instant `now` (une de plus toutes les 30 min, 5 au plus) et temps avant la prochaine. */
export function viesActuelles(v: Vies, now: number): { n: number; prochaine: number | null } {
  if (v.n >= VIES_MAX) return { n: VIES_MAX, prochaine: null };
  const gagnees = Math.floor(Math.max(0, now - v.depuis) / RECHARGE_MS);
  const n = Math.min(VIES_MAX, v.n + gagnees);
  if (n >= VIES_MAX) return { n, prochaine: null };
  return { n, prochaine: RECHARGE_MS - ((now - v.depuis) % RECHARGE_MS) };
}
/** Retire une vie (sans descendre sous 0) en gardant la recharge en cours. */
export function perdreVie(v: Vies, now: number): Vies {
  const { n } = viesActuelles(v, now);
  if (n >= VIES_MAX) return { n: VIES_MAX - 1, depuis: now };
  const gagnees = Math.floor(Math.max(0, now - v.depuis) / RECHARGE_MS);
  return { n: Math.max(0, n - 1), depuis: v.depuis + gagnees * RECHARGE_MS };
}
/** Rend une vie (relance payée après une défaite). */
export function rendreVie(v: Vies, now: number): Vies {
  const { n } = viesActuelles(v, now);
  const gagnees = Math.floor(Math.max(0, now - v.depuis) / RECHARGE_MS);
  return n + 1 >= VIES_MAX ? { n: VIES_MAX, depuis: now } : { n: n + 1, depuis: v.depuis + gagnees * RECHARGE_MS };
}
export const lireVies = () => load<Vies>(CLE_VIES, { n: VIES_MAX, depuis: 0 });
export const ecrireVies = (v: Vies) => save(CLE_VIES, v);
