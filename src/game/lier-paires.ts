/**
 * Paires de mots de « Lier », vérifiées avec le lexique (tests/lier.test.ts) :
 * facile = 2 étapes suffisent, moyen = 3 étapes au minimum, difficile = 3 étapes ou plus entre mots très éloignés (< 5°).
 */
import { rng } from './lexicon';

export type Pair = readonly [string, string];
export type Level = 'facile' | 'moyen' | 'difficile';

export const FACILE: Pair[] = [
  ['santé', 'internet'], ['mère', 'nuit'], ['serpent', 'fruit'], ['bois', 'ours'], ['volcan', 'cheval'],
  ['enfant', 'couronne'], ['oiseau', 'pomme'], ['bateau', 'café'], ['chapeau', 'bière'], ['porte', 'plage'],
  ['pluie', 'bougie'], ['fromage', 'papier'], ['bouclier', 'gâteau'], ['étoile', 'graine'], ['paix', 'amour'],
  ['route', 'fenêtre'], ['épée', 'pomme'], ['bière', 'ballon'], ['ours', 'sable'], ['forêt', 'armée'],
  ['miroir', 'étoile'], ['bière', 'montagne'], ['plage', 'terre'], ['chambre', 'route'], ['horloge', 'téléphone'],
  ['écran', 'internet'],
];

export const MOYEN: Pair[] = [
  ['prison', 'film'], ['église', 'chanson'], ['violon', 'abeille'], ['hiver', 'mur'], ['père', 'tennis'],
  ['violon', 'île'], ['pain', 'prince'], ['printemps', 'papier'], ['ordinateur', 'nuit'], ['violon', 'racine'],
  ['soldat', 'bière'], ['tennis', 'piano'], ['pluie', 'photo'], ['étoile', 'lait'], ['père', 'sucre'],
  ['rêve', 'hiver'], ['hiver', 'hôpital'], ['tennis', 'violon'], ['soleil', 'moto'], ['sport', 'lait'],
  ['médecin', 'tennis'], ['fruit', 'horloge'], ['automne', 'écran'], ['tomate', 'tennis'], ['film', 'train'],
  ['école', 'arbre'], ['école', 'chanson'], ['armée', 'chanson'], ['marché', 'ours'], ['chien', 'guitare'],
  ['église', 'matin'], ['train', 'prison'], ['ami', 'train'], ['violon', 'neige'], ['avion', 'film'],
  ['docteur', 'tambour'], ['tennis', 'chien'], ['chat', 'pierre'], ['lait', 'livre'], ['bus', 'tennis'],
  ['robot', 'bus'], ['lune', 'chanson'], ['juge', 'loup'], ['citron', 'château'], ['maison', 'robot'],
  ['moto', 'couronne'], ['ordinateur', 'volcan'], ['enfant', 'horloge'], ['nuit', 'théâtre'], ['train', 'chat'],
  ['reine', 'miroir'], ['avion', 'épée'], ['hôpital', 'vélo'], ['printemps', 'argent'], ['café', 'étoile'],
  ['pont', 'vin'], ['rêve', 'château'], ['chapeau', 'ami'], ['argent', 'plage'], ['avion', 'neige'],
  ['téléphone', 'ballon'], ['guitare', 'école'], ['tomate', 'film'], ['loup', 'piano'], ['fer', 'télévision'],
  ['téléphone', 'citron'], ['fenêtre', 'rêve'], ['chocolat', 'violon'], ['violon', 'vélo'],
];

export const DIFFICILE: Pair[] = [
  ['armée', 'café'], ['robot', 'racine'], ['serpent', 'sport'], ['matin', 'bijou'], ['clé', 'bois'],
  ['mère', 'moteur'], ['prince', 'métro'], ['camion', 'prince'], ['théâtre', 'moto'], ['prison', 'chat'],
  ['pont', 'chocolat'], ['paix', 'loup'], ['chat', 'fusée'], ['film', 'moto'], ['vélo', 'guerre'],
  ['vent', 'docteur'], ['football', 'pluie'], ['juge', 'sable'], ['lion', 'bus'], ['football', 'vache'],
  ['danse', 'écran'], ['miroir', 'radio'], ['neige', 'médecin'], ['loi', 'tennis'], ['police', 'vache'],
  ['couronne', 'robot'], ['téléphone', 'neige'], ['prince', 'internet'], ['télévision', 'soldat'],
];

/** Défi du jour : même paire pour tout le monde, tirée avec le numéro du jour. */
export const DEFIS: Pair[] = [...MOYEN, ...DIFFICILE];

export function dailyPair(day: number): Pair {
  return DEFIS[Math.floor(rng(day)() * DEFIS.length)];
}

/** Paires proposées à l'écran « Quels mots lier ? » (les mêmes toute la journée, puis d'autres à chaque nouvelle série). */
export function pairsFor(day: number, round = 0): Record<Level, Pair> {
  const r = rng(day * 97 + round * 7919 + 13);
  const pick = (l: Pair[]) => l[Math.floor(r() * l.length)];
  return { facile: pick(FACILE), moyen: pick(MOYEN), difficile: pick(DIFFICILE) };
}
