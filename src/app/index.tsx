import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { engine } from '@/game/engine';
import { load } from '@/game/storage';
import type { DailyState } from '@/game/useDaily';
import { useWallet } from '@/game/wallet';
import { Bubble } from '@/ui/Bubble';
import { Button } from '@/ui/Button';
import { BraisePill, HeaderButton, Tag, images } from '@/ui/bits';
import { Screen } from '@/ui/Screen';
import { T } from '@/ui/Text';

function untilMidnight(now = new Date()) {
  const m = new Date(now); m.setHours(24, 0, 0, 0);
  const min = Math.round((m.getTime() - now.getTime()) / 60000);
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}

export default function Accueil() {
  const { braises } = useWallet();
  const day = engine.dayNumber(new Date());
  const [daily, setDaily] = useState<DailyState | null>(null);
  // relit l'état du jour à chaque retour sur l'accueil
  useFocusEffect(useCallback(() => { load<DailyState | null>(`thermomot:mdj:fr:${day}`, null).then(setDaily); }, [day]));

  const solved = !!daily?.solved, started = !!daily && daily.guesses.length > 0;
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <HeaderButton kind="menu" label="Menu" />
        <T size={26} weight={700} outline style={{ flex: 1 }}>Thermo·Mot</T>
        <BraisePill value={braises} />
      </View>
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Bubble radius={26} style={{ padding: 18, paddingBottom: 22, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Image source={solved ? images.tisonSaut : images.tison} style={{ width: 96, height: 96 }} contentFit="contain" accessibilityLabel="Tison" />
            <View style={{ flex: 1, gap: 4 }}>
              <T size={14} weight={700} color="#6B6290">Mot du jour n°{day}</T>
              <T size={24} weight={700}>{solved ? 'Trouvé !' : started ? 'Partie en cours' : 'Le même pour tout le monde'}</T>
              {solved ? <Tag label={`« ${daily!.secret} » en ${daily!.guesses.length} essais`} />
                : started ? <Tag label={`${daily!.guesses.length} essais`} /> : null}
            </View>
          </View>
          <View style={{ marginTop: 16 }}>
            {solved
              ? <T size={15} weight={600} align="center" color="#6B6290">Prochain mot dans {untilMidnight()}</T>
              : <Button label={started ? 'Reprendre' : 'Jouer'} onPress={() => router.push('/mot-du-jour')} />}
          </View>
        </Bubble>
        {[['Jeux libres', 'Plus chaud / plus froid, L’intrus, Lier, Contre-la-montre'], ['Duel', 'Contre-la-montre, Duel à l’aveugle'], ['Coop et multi', 'Synchro, 4 mots, Bluff, Battle royale, Relais']].map(([t, d]) => (
          <Bubble key={t} radius={22} style={{ padding: 16, opacity: 0.85 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <T size={19} weight={700}>{t}</T>
                <T size={13} weight={600} color="#6B6290">{d}</T>
              </View>
              <Tag label="Bientôt" />
            </View>
          </Bubble>
        ))}
      </ScrollView>
    </Screen>
  );
}
