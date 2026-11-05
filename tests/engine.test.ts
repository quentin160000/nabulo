import { describe, expect, it } from 'vitest';
import data from '../assets/data/fr-dev.json';
import { createLocalEngine, type DevData } from '../src/game/engine/local';
import { dayNumberFrom } from '../src/game/engine/types';
import { braisesFor, sortGuesses } from '../src/game/rules';
import { moodOf, normalizeWord, toTemperature } from '../src/game/temperature';

const engine = createLocalEngine({ fr: data as DevData, en: undefined });
const secrets = Object.keys((data as DevData).secrets);

describe('jour', () => {
  it('1er janvier 2026 = mot n°1, et le numéro change à minuit', () => {
    expect(dayNumberFrom(new Date(2026, 0, 1, 0, 1))).toBe(1);
    expect(dayNumberFrom(new Date(2026, 0, 1, 23, 59))).toBe(1);
    expect(dayNumberFrom(new Date(2026, 0, 2, 0, 0))).toBe(2);
  });
});

describe('température', () => {
  it('seul le mot exact vaut 100 °C', () => {
    expect(toTemperature(1, true)).toBe(100);
    expect(toTemperature(1, false)).toBe(99.9);
    expect(toTemperature(0.4567, false)).toBe(45.7);
  });
  it('humeurs', () => {
    expect(moodOf(-3)).toBe('glacial'); expect(moodOf(12)).toBe('froid'); expect(moodOf(25)).toBe('tiede');
    expect(moodOf(45)).toBe('chaud'); expect(moodOf(75)).toBe('brulant'); expect(moodOf(100)).toBe('trouve');
  });
  it('saisie normalisée', () => { expect(normalizeWord('  Montagne ')).toBe('montagne'); });
});

describe('moteur local', () => {
  const day = 2; // 2e mot de la liste
  it('trouve le mot du jour', async () => {
    const r = await engine.guess('fr', day, secrets[1]);
    expect(r).toMatchObject({ known: true, found: true, temperature: 100, rank: 1 });
  });
  it('un mot proche est plus chaud qu’un mot sans rapport', async () => {
    const near = await engine.guess('fr', day, 'colline');   // secret n°2 = montagne
    const far = await engine.guess('fr', day, 'ordinateur');
    if (!near.known || !far.known) throw new Error('vocabulaire');
    expect(near.temperature).toBeGreaterThan(far.temperature);
    expect(near.found).toBe(false);
  });
  it('mot inconnu', async () => {
    expect(await engine.guess('fr', day, 'zzzqqq')).toEqual({ known: false, word: 'zzzqqq' });
  });
  it('l’indice est plus chaud que le meilleur essai et n’est jamais le mot secret', async () => {
    const h = await engine.hint('fr', day, 30, []);
    expect(h).not.toBeNull();
    expect(h!.temperature).toBeGreaterThan(30);
    expect(h!.word).not.toBe(secrets[1]);
  });
  it('mots les plus proches : le secret en premier, triés', async () => {
    const c = await engine.closest('fr', day, 10);
    expect(c[0]).toEqual({ word: secrets[1], temperature: 100 });
    for (let i = 2; i < c.length; i++) expect(c[i - 1].temperature).toBeGreaterThanOrEqual(c[i].temperature);
  });
});

describe('règles', () => {
  it('braises selon les essais', () => {
    expect(braisesFor(7)).toBe(50); expect(braisesFor(23)).toBe(30); expect(braisesFor(47)).toBe(20); expect(braisesFor(90)).toBe(10); expect(braisesFor(200)).toBe(5);
  });
  it('tri des essais', () => {
    const s = sortGuesses([{ word: 'a', temperature: 10, rank: null, order: 1 }, { word: 'b', temperature: 50, rank: null, order: 2 }, { word: 'c', temperature: 10, rank: null, order: 3 }]);
    expect(s.map(g => g.word)).toEqual(['b', 'c', 'a']);
  });
});
