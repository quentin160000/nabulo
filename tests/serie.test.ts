import { describe, expect, it } from 'vitest';
import {
  PALIER_BONUS_DEPART, PALIER_BONUS_PAS, PALIER_JOURS, PALIERS_KEY, apercuPaliers, bonusPalier, etatSerie, meilleureSerie, paliersAPayer,
  payeAujourdhui, prochainPalier, serieEnCours, type Store,
} from '../src/game/serie';

/** Stockage en mémoire, avec un historique de jours trouvés / ratés. */
function memoire(trouves: number[], rates: number[] = []): Store & { data: Map<string, string> } {
  const data = new Map<string, string>();
  for (const d of trouves) data.set(`nabulo:mdj:fr:${d}`, JSON.stringify({ day: d, solved: true, guesses: [] }));
  for (const d of rates) data.set(`nabulo:mdj:fr:${d}`, JSON.stringify({ day: d, solved: false, guesses: [{ word: 'x' }] }));
  return {
    data,
    load: async <T,>(k: string, fb: T) => (data.has(k) ? (JSON.parse(data.get(k)!) as T) : fb),
    save: async (k: string, v: unknown) => { data.set(k, JSON.stringify(v)); },
  };
}
const trouve = (s: Store & { data: Map<string, string> }, d: number) => s.data.set(`nabulo:mdj:fr:${d}`, JSON.stringify({ day: d, solved: true }));

describe('série du Jeu du jour', () => {
  it('barème : 3, 6, 9, 12 jours → 30, 50, 70, 90 brez', () => {
    expect(PALIER_JOURS).toBe(3);
    expect(PALIER_BONUS_DEPART).toBe(30);
    expect(PALIER_BONUS_PAS).toBe(20);
    expect([3, 6, 9, 12].map(bonusPalier)).toEqual([30, 50, 70, 90]);
    expect([0, 1, 2, 4, 5, 7].map(bonusPalier)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(prochainPalier(0)).toEqual({ jours: 3, bonus: 30, reste: 3 });
    expect(prochainPalier(4)).toEqual({ jours: 6, bonus: 50, reste: 2 });
    expect(prochainPalier(6)).toEqual({ jours: 9, bonus: 70, reste: 3 });
  });

  it('série cassée : un jour manqué remet à zéro', () => {
    const t = new Set([1, 2, 3, 4, 6, 7]);
    expect(serieEnCours(t, 7)).toEqual({ longueur: 2, debut: 6 });
    expect(serieEnCours(t, 9)).toEqual({ longueur: 0, debut: null }); // hier (8) manqué
    expect(meilleureSerie(t, 9)).toBe(4);
  });

  it('aujourd’hui pas encore joué ne casse pas la série', () => {
    const t = new Set([3, 4, 5]);
    expect(serieEnCours(t, 6)).toEqual({ longueur: 3, debut: 3 });
    expect(serieEnCours(new Set([3, 4, 5, 6]), 6)).toEqual({ longueur: 4, debut: 3 });
  });

  it('lit l’historique réel (clés nabulo:mdj:fr:<jour>)', async () => {
    const s = memoire([10, 11, 12], [13]);
    const e = await etatSerie(14, s);
    expect([...e.trouves].sort((a, b) => a - b)).toEqual([10, 11, 12]);
    expect(e.serie).toBe(0); // 13 joué mais raté
    expect(e.meilleure).toBe(3);
  });

  it('paliers successifs, sans double paiement', async () => {
    const s = memoire([1, 2]);
    expect((await paliersAPayer(2, s)).bonus).toBe(0);
    // appelé à la victoire, avant même que la partie du jour soit écrite : le jour compte déjà
    expect(await apercuPaliers(3, s)).toMatchObject({ bonus: 30, serie: 3 });
    trouve(s, 3);
    expect(await apercuPaliers(3, s)).toMatchObject({ bonus: 30, serie: 3 });
    const p3 = await paliersAPayer(3, s);
    expect(p3).toMatchObject({ bonus: 30, serie: 3 });
    expect((await paliersAPayer(3, s)).bonus).toBe(0);           // rappelé le même jour : rien
    expect(await payeAujourdhui(3, s)).toMatchObject({ bonus: 30, serie: 3 });
    for (const d of [4, 5]) { trouve(s, d); expect((await paliersAPayer(d, s)).bonus).toBe(0); }
    trouve(s, 6);
    expect((await paliersAPayer(6, s)).bonus).toBe(50);
    for (const d of [7, 8, 9]) { trouve(s, d); await paliersAPayer(d, s); }
    const payes = JSON.parse(s.data.get(PALIERS_KEY)!) as { jours: number; bonus: number }[];
    expect(payes.map(p => [p.jours, p.bonus])).toEqual([[3, 30], [6, 50], [9, 70]]);
  });

  it('une nouvelle série repart du 1er palier', async () => {
    const s = memoire([1, 2, 3]);
    expect((await paliersAPayer(3, s)).bonus).toBe(30);
    for (const d of [5, 6]) trouve(s, d); // jour 4 manqué
    trouve(s, 7);
    expect(await paliersAPayer(7, s)).toMatchObject({ bonus: 30, serie: 3 });
  });

  it('ne paie rien si le mot du jour n’est pas trouvé', async () => {
    const s = memoire([1, 2, 3]);
    expect((await paliersAPayer(4, s, false)).bonus).toBe(0);
    expect(s.data.has(PALIERS_KEY)).toBe(false);
  });
});
