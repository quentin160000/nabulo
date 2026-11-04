import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { ink } from '@/theme/colors';

const FAMILY = { 500: 'Fredoka_500Medium', 600: 'Fredoka_600SemiBold', 700: 'Fredoka_700Bold' } as const;

type Props = TextProps & { size?: number; weight?: 500 | 600 | 700; color?: string; outline?: boolean; align?: TextStyle['textAlign'] };

/** Texte Fredoka. `outline` = texte blanc avec l'ombre encre de la maquette. */
export function T({ size = 16, weight = 600, color, outline, align, style, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={[
        { fontFamily: FAMILY[weight], fontSize: size, color: color ?? (outline ? '#FFFFFF' : ink), textAlign: align, lineHeight: Math.round(size * 1.2) },
        outline && { textShadowColor: ink, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
        style,
      ]}
    />
  );
}
