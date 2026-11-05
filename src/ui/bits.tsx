import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { gameInk, ink, panel } from '@/theme/colors';
import { T } from './Text';

export const images = {
  braise: require('../../assets/images/braise.webp'),
  nabulo: require('../../assets/images/nabulo/neutre.webp'),
  nabuloSaut: require('../../assets/images/nabulo/saut.webp'),
  nabuloTriste: require('../../assets/images/nabulo/triste.webp'),
  nabuloTour: require('../../assets/images/nabulo/tour.webp'),
  nabuloJoie: require('../../assets/images/nabulo/joie.webp'),
  nabuloEmbete: require('../../assets/images/nabulo/embete.webp'),
  nabuloTete: require('../../assets/images/nabulo/tete.webp'),
  /* introduction : animations en boucle */
  nabuloCoucou: require('../../assets/images/nabulo/coucou.webp'),
  nabuloRegard: require('../../assets/images/nabulo/regard.webp'),
  nabuloPluie: require('../../assets/images/nabulo/pluie.webp'),
};

/** Pièce de braise. */
export function Coin({ size = 44, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return <Image source={images.braise} style={[{ width: size, height: size }, style as object]} contentFit="contain" accessible={false} />;
}

/** Icônes tracées de la maquette (viewBox 24). */
export function Icon({ name, size = 22, color = ink, width }: { name: IconName; size?: number; color?: string; width?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">{ICONS[name](color, width)}</Svg>;
}
type IconName = 'close' | 'menu' | 'back' | 'play' | 'chevron' | 'plus' | 'check' | 'bulb' | 'video' | 'bag' | 'clock' | 'bolt' | 'multi' | 'pad' | 'home' | 'grid' | 'trophy' | 'user' | 'star';
const L = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const ICONS: Record<IconName, (c: string, w?: number) => React.ReactNode> = {
  close: (c, w = 2.8) => <Path d="M6 6l12 12M18 6L6 18" stroke={c} strokeWidth={w} {...L} />,
  menu: (c, w = 2.4) => <Path d="M4 7h16M4 12h16M4 17h16" stroke={c} strokeWidth={w} {...L} />,
  back: (c, w = 2.8) => <Path d="M15 5l-7 7 7 7" stroke={c} strokeWidth={w} {...L} />,
  play: (c, w = 2.8) => <Path d="M8 5 L19 12 L8 19 Z" stroke={c} strokeWidth={w} {...L} />,
  chevron: (c, w = 3) => <Path d="m9 6 6 6-6 6" stroke={c} strokeWidth={w} {...L} />,
  plus: (c, w = 4.5) => <Path d="M12 5v14M5 12h14" stroke={c} strokeWidth={w} {...L} />,
  check: (c, w = 3.4) => <Path d="M5 12l5 5 9-10" stroke={c} strokeWidth={w} {...L} />,
  bulb: (c, w = 2.2) => <><Path d="M12 2.5a6.5 6.5 0 0 0-3.9 11.7c.7.5 1.1 1.3 1.1 2.1V17h5.6v-.7c0-.8.4-1.6 1.1-2.1A6.5 6.5 0 0 0 12 2.5z" fill="#FFD45C" stroke={c} strokeWidth={w} {...L} /><Path d="M9.5 20h5M10.5 22.5h3" stroke={c} strokeWidth={w} {...L} /></>,
  video: (c, w = 2.4) => <><Rect x={3} y={5} width={18} height={14} rx={3} stroke={c} strokeWidth={w} strokeLinejoin="round" /><Path d="M10 9l5 3-5 3z" fill={c} stroke={c} strokeWidth={w} strokeLinejoin="round" /></>,
  bag: (c, w = 2.2) => <><Path d="M5 8 H19 L18 20 H6 Z" fill="#FFFFFF" stroke={c} strokeWidth={w} {...L} /><Path d="M9 8 V6.5 a3 3 0 0 1 6 0 V8" stroke={c} strokeWidth={w} {...L} /></>,
  clock: (c, w = 2) => <><Circle cx={12} cy={12} r={9} fill="#FFFFFF" stroke={c} strokeWidth={w} /><Path d="M12 7 V12 L15.5 14" stroke={c} strokeWidth={w} {...L} /></>,
  bolt: (c, w = 2) => <Path d="M13 2 L5 13 H11 L10 22 L19 10 H13 Z" fill="#FFD23F" stroke={c} strokeWidth={w} {...L} />,
  multi: (c, w = 2) => <><Circle cx={12} cy={12} r={7} stroke={c} strokeWidth={w} strokeDasharray="2 3" /><Circle cx={12} cy={4.5} r={2.4} fill="#FFD23F" stroke={c} strokeWidth={w} /><Circle cx={18.5} cy={16} r={2.4} fill="#FF8FAB" stroke={c} strokeWidth={w} /><Circle cx={5.5} cy={16} r={2.4} fill="#7FE3EA" stroke={c} strokeWidth={w} /></>,
  pad: (c, w = 2) => <><Path d="M6 8 H18 A4 4 0 0 1 22 12 V14 A4 4 0 0 1 15 16 H9 A4 4 0 0 1 2 14 V12 A4 4 0 0 1 6 8 Z" fill="#FFFFFF" stroke={c} strokeWidth={w} {...L} /><Path d="M7 11 V14 M5.5 12.5 H8.5" stroke={c} strokeWidth={w} {...L} /><Circle cx={16} cy={11.5} r={1} fill={c} /><Circle cx={18} cy={13.5} r={1} fill={c} /></>,
  home: (c, w = 1.8) => <Path d="M4 11 L12 4 L20 11 V20 H14 V14 H10 V20 H4 Z" stroke={c} strokeWidth={w} {...L} />,
  grid: (c, w = 1.8) => <><Rect x={4} y={4} width={7} height={7} rx={2} stroke={c} strokeWidth={w} /><Rect x={13} y={4} width={7} height={7} rx={2} stroke={c} strokeWidth={w} /><Rect x={4} y={13} width={7} height={7} rx={2} stroke={c} strokeWidth={w} /><Rect x={13} y={13} width={7} height={7} rx={2} stroke={c} strokeWidth={w} /></>,
  trophy: (c, w = 1.8) => <><Path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" stroke={c} strokeWidth={w} {...L} /><Path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" stroke={c} strokeWidth={w} {...L} /></>,
  user: (c, w = 1.8) => <><Circle cx={12} cy={8} r={4} stroke={c} strokeWidth={w} /><Path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke={c} strokeWidth={w} {...L} /></>,
  star: (c, w = 2) => <Path d="M12 2.8 L14.7 8.6 L21 9.3 L16.3 13.6 L17.6 19.9 L12 16.7 L6.4 19.9 L7.7 13.6 L3 9.3 L9.3 8.6 Z" fill="#FFD23F" stroke={c} strokeWidth={w} {...L} />,
};

/** Bouton carré clair de l'en-tête des écrans de jeu (croix ou menu), à plat. */
export function HeaderButton({ kind, onPress, label }: { kind: 'close' | 'back' | 'menu'; onPress?: () => void; label: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}
      style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: panel, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={kind} size={kind === 'close' ? 20 : 22} color={gameInk} />
    </Pressable>
  );
}

/**
 * Solde de brez des écrans de jeu : pastille blanche, pièce qui dépasse à gauche, « + » jaune (ouvre la boutique).
 * `flash` affiche brièvement « −60 » au-dessus.
 */
export function CoinPill({ value, onPress, flash, color = gameInk }: { value: number; onPress?: () => void; flash?: string | null; color?: string }) {
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!flash) return;
    pop.setValue(0);
    Animated.timing(pop, { toValue: 1, duration: 450, easing: Easing.out(Easing.back(2)), useNativeDriver: true }).start();
  }, [flash, pop]);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${value} brez, ouvrir la boutique`} onPress={onPress}
      style={{ height: 40, marginLeft: 14, paddingLeft: 30, paddingRight: 5, borderRadius: 20, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Coin size={40} style={{ position: 'absolute', left: -16, top: 0 }} />
      <T size={17} weight={700} color={color} style={{ minWidth: 28, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{value}</T>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFD45C', alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={12} color={color} /></View>
      {flash ? (
        <Animated.View style={{ position: 'absolute', right: -8, top: -15, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 9, backgroundColor: '#FF5A36', transform: [{ scale: pop }] }}>
          <T size={12} weight={700} color="#FFFFFF">{flash}</T>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

/** Pastille de température (fond coloré selon la chaleur). */
export function Chip({ label, bg, size = 14, color = gameInk, style }: { label: string; bg: string; size?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ paddingHorizontal: 11, paddingVertical: 3, borderRadius: 13, borderWidth: 3, borderColor: 'transparent', backgroundColor: bg, alignSelf: 'flex-start' }, style]}>
      <T size={size} weight={700} color={color}>{label}</T>
    </View>
  );
}

export function Avatar({ letter, color, size = 30, textColor = gameInk }: { letter: string; color: string; size?: number; textColor?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <T size={Math.round(size * 0.43)} weight={700} color={textColor}>{letter}</T>
    </View>
  );
}

/** Carré blanc arrondi qui contient une icône (cartes de l'accueil). */
export function IconTile({ name, size = 50, radius = 16, bg = '#FFFFFF' }: { name: IconName; size?: number; radius?: number; bg?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={Math.round(size * 0.6)} />
    </View>
  );
}
