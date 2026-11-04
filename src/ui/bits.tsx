import { Image } from 'expo-image';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ink, tagBg } from '@/theme/colors';
import { T } from './Text';

export const images = {
  braise: require('../../assets/images/braise.webp'),
  nabulo: require('../../assets/images/nabulo/neutre.webp'),
  nabuloSaut: require('../../assets/images/nabulo/saut.webp'),
  nabuloTriste: require('../../assets/images/nabulo/triste.webp'),
  nabuloTour: require('../../assets/images/nabulo/tour.webp'),
};

/** Pastille de braises en haut à droite (à plat). */
export function BraisePill({ value, delta }: { value: number; delta?: number }) {
  return (
    <View accessibilityLabel={`${value} braises`} style={{ height: 36, paddingLeft: 30, paddingRight: 12, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', marginLeft: 16 }}>
      <Image source={images.braise} style={{ position: 'absolute', left: -12, top: -2, width: 40, height: 40 }} contentFit="contain" />
      <T size={17} weight={700}>{value}</T>
      {delta ? (
        <View style={{ position: 'absolute', right: -6, top: -10, paddingHorizontal: 6, borderRadius: 9, backgroundColor: '#FF5A36' }}>
          <T size={12} weight={700} color="#FFFFFF">{delta > 0 ? '+' : ''}{delta}</T>
        </View>
      ) : null}
    </View>
  );
}

/** Bouton carré de l'en-tête (croix, menu), à plat. */
export function HeaderButton({ kind, onPress, label }: { kind: 'close' | 'back' | 'menu'; onPress?: () => void; label: string }) {
  const d = kind === 'close' ? 'M6 6l12 12M18 6L6 18' : kind === 'back' ? 'M15 5l-7 7 7 7' : 'M4 7h16M4 12h16M4 17h16';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={22} height={22} viewBox="0 0 24 24"><Path d={d} stroke={ink} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
    </Pressable>
  );
}

/** Petite étiquette à plat. */
export function Tag({ label, bg = tagBg, color = ink, style }: { label: string; bg?: string; color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, backgroundColor: bg, alignSelf: 'flex-start' }, style]}>
      <T size={13} weight={700} color={color}>{label}</T>
    </View>
  );
}

export function Avatar({ letter, color, size = 36 }: { letter: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <T size={Math.round(size * 0.45)} weight={700}>{letter}</T>
    </View>
  );
}

export function BulbIcon({ size = 26, color = ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" fill="#FFD23F" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}
