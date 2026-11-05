import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/* De l'air entre la barre de saisie et le clavier, sur iOS comme sur Android. */

/** Espace minimal entre le bas de la barre de saisie (champ + boutons) et le haut du clavier. */
export const AIR_CLAVIER = 12;

/** Comportement de KeyboardAvoidingView : « padding » sur iOS, « height » sur Android (rien sur le web). */
export const KAV_BEHAVIOR = Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined;

/** Le clavier est-il ouvert ? (toujours faux sur le web, où il n'y a pas de clavier à l'écran) */
export function useClavierOuvert() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return open;
}

/**
 * Marge basse d'un écran avec barre de saisie : `ferme` quand le clavier est fermé (zone sûre comprise),
 * `AIR_CLAVIER` quand il est ouvert (le KeyboardAvoidingView a déjà remonté le contenu au-dessus du clavier).
 */
export function useMargeBasse(ferme: number) {
  return useClavierOuvert() ? AIR_CLAVIER : ferme;
}
