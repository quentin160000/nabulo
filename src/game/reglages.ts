import { useCallback, useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';
import { load, save } from './storage';

/** Réglages du joueur, gardés sous `nabulo:reglages`. */
export type Langue = 'fr' | 'en';
export type Reglages = {
  vibrations: boolean;
  /** Enregistré pour plus tard : l'appli n'a pas encore de sons. */
  sons: boolean;
  /** S'ajoute au réglage système « réduire les animations ». */
  animationsReduites: boolean;
  langue: Langue;
};

export const REGLAGES_KEY = 'nabulo:reglages';
export const REGLAGES_DEFAUT: Reglages = { vibrations: true, sons: true, animationsReduites: false, langue: 'fr' };

/** Garde les seuls champs connus, au bon type (une donnée abîmée retombe sur la valeur par défaut). */
function propre(v: unknown): Reglages {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<Record<keyof Reglages, unknown>>;
  const bool = (k: 'vibrations' | 'sons' | 'animationsReduites') => (typeof o[k] === 'boolean' ? o[k] as boolean : REGLAGES_DEFAUT[k]);
  return { vibrations: bool('vibrations'), sons: bool('sons'), animationsReduites: bool('animationsReduites'), langue: 'fr' };
}

/* Cache mémoire : chargé dès que le module est importé (au démarrage, via Button), lu de façon synchrone. */
let cache: Reglages = REGLAGES_DEFAUT;
const listeners = new Set<() => void>();
function publier(next: Reglages) {
  cache = next;
  listeners.forEach(f => f());
}
let touche = false;                                   // modifié avant la fin du chargement : on garde le choix du joueur
const pret: Promise<void> = load<unknown>(REGLAGES_KEY, null).then(v => { if (!touche) publier(propre(v)); });
const abonner = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
const lire = () => cache;

/** Vibrations autorisées ? (synchrone, pour le retour haptique des boutons) */
export const vibrationsActives = () => cache.vibrations;

/** Animations à couper : réglage système OU réglage de l'appli. */
export async function animationsReduites(): Promise<boolean> {
  await pret;
  const systeme = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
  return systeme || cache.animationsReduites;
}

/** Remet le cache aux valeurs par défaut (après « Réinitialiser ma progression »). */
export function oublierReglages() {
  publier(REGLAGES_DEFAUT);
}

/** Réglages courants et mise à jour partielle (enregistrée aussitôt). */
export function useReglages(): [Reglages, (patch: Partial<Reglages>) => void] {
  const r = useSyncExternalStore(abonner, lire, lire);
  const maj = useCallback((patch: Partial<Reglages>) => {
    touche = true;
    const next = propre({ ...cache, ...patch });
    publier(next);
    save(REGLAGES_KEY, next);
  }, []);
  return [r, maj];
}
