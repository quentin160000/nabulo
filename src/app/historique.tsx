import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { DUELS_KEY, tally, type DuelRecord, type Jeu } from '@/game/duel';
import { load } from '@/game/storage';
import { ink } from '@/theme/colors';
import { Bubble } from '@/ui/Bubble';
import { Button } from '@/ui/Button';
import { images } from '@/ui/bits';
import { CARD, Label, Row, SOFT, TabScreen, Tag } from '@/ui/onglets-bits';
import { T } from '@/ui/Text';

const NOM: Record<Jeu, string> = { chrono: 'Contre-la-montre', aveugle: 'Duel à l’aveugle' };

const valide = (r: unknown): r is DuelRecord => {
  const o = r as Partial<DuelRecord> | null;
  return !!o && (o.jeu === 'chrono' || o.jeu === 'aveugle') && typeof o.gagne === 'boolean' && typeof o.date === 'string';
};

const quand = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function Historique() {
  const [list, setList] = useState<DuelRecord[] | null>(null);
  useFocusEffect(useCallback(() => {
    load<unknown>(DUELS_KEY, []).then(l => setList(Array.isArray(l) ? l.filter(valide).reverse() : []));
  }, []));
  const { victoires, defaites } = tally(list ?? []);

  const cases: [string, string][] = [
    [String(victoires), victoires > 1 ? 'victoires' : 'victoire'],
    [String(defaites), defaites > 1 ? 'défaites' : 'défaite'],
    [list?.length ? `${Math.round((victoires / list.length) * 100)} %` : '–', 'de victoires'],
  ];

  return (
    <TabScreen title="Historique" back tab="profil">
      {list && list.length === 0 && (
        <View style={{ alignItems: 'center', gap: 6, paddingTop: 30 }}>
          <Image source={images.nabulo} style={{ width: 140, height: 140 }} contentFit="contain" accessibilityLabel="Nabulo" />
          <T size={20} weight={700} outline align="center">Aucun duel pour l’instant</T>
          <T size={14} weight={600} color="#E6E0FF" align="center">Affronte l’IA au contre-la-montre ou à l’aveugle :{'\n'}tes victoires et défaites s’afficheront ici.</T>
          <Button label="Lancer un duel" border={2} color={ink} style={{ alignSelf: 'stretch', marginTop: 14 }} onPress={() => router.push('/duel')} />
        </View>
      )}
      {list && list.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }} accessible accessibilityLabel={cases.map(([v, l]) => `${v} ${l}`).join(', ')}>
            {cases.map(([v, l]) => (
              <Bubble key={l} {...CARD.stat} style={{ flex: 1, minWidth: 0, paddingTop: 10, paddingHorizontal: 4, paddingBottom: 13, alignItems: 'center' }}>
                <T size={24} weight={700} color={ink}>{v}</T>
                <T size={12} weight={600} color={SOFT} numberOfLines={1}>{l}</T>
              </Bubble>
            ))}
          </View>
          <Label>Derniers duels</Label>
          {list.map((d, i) => (
            <Row key={`${d.date}-${i}`} kind="white" icon="bolt" title={NOM[d.jeu]} sub={`contre l’IA · ${quand(d.date)}`}
              trailing={<Tag label={d.gagne ? 'Gagné' : 'Perdu'} bg={d.gagne ? '#7CE0B5' : '#FFD6E0'} />} />
          ))}
        </>
      )}
    </TabScreen>
  );
}
