import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Platform, Share, type ViewInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/** Téléphone : capture de la carte en PNG (react-native-view-shot) puis partage de l'image (Share iOS / expo-sharing Android). */
export const captureDisponible = true;

export async function capturerVue(vue: ViewInstance | null): Promise<string | null> {
  if (!vue) return null;
  try { return await captureRef(vue, { format: 'png', quality: 1, result: 'tmpfile' }); } catch { return null; }
}

/**
 * iOS : la feuille de partage reçoit l'image ET le texte (lien compris).
 * Android : la feuille de partage de fichiers ne prend pas de texte : le message est d'abord copié,
 * l'appelant prévient le joueur qu'il peut le coller sous l'image.
 */
export async function partagerImage(uri: string, message: string): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      await Share.share({ url: uri, message });
      return true;
    }
    if (!(await Sharing.isAvailableAsync())) return false;
    await Clipboard.setStringAsync(message).catch(() => {});
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Partager', UTI: 'public.png' });
    return true;
  } catch {
    return false;
  }
}

export async function copierDansPressePapiers(message: string): Promise<boolean> {
  try { await Clipboard.setStringAsync(message); return true; } catch { return false; }
}
