import AsyncStorage from '@react-native-async-storage/async-storage';
import { engine } from './engine';
import { dailyKey, shortDate, streak, untilMidnight } from './history';
import { bestTemperature } from './rules';
import { load } from './storage';
import type { DailyState } from './useDaily';

/* Données réelles des écrans « En cours », « Mini-jeux », « Classement » et « Profil » (tout vient du téléphone). */

export type Famille = 'jour' | 'mini' | 'duel' | 'multi';
export type Partie = { id: string; titre: string; sousTitre: string; route: string; famille: Famille; key: string | null };

const ENCOURS = 'nabulo:encours:';
const DAILY_PREFIX = 'nabulo:mdj:fr:';
export const encoursKey = (jeu: string) => `${ENCOURS}${jeu}`;
export const recordKey = (jeu: string) => `nabulo:record:${jeu}`;

/** Date d'un numéro de mot du jour (1 = 1er janvier 2026). */
export const dateOfDay = (day: number) => new Date(2026, 0, day);

type Saved = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);

function familleOf(route: string): Famille {
  if (route.startsWith('/duel')) return 'duel';
  if (route.startsWith('/multi') || route.startsWith('/coop')) return 'multi';
  return 'mini';
}

const NOMS: Record<string, string> = { 'plus-chaud': 'Plus chaud / froid', intrus: 'L’intrus', lier: 'Lier', chrono: 'Contre-la-montre' };

/** Mot du jour commencé mais pas trouvé, ou null. */
export async function dailyEnCours(day = engine.dayNumber(new Date())): Promise<DailyState | null> {
  const s = await load<DailyState | null>(dailyKey(day), null);
  return s && !s.solved && s.guesses.length > 0 ? s : null;
}

/** Une partie enregistrée par un jeu libre sous `nabulo:encours:<jeu>` (format libre : titre, sous-titre, route). */
export async function encoursOf(jeu: string): Promise<Partie | null> {
  const v = await load<Saved | null>(encoursKey(jeu), null);
  if (!v || typeof v !== 'object') return null;
  const route = str(v.route) ?? `/jeux/${jeu}`;
  return {
    id: jeu, key: encoursKey(jeu), route, famille: familleOf(route),
    titre: str(v.titre) ?? NOMS[jeu] ?? jeu,
    sousTitre: str(v.sousTitre) ?? str(v['sous-titre']) ?? str(v.sous_titre) ?? str(v.sub) ?? '',
  };
}

/** Toutes les parties à reprendre : le mot du jour d'abord, puis les jeux libres. */
export async function partiesEnCours(): Promise<Partie[]> {
  const out: Partie[] = [];
  const d = await dailyEnCours();
  if (d) {
    out.push({
      id: 'jour', key: null, route: '/mot-du-jour', famille: 'jour', titre: 'Jeu du jour',
      sousTitre: `${shortDate()} · ${d.guesses.length} essais · meilleur ${Math.round(bestTemperature(d.guesses))}°\njusqu’à minuit · ${untilMidnight()}`,
    });
  }
  let keys: readonly string[] = [];
  try { keys = await AsyncStorage.getAllKeys(); } catch { /* pas de stockage : rien en cours */ }
  const jeux = keys.filter(k => k.startsWith(ENCOURS)).map(k => k.slice(ENCOURS.length)).sort();
  for (const j of jeux) { const p = await encoursOf(j); if (p) out.push(p); }
  return out;
}

export async function abandonner(p: Partie) {
  if (!p.key) return;
  try { await AsyncStorage.removeItem(p.key); } catch { /* déjà effacée */ }
}

export async function recordOf(jeu: string): Promise<number | null> {
  const v = await load<unknown>(recordKey(jeu), null);
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

export type Stats = { serie: number; trouves: number; essaisMoyens: number | null; depuis: Date | null };

/** Statistiques du mot du jour calculées depuis toutes les parties enregistrées. */
export async function statsMotDuJour(): Promise<Stats> {
  const today = engine.dayNumber(new Date());
  let keys: readonly string[] = [];
  try { keys = await AsyncStorage.getAllKeys(); } catch { /* aucune partie */ }
  const days = keys.filter(k => k.startsWith(DAILY_PREFIX)).map(k => Number(k.slice(DAILY_PREFIX.length))).filter(Number.isFinite);
  let trouves = 0, essais = 0, first: number | null = null;
  for (const d of days) {
    const s = await load<DailyState | null>(dailyKey(d), null);
    if (!s || s.guesses.length === 0) continue;
    if (first === null || d < first) first = d;
    if (s.solved) { trouves++; essais += s.guesses.length; }
  }
  return { serie: await streak(today), trouves, essaisMoyens: trouves ? Math.round(essais / trouves) : null, depuis: first ? dateOfDay(first) : null };
}

/** Résultat du jour (pour le classement). */
export async function resultatDuJour(): Promise<DailyState | null> {
  return load<DailyState | null>(dailyKey(engine.dayNumber(new Date())), null);
}

/** Rivaux enregistrés par les duels sous `nabulo:rivaux` (liste { nom, bilan }) ; vide tant qu'il n'y a pas de comptes. */
export type Rival = { nom: string; bilan: string; route?: string };
export async function rivaux(): Promise<Rival[]> {
  const v = await load<unknown>('nabulo:rivaux', []);
  if (!Array.isArray(v)) return [];
  return v.filter((r): r is Rival => !!r && typeof r === 'object' && typeof (r as Rival).nom === 'string')
    .map(r => ({ nom: r.nom, bilan: typeof r.bilan === 'string' ? r.bilan : '', route: typeof r.route === 'string' ? r.route : undefined }));
}
