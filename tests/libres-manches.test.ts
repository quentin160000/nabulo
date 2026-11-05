import { describe, expect, it } from 'vitest';
import { known, rng, temperature } from '../src/game/lexicon';
import {
  CHRONO_SEUIL, ECART_MIN, GROUPE_MIN, INTRUS_MAX, cibleChrono, cleanNeighbors, couleurPastille, essaiChrono, etatReponse, INTRUS_DUREE, PLUS_CHAUD_DUREE, mancheIntrus,
  manchePlusChaud, motsTrouves, noms, sameFamily,
} from '../src/game/libres-manches';

describe('jeux libres : Plus chaud / plus froid', () => {
  it('propose un mot proche et un mot lointain avec un écart net', () => {
    const r = rng(1);
    for (let s = 0; s < 30; s++) {
      const m = manchePlusChaud(r, s);
      const [a, b] = m.mots.map(w => temperature(m.cible, w)!);
      expect(Math.abs(a - b)).toBeGreaterThanOrEqual(ECART_MIN - 1);
      expect(m.bonne === 0 ? a > b : b > a).toBe(true);
      expect(m.temps[m.bonne]).toBe(Math.round(m.bonne === 0 ? a : b));
      expect(m.mots.some(w => sameFamily(w, m.cible))).toBe(false);
    }
  });
  it('est reproductible avec la même graine', () => {
    expect(manchePlusChaud(rng(9), 3)).toEqual(manchePlusChaud(rng(9), 3));
  });
});

describe('jeux libres : L’intrus', () => {
  it('donne 5 mots distincts dont un seul loin des 4 autres', () => {
    const r = rng(2);
    for (let s = 0; s < 20; s++) {
      const m = mancheIntrus(r);
      expect(new Set(m.mots).size).toBe(5);
      const intrus = m.mots[m.intrus], groupe = m.mots.filter((_, i) => i !== m.intrus);
      for (const g of groupe) {
        expect(temperature(g, intrus)!).toBeLessThanOrEqual(INTRUS_MAX);
        for (const h of groupe) if (g !== h) expect(temperature(g, h)!).toBeGreaterThanOrEqual(GROUPE_MIN);
      }
    }
  });
});

describe('jeux libres : Contre-la-montre', () => {
  it('choisit un mot cible avec assez de voisins chauds', () => {
    const c = cibleChrono(rng(3));
    expect(known(c)).toBe(true);
    expect(cleanNeighbors(c, 5).length).toBe(5);
  });
  it('refuse les mots vides, inconnus, le mot cible et les doublons', () => {
    expect(essaiChrono('cuisine', '  ', [])).toEqual({ ok: false, raison: 'vide' });
    expect(essaiChrono('cuisine', 'zzqx', [])).toEqual({ ok: false, raison: 'inconnu' });
    expect(essaiChrono('cuisine', 'Cuisine', [])).toEqual({ ok: false, raison: 'cible' });
    const v = essaiChrono('cuisine', 'recette', []);
    expect(v.ok).toBe(true);
    if (v.ok) expect(essaiChrono('cuisine', 'recette', [v.essai])).toEqual({ ok: false, raison: 'deja' });
  });
  it('ne compte que les mots au seuil ou plus', () => {
    expect(motsTrouves([{ word: 'a', temperature: CHRONO_SEUIL }, { word: 'b', temperature: CHRONO_SEUIL - 1 }, { word: 'c', temperature: 78 }])).toBe(2);
    expect(couleurPastille(CHRONO_SEUIL - 1)).toBe('#A9C6F2');
    expect(couleurPastille(81)).toBe('#FF7240');
  });
});

describe('jeux libres : mots', () => {
  it('ne garde que des noms connus du lexique', () => {
    expect(noms().length).toBeGreaterThan(150);
    expect(noms().every(known)).toBe(true);
  });
  it('repère les mots de la même famille', () => {
    expect(sameFamily('océan', 'océans')).toBe(true);
    expect(sameFamily('piano', 'pianiste')).toBe(true);
    expect(sameFamily('mer', 'marin')).toBe(false);
    expect(sameFamily('lait', 'laine')).toBe(false);
  });
});

describe('jeux libres : correction des manches', () => {
  it('Plus chaud : au temps écoulé, le bon mot est vert et l’autre rose', () => {
    expect(etatReponse(0, 0, null, true)).toBe('bon');
    expect(etatReponse(1, 0, null, true)).toBe('faux');
  });
  it('L’intrus : au temps écoulé, l’intrus est vert et les autres neutres', () => {
    expect(etatReponse(2, 2, null)).toBe('bon');
    expect(etatReponse(0, 2, null)).toBe('neutre');
  });
  it('en attente tout est neutre ; une erreur colore le mot touché en rose', () => {
    expect(etatReponse(0, 0, undefined, true)).toBe('neutre');
    expect(etatReponse(1, 0, 1)).toBe('faux');
    expect(etatReponse(3, 0, 1)).toBe('neutre');
  });
  it('garde les durées par manche', () => {
    expect(PLUS_CHAUD_DUREE).toBe(5);
    expect(INTRUS_DUREE).toBe(12);
  });
});
