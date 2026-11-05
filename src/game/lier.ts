/**
 * « Lier » (le pont) : relier un mot de départ à un mot d'arrivée par une chaîne de mots proches.
 * Chaque mot doit être à MIN_LINK° ou plus du précédent (sinon « trop loin ») mais pas un quasi-doublon
 * (MAX_LINK° ou plus, ou simple variante comme un pluriel : « trop proche »).
 * La chaîne est finie dès que le dernier mot est à MIN_LINK° ou plus du mot d'arrivée.
 * Score = nombre de **maillons** : les mots que le joueur a ajoutés entre le départ et l'arrivée (ce que montre la
 * pastille en jeu) ; moins il y en a, mieux c'est. Une chaîne de n maillons a n + 1 liens.
 */
import { known, neighbors, temperature } from './lexicon';
import { DIFFICILE, DIFFICILE_MAX, FACILE, MOYEN, type Level, type Pair } from './lier-paires';
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

/**
 * Indice : un mot intermédiaire valable après la chaîne en cours — lien valide avec le dernier mot et plus chaud
 * vers l'arrivée que lui. De préférence le premier mot d'une chaîne la plus courte ; sinon le voisin valide le plus
 * tourné vers l'arrivée. null si la chaîne peut déjà se refermer ou si aucun mot ne convient.
 */
export function hintAfter(chain: string[], target: string): string | null {
  const last = chain[chain.length - 1];
  const goal = normalizeWord(target);
  if (t(last, goal) >= MIN_LINK) return null;
  const here = t(last, goal);
  const fresh = (w: string) => w !== goal && !chain.some(c => variant(c, w)) && validLink(last, w);
  const s = solve(last, goal, chain.slice(0, -1));
  const first = s && s.length > 2 && fresh(s[1]) ? s[1] : null;
  if (first && t(first, goal) > here) return first;
  const better = band(last, [...chain, goal]).filter(w => fresh(w) && t(w, goal) > here).sort((x, y) => t(y, goal) - t(x, goal));
  return better[0] ?? first;
}

/** Peut-on refermer la chaîne (le dernier mot posé touche l'arrivée) ? */
export function canClose(chain: string[], target: string): boolean {
  return chain.length > 1 && t(chain[chain.length - 1], target) >= MIN_LINK;
}

/** Les plus proches voisins de l'arrivée, sans ses variantes (écran de fin). */
export function closeWords(target: string, n = 5): string[] {
  const plain = (w: string) => normalizeWord(w).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const out: string[] = [];
  for (const { word: w } of neighbors(target, 40)) {
    if (out.length >= n) break;
    // ni variante de l'arrivée ni d'un voisin déjà retenu (« plage » / « plages »), accents compris (« île » / « ile »)
    if (usable(w) && ![target, ...out].some(o => variant(w, o) || variant(plain(w), plain(o)))) out.push(w);
  }
  return out;
}

export const pairKey = (a: string, b: string) => `${normalizeWord(a)}>${normalizeWord(b)}`;

/** Résultat de partage : couleurs des liens sans dévoiler les mots. */
export function shareSquares(chain: string[]): string[] {
  const l = links(chain);
  return chain.map((_, i) => (i === 0 ? '#FFD45C' : i === chain.length - 1 ? '#FFD23F' : l[i - 1] >= HOT_LINK ? '#FF9A3C' : '#FFB35C'));
}
/** « 3 maillons », « 1 maillon ». */
export const maillonsLabel = (n: number) => `${n} maillon${n > 1 ? 's' : ''}`;
/** Maillons d'une chaîne complète (départ … arrivée) : les mots posés entre les deux. */
export const maillons = (chain: string[]) => Math.max(0, chain.length - 2);

export const LEVEL_LABEL: Record<Level, string> = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' };

/**
 * Texte partagé : la performance et une invitation, sans dévoiler les mots de la chaîne (seulement les couleurs des
 * liens). Le départ et l'arrivée sont donnés : c'est le défi lui-même.
 */
export function shareText(chain: string[], date: Date, level: Level | 'defi' = 'defi'): string {
  const l = links(chain);
  const emo = chain.map((_, i) => (i === 0 || i === chain.length - 1 ? '🟨' : l[i - 1] >= HOT_LINK ? '🟥' : '🟧')).join('');
  const where = level === 'defi' ? `Défi du jour · ${shortDate(date)}` : `Lier · ${LEVEL_LABEL[level]}`;
  return `J’ai relié « ${chain[0]} » à « ${chain[chain.length - 1]} » en ${maillonsLabel(maillons(chain))} sur Nabulo 🔗 Tu fais mieux ?\n${where}\n${emo}`;
}
export function shortDate(d: Date): string {
  const m = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][d.getMonth()];
  return `${d.getDate()} ${m}`;
}

/* ---------- Paires tirées au hasard selon la difficulté ---------- */

/**
 * Noms courants et concrets dont on tire les paires (complétés par les mots des paires de lier-paires.ts).
 * Les mots inconnus du lexique ou non jouables sont écartés.
 */
const POOL = `chat chien cheval vache loup lion ours oiseau poisson serpent abeille souris lapin cochon mouton singe tigre éléphant
baleine requin aigle pomme poire citron orange tomate fraise banane carotte pain fromage beurre lait sucre sel miel chocolat
gâteau café thé vin bière soupe riz maison école église château prison hôpital musée gare usine ferme marché boulangerie
cuisine chambre jardin garage pont tour mur porte fenêtre toit escalier voiture vélo moto bus train avion bateau camion métro
fusée taxi tracteur soleil lune étoile nuage pluie neige vent orage mer plage montagne forêt rivière lac île désert volcan
océan ciel terre sable glace feu livre journal lettre crayon stylo papier cahier piano guitare violon tambour trompette
chanson film théâtre danse peinture photo radio télévision téléphone ordinateur écran internet clavier robot roi reine prince
princesse soldat médecin docteur juge police pompier boulanger professeur enfant mère père bébé ami voisin épée bouclier
couronne clé miroir horloge bougie lampe chaise table lit armoire couteau fourchette assiette verre bouteille sac chapeau
chaussure robe manteau bijou bague football tennis sport ballon jeu course vacances voyage fête anniversaire mariage guerre
paix argent loi travail hiver été printemps automne nuit matin arbre fleur rose herbe feuille racine graine bois pierre fer
or diamant charbon`;

let pool: string[] | null = null;
export function pairPool(): string[] {
  if (pool) return pool;
  const set = new Set(POOL.split(/\s+/).filter(Boolean));
  for (const [a, b] of [...FACILE, ...MOYEN, ...DIFFICILE]) { set.add(a); set.add(b); }
  pool = [...set].filter(w => known(w) && usable(normalizeWord(w)));
  return pool;
}

/**
 * Difficulté d'une paire, d'après le plus court chemin trouvé par le solveur et la distance entre les deux mots.
 * Sur ce lexique, deux noms courants se relient presque toujours en 1 ou 2 maillons : la longueur seule ne suffit pas,
 * on la croise avec la température départ → arrivée (mêmes critères que les paires de lier-paires.ts) :
 * - facile : 1 maillon suffit, mots assez proches (de 6° à MIN_LINK°) ;
 * - moyen : 2 maillons au minimum, mots éloignés (de DIFFICILE_MAX à 10°) ;
 * - difficile : 2 maillons au minimum, mots très éloignés (sous DIFFICILE_MAX).
 * Le minimum de maillons est le même pour toutes les paires d'un niveau : les records par niveau restent comparables.
 */
export const LEVEL_MIN: Record<Level, number> = { facile: 1, moyen: 2, difficile: 2 };
const TEMP_BAND: Record<Level, [number, number]> = { facile: [6, MIN_LINK], moyen: [DIFFICILE_MAX, 10], difficile: [-100, DIFFICILE_MAX] };
/** Nombre maximal d'appels au solveur par tirage (≈ 10 à 50 ms chacun). */
const SOLVE_BUDGET = 40;

/** La paire a-t-elle exactement ce niveau ? */
export function hasLevel(a: string, b: string, level: Level): boolean {
  const [lo, hi] = TEMP_BAND[level], x = t(a, b);
  if (x < lo || x >= hi || variant(a, b)) return false;
  const n = LEVEL_MIN[level];
  const c = solve(a, b, [], n + 1);
  return !!c && c.length === n + 2;
}

/**
 * Nouvelle paire aléatoire du niveau demandé, différente de celles de `recent` (clés pairKey).
 * Préfiltre par température (les mots proches se lient vite, les mots éloignés demandent plus de maillons)
 * pour limiter les appels au solveur ; `fallback` sert si rien n'est trouvé dans le budget d'essais.
 */
export function randomPair(level: Level, rand: () => number, recent: readonly string[] = [], fallback: readonly Pair[] = [], tries = 400): Pair {
  const words = pairPool();
  const [lo, hi] = TEMP_BAND[level];
  let solved = 0;
  for (let i = 0; i < tries && solved < SOLVE_BUDGET; i++) {
    const a = words[Math.floor(rand() * words.length)], b = words[Math.floor(rand() * words.length)];
    if (a === b || recent.includes(pairKey(a, b))) continue;
    const x = t(a, b);
    if (x < lo || x >= hi) continue;
    solved++;
    if (hasLevel(a, b, level)) return [a, b];
  }
  const fresh = fallback.filter(p => !recent.includes(pairKey(p[0], p[1])));
  const list = fresh.length ? fresh : fallback;
  return list[Math.floor(rand() * list.length)] ?? ['violon', 'île'];
}
