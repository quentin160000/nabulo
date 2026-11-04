import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { bubble, yellow } from '@/theme/colors';
import { T } from './Text';
import type { ReactNode } from 'react';

type Variant = 'yellow' | 'white' | 'flat-yellow' | 'flat-white';
type Props = { label: string; onPress?: () => void; variant?: Variant; height?: number; icon?: ReactNode; disabled?: boolean; style?: StyleProp<ViewStyle>; accessibilityHint?: string };

/**
 * Boutons de la maquette.
 * - yellow : bouton principal en relief (contour jaune clair, diagonale, relief enfoncé).
 * - white  : bouton secondaire en relief.
 * - flat-* : à plat — boutons au-dessus du clavier, « J'ai déjà un compte ».
 */
export function Button({ label, onPress, variant = 'yellow', height = 60, icon, disabled, style, accessibilityHint }: Props) {
  const flat = variant.startsWith('flat');
  const isYellow = variant.includes('yellow');
  const bg = isYellow ? yellow.fill : '#FFFFFF';
  const relief = isYellow ? yellow.relief : bubble('#FFFFFF').relief;
  const border = isYellow ? yellow.border : bubble('#FFFFFF').border;
  const diag = isYellow ? yellow.fill2 : bubble('#FFFFFF').diag;
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
          { flex: 1, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 14 },
          flat ? { backgroundColor: bg } : { borderWidth: 2, borderColor: border, boxShadow: `inset 0 -7px 0 ${relief}`, paddingBottom: 5 },
        ]}
      >
        {!flat && (
          <LinearGradient pointerEvents="none" colors={[bg, bg, diag, diag]} locations={[0, 0.5, 0.5, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        )}
        {icon}
        <T size={height >= 56 ? 20 : 17} weight={700}>{label}</T>
      </View>
    </Pressable>
  );
}
