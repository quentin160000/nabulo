import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { encoursOf, recordOf } from '@/game/onglets-parties';
import { ink, meRow } from '@/theme/colors';
import { Bubble } from '@/ui/Bubble';
import { CARD, GlyphTile, Label, Row, SOFT, TabScreen, Tag } from '@/ui/onglets-bits';
import { T } from '@/ui/Text';

type Jeu = { id: string; titre: string; route: string; record: (n: number) => string; accroche: string };
const MINI_JEUX: Jeu[] = [
  { id: 'plus-chaud', titre: 'Plus chaud / froid', route: '/jeux/plus-chaud', record: n => `record ${n}`, accroche: 'devine la température' },
  { id: 'intrus', titre: 'L’intrus', route: '/jeux/intrus', record: n => `record ${n}`, accroche: 'trouve le mot à part' },
  { id: 'lier', titre: 'Lier', route: '/jeux/lier', record: n => `record ${n}`, accroche: 'de mot en mot' },
  { id: 'chrono', titre: 'Contre-la-montre', route: '/jeux/chrono', record: n => `record ${n} mots`, accroche: 'un maximum de mots' },
];

type Etat = { record: number | null; enCours: string | null };

export default function MiniJeux() {
  const [etat, setEtat] = useState<Record<string, Etat>>({});
  useFocusEffect(useCallback(() => {
    Promise.all(MINI_JEUX.map(async j => {
      const [record, p] = await Promise.all([recordOf(j.id), encoursOf(j.id)]);
      return [j.id, { record, enCours: p ? p.sousTitre : null }] as const;
    })).then(e => setEtat(Object.fromEntries(e)));
  }, []));

  const tuile = (j: Jeu) => {
    const e = etat[j.id];
    const parts = [e?.enCours?.split('\n')[0] || null, e?.record != null ? j.record(e.record) : null].filter(Boolean);
    const sub = parts.length ? parts.join(' · ') : j.accroche;
    return (
      <Pressable key={j.id} style={({ pressed }) => ({ flex: 1, minWidth: 0, transform: [{ translateY: pressed ? 2 : 0 }] })}
        accessibilityRole="button" accessibilityLabel={`${j.titre}, ${sub}${e?.enCours != null ? ', partie en cours' : ''}`} onPress={() => router.push(j.route as Href)}>
        <Bubble {...CARD.mini} style={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 15 }}>
          <View style={{ height: 128, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <GlyphTile name="pad" />
              {e?.enCours != null && <Tag label="en cours" bg={meRow} />}
            </View>
            <View>
              <T size={18} weight={700} color={ink} numberOfLines={2} adjustsFontSizeToFit style={{ lineHeight: 20 }}>{j.titre}</T>
              <T size={13} weight={600} color={SOFT} numberOfLines={2}>{sub}</T>
            </View>
          </View>
        </Bubble>
      </Pressable>
    );
  };

  return (
    <TabScreen title="Mini-jeux" back tab="accueil">
      <View style={{ flexDirection: 'row', gap: 10 }}>{MINI_JEUX.slice(0, 2).map(tuile)}</View>
      <View style={{ flexDirection: 'row', gap: 10 }}>{MINI_JEUX.slice(2).map(tuile)}</View>
      <Label>Défi du jour</Label>
      <Row kind="cours" icon="pad" title="Lier · défi du jour" sub="le même pour tous, chaque jour" onPress={() => router.push('/jeux/lier?defi=jour' as Href)} />
    </TabScreen>
  );
}
