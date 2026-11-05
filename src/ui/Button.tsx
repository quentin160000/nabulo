import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { bubble, gameInk, panel } from '@/theme/colors';
import { T } from './Text';
import type { ReactNode } from 'react';

type Look = { bg: string; border: string; diag: string; relief: string };
/** Variantes de la maquette. Les « flat-* » sont à plat : boutons au-dessus du clavier, « J'ai déjà un compte ». */
const LOOKS: Record<string, Look> = {
  yellow: { bg: '#FFD45C', border: '#FFE38F', diag: '#F7C843', relief: '#E3A91C' },
  white: { bg: '#FFFFFF', border: '#FFFFFF', diag: '#F6F3FD', relief: '#E4DEF5' },
  panel: { bg: panel, ...bubble(panel) },
  'yellow-mix': { bg: '#FFD45C', ...bubble('#FFD45C') },
};
type Variant = 'yellow' | 'white' | 'panel' | 'yellow-mix' | 'flat-yellow' | 'flat-white';

type Props = {
  label: string; onPress?: () => void; variant?: Variant; height?: number; fontSize?: number; border?: number; radius?: number;
  icon?: ReactNode; trailing?: ReactNode; disabled?: boolean; style?: StyleProp<ViewStyle>; accessibilityHint?: string; color?: string;
};

export function Button({ label, onPress, variant = 'yellow', height = 56, fontSize = 19, border = 3, radius = 18, icon, trailing, disabled, style, accessibilityHint, color = gameInk }: Props) {
  const flat = variant.startsWith('flat');
  const look = flat ? null : LOOKS[variant];
  const flatBg = variant === 'flat-yellow' ? '#FFD45C' : '#FFFFFF';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => { if (Platform.OS !== 'web') Haptics.selectionAsync(); onPress?.(); }}
      style={({ pressed }) => [{ height, opacity: disabled ? 0.5 : 1, transform: [{ translateY: pressed && !flat ? 2 : 0 }] }, style]}
    >
      <View
        style={[
          { flex: 1, borderRadius: radius, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 8 },
          look ? { borderWidth: border, borderColor: look.border, boxShadow: `inset 0 -6px 0 ${look.relief}` } : { backgroundColor: flatBg },
        ]}
      >
        {look && (
          <LinearGradient pointerEvents="none" colors={[look.bg, look.bg, look.diag, look.diag]} locations={[0, 0.5, 0.5, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        )}
        {icon ? <View>{icon}</View> : null}
        <T size={fontSize} weight={700} color={color} numberOfLines={1} style={{ lineHeight: Math.round(fontSize * 1.1) }}>{label}</T>
        {trailing ? <View>{trailing}</View> : null}
      </View>
    </Pressable>
  );
}
