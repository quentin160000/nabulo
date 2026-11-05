import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ink } from '@/theme/colors';
import { images } from './bits';
import { T } from './Text';
import { animationsReduites } from '@/game/reglages';

/** Écran de chargement (planche M-mascotte-tison-3d) : Nabulo qui tourne, titre, jauge froid → chaud. */
export function Loading({ onReady }: { onReady?: () => void }) {
  const inset = useSafeAreaInsets();
  const [v] = useState(() => new Animated.Value(0));
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    animationsReduites().then(r => {
      setReduce(r);
      if (r) return;
      // 0 → 80 % du temps : la jauge se remplit ; 80 → 100 % : elle reste pleine (comme l'animation tlfill de la maquette)
      loop = Animated.loop(Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 2560, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.delay(640),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: false }),
      ]));
      loop.start();
    });
    return () => loop?.stop();
  }, [v]);
  const width = reduce ? '62%' : v.interpolate({ inputRange: [0, 1], outputRange: ['8%', '100%'] });
  return (
    <View accessibilityLabel="Chargement des mots" style={{ flex: 1 }}>
      <LinearGradient colors={['#4B33B8', '#6E4FE6', '#9A7BFF']} locations={[0, 0.55, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <View style={{ flex: 1, paddingTop: inset.top + 4, paddingBottom: inset.bottom + 24, paddingHorizontal: 16, gap: 10 }}>
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Image source={images.nabuloTour} autoplay onLoad={onReady} onError={onReady} style={{ width: 280, height: 280 }} contentFit="contain" accessibilityLabel="Nabulo qui tourne sur lui-même" />
          <T size={46} weight={700} outline style={{ letterSpacing: 0.5 }}>Nabulo</T>
          <T size={16} weight={600} color="#FFFFFF">le jeu des mots chauds et froids</T>
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View style={{ width: 240, height: 26, borderRadius: 13, borderWidth: 4, borderColor: ink, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
            <Animated.View style={{ height: '100%', width, overflow: 'hidden' }}>
              <LinearGradient colors={['#5B8DEF', '#9AD8F5', '#FFC23D', '#FF5A36']} locations={[0, 0.35, 0.68, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: 232, height: '100%' }} />
            </Animated.View>
          </View>
          <T size={15} weight={600} color="#FFFFFF">Chargement des mots…</T>
        </View>
        <View style={{ height: 30 }} />
      </View>
    </View>
  );
}
