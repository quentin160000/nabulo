import AsyncStorage from '@react-native-async-storage/async-storage';
import { load, save } from './storage';

/** Jeux libres solo : records (nombre) et partie en cours (lue par l'écran « En cours »). */
export type JeuLibre = 'plus-chaud' | 'intrus' | 'chrono';
export type EnCours = { titre: string; sousTitre: string; route: string };

export const cleRecord = (jeu: JeuLibre) => `nabulo:record:${jeu}`;
export const cleEnCours = (jeu: JeuLibre) => `nabulo:encours:${jeu}`;

export async function lireRecord(jeu: JeuLibre): Promise<number> {
  const v = await load<number>(cleRecord(jeu), 0);
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** Enregistre le score s'il bat le record. Renvoie l'ancien record. */
export async function enregistrerScore(jeu: JeuLibre, score: number): Promise<number> {
  const ancien = await lireRecord(jeu);
  if (score > ancien) await save(cleRecord(jeu), score);
  return ancien;
}

export const marquerEnCours = (jeu: JeuLibre, v: EnCours) => save(cleEnCours(jeu), v);
export async function finirEnCours(jeu: JeuLibre): Promise<void> {
  try { await AsyncStorage.removeItem(cleEnCours(jeu)); } catch { /* rien à effacer */ }
}
