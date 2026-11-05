import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View, useWindowDimensions } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { alu, aluStops } from '@/theme/colors';

const fill = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const;

function useReduceMotion() {
  const [r, setR] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setR); }, []);
  return r;
}

/** Dégradé trois fois plus haut que l'écran qui glisse lentement de haut en bas (classes .hm-grad / .ff-heat). */
export function SlidingGradient({ colors, stops, duration = 16000 }: { colors: readonly string[]; stops: readonly number[]; duration?: number }) {
  const { height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduce, v, duration]);
  return (
    <View pointerEvents="none" style={[fill, { overflow: 'hidden' }]}>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: height * 3, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 2] }) }] }}>
        <LinearGradient colors={colors as [string, string, ...string[]]} locations={stops as [number, number, ...number[]]} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
}

const rnd = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
const BALLS = ['#FFD45C', '#FFB35C'];
const FLAKES = ['#9DBDF0', '#BDE7FF', '#FFFFFF'];

/** Petites braises rondes et flocons qui montent derrière le contenu (classe .hm-up de la maquette). */
export function RisingBits({ count = 16, seed = 1 }: { count?: number; seed?: number }) {
  const { width, height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const bits = useMemo(() => Array.from({ length: count }, (_, i) => {
    const flake = i % 2 === 1;
    const size = flake ? [24, 28][Math.floor(rnd(i, seed) * 2)] : [12, 14, 16, 18][Math.floor(rnd(i, seed + 1) * 4)];
    return {
      flake, size, x: (i / count) * width + rnd(i, seed + 2) * 20 - 6,
      color: flake ? FLAKES[Math.floor(rnd(i, seed + 3) * 3)] : BALLS[Math.floor(rnd(i, seed + 4) * 2)],
      dur: 9000 + rnd(i, seed + 5) * 6000, start: rnd(i, seed + 6), dx: (rnd(i, seed + 7) - 0.5) * 50,
      v: new Animated.Value(rnd(i, seed + 6)),
    };
  }), [count, seed, width]);
  useEffect(() => {
    if (reduce) return;
    const loops = bits.map(b => {
      // chaque élément part de sa position actuelle, puis boucle depuis le bas
      const first = Animated.timing(b.v, { toValue: 1, duration: b.dur * (1 - b.start), easing: Easing.linear, useNativeDriver: true });
      const again = Animated.loop(Animated.sequence([
        Animated.timing(b.v, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(b.v, { toValue: 1, duration: b.dur, easing: Easing.linear, useNativeDriver: true }),
      ]));
      const seq = Animated.sequence([first, again]);
      seq.start();
      return seq;
    });
    return () => loops.forEach(l => l.stop());
  }, [bits, reduce]);
  return (
    <View pointerEvents="none" style={[fill, { overflow: 'hidden' }]}>
      {bits.map((b, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: b.x, top: height, width: b.size, height: b.size,
          transform: [
            { translateY: b.v.interpolate({ inputRange: [0, 1], outputRange: [24, -height - 40] }) },
            { translateX: b.v.interpolate({ inputRange: [0, 1], outputRange: [0, b.dx] }) },
            { rotate: b.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
          ],
        }}>
          {b.flake ? (
            <Svg width={b.size} height={b.size} viewBox="0 0 100 100">
              <Polygon points="50,0 61,39 100,50 61,61 50,100 39,61 0,50 39,39" fill={b.color} />
            </Svg>
          ) : (
            <View style={{ flex: 1, borderRadius: b.size / 2, backgroundColor: b.color, borderWidth: 2.5, borderColor: '#2B2150' }} />
          )}
        </Animated.View>
      ))}
    </View>
  );
}

/** Fond aluminium : dégradé gris en biais avec un reflet clair en haut à gauche. */
export function AluBackground() {
  return (
    <View pointerEvents="none" style={fill}>
      <LinearGradient colors={alu as unknown as [string, string, ...string[]]} locations={aluStops as unknown as [number, number, ...number[]]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={fill} />
      <LinearGradient colors={['rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']} start={{ x: 0.1, y: 0 }} end={{ x: 0.5, y: 0.45 }} style={fill} />
    </View>
  );
}
