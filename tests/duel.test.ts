import { describe, expect, it } from 'vitest';
import {
  addRecord, blindAiPick, blindTimeoutWinner, checkBlindGuess, checkChronoWord, chronoAiPick, clock, gaugeSplit, matchOver,
  pickTarget, roundWinner, sameFamily, secretOk, tally, targets, type BlindGuess,
} from '../src/game/duel';
import { rng, temperature } from '../src/game/lexicon';

describe('duels contre l’IA', () => {
  it('a des mots cibles connus', () => {
    expect(targets().length).toBeGreaterThan(40);
    const r = rng(1);
    const a = pickTarget(r);
    expect(pickTarget(rng(5), [a])).not.toBe(a);
  });

  it('jauge de duel : mêmes parts que la planche DuelJauge', () => {
    expect(gaugeSplit(1, 1)).toBe(0.5);
    expect(gaugeSplit(2, 1)).toBeCloseTo(2 / 3);
    expect(gaugeSplit(0, 3)).toBe(0);
    expect(gaugeSplit(3, 2)).toBe(1);
  });

  it('contre-la-montre : refuse la cible, ses pluriels, les doublons et les mots inconnus', () => {
    expect(sameFamily('cuisine', 'cuisines')).toBe(true);
    expect(checkChronoWord('cuisine', 'Cuisine', []).kind).toBe('cible');
    expect(checkChronoWord('cuisine', 'zzqx', []).kind).toBe('inconnu');
    const ok = checkChronoWord('cuisine', 'cuisiner', []);
    expect(ok.kind).toBe('ok');
    expect(checkChronoWord('cuisine', 'cuisiner', [{ word: 'cuisiner', temperature: 72 }]).kind).toBe('deja');
  });

  it('manche : plus de mots à 50°+, puis meilleure température', () => {
    const w = (t: number, i = 0) => ({ word: 'm' + t + i, temperature: t });
    expect(roundWinner([w(60), w(55)], [w(90)])).toBe('me');
    expect(roundWinner([w(60)], [w(70)])).toBe('opp');
    expect(roundWinner([w(30)], [w(20)])).toBe(null);
    expect(matchOver(3, 1)).toBe('me');
    expect(matchOver(2, 2)).toBe(null);
  });

  it('l’IA normale trouve plus de mots chauds que l’IA facile', () => {
    const count = (n: 'facile' | 'normal') => {
      const r = rng(4); let hits = 0;
      for (const t of targets().slice(0, 10)) {
        const used: string[] = [];
        for (let i = 0; i < 8; i++) { const p = chronoAiPick(t, n, used, r); if (!p) break; used.push(p.word); if (p.temperature >= 50) hits++; }
      }
      return hits;
    };
    expect(count('normal')).toBeGreaterThan(count('facile'));
  });

  it('à l’aveugle : l’IA se rapproche du secret et finit souvent par le trouver', () => {
    const r = rng(11); let found = 0;
    for (const s of targets().slice(0, 8)) {
      const gs: BlindGuess[] = [];
      for (let k = 0; k < 40; k++) {
        const w = blindAiPick(s, 'normal', gs, r);
        expect(gs.some(g => g.word === w)).toBe(false);
        gs.push({ word: w, temperature: temperature(s, w) ?? -50, order: k });
        if (w === s) { found++; break; }
      }
    }
    expect(found).toBeGreaterThanOrEqual(5);
  });

  it('à l’aveugle : vérifie les essais et départage au temps', () => {
    expect(checkBlindGuess('mer', 'mer', []).kind).toBe('ok');
    expect(checkBlindGuess('mer', 'zzqx', []).kind).toBe('inconnu');
    expect(secretOk('lion')).toBe('ok');
    expect(secretOk('zzqx')).toBe('inconnu');
    const g = (t: number): BlindGuess => ({ word: 'x' + t, temperature: t, order: 0 });
    expect(blindTimeoutWinner([g(40)], [g(60)])).toBe('opp');
  });

  it('historique des duels', () => {
    let l = addRecord([], 'chrono', true, new Date(0));
    l = addRecord(l, 'chrono', false);
    l = addRecord(l, 'aveugle', true);
    expect(l[0]).toEqual({ jeu: 'chrono', adversaire: 'IA', gagne: true, date: '1970-01-01T00:00:00.000Z' });
    expect(tally(l, 'chrono')).toEqual({ victoires: 1, defaites: 1 });
    expect(tally(l)).toEqual({ victoires: 2, defaites: 1 });
    expect(clock(42)).toBe('0:42');
    expect(clock(150)).toBe('2:30');
  });
});
