import { shortDate } from '@/game/history';
import type { Guess } from '@/game/rules';
import { tempColor } from '@/game/temperature';
import { EcranPartage, messageInvitation, type CaseCarte } from './partage-carte';

/** Paliers de l'échelle des températures (mêmes couleurs que l'écran des règles). */
const BANDS = [
  { label: 'Glacial', color: '#5B8DEF', emoji: '🧊', max: 0 },
  { label: 'Froid', color: '#A9C6F2', emoji: '❄️', max: 20 },
  { label: 'Tiède', color: '#7CCDEF', emoji: '🌤️', max: 40 },
  { label: 'Chaud', color: '#FF9A3C', emoji: '🔥', max: 60 },
  { label: 'Brûlant', color: '#FF5A36', emoji: '🌋', max: 100 },
  { label: 'Trouvé', color: '#FFD23F', emoji: '🎯', max: Infinity },
] as const;
const bandOf = (t: number) => BANDS.findIndex(b => t < b.max || b.max === Infinity);

export type PartageMdj = { day: number; guesses: Guess[]; hintsUsed: number; date?: Date; serie?: number };

/** Nombre d'essais par palier de température : ce qu'on partage, sans aucun mot. */
export function compteParPalier(guesses: Guess[]): number[] {
  const n = BANDS.map(() => 0);
  guesses.forEach(g => { n[bandOf(g.temperature)] += 1; });
  return n;
}

const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;

/** Texte envoyé : performance + invitation à jouer. Ne contient jamais le mot ni les essais. */
export function texteDuPartage({ guesses, hintsUsed, serie = 0 }: PartageMdj): string {
  const n = compteParPalier(guesses);
  const perf = `J’ai trouvé le mot du jour de Nabulo en ${plural(guesses.length, 'essai')}${hintsUsed ? ` (${plural(hintsUsed, 'indice')})` : ''} 🔥`;
  const enSerie = serie >= 2 ? ` Série de ${serie} jours !` : '';
  const paliers = BANDS.map((b, i) => (n[i] ? `${b.emoji}${n[i]}` : null)).filter(Boolean).join(' ');
  return `${messageInvitation(`${perf}${enSerie}`)}\n${paliers}`;
}

/** Cases de la carte : une par essai (dans l'ordre joué) ; au-delà de 40 essais, une par palier avec son compte. */
function casesDeLaCarte(guesses: Guess[]): CaseCarte[] {
  const ordre = [...guesses].sort((a, b) => a.order - b.order);
  if (ordre.length <= 40) return ordre.map(g => ({ couleur: tempColor(g.temperature) }));
  const n = compteParPalier(guesses);
  return BANDS.flatMap((b, i) => (n[i] ? [{ couleur: b.color, texte: String(n[i]) }] : []));
}

/** Écran « Partager » du mot du jour : carte visuelle (partagée en image sur téléphone) + texte d'invitation. */
export function PartageMotDuJour({ onClose, ...p }: PartageMdj & { onClose: () => void }) {
  const date = p.date ?? new Date();
  return (
    <EcranPartage onClose={onClose} message={texteDuPartage(p)}
      carte={{
        jeu: 'Mot du jour', date: shortDate(date), chiffre: p.guesses.length, unite: p.guesses.length > 1 ? 'essais' : 'essai',
        detail: p.hintsUsed ? plural(p.hintsUsed, 'indice') : 'sans indice', cases: casesDeLaCarte(p.guesses), serie: p.serie,
      }} />
  );
}
