/**
 * Manches des jeux libres solo (Plus chaud / plus froid, L'intrus, Contre-la-montre), tirées avec le lexique hors ligne.
 * Tout est pur et reproductible : on passe un générateur `rand` (voir `rng` dans lexicon.ts).
 */
import { known, neighbors, temperature } from './lexicon';
import { normalizeWord } from './temperature';

/** Noms courants et concrets : mots cibles et mots « lointains » (le lexique ne connaît pas la nature des mots). */
const NOMS = [
  'océan', 'montagne', 'cuisine', 'volcan', 'hiver', 'chat', 'forêt', 'musique', 'jardin', 'soleil', 'neige', 'voyage',
  'étoile', 'pluie', 'café', 'livre', 'plage', 'château', 'fleur', 'train', 'pain', 'rivière', 'nuage', 'orage', 'désert',
  'feu', 'glace', 'lune', 'ville', 'piano', 'guitare', 'violon', 'tambour', 'tulipe', 'rose', 'voiture', 'vélo', 'avion',
  'bateau', 'camion', 'moto', 'chien', 'cheval', 'lapin', 'oiseau', 'poisson', 'lion', 'loup', 'ours', 'vache', 'cochon',
  'serpent', 'pomme', 'citron', 'orange', 'fraise', 'banane', 'tomate', 'carotte', 'fromage', 'chocolat', 'gâteau', 'soupe',
  'salade', 'viande', 'poulet', 'beurre', 'sucre', 'sel', 'miel', 'lait', 'vin', 'bière', 'thé', 'école', 'hôpital', 'église',
  'prison', 'banque', 'musée', 'théâtre', 'cinéma', 'restaurant', 'maison', 'chambre', 'fenêtre', 'porte', 'table', 'chaise',
  'lit', 'lampe', 'miroir', 'horloge', 'clé', 'téléphone', 'ordinateur', 'écran', 'clavier', 'télévision', 'radio', 'journal',
  'lettre', 'stylo', 'crayon', 'papier', 'cahier', 'médecin', 'docteur', 'soldat', 'roi', 'reine', 'prince', 'princesse',
  'pirate', 'sorcière', 'dragon', 'robot', 'fantôme', 'football', 'tennis', 'ski', 'natation', 'danse', 'peinture', 'photo',
  'chanson', 'poème', 'roman', 'film', 'guerre', 'paix', 'amour', 'mariage', 'bébé', 'enfant', 'famille', 'argent', 'or',
  'diamant', 'bijou', 'montre', 'chapeau', 'chaussure', 'robe', 'pantalon', 'manteau', 'cravate', 'sac', 'valise', 'parapluie',
  'arbre', 'herbe', 'feuille', 'racine', 'pierre', 'sable', 'mer', 'lac', 'île', 'ciel', 'vent', 'tempête', 'tonnerre', 'éclair',
  'été', 'automne', 'printemps', 'matin', 'nuit', 'soir', 'route', 'pont', 'tunnel', 'gare', 'port', 'aéroport', 'marteau',
  'couteau', 'fourchette', 'cuillère', 'assiette', 'verre', 'bouteille', 'four', 'frigo', 'savon', 'brosse', 'serviette',
  'ballon', 'jouet', 'poupée', 'cadeau', 'fête', 'anniversaire', 'noël', 'bougie', 'sapin', 'cirque', 'clown', 'magie',
  'planète', 'fusée', 'espace', 'cerveau', 'cœur', 'main', 'pied', 'œil', 'dent', 'cheveu', 'sang', 'médicament', 'vaccin',
  'abeille', 'papillon', 'fourmi', 'araignée', 'requin', 'baleine', 'dauphin', 'tortue', 'singe', 'éléphant', 'girafe',
  'tigre', 'renard', 'souris', 'grenouille', 'canard', 'poule', 'mouton', 'chèvre', 'cerise', 'raisin', 'poire', 'pêche',
  'riz', 'pâtes', 'pizza', 'sandwich', 'croissant', 'omelette', 'confiture', 'farine', 'charbon', 'pétrole', 'électricité',
  'usine', 'ferme', 'tracteur', 'blé', 'vigne', 'église', 'prière', 'ange', 'diable', 'ciseaux', 'aiguille', 'laine',
];

/** Mots à double sens (« en train de », « il porte ») : leurs voisins seraient déroutants. */
const AMBIGUS = new Set(['train', 'or', 'été', 'pêche', 'montre', 'ferme', 'porte', 'lit', 'sel', 'port', 'espace', 'main']);

let nomsCache: string[] | null = null;
/** Les noms de la liste que le lexique connaît (sans doublon). */
export function noms(): string[] {
  if (!nomsCache) nomsCache = [...new Set(NOMS)].filter(w => !AMBIGUS.has(w) && known(w));
  return nomsCache;
}

const pick = <T,>(rand: () => number, a: readonly T[]): T => a[Math.floor(rand() * a.length)];
function shuffle<T>(rand: () => number, a: readonly T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}
const t = (a: string, b: string) => temperature(a, b) ?? -100;

/** Deux mots de la même famille (océan / océans, cuisine / cuisiner, piano / pianiste) : on n'en garde qu'un. */
export function sameFamily(a: string, b: string): boolean {
  const x = normalizeWord(a), y = normalizeWord(b);
  if (x === y) return true;
  let n = 0;
  while (n < x.length && n < y.length && x[n] === y[n]) n++;
  return n >= Math.min(4, x.length, y.length) && Math.min(x.length, y.length) >= 3 && n >= 3;
}

/** Voisins « propres » d'un mot : mots simples, sans les mots de sa famille ni deux mots de la même famille. */
export function cleanNeighbors(word: string, k = 5, scan = 60): { word: string; temperature: number }[] {
  const out: { word: string; temperature: number }[] = [];
  for (const n of neighbors(word, scan)) {
    if (n.word.length < 3 || /[^a-zàâäçéèêëîïôöùûüÿœæ]/.test(n.word)) continue;
    if (sameFamily(n.word, word) || out.some(o => sameFamily(o.word, n.word))) continue;
    out.push(n);
    if (out.length >= k) break;
  }
  return out;
}

/* ---------- Plus chaud / plus froid ---------- */
export type ManchePlusChaud = { cible: string; mots: [string, string]; temps: [number, number]; bonne: 0 | 1 };
export const ECART_MIN = 15;

/**
 * Un mot cible, un voisin proche et un mot lointain, avec au moins `ECART_MIN` °C d'écart.
 * Plus la série est longue, plus l'écart se resserre (30 °C au début, 15 °C à partir de 15 bonnes réponses).
 */
export function manchePlusChaud(rand: () => number, serie = 0, deja: ReadonlySet<string> = new Set()): ManchePlusChaud {
  const ecart = Math.max(ECART_MIN, 30 - serie);
  for (let essai = 0; ; essai++) {
    const cible = pick(rand, noms());
    if (deja.has(cible) && essai < 50) continue;
    const proches = cleanNeighbors(cible, 12).filter(n => n.temperature >= 45);
    if (proches.length < 3) continue;
    // au début on prend les tout proches, ensuite des voisins un peu plus loin
    const fen = proches.slice(0, Math.min(proches.length, 4 + Math.floor(serie / 3)));
    const proche = pick(rand, fen);
    const loins = noms().filter(w => !sameFamily(w, cible) && !sameFamily(w, proche.word))
      .map(w => ({ word: w, temperature: t(cible, w) }))
      .filter(n => n.temperature <= proche.temperature - ecart && n.temperature <= 42);
    if (!loins.length) continue;
    // les lointains les plus « chauds » rendent le choix moins évident quand la série grandit
    loins.sort((a, b) => b.temperature - a.temperature);
    const loin = serie >= 8 ? pick(rand, loins.slice(0, Math.max(3, Math.ceil(loins.length / 3)))) : pick(rand, loins);
    const r1 = Math.round(proche.temperature), r2 = Math.round(loin.temperature);
    return rand() < 0.5
      ? { cible, mots: [proche.word, loin.word], temps: [r1, r2], bonne: 0 }
      : { cible, mots: [loin.word, proche.word], temps: [r2, r1], bonne: 1 };
  }
}

/* ---------- L'intrus ---------- */
export type MancheIntrus = { mots: string[]; intrus: number; theme: string };
/** Température minimale entre deux mots du groupe, maximale entre l'intrus et le groupe. */
export const GROUPE_MIN = 50, INTRUS_MAX = 33;

/** 4 mots proches entre eux (un thème et ses voisins) et 1 mot lointain, mélangés. */
export function mancheIntrus(rand: () => number, deja: ReadonlySet<string> = new Set()): MancheIntrus {
  for (let essai = 0; ; essai++) {
    const theme = pick(rand, noms());
    if (deja.has(theme) && essai < 50) continue;
    const cands = shuffle(rand, cleanNeighbors(theme, 10).filter(n => n.temperature >= 52).map(n => n.word));
    const groupe = [theme];
    for (const c of cands) {
      if (groupe.length === 4) break;
      if (groupe.every(g => !sameFamily(g, c) && t(g, c) >= GROUPE_MIN)) groupe.push(c);
    }
    if (groupe.length < 4) continue;
    const intrus = shuffle(rand, noms()).find(w => groupe.every(g => !sameFamily(g, w) && t(g, w) <= INTRUS_MAX));
    if (!intrus) continue;
    const mots = shuffle(rand, [...groupe, intrus]);
    return { mots, intrus: mots.indexOf(intrus), theme };
  }
}

/* ---------- Contre-la-montre ---------- */
export const CHRONO_DUREE = 60, CHRONO_SEUIL = 50, CHRONO_ALERTE = 10;
export type Essai = { word: string; temperature: number };
export type Verdict = { ok: true; essai: Essai } | { ok: false; raison: 'vide' | 'inconnu' | 'cible' | 'deja' };

/** Un mot cible courant qui a assez de voisins à 50 °C ou plus pour que la partie soit jouable. */
export function cibleChrono(rand: () => number): string {
  for (;;) {
    const c = pick(rand, noms());
    if (neighbors(c, 30).filter(n => n.temperature >= CHRONO_SEUIL).length >= 15) return c;
  }
}

/** Vérifie un mot proposé au contre-la-montre. */
export function essaiChrono(cible: string, saisie: string, essais: readonly Essai[]): Verdict {
  const w = normalizeWord(saisie);
  if (!w) return { ok: false, raison: 'vide' };
  if (!known(w)) return { ok: false, raison: 'inconnu' };
  if (w === normalizeWord(cible) || w === cible + 's' || w === cible + 'x') return { ok: false, raison: 'cible' };
  if (essais.some(e => e.word === w)) return { ok: false, raison: 'deja' };
  return { ok: true, essai: { word: w, temperature: Math.round(t(cible, w)) } };
}

export const motsTrouves = (essais: readonly Essai[]) => essais.filter(e => e.temperature >= CHRONO_SEUIL).length;

/** Couleur des pastilles du contre-la-montre (maquette : 81° #FF7240, 78° #FF9A3C, 63° #FFB35C, 52° #FFD45C, 31° #A9C6F2). */
export function couleurPastille(temp: number): string {
  if (temp >= 90) return '#FF5A36';
  if (temp >= 80) return '#FF7240';
  if (temp >= 70) return '#FF9A3C';
  if (temp >= 60) return '#FFB35C';
  if (temp >= CHRONO_SEUIL) return '#FFD45C';
  return '#A9C6F2';
}

/** Couleurs des voisins de l'écran de fin, du plus proche au moins proche. */
export const COULEURS_VOISINS = ['#FF5A36', '#FF7240', '#FF9A3C', '#FFB35C', '#FFD45C'] as const;
