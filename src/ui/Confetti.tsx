import { useEffect, useMemo } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { animationsReduites } from '@/game/reglages';

const COLORS = ['#FFD45C', '#FF5A36', '#5B8DEF', '#7CE0B5', '#FF86C8', '#FFFFFF', '#9DD8FF'];
/** Pseudo-hasard stable (même tirage à chaque rendu). */
const rnd = (i: number, k: number) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };

/** Confettis qui tombent en boucle derrière le contenu (désactivés si « réduire les animations »). */
export function Confetti({ count = 30 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: rnd(i, 1) * width, w: 6 + (i % 3), h: 10 + (i % 3) * 2, color: COLORS[i % COLORS.length],
    dur: 4500 + rnd(i, 2) * 3500, delay: rnd(i, 3) * 6000, dx: (rnd(i, 4) - 0.5) * 120, rot: (rnd(i, 5) > 0.5 ? 1 : -1) * (300 + rnd(i, 6) * 420),
    v: new Animated.Value(0),
  })), [count, width]);
  useEffect(() => {
    let loops: Animated.CompositeAnimation[] = [];
    animationsReduites().then(r => {
      if (r) return;
      loops = pieces.map(p => Animated.loop(Animated.sequence([
        Animated.delay(p.delay),
        Animated.timing(p.v, { toValue: 1, duration: p.dur, easing: Easing.linear, useNativeDriver: true }),
      ])));
      loops.forEach(l => l.start());
    });
    return () => loops.forEach(l => l.stop());
  }, [pieces]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' }}>
      {pieces.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: p.x, top: -24, width: p.w, height: p.h, borderRadius: 2, backgroundColor: p.color,
          transform: [
            { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, height + 48] }) },
            { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
            { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) },
          ],
        }} />
      ))}
    </View>
  );
}
