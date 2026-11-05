import { Image } from 'expo-image';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { DevSettings, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { engine } from '@/game/engine';
import { dailyKey, onboardingSeen, shortDate, streak, untilMidnight } from '@/game/history';
import { bestTemperature } from '@/game/rules';
import { load, resetAll } from '@/game/storage';
import { partiesEnCours, type Partie } from '@/game/onglets-parties';
import type { DailyState } from '@/game/useDaily';
import { ink } from '@/theme/colors';
import { Bubble } from '@/ui/Bubble';
import { Button } from '@/ui/Button';
import { AluBackground } from '@/ui/backgrounds';
import { Icon, IconTile, images } from '@/ui/bits';
import { Mascot } from '@/ui/Mascot';
import { goTab } from '@/ui/onglets-bits';
import { TabBar } from '@/ui/TabBar';
import { T } from '@/ui/Text';

const SOFT = '#3F3566';
const LABEL = '#4A4E57';
/** Cartes de l'accueil : couleurs exactes de la maquette (fond, contour, diagonale, relief). */
const CARDS = {
  jour: { bg: '#6A4BE0', colors: { border: '#8064EB', diag: '#5733E1', relief: '#4019D4' } },
  cours: { bg: '#FFCF5C', colors: { border: '#FFD369', diag: '#FFC845', relief: '#FFBD1F' } },
  duel: { bg: '#FF8AA8', colors: { border: '#FF97B1', diag: '#FF7397', relief: '#FF4D7A' } },
  multi: { bg: '#AE98FF', colors: { border: '#B8A5FF', diag: '#9C81FF', relief: '#7E5BFF' } },
  mini: { bg: '#5FD3DA', colors: { border: '#77DFE6', diag: '#48D2DA', relief: '#25CCD7' } },
};

export default function Accueil() {
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => { onboardingSeen().then(setSeen); }, []);
  if (seen === null) return <View style={{ flex: 1, backgroundColor: '#4B33B8' }} />;
  if (!seen) return <Redirect href="/onboarding" />;
  return <Home />;
}

function Home() {
  const inset = useSafeAreaInsets();
  const day = engine.dayNumber(new Date());
  const [daily, setDaily] = useState<DailyState | null>(null);
  const [serie, setSerie] = useState(0);
  const [enCours, setEnCours] = useState<Partie[]>([]);
  useFocusEffect(useCallback(() => {
    load<DailyState | null>(dailyKey(day), null).then(setDaily);
    streak(day).then(setSerie);
    partiesEnCours().then(setEnCours);
  }, [day]));

  const n = daily?.guesses.length ?? 0;
  const solved = !!daily?.solved;
  const playing = !solved && n > 0;
  const hour = new Date().getHours();

  return (
    <View style={{ flex: 1 }}>
      <AluBackground />
      <View style={{ flex: 1, paddingTop: inset.top + 6, paddingBottom: inset.bottom + 12, paddingHorizontal: 16, gap: 13 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
          <View style={{ flex: 1 }}>
            <T size={14} weight={600} color={LABEL}>{hour >= 5 && hour < 18 ? 'Bonjour' : 'Bonsoir'}</T>
            {/* en développement : appui long sur « Nabulo » = repartir de zéro (onboarding, partie, braises) */}
            <T size={30} weight={700} color={ink} style={{ lineHeight: 32 }}
              onLongPress={__DEV__ ? async () => { await resetAll(); DevSettings.reload(); } : undefined}>Nabulo</T>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Boutique" onPress={() => router.push('/boutique')}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFD45C', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bag" size={22} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Profil" onPress={() => goTab('profil')}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#7CE0B5', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="user" size={22} width={2.2} />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 13, paddingBottom: 6 }} showsVerticalScrollIndicator={false}>
          <Pressable accessibilityRole="button" accessibilityLabel="Jeu du jour" onPress={() => router.push('/mot-du-jour')}>
            <Bubble {...CARDS.jour} style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T size={13} weight={700} color="#E2DBFF">Jeu du jour · {shortDate()}</T>
                  <T size={32} weight={700} color="#FFFFFF" style={{ lineHeight: 34 }}>{solved ? `Trouvé en ${n}` : playing ? `${n} essais` : 'Nouveau mot'}</T>
                  <T size={14} weight={600} color="#E2DBFF">
                    {playing ? `meilleur ${Math.round(bestTemperature(daily!.guesses))}° · jusqu’à minuit`
                      : serie > 0 ? `série de ${serie} jour${serie > 1 ? 's' : ''}` : 'le même mot pour tout le monde'}
                  </T>
                </View>
                {solved ? <Mascot mood="trouve" size={86} /> : <Image source={images.nabulo} style={{ width: 86, height: 86 }} contentFit="contain" accessibilityLabel="Nabulo" />}
              </View>
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                {solved ? (
                  <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 13, borderWidth: 2, borderColor: '#D9D1F2', backgroundColor: '#FFFFFF' }}>
                    <T size={14} weight={700} color={ink}>Prochain mot dans {untilMidnight()}</T>
                  </View>
                ) : (
                  <Button label={playing ? 'Reprendre' : 'Jouer'} height={54} color={ink} style={{ flex: 1 }} onPress={() => router.push('/mot-du-jour')} icon={<Icon name="play" size={22} />} />
                )}
              </View>
            </Bubble>
          </Pressable>

          {enCours.length > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel={`${enCours.length} partie${enCours.length > 1 ? 's' : ''} en cours`} onPress={() => router.push('/en-cours')}>
              <Bubble {...CARDS.cours} style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <IconTile name="clock" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T size={19} weight={700} color={ink} style={{ lineHeight: 21 }}>En cours</T>
                    <T size={14} weight={600} color={SOFT} numberOfLines={1}>{enCours.map(p => (p.id === 'jour' ? `Jeu du jour · ${n} essais` : p.titre)).join(' · ')}</T>
                  </View>
                  <View style={{ minWidth: 28, height: 28, paddingHorizontal: 7, borderRadius: 14, borderWidth: 3, borderColor: '#B02E58', backgroundColor: '#FF5A8A', boxShadow: 'inset 0 -3px 0 #D63E6C', alignItems: 'center', justifyContent: 'center' }}>
                    <T size={14} weight={700} color="#FFFFFF" style={{ lineHeight: 16 }}>{enCours.length}</T>
                  </View>
                  <Icon name="chevron" size={22} />
                </View>
              </Bubble>
            </Pressable>
          )}

          <SectionLabel>Jouer avec d’autres</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {([['duel', 'bolt', 'Duel', '1 contre 1'], ['multi', 'multi', 'Multi', 'coop · groupe']] as const).map(([k, icon, title, sub]) => (
              <Pressable key={k} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={title} onPress={() => router.push(k === 'duel' ? '/duel' : '/multi')}>
                <Bubble {...CARDS[k]} style={{ paddingTop: 14, paddingHorizontal: 14, paddingBottom: 16 }}>
                  <View style={{ height: 112, justifyContent: 'space-between' }}>
                    <IconTile name={icon} />
                    <View>
                      <T size={21} weight={700} color={ink} style={{ lineHeight: 23 }}>{title}</T>
                      <T size={14} weight={600} color={SOFT}>{sub}</T>
                    </View>
                  </View>
                </Bubble>
              </Pressable>
            ))}
          </View>

          <SectionLabel>Seul</SectionLabel>
          <Pressable accessibilityRole="button" accessibilityLabel="Mini-jeux" onPress={() => router.push('/mini-jeux')}>
            <Bubble {...CARDS.mini} style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <IconTile name="pad" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T size={19} weight={700} color={ink} style={{ lineHeight: 21 }}>Mini-jeux</T>
                  <T size={14} weight={600} color={SOFT}>Plus chaud · L’intrus · Lier · Chrono</T>
                </View>
                <Icon name="chevron" size={22} />
              </View>
            </Bubble>
          </Pressable>
        </ScrollView>

        <TabBar active="accueil" onPress={t => { if (t !== 'accueil') goTab(t); }} />
      </View>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <T size={14} weight={700} color={LABEL} style={{ textTransform: 'uppercase', letterSpacing: 0.84, marginBottom: -6, marginLeft: 2 }}>{children}</T>;
}
