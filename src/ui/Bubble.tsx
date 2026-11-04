import { LinearGradient } from 'expo-linear-gradient';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { bubble } from '@/theme/colors';
import type { ReactNode } from 'react';

type Props = { bg?: string; radius?: number; inset?: number; border?: number; style?: StyleProp<ViewStyle>; children?: ReactNode; flat?: boolean };

/**
 * Bulle de la maquette : contour plus clair que le fond, fond coupé en biais, relief enfoncé en bas.
 * `flat` : même forme sans contour ni relief (choix de mots, éléments du clavier, petites étiquettes).
 */
export function Bubble({ bg = '#FFFFFF', radius = 20, inset = 6, border = 2, style, children, flat }: Props) {
  if (flat) return <View style={[{ backgroundColor: bg, borderRadius: radius }, style]}>{children}</View>;
  const b = bubble(bg);
  return (
    <View style={[{ borderRadius: radius, borderWidth: border, borderColor: b.border, overflow: 'hidden', boxShadow: `inset 0 -${inset}px 0 ${b.relief}` }, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={[bg, bg, b.diag, b.diag]}
        locations={[0, 0.5, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      {children}
    </View>
  );
}
