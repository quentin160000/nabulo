import AsyncStorage from '@react-native-async-storage/async-storage';

/** Lecture / écriture JSON tolérante : une donnée illisible ne casse jamais l'appli. */
export async function load<T>(key: string, fallback: T): Promise<T> {
  try { const s = await AsyncStorage.getItem(key); return s ? (JSON.parse(s) as T) : fallback; }
  catch { return fallback; }
}
export async function save(key: string, value: unknown): Promise<void> {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch { /* sans effet : on rejouera depuis la mémoire */ }
}
