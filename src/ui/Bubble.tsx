import { View, type StyleProp, type ViewStyle } from 'react-native';
import { bubble } from '@/theme/colors';
import { Diagonal, Relief } from './Diagonal';
import type { ReactNode } from 'react';

type Colors = { border: string; diag: string; relief: string };
type Props = {
  bg?: string; radius?: number; inset?: number; border?: number; style?: StyleProp<ViewStyle>; children?: ReactNode; flat?: boolean;
  /** Couleurs exactes quand la maquette ne suit pas la formule (cartes de l'accueil). */
  colors?: Partial<Colors>;
};

/**
 * Bulle de la maquette : contour plus clair que le fond, fond coupé en biais, relief enfoncé en bas.
 * `flat` : même forme sans contour ni relief.
 */
export function Bubble({ bg = '#FFFFFF', radius = 20, inset = 6, border = 3, style, children, flat, colors }: Props) {
  if (flat) return <View style={[{ backgroundColor: bg, borderRadius: radius }, style]}>{children}</View>;
  const b = { ...bubble(bg), ...colors };
  return (
    <View style={[{ borderRadius: radius, borderWidth: border, borderColor: b.border, overflow: 'hidden' }, style]}>
      <Diagonal bg={bg} diag={b.diag} />
      <Relief inset={inset} color={b.relief} radius={Math.max(0, radius - border)} />
      {children}
    </View>
  );
}
