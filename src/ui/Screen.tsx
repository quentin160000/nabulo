import { LinearGradient } from 'expo-linear-gradient';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appGradient } from '@/theme/colors';
import type { ReactNode } from 'react';

/** Écran plein, fond dégradé violet (ou un autre dégradé), marges de sécurité gérées. */
export function Screen({ children, colors = appGradient, style, background }: { children: ReactNode; colors?: readonly string[]; style?: StyleProp<ViewStyle>; background?: ReactNode }) {
  const inset = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={colors as [string, string, ...string[]]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      {background}
      <View style={[{ flex: 1, paddingTop: inset.top + 8, paddingBottom: inset.bottom + 12, paddingHorizontal: 16, gap: 10 }, style]}>{children}</View>
    </View>
  );
}
