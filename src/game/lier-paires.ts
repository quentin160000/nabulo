/**
 * Paires de mots de « Lier », vérifiées avec le lexique frWac (tests/lier.test.ts) :
 * facile = 2 étapes suffisent, moyen = 3 étapes au minimum,
 * difficile = 3 étapes ou plus entre mots très éloignés (sous `DIFFICILE_MAX` °C).
 */
import { rng } from './lexicon';

/** Température maximale entre les deux mots d'une paire difficile (5 °C sur l'ancienne échelle fastText). */
export const DIFFICILE_MAX = -2;

export type Pair = readonly [string, string];
export type Level = 'facile' | 'moyen' | 'difficile';

export const FACILE: Pair[] = [
  ['santé', 'internet'], ['mère', 'nuit'], ['serpent', 'fruit'], ['bois', 'ours'], ['enfant', 'couronne'],
  ['oiseau', 'pomme'], ['bateau', 'café'], ['chapeau', 'bière'], ['porte', 'plage'], ['pluie', 'bougie'],
  ['fromage', 'papier'], ['bouclier', 'gâteau'], ['étoile', 'graine'], ['route', 'fenêtre'], ['ours', 'sable'],
  ['forêt', 'armée'], ['plage', 'terre'], ['chambre', 'route'], ['horloge', 'téléphone'], ['écran', 'internet'],
  ['prison', 'film'], ['nuit', 'théâtre'], ['guitare', 'école'], ['avion', 'neige'], ['téléphone', 'citron'],
  ['église', 'chanson'],
];

export const MOYEN: Pair[] = [
  ['violon', 'abeille'], ['violon', 'île'], ['soldat', 'bière'], ['étoile', 'lait'], ['père', 'sucre'],
  ['hiver', 'hôpital'], ['fruit', 'horloge'], ['école', 'arbre'], ['avion', 'film'], ['docteur', 'tambour'],
  ['chat', 'pierre'], ['juge', 'loup'], ['citron', 'château'], ['ordinateur', 'volcan'], ['reine', 'miroir'],
  ['argent', 'plage'], ['fer', 'télévision'], ['violon', 'vélo'], ['épée', 'pomme'], ['bière', 'ballon'],
  ['clé', 'bois'], ['mère', 'moteur'], ['juge', 'sable'], ['loi', 'tennis'], ['police', 'vache'],
  ['ours', 'école'], ['abeille', 'sable'], ['radio', 'tomate'], ['prison', 'internet'], ['clé', 'paix'],
  ['automne', 'hôpital'], ['télévision', 'vache'], ['hôpital', 'papier'], ['police', 'vin'], ['chat', 'fer'],
  ['bouclier', 'graine'], ['métro', 'écran'], ['pont', 'marché'], ['loi', 'pomme'], ['bijou', 'soldat'],
  ['loi', 'soleil'], ['miroir', 'vache'], ['médecin', 'ours'], ['abeille', 'chambre'], ['hôpital', 'fer'],
  ['bateau', 'loi'], ['internet', 'police'], ['chapeau', 'horloge'], ['graine', 'piano'], ['église', 'médecin'],
  ['ordinateur', 'fromage'], ['arbre', 'téléphone'], ['sucre', 'piano'], ['cheval', 'maison'], ['robot', 'clé'],
  ['marché', 'porte'], ['arbre', 'ordinateur'], ['bière', 'sport'], ['bus', 'chat'], ['police', 'sable'],
  ['chien', 'clé'], ['moteur', 'film'], ['internet', 'abeille'], ['église', 'armée'], ['camion', 'lion'],
  ['vélo', 'piano'], ['docteur', 'tennis'], ['marché', 'violon'], ['livre', 'chat'],
];

export const DIFFICILE: Pair[] = [
  ['armée', 'café'], ['robot', 'racine'], ['serpent', 'sport'], ['camion', 'prince'], ['pont', 'chocolat'],
  ['film', 'moto'], ['vélo', 'guerre'], ['vent', 'docteur'], ['lion', 'bus'], ['football', 'vache'],
  ['neige', 'médecin'], ['couronne', 'robot'], ['téléphone', 'neige'], ['prince', 'internet'], ['père', 'tennis'],
  ['médecin', 'tennis'], ['tomate', 'tennis'], ['école', 'chanson'], ['chien', 'guitare'], ['violon', 'neige'],
  ['moto', 'couronne'], ['enfant', 'horloge'], ['avion', 'épée'], ['hôpital', 'vélo'], ['printemps', 'argent'],
  ['loup', 'piano'], ['volcan', 'cheval'], ['bière', 'montagne'], ['île', 'miroir'],
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
