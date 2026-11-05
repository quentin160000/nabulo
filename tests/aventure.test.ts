import { describe, expect, it } from 'vitest';
import {
  CHRONO_MIN, LIEN_MIN, MONDES, NIVEAUX, PROGRESSION_VIDE, RECHARGE_MS, TOTAL, VIES_MAX, estFinDeMonde, gagner, mondeDe, perdreVie,
  rang, relance, rendreVie, viesActuelles, voisinsDe,
} from '../src/game/aventure';
import { known, neighbors, rng, temperature } from '../src/game/lexicon';
import { mancheIntrus, manchePlusChaud } from '../src/game/libres-manches';
import { solve, variant } from '../src/game/lier';

const t = (a: string, b: string) => temperature(a, b) ?? -100;
/**
 * Voisins utilisables (pas une simple variante du mot) à `min`° ou plus, parmi les 15 000 mots les plus fréquents
 * (la taille de l'ancien lexique : frWac range « cratère » ou « lave » au-delà des 8 000 premiers).
 */
const chauds = (mot: string, min: number) => neighbors(mot, 200, 15000).filter(v => v.temperature >= min && !variant(v.word, mot));
/** « Mot chaud » pour s'approcher d'un mot secret (55° sur l'ancienne échelle fastText). */
const CHAUD = 37;

describe('aventure : structure', () => {
  it('30 niveaux, 5 mondes de 6, le 6e est la fin de monde', () => {
    expect(TOTAL).toBe(30);
    expect(MONDES).toHaveLength(5);
    NIVEAUX.forEach((nv, i) => expect(nv.n).toBe(i + 1));
    expect(NIVEAUX.filter(nv => estFinDeMonde(nv.n)).map(nv => nv.n)).toEqual([6, 12, 18, 24, 30]);
    expect([1, 6, 7, 12, 13, 30].map(n => mondeDe(n).nom)).toEqual(['Banquise', 'Banquise', 'Toundra', 'Toundra', 'Forêt tiède', 'Volcan']);
  });
  it('les 7 types de niveau sont présents', () => {
    expect(new Set(NIVEAUX.map(nv => nv.type)).size).toBe(7);
  });
});

describe('aventure : chaque niveau est jouable avec le lexique', () => {
  for (const nv of NIVEAUX) {
    it(`niveau ${nv.n} (${nv.type})`, () => {
      switch (nv.type) {
        case 'secret': case 'points': {
          expect(known(nv.mot)).toBe(true);
          // il existe des mots chauds pour s'approcher, et l'écran de fin a 5 voisins
          expect(chauds(nv.mot, CHAUD).length).toBeGreaterThanOrEqual(3);
          expect(voisinsDe(nv.mot)).toHaveLength(5);
          expect(rang(nv.mot, nv.mot)).toBe(1);
          if (nv.type === 'points') expect(Math.floor((nv.depart - nv.minimum) / nv.cout)).toBeGreaterThanOrEqual(10);
          break;
        }
        case 'seuil': {
          expect(known(nv.mot)).toBe(true);
          expect(chauds(nv.mot, nv.seuil).length).toBeGreaterThanOrEqual(2);
          expect(voisinsDe(nv.mot)).toHaveLength(5);
          break;
        }
        case 'plus-chaud': {
          for (const essai of [0, 1]) {
            const r = rng(nv.n * 7919 + essai), vus = new Set<string>();
            for (let i = 0; i < nv.bonnes + nv.erreurs; i++) {
              const m = manchePlusChaud(r, nv.serie + i, vus);
              vus.add(m.cible);
              expect(t(m.cible, m.mots[m.bonne])).toBeGreaterThan(t(m.cible, m.mots[1 - m.bonne]));
            }
          }
          break;
        }
        case 'intrus': {
          const r = rng(nv.n * 7919), vus = new Set<string>();
          for (let i = 0; i < nv.series + nv.erreurs; i++) {
            const m = mancheIntrus(r, vus);
            vus.add(m.theme);
            expect(new Set(m.mots).size).toBe(5);
          }
          break;
        }
        case 'lier': {
          expect(known(nv.depart) && known(nv.arrivee)).toBe(true);
          expect(t(nv.depart, nv.arrivee)).toBeLessThan(LIEN_MIN);
          const chaine = solve(nv.depart, nv.arrivee);
          expect(chaine).not.toBeNull();
          expect(chaine!.length - 1).toBeLessThanOrEqual(nv.max);
          expect(voisinsDe(nv.arrivee)).toHaveLength(5);
          break;
        }
        case 'chrono': {
          expect(known(nv.mot)).toBe(true);
          expect(chauds(nv.mot, CHRONO_MIN).length).toBeGreaterThanOrEqual(nv.mots * 2);
          break;
        }
      }
    }, 60000);
  }
});

describe('aventure : difficulté croissante', () => {
  it('les budgets se resserrent au fil des mondes', () => {
    const secrets = NIVEAUX.filter(nv => nv.type === 'secret').map(nv => (nv.type === 'secret' ? nv.essais : 0));
    expect(secrets[0]).toBeGreaterThanOrEqual(secrets[secrets.length - 1]);
    const pc = NIVEAUX.filter(nv => nv.type === 'plus-chaud').map(nv => (nv.type === 'plus-chaud' ? nv.bonnes : 0));
    expect([...pc].sort((a, b) => a - b)).toEqual(pc);
  });
  it('chaque type sauf « à points » a une relance payante', () => {
    for (const nv of NIVEAUX) expect(relance(nv) === null).toBe(nv.type === 'points');
  });
});

describe('aventure : progression', () => {
  it('une victoire débloque le niveau suivant et garde la meilleure note', () => {
    let p = gagner(PROGRESSION_VIDE, 1, 2, 17);
    expect(p.atteint).toBe(2);
    p = gagner(p, 1, 1, 10);
    expect(p.etoiles[1]).toBe(2);
    expect(p.atteint).toBe(2);
    expect(gagner({ ...p, atteint: 30 }, 30, 3, 1).atteint).toBe(30);
  });
});

describe('aventure : vies', () => {
  const t0 = 1_000_000_000;
  it('5 vies au départ, une de moins à la défaite', () => {
    const v = perdreVie({ n: VIES_MAX, depuis: 0 }, t0);
    expect(viesActuelles(v, t0)).toEqual({ n: 4, prochaine: RECHARGE_MS });
  });
  it('+1 vie toutes les 30 minutes, 5 au plus', () => {
    let v = perdreVie({ n: VIES_MAX, depuis: 0 }, t0);
    v = perdreVie(v, t0 + 10 * 60 * 1000);
    expect(viesActuelles(v, t0 + 10 * 60 * 1000).n).toBe(3);
    expect(viesActuelles(v, t0 + 31 * 60 * 1000).n).toBe(4);
    expect(viesActuelles(v, t0 + 31 * 60 * 1000).prochaine).toBe(29 * 60 * 1000);
    expect(viesActuelles(v, t0 + 5 * RECHARGE_MS)).toEqual({ n: 5, prochaine: null });
  });
  it('la recharge en cours est gardée quand on perd une vie', () => {
    let v = perdreVie({ n: VIES_MAX, depuis: 0 }, t0);
    v = perdreVie(v, t0 + 10 * 60 * 1000);
    v = perdreVie(v, t0 + 40 * 60 * 1000); // 3 + 1 (recharge) − 1 = 3
    expect(viesActuelles(v, t0 + 40 * 60 * 1000)).toEqual({ n: 3, prochaine: 20 * 60 * 1000 });
  });
  it('jamais sous 0 ; une relance rend la vie', () => {
    let v = { n: 0, depuis: t0 };
    v = perdreVie(v, t0);
    expect(viesActuelles(v, t0).n).toBe(0);
    expect(viesActuelles(rendreVie(v, t0), t0).n).toBe(1);
  });
});
