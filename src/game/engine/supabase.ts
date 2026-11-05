/**
 * Moteur de production : le mot secret ne quitte jamais le serveur.
 * Les fonctions SQL sont dans supabase/migrations (guess_word, hint_word, closest_words, reveal_word).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { dayNumberFrom, type GuessResult, type TemperatureEngine } from './types';
import { normalizeWord } from '../temperature';

export function createSupabaseEngine(url: string, anonKey: string): TemperatureEngine {
  const db: SupabaseClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const call = async <T,>(fn: string, args: Record<string, unknown>): Promise<T> => {
    const { data, error } = await db.rpc(fn, args);
    if (error) throw new Error(`${fn} : ${error.message}`);
    return data as T;
  };
  return {
    dayNumber: (date) => dayNumberFrom(date),
    async guess(lang, day, raw) {
      const word = normalizeWord(raw);
      const r = await call<{ known: boolean; temperature: number | null; rank: number | null; found: boolean }[]>(
        'guess_word', { p_lang: lang, p_day: day, p_word: word });
      const row = r[0];
      if (!row?.known) return { known: false, word } as GuessResult;
      return { known: true, word, temperature: Number(row.temperature), rank: row.rank, found: row.found };
    },
    async hint(lang, day, above, exclude) {
      const r = await call<{ word: string; temperature: number }[]>('hint_word', { p_lang: lang, p_day: day, p_above: above, p_exclude: exclude });
      return r[0] ? { word: r[0].word, temperature: Number(r[0].temperature) } : null;
    },
    async closest(lang, day, count, proof) {
      const r = await call<{ word: string; temperature: number }[]>('closest_words', { p_lang: lang, p_day: day, p_count: count, p_proof: proof ?? null });
      return r.map(x => ({ word: x.word, temperature: Number(x.temperature) }));
    },
    async reveal(lang, day, proof) { return call<string>('reveal_word', { p_lang: lang, p_day: day, p_proof: proof ?? null }); },
  };
}
