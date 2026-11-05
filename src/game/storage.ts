import AsyncStorage from '@react-native-async-storage/async-storage';

/** Lecture / écriture JSON tolérante : une donnée illisible ne casse jamais l'appli. */
export async function load<T>(key: string, fallback: T): Promise<T> {
  try { const s = await AsyncStorage.getItem(key); return s ? (JSON.parse(s) as T) : fallback; }
  catch { return fallback; }
}
export async function save(key: string, value: unknown): Promise<void> {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch { /* sans effet : on rejouera depuis la mémoire */ }
}

/** Efface toutes les données de Nabulo (outil de développement). */
export async function resetAll(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith('nabulo:'));
    await AsyncStorage.multiRemove(keys);
  } catch { /* rien à effacer */ }
}
