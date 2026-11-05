import { describe, expect, it } from 'vitest';
import { rng, temperature } from '../src/game/lexicon';
import {
  SERIE_PLANCHER, SYNCHRO_PAS_MAL, aiAssociate, aiGuess, aiHint, checkAssociate, checkHint, closeWords, commonSeed, makeSeries, nounish, synchroLabel, synchroScore, variant,
} from '../src/game/coop';

describe('coop · 4 mots + mot-indice', () => {
  it('tire 4 mots distincts et proches, dont le mot visé', () => {
    const r = rng(3);
    for (let i = 0; i < 10; i++) {
      const s = makeSeries(r);
      expect(s.words).toHaveLength(4);
      expect(s.words).toContain(s.secret);
      for (const a of s.words) for (const b of s.words) if (a !== b) {
        expect(variant(a, b)).toBe(false);
        expect(temperature(a, b)!).toBeGreaterThanOrEqual(SERIE_PLANCHER);
      }
    }
  });
  it('l’IA donne un indice qui n’est pas l’un des 4 et le devine elle-même le plus souvent', () => {
    const r = rng(11); let ok = 0;
    for (let i = 0; i < 20; i++) {
      const s = makeSeries(r), h = aiHint(s, r);
      expect(s.words.some(w => variant(w, h))).toBe(false);
      if (aiGuess(h, s.words) === s.secret) ok++;
    }
    expect(ok).toBeGreaterThanOrEqual(16);
  });
  it('l’IA devine le mot le plus proche de l’indice', () => {
    expect(aiGuess('violon', ['voiture', 'musique', 'pomme', 'chien'])).toBe('musique');
  });
  it('refuse un indice vide, de plusieurs mots, inconnu ou parmi les 4', () => {
    const w = ['tempête', 'orage', 'ouragan', 'cyclone'];
    expect(checkHint('  ', w)).toMatchObject({ ok: false, reason: 'vide' });
    expect(checkHint('vent fort', w)).toMatchObject({ ok: false, reason: 'plusieurs' });
    expect(checkHint('zzqx', w)).toMatchObject({ ok: false, reason: 'inconnu' });
    expect(checkHint('Orages', w)).toMatchObject({ ok: false, reason: 'interdit' });
    expect(checkHint('Pluie', w)).toEqual({ ok: true, word: 'pluie' });
  });
  it('donne des voisins sans variantes', () => {
    const v = closeWords('montagne', 5);
    expect(v).toHaveLength(5);
    expect(v.some(x => variant(x, 'montagne'))).toBe(false);
  });
});

describe('coop · synchro', () => {
  it('score = proximité des deux mots, 100 pour le même mot', () => {
    expect(synchroScore('neige', 'neige')).toBe(100);
    expect(synchroScore('neige', 'ski')).toBeGreaterThan(synchroScore('neige', 'banque'));
    expect(synchroScore('neige', 'zzqx')).toBe(0);
    expect(synchroLabel(78)).toBe('Bien synchro !');
  });
  it('l’IA associe un mot proche du mot affiché, jamais déjà joué', () => {
    const r = rng(5);
    const w = aiAssociate('montagne', null, ['montagne', 'neige'], r);
    expect(variant(w, 'montagne')).toBe(false);
    expect(variant(w, 'neige')).toBe(false);
    expect(temperature(w, 'montagne')!).toBeGreaterThan(SYNCHRO_PAS_MAL);
  });
  it('le mot suivant est un voisin commun des deux mots joués', () => {
    const n = commonSeed('neige', 'ski', ['montagne']);
    expect(n).not.toBe('montagne');
    // 20° sur l'ancienne échelle fastText
    expect(Math.min(temperature(n, 'neige')!, temperature(n, 'ski')!)).toBeGreaterThan(5);
  });
  it('refuse le mot affiché ou une de ses formes', () => {
    expect(checkAssociate('Montagnes', 'montagne')).toMatchObject({ ok: false, reason: 'interdit' });
    expect(checkAssociate('neige', 'montagne')).toEqual({ ok: true, word: 'neige' });
  });
  it('reconnaît les formes verbales et adverbes', () => {
    expect(nounish('tranquillement')).toBe(false);
    expect(nounish('portant')).toBe(false);
    expect(nounish('montagne')).toBe(true);
  });
});
