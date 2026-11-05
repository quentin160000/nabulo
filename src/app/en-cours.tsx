import { Image } from 'expo-image';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import { abandonner, partiesEnCours, type Famille, type Partie } from '@/game/onglets-parties';
import { images } from '@/ui/bits';
import { PlayDot, Row, TabScreen, type CardKind, type GlyphName } from '@/ui/onglets-bits';
import { T } from '@/ui/Text';

const LOOK: Record<Famille, { kind: CardKind; icon: GlyphName }> = {
  jour: { kind: 'jour', icon: 'calendar' }, mini: { kind: 'mini', icon: 'pad' }, duel: { kind: 'duel', icon: 'bolt' }, multi: { kind: 'multi', icon: 'multi' },
};

export default function EnCours() {
  const [parties, setParties] = useState<Partie[] | null>(null);
  const refresh = useCallback(() => { partiesEnCours().then(setParties); }, []);
  useFocusEffect(refresh);

  const drop = async (p: Partie) => { await abandonner(p); refresh(); };

  return (
    <TabScreen title="En cours" back badge={parties?.length || undefined} tab="accueil">
      {parties?.map(p => <Ligne key={p.id} p={p} onAbandon={p.key ? () => drop(p) : undefined} />)}
      {parties && parties.length === 0 && (
        <View style={{ alignItems: 'center', gap: 6, paddingTop: 30 }}>
          <Image source={images.nabulo} style={{ width: 140, height: 140 }} contentFit="contain" accessibilityLabel="Nabulo" />
          <T size={20} weight={700} outline align="center">Aucune partie en cours</T>
          <T size={14} weight={600} color="#E6E0FF" align="center">Lance un jeu depuis l’accueil :{'\n'}il t’attendra ici si tu le quittes.</T>
        </View>
      )}
      {parties && parties.length > 0 && (
        <T size={13} weight={600} color="#E6E0FF" align="center" style={{ marginTop: 4 }}>
          Une partie par jeu, sauvegardée à chaque coup.{'\n'}Glisse une ligne vers la gauche pour l’abandonner.
        </T>
      )}
    </TabScreen>
  );
}

/** Ligne de partie ; glisser vers la gauche l'abandonne (sauf le mot du jour). */
function Ligne({ p, onAbandon }: { p: Partie; onAbandon?: () => void }) {
  const [x] = useState(() => new Animated.Value(0));
  const [pan] = useState(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => !!onAbandon && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_, g) => x.setValue(Math.min(0, g.dx)),
    onPanResponderRelease: (_, g) => {
      if (g.dx < -110) Animated.timing(x, { toValue: -480, duration: 180, useNativeDriver: true }).start(() => onAbandon?.());
      else Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
  }));
  const look = LOOK[p.famille];
  return (
    <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }] }}
      accessibilityActions={onAbandon ? [{ name: 'delete', label: 'Abandonner la partie' }] : undefined}
      onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'delete') onAbandon?.(); }}>
      <Row kind={look.kind} icon={look.icon} title={p.titre} sub={p.sousTitre || undefined} trailing={<PlayDot />}
        label={`Reprendre ${p.titre}`} onPress={() => router.push(p.route as Href)} />
    </Animated.View>
  );
}
