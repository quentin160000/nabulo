import { describe, expect, it } from 'vitest';
import { rng, temperature } from '../src/game/lexicon';
import {
  BLUFF_FAUX_MIN, bestLink, bluffAiClue, bluffAiVote, bluffOutcome, bluffWordOf, brAiGuess, brEliminate, brRoundCount, brSimulateRest,
  checkBluffClue, checkRelais, clueCandidates, makePlayers, newBluffRound, rankByScore, relaisAiWord, sameRoot, secretWords,
} from '../src/game/multi';

describe('multi · commun', () => {
  it('nomme les IA « IA 1 », « IA 2 »…', () => {
    const p = makePlayers(3);
    expect(p.map(x => x.name)).toEqual(['Toi', 'IA 1', 'IA 2', 'IA 3']);
    expect(p.filter(x => x.me)).toHaveLength(1);
  });
  it('n’a que des mots secrets connus', () => { expect(secretWords().length).toBeGreaterThan(100); });
  it('reconnaît les mots de même racine', () => {
    expect(sameRoot('robot', 'robots')).toBe(true);
    expect(sameRoot('poivre', 'poivrier')).toBe(true);
    expect(sameRoot('poivre', 'citron')).toBe(false);
    expect(sameRoot('hôtel', 'hotel')).toBe(true);
  });
  it('ne propose pas de dérivés comme indice', () => {
    expect(clueCandidates('robot', 30).some(c => c.word === 'robots')).toBe(false);
  });
});

describe('imposteur', () => {
  const players = makePlayers(4);
  it('donne un mot proche à l’imposteur et le même mot aux autres', () => {
    const r = newBluffRound(players, rng(1), 0);
    expect(r.fake).not.toBe(r.secret);
    expect(temperature(r.secret, r.fake)!).toBeGreaterThanOrEqual(BLUFF_FAUX_MIN);
    expect(players.map(p => p.id)).toContain(r.imposter);
    const others = players.filter(p => p.id !== r.imposter);
    expect(new Set(others.map(p => bluffWordOf(r, p.id)))).toEqual(new Set([r.secret]));
    expect(r.order).toHaveLength(players.length);
  });
  it('fait tourner l’ordre de parole', () => {
    expect(newBluffRound(players, rng(2), 0).order).toEqual([...players.slice(1), players[0]].map(p => p.id));
    expect(newBluffRound(players, rng(2), 1).order[0]).toBe(players[2].id);
  });
  it('les indices des IA sont liés à leur mot et jamais évidents', () => {
    const rand = rng(3), r = newBluffRound(players, rand, 0);
    for (const p of players.slice(1)) {
      const c = bluffAiClue(r, p.id, rand);
      expect(sameRoot(c, bluffWordOf(r, p.id))).toBe(false);
      // 30° sur l'ancienne échelle fastText
      expect(temperature(c, bluffWordOf(r, p.id))!).toBeGreaterThan(12);
      r.clues[p.id] = c;
    }
  });
  it('vérifie mon indice', () => {
    const r = newBluffRound(players, rng(4), 0);
    expect(checkBluffClue(r, 'me', '').ok).toBe(false);
    expect(checkBluffClue(r, 'me', 'zzqx')).toEqual({ ok: false, reason: 'inconnu' });
    expect(checkBluffClue(r, 'me', bluffWordOf(r, 'me'))).toEqual({ ok: false, reason: 'evident' });
  });
  it('les IA votent pour l’indice le plus froid', () => {
    const r = { secret: 'poivre', fake: 'citron', imposter: 'ia2', order: players.map(p => p.id), votes: {},
      clues: { me: 'épices', ia1: 'sel', ia2: 'football', ia3: 'sauce', ia4: 'ail' } as Record<string, string> };
    const votes = ['ia1', 'ia3', 'ia4'].map(v => bluffAiVote(r, players, v, () => 0));
    expect(votes).toEqual(['ia2', 'ia2', 'ia2']);
  });
  it('compte les points', () => {
    const base = { secret: 'a', fake: 'b', imposter: 'ia1', order: [], clues: {} };
    const found = bluffOutcome({ ...base, votes: { me: 'ia1', ia2: 'ia1', ia1: 'me' } });
    expect(found).toMatchObject({ found: true, against: 2, gains: { me: 2, ia2: 2 } });
    const missed = bluffOutcome({ ...base, votes: { me: 'ia2', ia2: 'me', ia1: 'me' } });
    expect(missed).toMatchObject({ found: false, gains: { ia1: 3 } });
    const tie = bluffOutcome({ ...base, votes: { me: 'ia1', ia1: 'me' } });
    expect(tie.found).toBe(false);
    expect(rankByScore(players, { ia3: 5, me: 2 }).map(p => p.id).slice(0, 2)).toEqual(['ia3', 'me']);
  });
});

describe('battle royale', () => {
  it('élimine les 2 plus froids, jusqu’à un seul', () => {
    expect(brRoundCount(8)).toBe(4);
    const r = brEliminate([{ id: 'a', best: 50 }, { id: 'b', best: 10 }, { id: 'c', best: 70 }, { id: 'd', best: 20 }], rng(1));
    expect(r.order.map(p => p.id)).toEqual(['c', 'a', 'd', 'b']);
    expect(r.out.map(p => p.id)).toEqual(['d', 'b']);
    expect(brEliminate([{ id: 'a', best: 5 }, { id: 'b', best: 9 }], rng(1)).out.map(p => p.id)).toEqual(['a']);
  });
  it('une IA forte devine plus chaud qu’une faible', () => {
    const pool = Array.from({ length: 1000 }, (_, i) => ({ word: 'w' + i, temperature: 80 - i * 0.07 }));
    const avg = (s: number) => { const r = rng(9); let t = 0; for (let i = 0; i < 400; i++) t += brAiGuess('x', pool, s, r).temperature; return t / 400; };
    expect(avg(1)).toBeGreaterThan(avg(0.3));
  });
  it('simule la fin sans moi', () => {
    const res = brSimulateRest([{ id: 'a', skill: 0.5 }, { id: 'b', skill: 0.9 }, { id: 'c', skill: 0.4 }], 3, rng(5));
    expect(['a', 'b', 'c']).toContain(res.winner);
    expect(Object.keys(res.outRound)).toHaveLength(2);
  });
});

describe('le relais', () => {
  it('vérifie les maillons', () => {
    const chain = [{ by: 'ia1', word: 'mer', temperature: null }];
    expect(checkRelais(chain, 'océan')).toMatchObject({ ok: true, word: 'océan' });
    expect(checkRelais(chain, 'mer')).toEqual({ ok: false, reason: 'deja' });
    expect(checkRelais([{ by: 'ia1', word: 'hôtel', temperature: null }], 'hotel')).toEqual({ ok: false, reason: 'deja' });
    expect(checkRelais(chain, 'zzqx')).toEqual({ ok: false, reason: 'inconnu' });
    expect(checkRelais(chain, 'fourchette')).toMatchObject({ ok: false, reason: 'froid' });
  });
  it('les IA prolongent la chaîne avec des mots nouveaux', () => {
    const rand = rng(7);
    const chain = [{ by: 'ia1', word: 'mer', temperature: null as number | null }];
    for (let i = 0; i < 6; i++) { const w = relaisAiWord(chain, rand); expect(chain.some(l => l.word === w)).toBe(false); chain.push({ by: 'ia1', word: w, temperature: temperature(w, chain[chain.length - 1].word) }); }
    expect(bestLink(chain)).not.toBeNull();
  });
});
