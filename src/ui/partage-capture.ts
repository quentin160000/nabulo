/**
 * Web : pas de capture d'image (react-native-view-shot demanderait html2canvas-pro) ni de feuille de partage
 * native. `partage-carte.tsx` retombe sur « copier le texte ». La version téléphone est dans `partage-capture.native.ts`.
 */
export const captureDisponible = false;

export async function capturerVue(_vue: unknown): Promise<string | null> {
  return null;
}

export async function partagerImage(_uri: string, _message: string): Promise<boolean> {
  return false;
}

export async function copierDansPressePapiers(message: string): Promise<boolean> {
  const clip = (globalThis as { navigator?: { clipboard?: { writeText(s: string): Promise<void> } } }).navigator?.clipboard;
  if (!clip) return false;
  try { await clip.writeText(message); return true; } catch { return false; }
}
