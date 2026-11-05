import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { panel } from '@/theme/colors';
import { Glyph } from './onglets-bits';

/** Bouton d'en-tête à plat (comme HeaderButton) qui ouvre le calendrier du Jeu du jour. */
export function CalendrierBouton() {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Calendrier du Jeu du jour" onPress={() => router.push('/calendrier')} hitSlop={6}
      style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: panel, alignItems: 'center', justifyContent: 'center' }}>
      <Glyph name="calendar" size={24} />
    </Pressable>
  );
}
