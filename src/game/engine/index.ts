import { createLocalEngine, type DevData } from './local';
import { createSupabaseEngine } from './supabase';
import type { TemperatureEngine } from './types';

export * from './types';

/**
 * Supabase si EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY sont définies (fichier .env),
 * sinon le moteur local pour développer hors ligne.
 */
function pick(): TemperatureEngine {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL, key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) return createSupabaseEngine(url, key);
  const fr = require('../../../assets/data/fr-dev.json') as DevData;
  return createLocalEngine({ fr, en: undefined });
}

export const engine: TemperatureEngine = pick();
export const engineKind: 'supabase' | 'local' =
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'supabase' : 'local';
