import { describe, expect, it } from 'vitest';
import { known, rng, temperature } from '../src/game/lexicon';
import { canClose, closeWords, hasLevel, hintAfter, judge, LEVEL_MIN, links, maillons, maillonsLabel, MAX_LINK, MIN_LINK, pairKey, randomPair, shareSquares, shareText, solve, validLink, variant } from '../src/game/lier';
import { DIFFICILE, DIFFICILE_MAX, FACILE, MOYEN, dailyPair, pairsFor } from '../src/game/lier-paires';

const isChain = (c: string[]) => c.slice(1, -1).every((w, i) => validLink(c[i], w)) && temperature(c[c.length - 2], c[c.length - 1])! >= MIN_LINK;

describe('Lier : règles', () => {
  it('reconnaît les variantes', () => {
    expect(variant('soleil', 'soleils')).toBe(true);
    expect(variant('lion', 'lionne')).toBe(true);
    expect(variant('chat', 'chien')).toBe(false);
  });
  it('juge chaque mot proposé', () => {
    expect(judge(['plage'], 'ordinateur', '  ').kind).toBe('vide');
    expect(judge(['plage'], 'ordinateur', 'zzqx').kind).toBe('inconnu');
    expect(judge(['plage', 'soleil'], 'ordinateur', 'Soleil').kind).toBe('deja');
    expect(judge(['plage'], 'ordinateur', 'clavier').kind).toBe('loin');
    expect(judge(['plage'], 'ordinateur', 'plages').kind).toBe('proche');
    const ok = judge(['plage'], 'ordinateur', 'soleil');
    expect(ok).toMatchObject({ kind: 'ok', done: false, prev: 'plage' });
    const done = judge(['plage', 'soleil', 'écran'], 'ordinateur', 'clavier');
    expect(done.kind === 'loin' || (done.kind === 'ok' && done.done)).toBe(true);
  });
  it('un mot accepté est entre les deux seuils', () => {
    const v = judge(['écran'], 'ordinateur', 'clavier');
    if (v.kind === 'ok') { expect(v.temperature).toBeGreaterThanOrEqual(MIN_LINK); expect(v.temperature).toBeLessThan(MAX_LINK); }
  });
});

describe('Lier : solveur', () => {
  it('trouve une chaîne valide et courte', () => {
    const c = solve('plage', 'ordinateur')!;
    expect(c[0]).toBe('plage'); expect(c[c.length - 1]).toBe('ordinateur');
    expect(isChain(c)).toBe(true);
    expect(c.length - 1).toBeLessThanOrEqual(3);
  });
  it('donne un indice qui est une étape valide', () => {
    const h = hintAfter(['plage', 'soleil'], 'ordinateur');
    expect(h).not.toBeNull();
    expect(validLink('soleil', h!)).toBe(true);
  });
  it('l’indice rapproche de l’arrivée sans reprendre un mot de la chaîne', () => {
    for (const chain of [['plage', 'soleil'], ['violon'], ['violon', 'conservatoire'], ['église']]) {
      const target = chain[0] === 'plage' ? 'ordinateur' : chain[0] === 'église' ? 'armée' : 'île';
      const h = hintAfter(chain, target)!;
      expect(h, chain.join('>')).toBeTruthy();
      const last = chain[chain.length - 1];
      expect(validLink(last, h)).toBe(true);
      expect(temperature(h, target)!).toBeGreaterThan(temperature(last, target)!);
      expect(chain.some(c => variant(c, h))).toBe(false);
    }
  });
  it('pas d’indice quand la chaîne peut se refermer', () => {
    expect(canClose(['violon', 'conservatoire', 'littoral'], 'île')).toBe(true);
    expect(hintAfter(['violon', 'conservatoire', 'littoral'], 'île')).toBeNull();
    expect(canClose(['violon'], 'île')).toBe(false);
  });
  it('les voisins de l’arrivée ignorent les variantes sans accent', () => {
    const v = closeWords('île');
    expect(v).not.toContain('ile');
    expect(v.some((a, i) => v.some((b, j) => i !== j && variant(a, b)))).toBe(false);
  });
  it('liste les voisins de l’arrivée sans variantes', () => {
    const v = closeWords('ordinateur');
    expect(v).toHaveLength(5); expect(v).not.toContain('ordinateurs');
  });
});

describe('Lier : paires', () => {
  it('les paires faciles se lient en 2 étapes', () => {
    for (const [a, b] of FACILE) { expect(known(a) && known(b)).toBe(true); expect(solve(a, b, [], 2)?.length, `${a}>${b}`).toBe(3); }
  });
  it('les paires moyennes et difficiles demandent 3 étapes ou plus', () => {
    for (const [a, b] of [...MOYEN, ...DIFFICILE]) {
      expect(solve(a, b, [], 2), `${a}>${b}`).toBeNull();
      const c = solve(a, b, [], 4);
      expect(c, `${a}>${b}`).not.toBeNull(); expect(isChain(c!)).toBe(true);
    }
    for (const [a, b] of DIFFICILE) expect(temperature(a, b)!, `${a}>${b}`).toBeLessThan(DIFFICILE_MAX);
  }, 60000);
  it('le défi du jour est le même pour tous et change selon le jour', () => {
    expect(dailyPair(309)).toEqual(dailyPair(309));
    const days = new Set(Array.from({ length: 10 }, (_, i) => dailyPair(300 + i).join('>')));
    expect(days.size).toBeGreaterThan(5);
    expect(pairsFor(309, 0)).toEqual(pairsFor(309, 0));
  });
  it('partage sans dévoiler les mots', () => {
    const c = ['plage', 'soleil', 'écran', 'clavier', 'ordinateur'];
    expect(shareSquares(c)).toHaveLength(5);
    const s = shareText(c, new Date(2026, 9, 31));
    expect(s).toContain('31 oct.'); expect(s).toContain('J’ai relié « plage » à « ordinateur » en 3 maillons sur Nabulo 🔗 Tu fais mieux ?');
    expect(s).not.toContain('soleil'); expect(s).not.toContain('écran'); expect(s).not.toContain('clavier');
    expect(shareText(c, new Date(2026, 9, 31), 'difficile')).toContain('Lier · Difficile');
    expect(shareText(['plage', 'soleil', 'ordinateur'], new Date())).toContain('en 1 maillon sur');
    expect(links(c)).toHaveLength(4);
  });
  it('un maillon = un mot ajouté entre le départ et l’arrivée', () => {
    expect(maillons(['a', 'b'])).toBe(0);
    expect(maillons(['plage', 'soleil', 'écran', 'ordinateur'])).toBe(2);
    expect(maillonsLabel(1)).toBe('1 maillon'); expect(maillonsLabel(2)).toBe('2 maillons');
  });
});

describe('Lier : paires tirées au hasard', () => {
  for (const level of ['facile', 'moyen', 'difficile'] as const) {
    it(`${level} : paires différentes à chaque partie, du bon niveau et solubles`, () => {
      const r = rng(level.length * 31 + 7), recents: string[] = [], seen = new Set<string>();
      for (let i = 0; i < 6; i++) {
        const [a, b] = randomPair(level, r, recents);
        const key = pairKey(a, b);
        expect(seen.has(key), key).toBe(false); seen.add(key); recents.unshift(key);
        expect(hasLevel(a, b, level), key).toBe(true);
        expect(temperature(a, b)!, key).toBeLessThan(MIN_LINK);
        const c = solve(a, b, [], LEVEL_MIN[level] + 1)!;
        expect(isChain(c), key).toBe(true);
        expect(maillons(c), key).toBe(LEVEL_MIN[level]);
        if (LEVEL_MIN[level] > 1) expect(solve(a, b, [], LEVEL_MIN[level]), key).toBeNull();
      }
    }, 60000);
  }
});
