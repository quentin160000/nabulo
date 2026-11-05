/**
 * Logique des duels contre l'IA (contre-la-montre duel, duel à l'aveugle).
 * Pas de serveur temps réel : l'adversaire est une « IA » qui joue avec le lexique (voisins, températures).
 * Tout est pur (pas de stockage ni d'horloge) pour être testé avec vitest.
 */
import { known, neighbors, rng, temperature } from './lexicon';
import { normalizeWord } from './temperature';

export type Niveau = 'facile' | 'normal';
export type Jeu = 'chrono' | 'aveugle';
/** Une partie jouée, gardée sous `nabulo:duels` pour le profil. */
export type DuelRecord = { jeu: Jeu; adversaire: 'IA'; gagne: boolean; date: string };

export const DUELS_KEY = 'nabulo:duels';
export const NIVEAU_KEY = 'nabulo:duel-niveau';
/** Manches à gagner (best of 5). */
export const MANCHES_GAGNANTES = 3;
/** Durée d'une manche du contre-la-montre, en secondes. */
export const CHRONO_DUREE = 60;
/** Seuil de température d'un mot qui compte au contre-la-montre. */
export const CHRONO_SEUIL = 32;
/** Durée d'un duel à l'aveugle, en secondes. */
export const AVEUGLE_DUREE = 180;
/** À l'aveugle, sous cette température l'IA change souvent de piste. */
export const AVEUGLE_FROID = 8;
/** À l'aveugle, au-dessus de cette température on prévient que l'IA brûle. */
export const AVEUGLE_ALERTE = 44;
/** Braises : victoire / partie jouée. */
export const GAIN_VICTOIRE = 20;
export const GAIN_DEFAITE = 5;

/** Mots cibles : noms concrets et courants, faciles à « entourer ». */
const CIBLES = [
  'cuisine', 'montagne', 'océan', 'musique', 'jardin', 'hiver', 'forêt', 'plage', 'voiture', 'école', 'hôpital', 'chien', 'cheval', 'oiseau', 'poisson', 'fleur', 'arbre', 'soleil', 'pluie', 'neige', 'orage', 'café', 'pain', 'fromage',
  'vin', 'livre', 'film', 'théâtre', 'football', 'avion', 'bateau', 'maison', 'château', 'église', 'ville',
  'village', 'rivière', 'désert', 'étoile', 'guitare', 'piano', 'danse', 'peinture', 'médecin',
  'police', 'armée', 'guerre', 'mariage', 'enfant', 'chaussure', 'ordinateur', 'téléphone', 'argent',
  'banque', 'magasin', 'restaurant', 'vacances', 'voyage', 'sport', 'glace', 'chocolat', 'légume',
  'girafe', 'lion', 'éléphant', 'mer', 'île', 'prison', 'justice', 'santé', 'ferme', 'route',
];

/** Mots cibles connus du lexique (filtrés une fois). */
let cibles: string[] | null = null;
export function targets(): string[] {
  if (!cibles) cibles = CIBLES.filter(known);
  return cibles;
}

/** Une cible au hasard, différente des précédentes si possible. */
export function pickTarget(rand: () => number, avoid: string[] = []): string {
  const all = targets();
  const pool = all.filter(w => !avoid.includes(w));
  const list = pool.length ? pool : all;
  return list[Math.floor(rand() * list.length)];
}

/** Même mot ou simple pluriel / singulier : refusé (trop facile). */
export function sameFamily(a: string, b: string): boolean {
  const x = normalizeWord(a), y = normalizeWord(b);
  return x === y || x === y + 's' || x === y + 'x' || y === x + 's' || y === x + 'x';
}

/* ---------------- Jauge de duel ---------------- */

/** Part de la jauge à ma couleur selon le score des manches (valeurs de la planche DuelJauge). */
const SPLIT: number[][] = [
  [0.5, 0.4, 0.25, 0],
  [0.6, 0.5, 1 / 3, 0],
  [0.75, 2 / 3, 0.5, 0],
  [1, 1, 1, 1],
];
export function gaugeSplit(me: number, opp: number): number {
  const a = Math.max(0, Math.min(3, me)), b = Math.max(0, Math.min(3, opp));
  return SPLIT[a][b];
}

/* ---------------- Contre-la-montre duel ---------------- */

export type ChronoWord = { word: string; temperature: number };
export type ChronoCheck =
  | { kind: 'ok'; word: string; temperature: number }
  | { kind: 'froid'; word: string; temperature: number }
  | { kind: 'inconnu'; word: string } | { kind: 'deja'; word: string } | { kind: 'cible'; word: string } | { kind: 'vide'; word: string };

/** Vérifie un mot proposé autour de la cible. */
export function checkChronoWord(target: string, raw: string, mine: ChronoWord[]): ChronoCheck {
  const word = normalizeWord(raw);
  if (!word) return { kind: 'vide', word };
  if (sameFamily(word, target)) return { kind: 'cible', word };
  if (mine.some(m => m.word === word)) return { kind: 'deja', word };
  const t = temperature(target, word);
  if (t === null) return { kind: 'inconnu', word };
  return { kind: t >= CHRONO_SEUIL ? 'ok' : 'froid', word, temperature: t };
}

/** Réglages de l'IA : fenêtre de voisins dans laquelle elle pioche, et délai entre deux essais (ms). */
export const IA = {
  facile: { from: 5, to: 85, delay: [7000, 11000] as const, blindDelay: [12000, 16000] as const },
  normal: { from: 0, to: 60, delay: [5500, 8500] as const, blindDelay: [8500, 12500] as const },
} satisfies Record<Niveau, { from: number; to: number; delay: readonly [number, number]; blindDelay: readonly [number, number] }>;

export function aiDelay(niveau: Niveau, rand: () => number, mode: Jeu = 'chrono'): number {
  const [a, b] = mode === 'chrono' ? IA[niveau].delay : IA[niveau].blindDelay;
  return Math.round(a + rand() * (b - a));
}

/** Candidats de l'IA pour une cible (voisins sans la cible ni ses pluriels), du plus proche au plus loin. */
const candCache = new Map<string, ChronoWord[]>();
export function chronoCandidates(target: string): ChronoWord[] {
  let c = candCache.get(target);
  if (!c) {
    c = neighbors(target, 160).filter(n => !sameFamily(n.word, target) && !n.word.includes('-'));
    candCache.set(target, c);
  }
  return c;
}

/** Prochain essai de l'IA au contre-la-montre (null si elle n'a plus d'idée). */
export function chronoAiPick(target: string, niveau: Niveau, used: string[], rand: () => number): ChronoWord | null {
  const all = chronoCandidates(target);
  const { from, to } = IA[niveau];
  let window = all.slice(from, to).filter(c => !used.includes(c.word));
  if (!window.length) window = all.filter(c => !used.includes(c.word));
  if (!window.length) return null;
  return window[Math.floor(rand() * window.length)];
}

export const validWords = (ws: ChronoWord[]) => ws.filter(w => w.temperature >= CHRONO_SEUIL);

/** Vainqueur d'une manche : plus de mots à `CHRONO_SEUIL`°+, puis meilleure température ; null = égalité. */
export function roundWinner(mine: ChronoWord[], theirs: ChronoWord[]): 'me' | 'opp' | null {
  const a = validWords(mine), b = validWords(theirs);
  if (a.length !== b.length) return a.length > b.length ? 'me' : 'opp';
  const best = (ws: ChronoWord[]) => ws.reduce((m, w) => Math.max(m, w.temperature), -100);
  const ba = best(a), bb = best(b);
  if (a.length && ba !== bb) return ba > bb ? 'me' : 'opp';
  return null;
}

export function matchOver(me: number, opp: number): 'me' | 'opp' | null {
  return me >= MANCHES_GAGNANTES ? 'me' : opp >= MANCHES_GAGNANTES ? 'opp' : null;
}

/* ---------------- Duel à l'aveugle ---------------- */

export type BlindGuess = { word: string; temperature: number; order: number };
export type BlindCheck = { kind: 'ok'; guess: BlindGuess } | { kind: 'inconnu'; word: string } | { kind: 'deja'; word: string } | { kind: 'vide'; word: string };

export function checkBlindGuess(secret: string, raw: string, mine: BlindGuess[]): BlindCheck {
  const word = normalizeWord(raw);
  if (!word) return { kind: 'vide', word };
  if (mine.some(m => m.word === word)) return { kind: 'deja', word };
  const t = temperature(secret, word);
  if (t === null) return { kind: 'inconnu', word };
  return { kind: 'ok', guess: { word, temperature: t, order: mine.length } };
}

/** Un mot secret valable pour l'IA : connu et assez courant pour qu'elle puisse le trouver. */
export function secretOk(raw: string): 'ok' | 'vide' | 'inconnu' | 'rare' {
  const w = normalizeWord(raw);
  if (!w) return 'vide';
  if (!known(w)) return 'inconnu';
  if (w.length < 3 || w.includes(' ')) return 'rare';
  return 'ok';
}

const best = (gs: BlindGuess[]) => gs.reduce<BlindGuess | null>((m, g) => (!m || g.temperature > m.temperature ? g : m), null);
export const bestGuess = best;

/**
 * Prochain essai de l'IA à l'aveugle : elle part de son essai le plus chaud et choisit parmi ses voisins,
 * souvent le plus proche du secret (normal) ou plus au hasard (facile). Au départ, un mot cible au hasard.
 */
export function blindAiPick(secret: string, niveau: Niveau, guesses: BlindGuess[], rand: () => number): string {
  const used = new Set(guesses.map(g => g.word));
  const b = best(guesses);
  const skill = niveau === 'normal' ? 0.72 : 0.3;
  // trop froid : l'IA tente un autre mot courant
  if (!b || (b.temperature < AVEUGLE_FROID && rand() < 0.6)) {
    for (let i = 0; i < 20; i++) { const w = pickTarget(rand); if (!used.has(w) && w !== secret) return w; }
  }
  const from = b ? b.word : pickTarget(rand);
  const cands = neighbors(from, niveau === 'normal' ? 40 : 25, 15000).map(n => n.word).filter(w => !used.has(w) && !w.includes('-'));
  // le secret est un voisin direct d'un mot brûlant : l'IA le tente parfois
  if (cands.includes(secret) && rand() < skill) return secret;
  const pool = cands.filter(w => w !== secret);
  if (!pool.length) return pickTarget(rand, [...used]);
  if (rand() < skill) {
    let top = pool[0], tt = -999;
    for (const w of pool) { const t = temperature(secret, w) ?? -999; if (t > tt) { tt = t; top = w; } }
    return top;
  }
  return pool[Math.floor(rand() * pool.length)];
}

/** Secret que l'IA choisit pour moi (mots croisés) ou mot commun (même mot). */
export function aiSecret(seed: number, avoid: string[] = []): string {
  return pickTarget(rng(seed), avoid);
}

/** Vainqueur quand le temps est écoulé : le plus proche. */
export function blindTimeoutWinner(mine: BlindGuess[], theirs: BlindGuess[]): 'me' | 'opp' {
  const a = best(mine)?.temperature ?? -100, b = best(theirs)?.temperature ?? -100;
  return a >= b ? 'me' : 'opp';
}

/* ---------------- Historique ---------------- */

export function addRecord(list: DuelRecord[], jeu: Jeu, gagne: boolean, date = new Date()): DuelRecord[] {
  return [...list, { jeu, adversaire: 'IA' as const, gagne, date: date.toISOString() }].slice(-200);
}

export function tally(list: DuelRecord[], jeu?: Jeu): { victoires: number; defaites: number } {
  const l = list.filter(r => !jeu || r.jeu === jeu);
  const victoires = l.filter(r => r.gagne).length;
  return { victoires, defaites: l.length - victoires };
}

/* ---------------- Affichage ---------------- */

/** Couleur des pastilles de mots en fin de partie (planches 14 et 16). */
export function endChipColor(t: number): string {
  if (t >= 44) return '#FF7A3C';
  if (t >= 19) return '#FFB35C';
  return '#A9C6F2';
}
/** Couleur des pastilles de fin de manche (four, frigo, chef…). */
export function roundChipColor(t: number): string {
  if (t >= 58) return '#FF9A3C';
  if (t >= 44) return '#FFB35C';
  return '#FFD45C';
}

export const deg = (t: number) => `${Math.round(t)}°`;
export const fmt1 = (t: number, unit = '°') => t.toFixed(1).replace('.', ',') + unit;
export function clock(s: number): string {
  const v = Math.max(0, Math.ceil(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
}
