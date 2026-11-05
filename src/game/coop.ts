/**
 * Modes coop (jouables avec un partenaire « IA » qui joue avec le lexique hors ligne).
 *  - 4 mots + mot-indice : 4 mots très proches, l'un donne un indice, l'autre devine le mot visé.
 *  - Synchro : chacun tape un mot associé au mot affiché ; la proximité des deux mots fait le score.
 */
import { cosine, known, neighbors, randomWord, temperature } from './lexicon';
import { normalizeWord } from './temperature';
import { COOP_SEEDS } from './coop-mots';

export const RECORD_QUATRE_MOTS = 'nabulo:record:quatre-mots';
export const RECORD_SYNCHRO = 'nabulo:record:synchro';
export const LIVES = 3;
export const SYNCHRO_ROUNDS = 5;

/** Mot « propre » : lettres seulement (pas de tiret, d'apostrophe ni de chiffre), 3 lettres ou plus. */
export function clean(w: string): boolean {
  return w.length >= 3 && /^[a-zàâäçéèêëîïôöùûüÿœæ]+$/.test(w);
}

/** Minuscules sans accents (hôtel = hotel). */
const fold = (w: string) => normalizeWord(w).normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Deux formes du même mot (orage / orages, chant / chanter) : même début sur au moins 5 lettres, ou l'un contient l'autre. */
export function variant(a: string, b: string): boolean {
  a = fold(a); b = fold(b);
  if (a === b) return true;
  if (a.length >= 4 && b.includes(a)) return true;
  if (b.length >= 4 && a.includes(b)) return true;
  const n = Math.min(5, a.length - 1, b.length - 1);
  return n >= 4 && a.slice(0, n) === b.slice(0, n);
}

/**
 * Le mot ressemble-t-il à un nom ? Écarte adverbes en -ment, pluriels d'un mot connu, formes verbales
 * (portant, portent, portait, porté, porter) : le lexique ne donne pas la nature des mots.
 */
export function nounish(w: string, allowPlural = false): boolean {
  if (!clean(w)) return false;
  const k = (x: string) => x.length >= 2 && known(x);
  if (w.endsWith('ment') && k(w.slice(0, -4))) return false;
  if (!allowPlural && /[sx]$/.test(w) && k(w.slice(0, -1))) return false;
  for (const suf of ['aient', 'ait', 'ant', 'ent', 'ons', 'ez', 'ées', 'és', 'ée', 'é']) {
    if (!w.endsWith(suf)) continue;
    const st = w.slice(0, -suf.length);
    if (st.length >= 2 && (k(st + 'er') || k(st + 'ir') || k(st + 're'))) return false;
  }
  if (w.endsWith('er') && k(w.slice(0, -2) + 'ant')) return false;
  if (w.endsWith('ir') && k(w.slice(0, -2) + 'issant')) return false;
  return true;
}

/** Un mot de départ (nom courant) tiré au hasard parmi ceux que le lexique connaît. */
export function seedWord(rand: () => number, exclude: string[] = []): string {
  const pool = COOP_SEEDS.filter(w => known(w) && !exclude.includes(w));
  return pool[Math.floor(rand() * pool.length)] ?? randomWord(rand);
}

const cos = (a: string, b: string) => cosine(a, b) ?? -1;
const shuffle = <T,>(xs: T[], rand: () => number) => {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

/* ---------------- 4 mots + mot-indice ---------------- */

export type Series = { words: string[]; secret: string };

/** Température minimale entre deux des 4 mots, et plancher si la série tarde à se former. */
export const SERIE_MIN = 15, SERIE_PLANCHER = 8;

/** Tire 4 mots très proches les uns des autres (aucun n'est une variante d'un autre) et le mot visé. */
export function makeSeries(rand: () => number, minTemp = SERIE_MIN): Series {
  for (let attempt = 0; ; attempt++) {
    const seed = seedWord(rand);
    const group = [seed];
    for (const n of neighbors(seed, 40)) {
      if (!nounish(n.word, /[sx]$/.test(seed)) || group.some(g => variant(g, n.word))) continue;
      if (group.every(g => (temperature(g, n.word) ?? 0) >= (attempt > 30 ? Math.min(minTemp, SERIE_PLANCHER) : minTemp))) group.push(n.word);
      if (group.length === 4) break;
    }
    if (group.length < 4) continue;
    const words = shuffle(group, rand);
    return { words, secret: words[Math.floor(rand() * 4)] };
  }
}

/** Indice de l'IA : un mot proche de la série qui désigne le mieux le mot visé (proche de lui, plus loin des 3 autres). */
export function aiHint(s: Series, rand: () => number = Math.random): string {
  const others = s.words.filter(w => w !== s.secret);
  const scored = neighbors(s.secret, 80)
    .filter(n => nounish(n.word, true) && !s.words.some(w => variant(w, n.word)))
    .map(n => {
      const c = cos(n.word, s.secret);
      return { word: n.word, score: c + (c - Math.max(...others.map(o => cos(n.word, o)))) * 1.5 };
    })
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return neighbors(s.secret, 1)[0]?.word ?? s.secret;
  // un peu de variété : un des trois meilleurs
  return scored[Math.min(scored.length - 1, Math.floor(rand() * 3))].word;
}

/** Choix de l'IA : le candidat le plus proche de l'indice. */
export function aiGuess(hint: string, words: string[]): string {
  let best = words[0], bt = -Infinity;
  for (const w of words) { const t = temperature(hint, w) ?? -100; if (t > bt) { bt = t; best = w; } }
  return best;
}

/** Les 4 mots triés du plus chaud au plus froid par rapport à l'indice. */
export function hintTemperatures(hint: string, words: string[]): { word: string; temperature: number }[] {
  return words.map(w => ({ word: w, temperature: temperature(hint, w) ?? 0 })).sort((a, b) => b.temperature - a.temperature);
}

export type HintCheck = { ok: true; word: string } | { ok: false; reason: 'vide' | 'plusieurs' | 'inconnu' | 'interdit'; word: string };

/** Vérifie l'indice du joueur : un seul mot connu, qui n'est pas (une forme de) l'un des 4. */
export function checkHint(raw: string, words: string[]): HintCheck {
  const w = normalizeWord(raw);
  if (!w) return { ok: false, reason: 'vide', word: w };
  if (/\s/.test(w)) return { ok: false, reason: 'plusieurs', word: w };
  if (words.some(x => variant(x, w))) return { ok: false, reason: 'interdit', word: w };
  if (!known(w)) return { ok: false, reason: 'inconnu', word: w };
  return { ok: true, word: w };
}

/** Voisins d'un mot pour l'écran de fin (sans variantes ni mots déjà montrés). */
export function closeWords(word: string, k = 5, exclude: string[] = []): string[] {
  const out: string[] = [];
  for (const n of neighbors(word, 60)) {
    if (!nounish(n.word, true) || variant(n.word, word) || exclude.some(e => variant(e, n.word)) || out.some(o => variant(o, n.word))) continue;
    out.push(n.word);
    if (out.length === k) break;
  }
  return out;
}

/* ---------------- Synchro ---------------- */

/** Points d'une manche : proximité des deux mots (0 à 100). */
export function synchroScore(a: string, b: string): number {
  return Math.max(0, Math.round(temperature(a, b) ?? 0));
}

/** Paliers des messages de Synchro (°C entre les deux mots). */
export const SYNCHRO_BIEN = 44, SYNCHRO_PAS_MAL = 19, SYNCHRO_LOIN = 5;

export function synchroLabel(score: number): string {
  if (score >= 100) return 'Même mot !';
  if (score >= SYNCHRO_BIEN) return 'Bien synchro !';
  if (score >= SYNCHRO_PAS_MAL) return 'Pas mal !';
  if (score >= SYNCHRO_LOIN) return 'Un peu loin…';
  return 'Pas synchro…';
}

/**
 * Mot de l'IA pour une manche : un voisin du mot affiché, en penchant vers le dernier mot du joueur
 * (l'IA s'aligne sur son partenaire) ; jamais un mot déjà joué.
 */
export function aiAssociate(prompt: string, prevYou: string | null, used: string[], rand: () => number = Math.random): string {
  const pool = neighbors(prompt, 40).filter(n => nounish(n.word, true) && !variant(n.word, prompt) && !used.some(u => variant(u, n.word)));
  if (!pool.length) return neighbors(prompt, 1)[0]?.word ?? prompt;
  let best = pool[0].word, bs = -Infinity;
  for (const n of pool) {
    const s = cos(n.word, prompt) + (prevYou ? 0.35 * cos(n.word, prevYou) : 0) + rand() * 0.04;
    if (s > bs) { bs = s; best = n.word; }
  }
  return best;
}

/** Voisin commun de deux mots (le plus proche des deux à la fois) : mot de la manche suivante. */
export function commonNeighbor(a: string, b: string, used: string[] = []): string | null {
  const seen = new Set<string>();
  let best: string | null = null, bs = -Infinity;
  for (const n of [...neighbors(a, 60), ...neighbors(b, 60)]) {
    const w = n.word;
    if (seen.has(w)) continue;
    seen.add(w);
    if (!nounish(w) || variant(w, a) || variant(w, b) || used.some(u => variant(u, w))) continue;
    const s = Math.min(cos(w, a), cos(w, b));
    if (s > bs) { bs = s; best = w; }
  }
  return best;
}

/**
 * Mot de la manche suivante : le mot de départ (nom courant) le plus proche à la fois des deux mots
 * que vous venez de jouer. La partie suit ainsi le fil de vos idées.
 */
export function commonSeed(a: string, b: string, used: string[] = []): string {
  let best: string | null = null, bs = -Infinity;
  for (const w of COOP_SEEDS) {
    if (!known(w) || variant(w, a) || variant(w, b) || used.some(u => variant(u, w))) continue;
    const s = Math.min(cos(w, a), cos(w, b));
    if (s > bs) { bs = s; best = w; }
  }
  return best ?? commonNeighbor(a, b, used) ?? a;
}

export type SynchroCheck = { ok: true; word: string } | { ok: false; reason: 'vide' | 'plusieurs' | 'inconnu' | 'interdit'; word: string };

/** Vérifie le mot du joueur : un seul mot connu, différent du mot affiché. */
export function checkAssociate(raw: string, prompt: string): SynchroCheck {
  const w = normalizeWord(raw);
  if (!w) return { ok: false, reason: 'vide', word: w };
  if (/\s/.test(w)) return { ok: false, reason: 'plusieurs', word: w };
  if (variant(w, prompt)) return { ok: false, reason: 'interdit', word: w };
  if (!known(w)) return { ok: false, reason: 'inconnu', word: w };
  return { ok: true, word: w };
}

/** Premier mot d'une partie de Synchro. */
export function firstPrompt(rand: () => number): string {
  return seedWord(rand);
}
