import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { ink } from '@/theme/colors';

/**
 * Métriques de Fredoka (hhea) : ascendante 0,974 em, descendante 0,236 em → boîte de 1,21 em, ligne de base à 0,974 em.
 * Avec une hauteur de ligne de 1,21 em, le milieu des capitales (0,974 − 0,35 = 0,624 em) tombe à 0,019 em du milieu
 * de la boîte : le texte est centré verticalement, à l'identique sur iOS, Android (sans marge de police) et le web.
 */
export const LINE = 1.21;

const FAMILY = { 500: 'Fredoka_500Medium', 600: 'Fredoka_600SemiBold', 700: 'Fredoka_700Bold' } as const;

type Props = TextProps & { size?: number; weight?: 500 | 600 | 700; color?: string; outline?: boolean; align?: TextStyle['textAlign'] };

/** Texte Fredoka. `outline` = texte blanc avec l'ombre encre de la maquette. */
export function T({ size = 16, weight = 600, color, outline, align, style, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={[
        { fontFamily: FAMILY[weight], fontSize: size, color: color ?? (outline ? '#FFFFFF' : ink), textAlign: align, lineHeight: Math.round(size * LINE), includeFontPadding: false, textAlignVertical: 'center' },
        outline && { textShadowColor: ink, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
        style,
      ]}
    />
  );
}
