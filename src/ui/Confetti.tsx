import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { animationsReduites } from '@/game/reglages';

const COLORS = ['#FFD45C', '#FF5A36', '#5B8DEF', '#7CE0B5', '#FF86C8', '#FFFFFF', '#9DD8FF'];
/** Pseudo-hasard stable (même tirage à chaque rendu). */
const rnd = (i: number, k: number) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
/** Départ au-dessus du cadre ; à l'arrivée chaque confetti est entièrement sorti par le bas (et déjà effacé). */
const TOP = -24;
const MARGIN = 40;

/**
 * Confettis qui tombent en boucle derrière le contenu (désactivés si « réduire les animations »).
 * La chute se mesure sur la hauteur réelle du cadre (pas celle de la fenêtre) et finit en fondu sous le bord :
 * aucun confetti ne reste posé en bas, même si l'animation s'arrête.
 */
export function Confetti({ count = 30 }: { count?: number }) {
  const win = useWindowDimensions();
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const width = box?.w ?? win.width;
  const height = box?.h ?? win.height;
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: rnd(i, 1), w: 6 + (i % 3), h: 10 + (i % 3) * 2, color: COLORS[i % COLORS.length],
    dur: 4500 + rnd(i, 2) * 3500, delay: rnd(i, 3) * 6000, dx: (rnd(i, 4) - 0.5) * 120, rot: (rnd(i, 5) > 0.5 ? 1 : -1) * (300 + rnd(i, 6) * 420),
    v: new Animated.Value(0),
  })), [count]);
  const [on, setOn] = useState(false);

  useEffect(() => {
    let alive = true;
    const running: Animated.CompositeAnimation[] = [];
    // chaque chute repart explicitement d'en haut : pas de valeur qui reste bloquée en bas entre deux tours
    const fall = (p: (typeof pieces)[number], delay: number) => {
      if (!alive) return;
      p.v.setValue(0);
      const a = Animated.timing(p.v, { toValue: 1, duration: p.dur, delay, easing: Easing.linear, useNativeDriver: true });
      running.push(a);
      a.start(({ finished }) => { running.splice(running.indexOf(a), 1); if (finished) fall(p, 0); });
    };
    animationsReduites().then(r => {
      if (!alive || r) return;
      setOn(true);
      pieces.forEach(p => fall(p, p.delay));
    });
    return () => { alive = false; running.slice().forEach(a => a.stop()); pieces.forEach(p => p.v.setValue(0)); };
  }, [pieces]);

  const travel = height - TOP + MARGIN;
  return (
    <View pointerEvents="none" onLayout={e => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' }}>
      {on && pieces.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: p.x * width, top: TOP, width: p.w, height: p.h, borderRadius: 2, backgroundColor: p.color,
          // fondu sur la fin : le confetti s'efface pendant qu'il passe sous le bord
          opacity: p.v.interpolate({ inputRange: [0, 0.85, 0.97, 1], outputRange: [1, 1, 0, 0] }),
          transform: [
            { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }) },
            { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
            { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) },
          ],
        }} />
      ))}
    </View>
  );
}
