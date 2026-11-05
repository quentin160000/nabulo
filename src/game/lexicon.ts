/**
 * Lexique des mini-jeux : similarité entre deux mots quelconques, voisins d'un mot, tirage de mots.
 * Hors ligne, à partir de assets/data/fr-vec.json (scripts/build_offline_data.py) : vecteurs word2vec frWac compacts
 * dans le même ordre que fr-dev.json, c'est-à-dire du mot le plus fréquent au moins fréquent.
 */
import { decodeBase64 } from './engine/local';
import { normalizeWord, toTemperature } from './temperature';

type Vec = { dim: number; count: number; scales: string; data: string };
type Lex = { words: string[]; index: Map<string, number>; dim: number; v: Float32Array };

let cache: Lex | null = null;
function lex(): Lex {
  if (cache) return cache;
  const words = (require('../../assets/data/fr-dev.json') as { words: string[] }).words;
  const raw = require('../../assets/data/fr-vec.json') as Vec;
  const q = decodeBase64(raw.data), sb = decodeBase64(raw.scales);
  const scales = new Float32Array(sb.buffer, sb.byteOffset, raw.count);
  const v = new Float32Array(raw.count * raw.dim);
  for (let i = 0; i < raw.count; i++) {
    const s = scales[i];
    for (let k = 0; k < raw.dim; k++) { const b = q[i * raw.dim + k]; v[i * raw.dim + k] = (b > 127 ? b - 256 : b) * s; }
  }
  cache = { words, index: new Map(words.map((w, i) => [w, i])), dim: raw.dim, v };
  return cache;
}

function dot(L: Lex, a: number, b: number) {
  let s = 0; const d = L.dim, oa = a * d, ob = b * d;
  for (let k = 0; k < d; k++) s += L.v[oa + k] * L.v[ob + k];
  return s;
}

/** Le mot est-il connu ? (après normalisation : minuscules, espaces retirés) */
export function known(word: string): boolean { return lex().index.has(normalizeWord(word)); }

/** Similarité cosinus brute (−1…1), ou null si un des mots est inconnu. */
export function cosine(a: string, b: string): number | null {
  const L = lex(), ia = L.index.get(normalizeWord(a)), ib = L.index.get(normalizeWord(b));
  if (ia === undefined || ib === undefined) return null;
  return dot(L, ia, ib);
}

/** Température entre deux mots, sur la même échelle que le mot du jour (100 = même mot). */
export function temperature(a: string, b: string): number | null {
  const c = cosine(a, b);
  if (c === null) return null;
  return toTemperature(c, normalizeWord(a) === normalizeWord(b));
}

/** Les `k` mots les plus proches de `word` (sans lui), parmi les `pool` mots les plus fréquents. */
export function neighbors(word: string, k = 20, pool = 8000): { word: string; temperature: number }[] {
  const L = lex(), i = L.index.get(normalizeWord(word));
  if (i === undefined) return [];
  const n = Math.min(pool, L.words.length), sims: [number, number][] = [];
  for (let j = 0; j < n; j++) if (j !== i) sims.push([j, dot(L, i, j)]);
  sims.sort((x, y) => y[1] - x[1]);
  return sims.slice(0, k).map(([j, s]) => ({ word: L.words[j], temperature: toTemperature(s, false) }));
}

/** Générateur pseudo-aléatoire reproductible (même graine = même partie). */
export function rng(seed: number) {
  let t = seed >>> 0;
  return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}

/** Un mot courant tiré au hasard (noms de 4 lettres ou plus parmi les `pool` plus fréquents). */
export function randomWord(rand: () => number, pool = 3000, minLen = 4): string {
  const L = lex();
  for (;;) { const w = L.words[Math.floor(rand() * Math.min(pool, L.words.length))]; if (w.length >= minLen && !w.includes('-')) return w; }
}
