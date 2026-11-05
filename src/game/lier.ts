/**
 * « Lier » (le pont) : relier un mot de départ à un mot d'arrivée par une chaîne de mots proches.
 * Chaque mot doit être à MIN_LINK° ou plus du précédent (sinon « trop loin ») mais pas un quasi-doublon
 * (MAX_LINK° ou plus, ou simple variante comme un pluriel : « trop proche »).
 * La chaîne est finie dès que le dernier mot est à MIN_LINK° ou plus du mot d'arrivée.
 * Étapes = nombre de liens (départ → … → arrivée) ; moins il y en a, mieux c'est.
 */
import { known, neighbors, temperature } from './lexicon';
import { normalizeWord } from './temperature';

export const MIN_LINK = 20;
export const MAX_LINK = 74;
/** Lien « chaud » (case rouge du partage). */
export const HOT_LINK = 44;
/** Taille du voisinage exploré par le solveur (parmi les mots courants du lexique). */
const K = 500;

/** Mot « jouable » par le solveur : lettres seulement, 3 lettres ou plus, pas d'adverbe en -ment. */
export function usable(w: string): boolean {
  return w.length >= 3 && /^[a-zàâäçéèêëîïôöùûüÿœæ]+$/.test(w) && !(w.length > 7 && w.endsWith('ment'));
}

const stem = (w: string) => w.replace(/(es|s|x)$/, '').replace(/e$/, '');
/** Variante d'un même mot (pluriel, féminin…) : « soleil » / « soleils », « lion » / « lionne ». */
export function variant(a: string, b: string): boolean {
  a = normalizeWord(a); b = normalizeWord(b);
  if (a === b || stem(a) === stem(b)) return true;
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  return s.length >= 4 && l.startsWith(s) && l.length - s.length <= 2;
}

const t = (a: string, b: string) => temperature(a, b) ?? -100;
/** Lien valide entre deux mots consécutifs. */
export function validLink(a: string, b: string): boolean {
  const x = t(a, b);
  return x >= MIN_LINK && x < MAX_LINK && !variant(a, b);
}

export type Verdict =
  | { kind: 'vide' }
  | { kind: 'inconnu'; word: string }
  | { kind: 'deja'; word: string }
  | { kind: 'loin'; word: string; temperature: number; prev: string }
  | { kind: 'proche'; word: string; temperature: number; prev: string }
  | { kind: 'ok'; word: string; temperature: number; prev: string; done: boolean };

/** Juge le mot proposé après `chain` (départ + mots déjà posés) vers `target`. */
export function judge(chain: string[], target: string, raw: string): Verdict {
  const word = normalizeWord(raw);
  if (!word) return { kind: 'vide' };
  if (!known(word)) return { kind: 'inconnu', word };
  const prev = chain[chain.length - 1];
  if (chain.some(c => normalizeWord(c) === word)) return { kind: 'deja', word };
  const x = t(prev, word);
  if (normalizeWord(target) === word) {
    return x >= MIN_LINK ? { kind: 'ok', word, temperature: x, prev, done: true } : { kind: 'loin', word, temperature: x, prev };
  }
  if (x < MIN_LINK) return { kind: 'loin', word, temperature: x, prev };
  if (x >= MAX_LINK || variant(prev, word)) return { kind: 'proche', word, temperature: x, prev };
  if (chain.some(c => variant(c, word))) return { kind: 'deja', word };
  return { kind: 'ok', word, temperature: x, prev, done: t(word, target) >= MIN_LINK };
}

/** Températures de chaque lien d'une chaîne complète (départ … arrivée). */
export function links(chain: string[]): number[] {
  return chain.slice(1).map((w, i) => t(chain[i], w));
}

/** Chaleur d'un mot vers l'arrivée, de 0 à 100 (jauge « Vers … »). */
export function towards(word: string, target: string): number {
  return Math.max(0, Math.min(100, Math.round(t(word, target))));
}

function band(word: string, avoid: string[]): string[] {
  return neighbors(word, K)
    .filter(n => n.temperature >= MIN_LINK && n.temperature < MAX_LINK && usable(n.word))
    .map(n => n.word)
    .filter(w => !avoid.some(a => variant(a, w)));
}

/** Choisit la chaîne dont le lien le plus faible est le plus fort. */
function strongest(cands: string[][]): string[] | null {
  let best: string[] | null = null, score = -Infinity;
  for (const c of cands) { const s = Math.min(...links(c)); if (s > score) { score = s; best = c; } }
  return best;
}

/**
 * Chaîne la plus courte trouvée de `start` à `target` (mots courants, liens valides) ou null.
 * Exacte jusqu'à 3 liens dans le voisinage exploré (recherche des deux côtés), puis 4 liens en élargissant
 * le départ, puis recherche gloutonne en faisceau. `avoid` : mots à ne pas réutiliser.
 */
export function solve(start: string, target: string, avoid: string[] = [], maxSteps = 8): string[] | null {
  start = normalizeWord(start); target = normalizeWord(target);
  if (!known(start) || !known(target)) return null;
  if (t(start, target) >= MIN_LINK) return [start, target];
  const ban = [start, target, ...avoid];
  const A = band(start, ban);
  const two = A.filter(a => t(a, target) >= MIN_LINK && !variant(a, target)).map(a => [start, a, target]);
  if (two.length) return strongest(two);
  if (maxSteps < 3) return null;
  const B = band(target, ban);
  const pairs = (from: string[]) => {
    const out: string[][] = [];
    for (const a of from) for (const b of B) if (a !== b && validLink(a, b)) out.push([a, b]);
    return out;
  };
  const three = pairs(A).map(([a, b]) => [start, a, b, target]);
  if (three.length) return strongest(three);
  if (maxSteps < 4) return null;
  // 4 liens : on élargit le départ par ses voisins les plus tournés vers l'arrivée
  const byGoal = (ws: string[]) => [...ws].sort((x, y) => t(y, target) - t(x, target));
  const four: string[][] = [];
  for (const a of byGoal(A).slice(0, 25)) {
    const X = band(a, [...ban, ...A]).slice(0, 120);
    for (const [x, b] of pairs(X)) if (!variant(x, a)) four.push([start, a, x, b, target]);
    if (four.length >= 40) break;
  }
  if (four.length) return strongest(four);
  // au-delà : faisceau glouton jusqu'à rejoindre le voisinage de l'arrivée
  const Bset = new Set(B);
  let beam: string[][] = byGoal(A).slice(0, 6).map(a => [start, a]);
  for (let depth = 2; depth <= maxSteps - 2 && beam.length; depth++) {
    const next: string[][] = [];
    for (const path of beam) {
      const last = path[path.length - 1];
      for (const x of byGoal(band(last, [...ban, ...path])).slice(0, 8)) {
        const p = [...path, x];
        const hit = B.find(b => Bset.has(b) && !p.some(w => variant(w, b)) && validLink(x, b));
        if (hit) return [...p, hit, target];
        next.push(p);
      }
    }
    const seen = new Set<string>();
    beam = next.sort((p, q) => t(q[q.length - 1], target) - t(p[p.length - 1], target))
      .filter(p => { const k = p[p.length - 1]; if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 6);
  }
  return null;
}

/** Indice : une bonne étape suivante après la chaîne en cours (premier mot d'une chaîne la plus courte). */
export function hintAfter(chain: string[], target: string): string | null {
  const last = chain[chain.length - 1];
  const s = solve(last, target, chain.slice(0, -1));
  if (!s || s.length < 2) return null;
  return s[1] === normalizeWord(target) ? null : s[1];
}

/** Les plus proches voisins de l'arrivée, sans ses variantes (écran de fin). */
export function closeWords(target: string, n = 5): string[] {
  return neighbors(target, 40).map(x => x.word).filter(w => usable(w) && !variant(w, target)).slice(0, n);
}

export const pairKey = (a: string, b: string) => `${normalizeWord(a)}>${normalizeWord(b)}`;

/** Résultat de partage : couleurs des liens sans dévoiler les mots. */
export function shareSquares(chain: string[]): string[] {
  const l = links(chain);
  return chain.map((_, i) => (i === 0 ? '#FFD45C' : i === chain.length - 1 ? '#FFD23F' : l[i - 1] >= HOT_LINK ? '#FF9A3C' : '#FFB35C'));
}
export function shareText(chain: string[], date: Date): string {
  const l = links(chain);
  const emo = chain.map((_, i) => (i === 0 || i === chain.length - 1 ? '🟨' : l[i - 1] >= HOT_LINK ? '🟥' : '🟧')).join('');
  return `Nabulo · Lier · ${shortDate(date)}\n${chain.length - 1} étapes\n${emo}`;
}
export function shortDate(d: Date): string {
  const m = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][d.getMonth()];
  return `${d.getDate()} ${m}`;
}
