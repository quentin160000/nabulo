import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { rivaux, type Rival } from '@/game/onglets-parties';
import { ink, meRow } from '@/theme/colors';
import { Avatar } from '@/ui/bits';
import { GlyphTile, Label, Row, TabScreen, Tag, type GlyphName } from '@/ui/onglets-bits';
import { T } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

type Adv = 'ami' | 'hasard' | 'ia';
const ADVERSAIRES: readonly [Adv, GlyphName, string][] = [['ami', 'friend', 'Un ami'], ['hasard', 'globe', 'Au hasard'], ['ia', 'robot', 'Une IA']];
const AVATARS = ['#FFB35C', '#7FE3EA', '#FF8FAB', '#7CE0B5', '#B9A8FF'];

export default function Duel() {
  const toast = useToast();
  const [adv, setAdv] = useState<Adv>('ia');
  const [rivals, setRivals] = useState<Rival[]>([]);
  useFocusEffect(useCallback(() => { rivaux().then(setRivals); }, []));

  const pick = (a: Adv) => { if (a === 'ia') setAdv('ia'); else toast.show('Bientôt disponible'); };
  const go = (route: string) => router.push(`${route}?adversaire=${adv}` as Href);

  return (
    <TabScreen title="Duel" back tab="accueil" toast={toast.msg}>
      <Label>Choisis le jeu</Label>
      <Row kind="duel" icon="bolt" title="Contre-la-montre duel" sub="best of 5 · tir à la corde" onPress={() => go('/duel/chrono')} />
      <Row kind="duel" icon="bolt" title="Duel à l’aveugle" sub="même mot caché · le 1er qui trouve" onPress={() => go('/duel/aveugle')} />

      <Label>Contre qui ?</Label>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {ADVERSAIRES.map(([k, icon, lbl]) => {
          const on = adv === k;
          return (
            <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={lbl} onPress={() => pick(k)}
              style={{ flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 20, backgroundColor: on ? meRow : '#FFFFFF', alignItems: 'center', gap: 6 }}>
              <GlyphTile name={icon} size={42} icon={25} bg="#F1EEFA" />
              <T size={15} weight={700} color={ink} align="center" style={{ lineHeight: 17 }}>{lbl}</T>
            </Pressable>
          );
        })}
      </View>

      {rivals.length > 0 && (
        <>
          <Label>Tes rivaux</Label>
          {rivals.map((r, i) => (
            <Row key={r.nom} kind="white" icon="user" title={r.nom} sub={r.bilan || undefined}
              leading={<Avatar letter={r.nom[0]?.toUpperCase() ?? '?'} color={AVATARS[i % AVATARS.length]} size={40} textColor={ink} />}
              trailing={<Tag label="Défier" bg="#FFD45C" />} label={`Défier ${r.nom}`}
              onPress={() => (r.route ? router.push(r.route as Href) : toast.show('Bientôt disponible'))} />
          ))}
        </>
      )}
    </TabScreen>
  );
}
