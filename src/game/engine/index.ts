import { FORCE_LOCAL, SUPABASE_KEY, SUPABASE_URL } from '@/config';
import { createLocalEngine, type DevData } from './local';
import { createSupabaseEngine } from './supabase';
import type { TemperatureEngine } from './types';

export * from './types';


/** Supabase (mot du jour commun à tous), sauf si EXPO_PUBLIC_ENGINE=local : moteur hors ligne pour développer. */
function pick(): TemperatureEngine {
  if (!FORCE_LOCAL) return createSupabaseEngine(SUPABASE_URL, SUPABASE_KEY);
  const fr = require('../../../assets/data/fr-dev.json') as DevData;
  return createLocalEngine({ fr, en: undefined });
}

export const engine: TemperatureEngine = pick();
export const engineKind: 'supabase' | 'local' = FORCE_LOCAL ? 'local' : 'supabase';
