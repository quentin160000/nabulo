import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { ink } from '@/theme/colors';
import { formatTemp, moodLabel, moodOf, tempColor } from '@/game/temperature';
import { T } from './Text';

/** Jauge horizontale du meilleur essai : du bleu glacier au rouge braise, curseur à la température. */
export function TempGauge({ best, last }: { best: number | null; last?: { word: string; temperature: number } | null }) {
  const pct = best === null ? 0 : Math.max(0, Math.min(100, best));
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <T size={14} weight={700} outline>{best === null ? 'Aucun essai' : `Meilleur : ${formatTemp(best)}`}</T>
        {best !== null && <T size={14} weight={700} outline>{moodLabel[moodOf(best)]}</T>}
      </View>
      <View style={{ height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', padding: 3 }}>
        <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#EEE9FB' }}>
          <LinearGradient colors={['#5B8DEF', '#9AD8F5', '#FFC23D', '#FF5A36']} locations={[0, 0.35, 0.68, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%` }} />
        </View>
        {best !== null && (
          <View style={{ position: 'absolute', top: -5, left: `${pct}%`, marginLeft: -14, width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 4, borderColor: tempColor(best) }} />
        )}
      </View>
      {last ? (
        <T size={14} weight={600} outline align="center">
          « {last.word} » · {formatTemp(last.temperature)}
        </T>
      ) : null}
    </View>
  );
}

export function TempChip({ t }: { t: number }) {
  return (
    <View style={{ minWidth: 64, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: tempColor(t), alignItems: 'center' }}>
      <T size={14} weight={700} color={ink}>{t.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}°</T>
    </View>
  );
}
