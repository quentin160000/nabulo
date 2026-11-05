import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Keyboard, LayoutAnimation, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appGradient, appGradientStops, bgDeep } from '@/theme/colors';
import { AluBackground } from './backgrounds';
import { T } from './Text';

/* Briques communes des écrans de jeu (mot du jour, jeux libres, duels…). */

export function GameBg() {
  return <LinearGradient colors={appGradient as unknown as [string, string, string]} locations={appGradientStops as unknown as [number, number, number]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />;
}

/** Le clavier est-il ouvert ? (avec une animation douce de la mise en page quand il s'ouvre ou se ferme) */
export function useKeyboardVisible() {
  const [v, setV] = useState(Platform.OS !== 'web');
  useEffect(() => {
    const ease = () => LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => { ease(); setV(true); });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => { ease(); setV(false); });
    return () => { show.remove(); hide.remove(); };
  }, []);
  return v;
}

/** Section foncée des écrans de jeu (« Comment jouer », « Les plus chauds »…). */
export function Section({ title, right, children, padding = 10, gap = 7, style }: { title: string; right?: string; children: React.ReactNode; padding?: number; gap?: number; style?: object }) {
  return (
    <View style={[{ backgroundColor: bgDeep, borderRadius: 22, padding, gap }, style]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 }}>
        <T size={14} weight={600} color="#FFFFFF">{title}</T>
        {right ? <T size={14} weight={600} color="#FFFFFF" style={{ opacity: 0.85 }}>{right}</T> : null}
      </View>
      {children}
    </View>
  );
}

/** Panneau du bas en aluminium (indice). */
export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const inset = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      {/* le voile couvre tout l'écran, y compris derrière les coins arrondis du panneau */}
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer et revenir à la partie" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(24,14,60,0.45)' }} onPress={onClose} />
      <View pointerEvents="box-none" style={{ flex: 1 }} />
      <View style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', paddingTop: 10, paddingHorizontal: 18, paddingBottom: 28 + inset.bottom, gap: 14 }}>
        <AluBackground />
        <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(43,33,80,0.18)' }} />
        {children}
      </View>
    </Modal>
  );
}
