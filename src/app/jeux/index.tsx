import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ink } from '@/theme/colors';
import { IconeCarte } from '@/ui/aventure-carte';
import { Bubble } from '@/ui/Bubble';
import { CARD, GlyphTile, Label, Row, Segmented, TabScreen } from '@/ui/onglets-bits';
import { T } from '@/ui/Text';

type Filtre = 'tous' | 'seul' | 'plusieurs';
const FILTRES = [['tous', 'Tous'], ['seul', 'Seul'], ['plusieurs', 'À plusieurs']] as const;
const MINI: [string, string, string][] = [
  ['Plus chaud', 'Plus chaud / plus froid', '/jeux/plus-chaud'], ['L’intrus', 'L’intrus', '/jeux/intrus'],
  ['Lier', 'Lier', '/jeux/lier'], ['Chrono', 'Contre-la-montre', '/jeux/chrono'],
];

export default function Jeux() {
  const [f, setF] = useState<Filtre>('tous');
  const seul = f !== 'plusieurs', plusieurs = f !== 'seul';
  return (
    <TabScreen title="Jeux" tab="jeux">
      <Row kind="cours" icon="pad" title="Aventure" sub="5 mondes · 30 niveaux" onPress={() => router.push('/aventure' as Href)}
        leading={<View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconeCarte size={27} color={ink} /></View>} />
      <Segmented options={FILTRES} value={f} onChange={setF} />
      {seul && (
        <>
          <Row kind="jour" icon="calendar" title="Jeu du jour" sub="nouveau mot chaque jour" onPress={() => router.push('/mot-du-jour')} />
          <Label>Mini-jeux</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {MINI.map(([court, long, route]) => (
              <Pressable key={route} accessibilityRole="button" accessibilityLabel={long} onPress={() => router.push(route as Href)}
                style={({ pressed }) => ({ flex: 1, minWidth: 0, transform: [{ translateY: pressed ? 2 : 0 }] })}>
                <Bubble {...CARD.mini} style={{ paddingTop: 8, paddingHorizontal: 4, paddingBottom: 12, alignItems: 'center', gap: 4 }}>
                  <GlyphTile name="pad" size={40} icon={24} />
                  <T size={13} weight={700} color={ink} align="center" numberOfLines={2} style={{ lineHeight: 14 }}>{court}</T>
                </Bubble>
              </Pressable>
            ))}
          </View>
        </>
      )}
      {plusieurs && (
        <>
          <Label>Duel</Label>
          <Row kind="duel" icon="bolt" title="Contre-la-montre duel" sub="1 contre 1" onPress={() => router.push('/duel/chrono?adversaire=ia' as Href)} />
          <Row kind="duel" icon="bolt" title="Duel à l’aveugle" sub="1 contre 1" onPress={() => router.push('/duel/aveugle?adversaire=ia' as Href)} />
          <Label>Multi</Label>
          <Row kind="multi" icon="multi" title="Bluff · Battle royale · 4 mots" sub="coop et groupe" onPress={() => router.push('/multi' as Href)} />
        </>
      )}
    </TabScreen>
  );
}
