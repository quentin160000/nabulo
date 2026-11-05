import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ink } from '@/theme/colors';
import { Bubble } from '@/ui/Bubble';
import { CARD, Chevron, GlyphTile, Label, Row, Segmented, SOFT, TabScreen } from '@/ui/onglets-bits';
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
      {/* le mode Aventure est mis de côté pour l'instant (route /aventure toujours présente) */}
      <Pressable accessibilityRole="button" accessibilityLabel="Jeu du jour" onPress={() => router.push('/mot-du-jour')}
        style={({ pressed }) => ({ transform: [{ translateY: pressed ? 2 : 0 }] })}>
        <Bubble {...CARD.cours} style={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <GlyphTile name="calendar" size={58} icon={34} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={24} weight={700} color={ink}>Jeu du jour</T>
            <T size={15} weight={600} color={SOFT}>nouveau mot chaque jour</T>
          </View>
          <Chevron />
        </Bubble>
      </Pressable>
      <Segmented options={FILTRES} value={f} onChange={setF} />
      {seul && (
        <>
          <Label>Mini-jeux</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {MINI.map(([court, long, route]) => (
              <Pressable key={route} accessibilityRole="button" accessibilityLabel={long} onPress={() => router.push(route as Href)}
                style={({ pressed }) => ({ flex: 1, flexBasis: 0, minWidth: 0, transform: [{ translateY: pressed ? 2 : 0 }] })}>
                {/* 4 tuiles identiques : même largeur (flex 1, base 0) et même hauteur fixe */}
                <Bubble {...CARD.mini} style={{ height: 88, paddingTop: 8, paddingHorizontal: 4, paddingBottom: 12, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <GlyphTile name="pad" size={40} icon={24} />
                  <T size={13} weight={700} color={ink} align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{court}</T>
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
          <Row kind="multi" icon="multi" title="Imposteur · Battle royale · Trouve le mot" sub="coop et groupe" onPress={() => router.push('/multi' as Href)} />
        </>
      )}
    </TabScreen>
  );
}
