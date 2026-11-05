/**
 * Moteur local, pour développer sans serveur.
 * Les similarités sont précalculées par scripts/build_dev_data.py (vecteurs fastText élagués) :
 * qualité correcte pour tester, mais le vocabulaire est limité (~15 000 mots). La production passe par Supabase.
 */
import { toTemperature, normalizeWord } from '../temperature';
import { dayNumberFrom, type GuessResult, type Lang, type TemperatureEngine } from './types';

export type DevData = { lang: Lang; words: string[]; secrets: Record<string, string> };

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function decodeBase64(s: string): Uint8Array {
  const clean = s.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor(clean.length * 3 / 4));
  let buf = 0, bits = 0, o = 0;
  for (let i = 0; i < clean.length; i++) {
    buf = (buf << 6) | B64.indexOf(clean[i]); bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (buf >> bits) & 255; }
  }
  return out;
}

type Table = { secret: string; sims: Float32Array; order: number[]; rankOf: Map<number, number> };

export function createLocalEngine(data: Record<Lang, DevData | undefined>): TemperatureEngine {
  const indexes = new Map<Lang, Map<string, number>>();
  const tables = new Map<string, Table>();

  const indexOf = (lang: Lang) => {
    let m = indexes.get(lang);
    if (!m) { m = new Map(data[lang]!.words.map((w, i) => [w, i])); indexes.set(lang, m); }
    return m;
  };
  const table = (lang: Lang, day: number): Table => {
    const d = data[lang];
    if (!d) throw new Error(`Pas de données locales pour la langue ${lang}`);
    const secrets = Object.keys(d.secrets);
    const secret = secrets[((day - 1) % secrets.length + secrets.length) % secrets.length];
    const key = lang + ':' + secret;
    let t = tables.get(key);
    if (!t) {
      const bytes = decodeBase64(d.secrets[secret]);
      const sims = new Float32Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) sims[i] = bytes[i] / 127 - 1;
      const order = Array.from(sims.keys()).sort((a, b) => sims[b] - sims[a]);
      const rankOf = new Map<number, number>();
      order.slice(0, 1000).forEach((wi, r) => rankOf.set(wi, r + 1));   // rang parmi les 1 000 plus proches, comme Cémantix
      t = { secret, sims, order, rankOf };
      tables.set(key, t);
    }
    return t;
  };
  const tempOf = (lang: Lang, t: Table, i: number) => toTemperature(t.sims[i], data[lang]!.words[i] === t.secret);

  return {
    dayNumber: (date) => dayNumberFrom(date),
    async guess(lang, day, raw): Promise<GuessResult> {
      const word = normalizeWord(raw);
      const i = indexOf(lang).get(word);
      if (i === undefined) return { known: false, word };
      const t = table(lang, day);
      const temperature = tempOf(lang, t, i);
      return { known: true, word, temperature, rank: t.rankOf.get(i) ?? null, found: word === t.secret };
    },
    async hint(lang, day, above, exclude) {
      const t = table(lang, day), words = data[lang]!.words, skip = new Set(exclude);
      // parmi les 300 mots les plus proches, le plus froid qui reste au-dessus du meilleur essai : un vrai coup de pouce sans tout donner
      const pool = t.order.slice(1, 300).filter(i => !skip.has(words[i]) && words[i] !== t.secret);
      const warmer = pool.filter(i => tempOf(lang, t, i) > above);
      const pick = warmer.length ? warmer[warmer.length - 1] : pool[0];
      return pick === undefined ? null : { word: words[pick], temperature: tempOf(lang, t, pick) };
    },
    async closest(lang, day, count) {
      const t = table(lang, day), words = data[lang]!.words;
      return t.order.slice(0, count).map(i => ({ word: words[i], temperature: tempOf(lang, t, i) }));
    },
    async reveal(lang, day) { return table(lang, day).secret; },
  };
}
