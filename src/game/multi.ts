/**
 * Modes multi (le bluff, battle royale, le relais) joués hors ligne avec des joueurs IA.
 * Les IA jouent avec le lexique : leurs indices et leurs mots sont des voisins, leurs votes viennent des températures.
 * Tout est pur (pas de React) et reproductible avec un `rand` (voir rng() du lexique).
 */
import { known, neighbors, temperature } from './lexicon';
import { normalizeWord } from './temperature';

export type Rand = () => number;
export type Player = { id: string; name: string; letter: string; color: string; me: boolean };

export const ME_COLOR = '#FFD45C';
/** Couleurs des avatars des IA (celles des joueurs de la maquette, puis quelques autres). */
export const AI_COLORS = ['#7CE0B5', '#FF86C8', '#9DD8FF', '#FFB35C', '#C9C2DD', '#C9A7FF', '#FF9E9E', '#A6E3F0', '#B9E58C'];

/** Toi + `aiCount` IA nommées « IA 1 », « IA 2 »… (jamais de faux pseudo humain). */
export function makePlayers(aiCount: number): Player[] {
  const me: Player = { id: 'me', name: 'Toi', letter: 'T', color: ME_COLOR, me: true };
  return [me, ...Array.from({ length: aiCount }, (_, i) => ({ id: `ia${i + 1}`, name: `IA ${i + 1}`, letter: String(i + 1), color: AI_COLORS[i % AI_COLORS.length], me: false }))];
}

export const pickIn = <T,>(rand: Rand, arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

export function shuffle<T>(rand: Rand, arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Mots secrets : des noms concrets et courants, que tout le monde peut faire deviner. */
const WORDS_RAW = (
  'poivre volcan mer pizza guitare plage montagne forêt soleil lune train avion bateau voiture vélo école hôpital cuisine ' +
  'fromage chocolat café pain pomme citron fraise gâteau neige pluie orage hiver musique piano cinéma roi château dragon ' +
  'pirate robot football tennis ballon médecin police jardin fleur arbre rivière lac désert île cheval lion tigre oiseau ' +
  'poisson abeille miel lait vin bière thé sel sucre étoile planète fusée téléphone ordinateur argent banque église prison ' +
  'armée guerre mariage anniversaire cadeau noël hôtel avocat prince sorcière fantôme tempête vent nuage sable plume chien ' +
  'lapin loup ours singe vache cochon mouton serpent dauphin banane cerise tomate carotte soupe riz sandwich chaussure ' +
  'chapeau robe lunettes valise clé fenêtre lampe bougie miroir peinture danse théâtre concert stade piscine ski parapluie couteau'
).split(' ');

let words: string[] | null = null;
export function secretWords(): string[] {
  if (!words) words = WORDS_RAW.filter(known);
  return words;
}
export function pickWord(rand: Rand, exclude: readonly string[] = []): string {
  const pool = secretWords().filter(w => !exclude.includes(w));
  return pickIn(rand, pool.length ? pool : secretWords());
}

/** Mots que les IA ne proposent jamais (le lexique vient du web). */
const BLOCK = new Set(['sexe', 'coquine', 'chatte', 'porno', 'salope', 'pute', 'cul', 'bite', 'nu', 'nue', 'adulte', 'gratuit', 'webcam', 'escort', 'viol', 'nazi']);

/** Même racine : identiques, l'un contient l'autre, ou 5 premières lettres communes (pluriels, dérivés). */
const fold = (w: string) => normalizeWord(w).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export function sameRoot(a: string, b: string): boolean {
  const x = fold(a), y = fold(b);
  if (x === y) return true;
  if (Math.min(x.length, y.length) >= 4 && (x.includes(y) || y.includes(x))) return true;
  return x.length >= 5 && y.length >= 5 && x.slice(0, 5) === y.slice(0, 5);
}

/** Voisins utilisables comme indice ou maillon : ni dérivé du mot, ni déjà joué. */
export function clueCandidates(word: string, k = 40, avoid: readonly string[] = []): { word: string; temperature: number }[] {
  return neighbors(word, k).filter(n =>
    !BLOCK.has(n.word) && n.word.length >= 3 && !/[-'’ ]/.test(n.word) && !sameRoot(n.word, word) && !avoid.some(a => sameRoot(a, n.word)));
}

/* =========================== Le bluff · l'imposteur =========================== */

export const BLUFF_ROUNDS = 6;
export type BluffRound = {
  secret: string; fake: string; imposter: string; order: string[];
  clues: Record<string, string>; votes: Record<string, string>;
};

export const bluffWordOf = (r: BluffRound, id: string) => (id === r.imposter ? r.fake : r.secret);

/** Nouvelle manche : un mot pour tous, un mot proche pour l'imposteur (tiré au hasard, toi compris). */
export function newBluffRound(players: Player[], rand: Rand, index: number, used: readonly string[] = []): BluffRound {
  for (let tries = 0; ; tries++) {
    const secret = pickWord(rand, used);
    const close = clueCandidates(secret, 30).filter(n => n.temperature >= 45 && n.temperature <= 82).slice(0, 6);
    if (!close.length && tries < 20) continue;
    const fake = close.length ? pickIn(rand, close).word : pickWord(rand, [secret]);
    // toi (en tête de liste) parles en dernier à la première manche, puis l'ordre tourne
    const n = players.length, start = (index + 1) % n;
    const order = players.map((_, i) => players[(start + i) % n].id);
    return { secret, fake, imposter: pickIn(rand, players).id, order, clues: {}, votes: {} };
  }
}

/** Indice d'une IA : un voisin de SON mot, assez proche sans être le plus évident. */
export function bluffAiClue(r: BluffRound, id: string, rand: Rand): string {
  const own = bluffWordOf(r, id);
  const c = clueCandidates(own, 40, [r.secret, r.fake, ...Object.values(r.clues)]);
  if (!c.length) return pickWord(rand, [r.secret, r.fake]);
  const zone = c.slice(1, 12);
  return (zone.length ? pickIn(rand, zone) : c[0]).word;
}

export type ClueCheck = { ok: true; word: string } | { ok: false; reason: 'vide' | 'inconnu' | 'evident' | 'deja' };
export function checkBluffClue(r: BluffRound, id: string, raw: string): ClueCheck {
  const w = normalizeWord(raw);
  if (!w) return { ok: false, reason: 'vide' };
  if (!known(w)) return { ok: false, reason: 'inconnu' };
  if (sameRoot(w, bluffWordOf(r, id))) return { ok: false, reason: 'evident' };
  if (Object.values(r.clues).some(c => normalizeWord(c) === w)) return { ok: false, reason: 'deja' };
  return { ok: true, word: w };
}

const temp0 = (a: string, b: string) => temperature(a, b) ?? 0;

/**
 * Vote d'une IA : l'imposteur est celui dont l'indice est le plus froid, à la fois avec le mot de l'IA
 * et avec les autres indices. Un peu de hasard pour qu'elles ne votent pas toutes pareil.
 */
export function bluffAiVote(r: BluffRound, players: Player[], voter: string, rand: Rand): string {
  const own = bluffWordOf(r, voter);
  const others = players.filter(p => p.id !== voter);
  let best = others[0].id, bestScore = Infinity;
  for (const p of others) {
    const clue = r.clues[p.id];
    if (!clue) continue;
    const rest = players.filter(q => q.id !== p.id && r.clues[q.id]).map(q => temp0(clue, r.clues[q.id]));
    const mean = rest.length ? rest.reduce((s, t) => s + t, 0) / rest.length : 0;
    const score = temp0(clue, own) + mean + rand() * 14;
    if (score < bestScore) { bestScore = score; best = p.id; }
  }
  return best;
}

export function tallyVotes(r: BluffRound): Record<string, number> {
  const t: Record<string, number> = {};
  for (const target of Object.values(r.votes)) t[target] = (t[target] ?? 0) + 1;
  return t;
}

/** Démasqué si l'imposteur a strictement le plus de votes. Démasqué : +2 à ceux qui l'ont désigné ; sinon +3 pour lui. */
export function bluffOutcome(r: BluffRound): { found: boolean; against: number; gains: Record<string, number> } {
  const t = tallyVotes(r), against = t[r.imposter] ?? 0;
  const found = Object.entries(t).every(([id, n]) => id === r.imposter || n < against) && against > 0;
  const gains: Record<string, number> = {};
  if (found) { for (const [voter, target] of Object.entries(r.votes)) if (target === r.imposter) gains[voter] = 2; }
  else gains[r.imposter] = 3;
  return { found, against, gains };
}

/** Classement par points décroissants (à égalité, l'ordre des joueurs). */
export function rankByScore(players: Player[], scores: Record<string, number>): Player[] {
  return [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0) || players.indexOf(a) - players.indexOf(b));
}

/* =========================== Battle royale =========================== */

export const BR_ROUND_SECONDS = 25;
export const BR_PLAYERS = 8;

/** Combien sortent à la fin d'une manche : les 2 plus froids, mais il reste toujours au moins un joueur. */
export const brOutCount = (alive: number) => Math.min(2, alive - 1);
/** Nombre de manches pour passer de `n` joueurs à un seul. */
export function brRoundCount(n: number): number { let r = 0; while (n > 1) { n -= brOutCount(n); r++; } return r; }

/** Niveau d'une IA (0,3 à 1). */
export const brSkill = (rand: Rand) => 0.3 + rand() * 0.7;

/** Essai d'une IA : un mot pris dans les voisins du mot secret, d'autant plus proche qu'elle est forte. Rarement, le mot lui-même. */
export function brAiGuess(secret: string, pool: readonly { word: string; temperature: number }[], skill: number, rand: Rand): { word: string; temperature: number } {
  if (rand() < 0.0025 * skill || !pool.length) return { word: secret, temperature: 100 };
  const idx = Math.floor(pool.length * Math.pow(rand(), 0.6 + 1.2 * skill));
  return pool[Math.min(pool.length - 1, idx)];
}

/** Fin de manche : tri du plus chaud au plus froid (égalité au hasard), puis les plus froids sortent. */
export function brEliminate<T extends { id: string; best: number }>(alive: readonly T[], rand: Rand): { order: T[]; out: T[] } {
  const keyed = alive.map(p => ({ p, k: rand() }));
  keyed.sort((a, b) => b.p.best - a.p.best || a.k - b.k);
  const order = keyed.map(x => x.p), n = brOutCount(order.length);
  return { order, out: n > 0 ? order.slice(order.length - n) : [] };
}

/** Quand tu es éliminé, la fin se joue sans toi : le niveau de chaque IA et un peu de hasard décident. */
export function brSimulateRest(alive: readonly { id: string; skill: number }[], fromRound: number, rand: Rand): { winner: string; outRound: Record<string, number> } {
  let left = [...alive];
  const outRound: Record<string, number> = {};
  let round = fromRound;
  while (left.length > 1) {
    const scored = left.map(p => ({ id: p.id, best: 30 + 60 * Math.pow(rand(), 1.4 - p.skill), skill: p.skill }));
    const { out } = brEliminate(scored, rand);
    for (const o of out) outRound[o.id] = round;
    left = left.filter(p => !out.some(o => o.id === p.id));
    round++;
  }
  return { winner: left[0].id, outRound };
}

/* =========================== Le relais =========================== */

export const RELAIS_MIN = 30;
export const RELAIS_HEARTS = 3;
export type Link = { by: string; word: string; temperature: number | null };

export type RelaisCheck = { ok: true; word: string; temperature: number } | { ok: false; reason: 'vide' | 'inconnu' | 'deja' } | { ok: false; reason: 'froid'; word: string; temperature: number };

/** Un maillon est valable s'il est connu, nouveau et à 30° ou plus du dernier mot (sinon : un cœur perdu). */
export function checkRelais(chain: readonly Link[], raw: string): RelaisCheck {
  const w = normalizeWord(raw);
  if (!w) return { ok: false, reason: 'vide' };
  if (!known(w)) return { ok: false, reason: 'inconnu' };
  // déjà joué, au pluriel ou aux accents près (hôtel / hotel / hôtels)
  const f = fold(w), bare = (x: string) => x.replace(/[sx]$/, '');
  if (chain.some(l => fold(l.word) === f || bare(fold(l.word)) === bare(f))) return { ok: false, reason: 'deja' };
  const t = temperature(w, chain[chain.length - 1].word) ?? 0;
  return t >= RELAIS_MIN ? { ok: true, word: w, temperature: t } : { ok: false, reason: 'froid', word: w, temperature: t };
}

/** Maillon d'une IA : un voisin du dernier mot ; parfois (8 %) elle se trompe et propose un mot sans rapport. */
export function relaisAiWord(chain: readonly Link[], rand: Rand): string {
  const used = chain.map(l => l.word);
  if (rand() < 0.08) return pickWord(rand, used);
  const c = clueCandidates(chain[chain.length - 1].word, 30, used);
  if (!c.length) return pickWord(rand, used);
  return pickIn(rand, c.slice(0, 10)).word;
}

/** Le lien le plus chaud de la chaîne. */
export function bestLink(chain: readonly Link[]): { from: string; to: string; temperature: number } | null {
  let best: { from: string; to: string; temperature: number } | null = null;
  for (let i = 1; i < chain.length; i++) {
    const t = chain[i].temperature;
    if (t !== null && (!best || t > best.temperature)) best = { from: chain[i - 1].word, to: chain[i].word, temperature: t };
  }
  return best;
}
