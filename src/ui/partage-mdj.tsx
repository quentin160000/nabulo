import { Platform, Pressable, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shortDate } from '@/game/history';
import type { Guess } from '@/game/rules';
import { gameInk } from '@/theme/colors';
import { Bubble } from './Bubble';
import { Button } from './Button';
import { Icon } from './bits';
import { GameBg } from './game';
import { T } from './Text';
import { Toast, useToast } from './Toast';

const INK = gameInk;
const SH2 = { textShadowColor: '#2B2150', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 } as const;

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

export type PartageMdj = { day: number; guesses: Guess[]; hintsUsed: number; date?: Date };

/** Nombre d'essais par palier de température : ce qu'on partage, sans aucun mot. */
export function compteParPalier(guesses: Guess[]): number[] {
  const n = BANDS.map(() => 0);
  guesses.forEach(g => { n[bandOf(g.temperature)] += 1; });
  return n;
}

const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;

/** Texte envoyé : score, indices et répartition des températures. Ne contient jamais le mot ni les essais. */
export function texteDuPartage({ day, guesses, hintsUsed, date = new Date() }: PartageMdj): string {
  const n = compteParPalier(guesses);
  const lignes = BANDS.map((b, i) => (n[i] ? `${b.emoji} ${b.label} × ${n[i]}` : null)).filter(Boolean);
  return [
    `Nabulo · Mot du jour · ${shortDate(date)}`,
    `Trouvé en ${plural(guesses.length, 'essai')}${hintsUsed ? ` (${plural(hintsUsed, 'indice')})` : ''}`,
    '',
    ...lignes,
  ].join('\n');
}

/** Écran « Partager » du mot du jour (planche « Partage » : carte au centre, Copier / Envoyer en bas). */
export function PartageMotDuJour({ onClose, ...p }: PartageMdj & { onClose: () => void }) {
  const inset = useSafeAreaInsets();
  const toast = useToast();
  const date = p.date ?? new Date();
  const message = texteDuPartage({ ...p, date });
  const n = compteParPalier(p.guesses);
  const send = () => { Share.share({ message }).catch(() => {}); };
  const copy = async () => {
    const clip = Platform.OS === 'web' ? (globalThis as { navigator?: { clipboard?: { writeText(s: string): Promise<void> } } }).navigator?.clipboard : undefined;
    if (clip) { try { await clip.writeText(message); toast.show('Copié !'); return; } catch { /* on passe par le partage */ } }
    send();
  };
  return (
    <View style={{ flex: 1 }}>
      <GameBg />
      <View style={{ flex: 1, paddingTop: inset.top + 4, paddingBottom: inset.bottom + 24, paddingHorizontal: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Retour au résultat" onPress={onClose} hitSlop={4}
            style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={20} color={INK} />
          </Pressable>
          <T size={18} weight={700} color="#FFFFFF" style={[{ flex: 1, minWidth: 0 }, SH2]}>Partager</T>
        </View>
        <View style={{ flex: 1 }} />
        <Bubble bg="#FFFFFF" radius={18} border={2} inset={6} style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
          <T size={15} weight={700} color={INK} align="center">Nabulo · Mot du jour · {shortDate(date)}</T>
          <T size={26} weight={700} color={INK} align="center" style={{ marginTop: 4, marginBottom: 8 }}>
            {plural(p.guesses.length, 'essai')}{p.hintsUsed ? ` · ${plural(p.hintsUsed, 'indice')}` : ''}
          </T>
          <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}
            accessibilityLabel={BANDS.map((b, i) => `${b.label} ${n[i]}`).join(', ')}>
            {BANDS.map((b, i) => (
              <View key={b.label} style={{ width: 40, height: 40, borderRadius: 10, borderWidth: 2, borderColor: 'transparent', backgroundColor: b.color, opacity: n[i] ? 1 : 0.35, alignItems: 'center', justifyContent: 'center' }}>
                <T size={15} weight={700} color={INK}>{n[i]}</T>
              </View>
            ))}
          </View>
          <T size={13} weight={600} color={INK} align="center" style={{ marginTop: 8 }}>les couleurs montrent la température de tes essais, sans dévoiler le mot</T>
        </Bubble>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Copier" variant="yellow-mix" border={2} radius={18} fontSize={18} style={{ flex: 1 }} onPress={copy} />
          <Button label="Envoyer" variant="yellow" border={2} radius={18} fontSize={18} style={{ flex: 1 }} onPress={send} />
        </View>
      </View>
      <Toast msg={toast.msg} style={{ bottom: 100 + inset.bottom }} />
    </View>
  );
}
