import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { Mood } from '@/game/temperature';

const INK = '#2B2150';

/** Petits personnages de température de la maquette (composant « Mascot ») : glaçon, boule de neige, goutte, braise, flamme, soleil. */
export function Mascot({ mood, size = 96, animate = true }: { mood: Mood; size?: number; animate?: boolean }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!animate) return;
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then(r => {
      if (r) return;
      loop = Animated.loop(Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      loop.start();
    });
    return () => { loop?.stop(); };
  }, [animate, v]);
  const k = size / 200;
  const transform = mood === 'glacial'
    ? [{ translateX: v.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [-1.5 * k, 1.5 * k, -1.5 * k, 1.5 * k, -1.5 * k] }) }]
    : [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -6 * k] }) }];
  return (
    <Animated.View accessibilityRole="image" accessibilityLabel={LABEL[mood]} style={{ width: size, height: size, transform }}>
      <Svg width={size} height={size} viewBox="0 0 200 200">{DRAW[mood]}</Svg>
    </Animated.View>
  );
}

const LABEL: Record<Mood, string> = {
  glacial: 'Glaçon qui grelotte', froid: 'Boule de neige avec écharpe', tiede: 'Goutte d’eau perplexe',
  chaud: 'Braise souriante', brulant: 'Flamme surexcitée', trouve: 'Soleil victorieux à lunettes',
};

const s = { stroke: INK, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const DRAW: Record<Mood, React.ReactNode> = {
  glacial: (
    <G>
      <Path d="M30 84 L38 92 L30 100" fill="none" {...s} strokeWidth={4} />
      <Path d="M170 84 L162 92 L170 100" fill="none" {...s} strokeWidth={4} />
      <Path d="M62 150 L72 184 L82 150 Z" fill="#BDE7FF" {...s} strokeWidth={5} />
      <Path d="M112 150 L119 174 L126 150 Z" fill="#BDE7FF" {...s} strokeWidth={5} />
      <Rect x={42} y={50} width={116} height={110} rx={24} fill="#BDE7FF" stroke={INK} strokeWidth={6} />
      <Path d="M46 72 C 46 54, 60 48, 72 52 C 80 42, 98 42, 106 50 C 116 42, 136 46, 140 56 C 152 56, 156 68, 152 74 Z" fill="#FFFFFF" {...s} strokeWidth={5} />
      <Path d="M58 88 L58 120" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" />
      <Path d="M74 98 L86 106 L74 114" fill="none" {...s} strokeWidth={5} />
      <Path d="M126 98 L114 106 L126 114" fill="none" {...s} strokeWidth={5} />
      <Ellipse cx={70} cy={126} rx={8} ry={5} fill="#86C2F0" />
      <Ellipse cx={130} cy={126} rx={8} ry={5} fill="#86C2F0" />
      <Path d="M84 134 Q 92 127 100 134 Q 108 141 116 134" fill="none" {...s} strokeWidth={5} />
    </G>
  ),
  froid: (
    <G>
      <G stroke="#86C2F0" strokeWidth={4} strokeLinecap="round">
        <Path d="M22 50 L42 50 M27 41 L37 59 M27 59 L37 41" />
        <Path d="M160 36 L178 36 M164.5 28 L173.5 44 M164.5 44 L173.5 28" />
      </G>
      <Circle cx={100} cy={106} r={62} fill="#F4F8FF" stroke={INK} strokeWidth={6} />
      <Path d="M58 116 C 68 150, 132 150, 142 116" fill="none" stroke="#D6E6FA" strokeWidth={10} strokeLinecap="round" />
      <Path d="M126 150 L134 186 L150 182 L142 148 Z" fill="#5B8DEF" {...s} strokeWidth={5} />
      <Path d="M46 134 C 72 152, 128 152, 154 134 L 156 152 C 128 170, 72 170, 44 152 Z" fill="#5B8DEF" {...s} strokeWidth={5} />
      <Path d="M70 150 L76 141 M90 154 L94 144 M110 154 L106 144 M130 150 L124 141" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" />
      <Circle cx={82} cy={98} r={7} fill={INK} />
      <Circle cx={118} cy={98} r={7} fill={INK} />
      <Circle cx={84.5} cy={95.5} r={2.2} fill="#FFFFFF" />
      <Circle cx={120.5} cy={95.5} r={2.2} fill="#FFFFFF" />
      <Ellipse cx={68} cy={114} rx={8} ry={5} fill="#C9DDF8" />
      <Ellipse cx={132} cy={114} rx={8} ry={5} fill="#C9DDF8" />
      <Path d="M90 122 Q 100 115 110 122" fill="none" {...s} strokeWidth={5} />
    </G>
  ),
  tiede: (
    <G>
      <Path d="M100 28 C 118 58, 152 92, 152 124 A 52 52 0 0 1 48 124 C 48 92, 82 58, 100 28 Z" fill="#9AD8F5" {...s} strokeWidth={6} />
      <Path d="M68 116 C 68 100, 76 88, 86 80" fill="none" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" />
      <Ellipse cx={84} cy={124} rx={6.5} ry={8.5} fill={INK} />
      <Ellipse cx={116} cy={124} rx={6.5} ry={8.5} fill={INK} />
      <Circle cx={86} cy={121} r={2.2} fill="#FFFFFF" />
      <Circle cx={118} cy={121} r={2.2} fill="#FFFFFF" />
      <Path d="M90 150 L110 150" {...s} strokeWidth={5} />
      <Path d="M152 52 C 158 62, 162 68, 162 74 A 8 8 0 0 1 146 74 C 146 68, 148 62, 152 52 Z" fill="#FFFFFF" {...s} strokeWidth={3.5} />
    </G>
  ),
  chaud: (
    <G>
      <Circle cx={40} cy={74} r={5} fill="#FFC23D" stroke={INK} strokeWidth={3} />
      <Circle cx={164} cy={86} r={6} fill="#FFC23D" stroke={INK} strokeWidth={3} />
      <Path d="M100 70 C 86 56, 90 40, 102 24 C 104 40, 122 46, 112 68 Z" fill="#FFC23D" {...s} strokeWidth={5} />
      <Path d="M48 122 C 48 84, 76 64, 100 64 C 128 64, 152 84, 152 122 C 152 156, 128 172, 100 172 C 72 172, 48 156, 48 122 Z" fill="#FF9A3C" stroke={INK} strokeWidth={6} />
      <Ellipse cx={100} cy={136} rx={36} ry={22} fill="#FFC23D" opacity={0.55} />
      <Path d="M76 112 Q 84 101 92 112" fill="none" {...s} strokeWidth={5} />
      <Path d="M108 112 Q 116 101 124 112" fill="none" {...s} strokeWidth={5} />
      <Ellipse cx={70} cy={128} rx={8} ry={5} fill="#FF6B5A" />
      <Ellipse cx={130} cy={128} rx={8} ry={5} fill="#FF6B5A" />
      <Path d="M88 130 Q 100 148 112 130 Z" fill="#7A2A1C" {...s} strokeWidth={4} />
    </G>
  ),
  brulant: (
    <G>
      <Path d="M34 64 L40 56 L46 64 L40 72 Z" fill="#FFC23D" {...s} strokeWidth={3} />
      <Path d="M156 46 L163 37 L170 46 L163 55 Z" fill="#FFC23D" {...s} strokeWidth={3} />
      <Path d="M168 112 L173 106 L178 112 L173 118 Z" fill="#FF5A36" {...s} strokeWidth={3} />
      <Path d="M100 20 C 120 58, 160 70, 156 122 C 152 165, 124 182, 100 182 C 72 182, 44 164, 44 124 C 44 92, 66 84, 70 56 C 82 72, 88 80, 92 82 C 92 60, 94 40, 100 20 Z" fill="#FF5A36" {...s} strokeWidth={6} />
      <Path d="M100 88 C 112 108, 132 118, 130 142 C 128 162, 114 172, 100 172 C 84 172, 70 160, 70 142 C 70 122, 92 114, 100 88 Z" fill="#FFC23D" />
      <Path d="M76 112 L94 118" {...s} strokeWidth={4.5} />
      <Path d="M124 112 L106 118" {...s} strokeWidth={4.5} />
      <Ellipse cx={88} cy={132} rx={9} ry={11} fill="#FFFFFF" stroke={INK} strokeWidth={4} />
      <Ellipse cx={112} cy={132} rx={9} ry={11} fill="#FFFFFF" stroke={INK} strokeWidth={4} />
      <Circle cx={90} cy={134} r={5} fill={INK} />
      <Circle cx={110} cy={134} r={5} fill={INK} />
      <Path d="M88 152 Q 100 170 112 152 Z" fill="#7A2A1C" {...s} strokeWidth={4} />
    </G>
  ),
  trouve: (
    <G>
      {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
        <Rect key={a} x={93} y={13} width={14} height={22} rx={7} fill="#FFB020" stroke={INK} strokeWidth={4} transform={`rotate(${a} 100 104)`} />
      ))}
      <Circle cx={100} cy={104} r={58} fill="#FFD23F" stroke={INK} strokeWidth={6} />
      <Path d="M58 92 L142 92" {...s} strokeWidth={5} />
      <Path d="M62 90 H96 V100 Q 96 114 80 114 Q 64 114 62 100 Z" fill={INK} />
      <Path d="M104 90 H138 V100 Q 136 114 120 114 Q 104 114 104 100 Z" fill={INK} />
      <Path d="M70 96 L78 96 M112 96 L120 96" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" />
      <Ellipse cx={66} cy={118} rx={8} ry={5} fill="#FF9A3C" />
      <Ellipse cx={134} cy={118} rx={8} ry={5} fill="#FF9A3C" />
      <Path d="M84 130 Q 104 142 122 124" fill="none" {...s} strokeWidth={5.5} />
    </G>
  ),
};
