import { dailyKey } from './history';
import { load, save } from './storage';
import type { DailyState } from './useDaily';

/* Série du Jeu du jour : jours d'affilée où le mot a été trouvé, et bonus de brez tous les 3 jours. */

/** Un palier tous les 3 jours de suite (3, 6, 9, 12…). */
export const PALIER_JOURS = 3;
/** Bonus du 1er palier (3 jours). */
export const PALIER_BONUS_DEPART = 30;
/** Ce que chaque palier ajoute au précédent : 30, 50, 70, 90… */
export const PALIER_BONUS_PAS = 20;
/** Clé des paliers déjà payés. */
export const PALIERS_KEY = 'nabulo:serie-paliers';
/** Nombre de paiements gardés en mémoire (les plus anciens ne servent plus). */
const GARDES = 120;

/** Bonus du palier atteint à `longueur` jours (0 si ce n'est pas un palier). */
export function bonusPalier(longueur: number): number {
  if (longueur < PALIER_JOURS || longueur % PALIER_JOURS !== 0) return 0;
  return PALIER_BONUS_DEPART + (longueur / PALIER_JOURS - 1) * PALIER_BONUS_PAS;
}

/** Prochain palier strictement au-dessus d'une série de `longueur` jours. */
export function prochainPalier(longueur: number): { jours: number; bonus: number; reste: number } {
  const jours = (Math.floor(Math.max(0, longueur) / PALIER_JOURS) + 1) * PALIER_JOURS;
  return { jours, bonus: bonusPalier(jours), reste: jours - Math.max(0, longueur) };
}

/** Série en cours : aujourd'hui compte s'il est trouvé ; s'il n'est pas encore joué, la série court jusqu'à hier. */
export function serieEnCours(trouves: ReadonlySet<number>, today: number): { longueur: number; debut: number | null } {
  let d = trouves.has(today) ? today : today - 1;
  let n = 0;
  while (d > 0 && trouves.has(d)) { n++; d--; }
  return { longueur: n, debut: n > 0 ? d + 1 : null };
}

/** Meilleure série (jours consécutifs trouvés) jusqu'à aujourd'hui inclus. */
export function meilleureSerie(trouves: ReadonlySet<number>, today: number): number {
  let best = 0, run = 0;
  for (let d = 1; d <= today; d++) {
    run = trouves.has(d) ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

/** Un palier payé : la série est repérée par son 1er jour, le palier par sa longueur. */
export type PalierPaye = { debut: number; jours: number; bonus: number; jour: number };
export type Paiement = { bonus: number; serie: number; paliers: PalierPaye[] };

/** Paliers atteints par la série en cours qui n'ont pas encore été payés (calcul pur). */
export function paliersDus(trouves: ReadonlySet<number>, today: number, payes: readonly PalierPaye[]): Paiement {
  const { longueur, debut } = serieEnCours(trouves, today);
  if (debut === null || !trouves.has(today)) return { bonus: 0, serie: longueur, paliers: [] };
  const deja = new Set(payes.filter(p => p.debut === debut).map(p => p.jours));
  const paliers: PalierPaye[] = [];
  for (let j = PALIER_JOURS; j <= longueur; j += PALIER_JOURS) {
    if (!deja.has(j)) paliers.push({ debut, jours: j, bonus: bonusPalier(j), jour: today });
  }
  return { bonus: paliers.reduce((s, p) => s + p.bonus, 0), serie: longueur, paliers };
}

/* ---------- lecture / écriture ---------- */

export type Store = { load: typeof load; save: typeof save };
const defaut: Store = { load, save };

/** Jours trouvés de 1 à `today` (historique réel : clés nabulo:mdj:fr:<jour>). */
export async function joursTrouves(today: number, store: Store = defaut): Promise<Set<number>> {
  const jours = Array.from({ length: Math.max(0, today) }, (_, i) => i + 1);
  const etats = await Promise.all(jours.map(d => store.load<DailyState | null>(dailyKey(d), null)));
  return new Set(jours.filter((_, i) => !!etats[i]?.solved));
}

export const paliersPayes = (store: Store = defaut) => store.load<PalierPaye[]>(PALIERS_KEY, []);

/**
 * Ce que `paliersAPayer` verserait maintenant, sans rien enregistrer (pour l'annoncer pendant l'animation).
 * `trouveAujourdhui` : la partie du jour vient d'être gagnée (sa sauvegarde peut ne pas être encore écrite).
 */
export async function apercuPaliers(today: number, store: Store = defaut, trouveAujourdhui = true): Promise<Paiement> {
  const [trouves, payes] = await Promise.all([joursTrouves(today, store), paliersPayes(store)]);
  if (trouveAujourdhui) trouves.add(today);
  return paliersDus(trouves, today, payes);
}

/**
 * À appeler quand le mot du jour est trouvé : renvoie le bonus de série dû et l'enregistre aussitôt comme payé,
 * pour qu'il ne soit jamais versé deux fois (l'appelant ajoute `bonus` aux brez).
 */
export async function paliersAPayer(today: number, store: Store = defaut, trouveAujourdhui = true): Promise<Paiement> {
  const [trouves, payes] = await Promise.all([joursTrouves(today, store), paliersPayes(store)]);
  if (trouveAujourdhui) trouves.add(today);
  const du = paliersDus(trouves, today, payes);
  if (du.paliers.length) await store.save(PALIERS_KEY, [...payes, ...du.paliers].slice(-GARDES));
  return du;
}

/** Bonus déjà versé aujourd'hui (pour le réafficher en revenant sur l'écran de victoire). */
export async function payeAujourdhui(today: number, store: Store = defaut): Promise<Paiement> {
  const [trouves, payes] = await Promise.all([joursTrouves(today, store), paliersPayes(store)]);
  const paliers = payes.filter(p => p.jour === today);
  return { bonus: paliers.reduce((s, p) => s + p.bonus, 0), serie: serieEnCours(trouves, today).longueur, paliers };
}

/** Tout ce dont l'écran Calendrier a besoin. */
export async function etatSerie(today: number, store: Store = defaut) {
  const [trouves, payes] = await Promise.all([joursTrouves(today, store), paliersPayes(store)]);
  const enCours = serieEnCours(trouves, today);
  return { trouves, payes, serie: enCours.longueur, debut: enCours.debut, meilleure: meilleureSerie(trouves, today), aujourdhui: trouves.has(today) };
}
