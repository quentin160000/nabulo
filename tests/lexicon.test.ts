import { describe, expect, it } from 'vitest';
import { known, neighbors, randomWord, rng, temperature } from '../src/game/lexicon';

describe('lexique des mini-jeux', () => {
  it('connaît les mots courants', () => { expect(known('musique')).toBe(true); expect(known('zzqx')).toBe(false); });
  it('donne 100 °C au même mot et plus chaud aux mots proches', () => {
    expect(temperature('chat', 'chat')).toBe(100);
    expect(temperature('musique', 'chanson')!).toBeGreaterThan(temperature('musique', 'voiture')!);
  });
  it('trouve des voisins cohérents', () => {
    const v = neighbors('guitare', 30).map(n => n.word);
    expect(v.some(w => ['piano', 'violon', 'basse', 'batterie', 'musique'].includes(w))).toBe(true);
  });
  it('tire les mêmes mots avec la même graine', () => {
    const a = rng(42), b = rng(42);
    expect(randomWord(a)).toBe(randomWord(b));
  });
});
