import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PROGRESSION_VIDE, VIES_MAX, ecrireProgression, ecrireVies, gagner, lireProgression, lireVies, perdreVie, rendreVie, viesActuelles,
  type Progression, type Vies,
} from './aventure';

/** Progression de l'aventure, relue à chaque retour sur l'écran. */
export function useProgression() {
  const [p, setP] = useState<Progression>(PROGRESSION_VIDE);
  const [ready, setReady] = useState(false);
  useFocusEffect(useCallback(() => { lireProgression().then(v => { setP(v); setReady(true); }); }, []));
  const victoire = useCallback(async (n: number, note: number, score: number) => {
    const cur = await lireProgression();
    const next = gagner(cur, n, note, score);
    setP(next);
    await ecrireProgression(next);
    return { avant: cur, apres: next };
  }, []);
  return { p, ready, victoire };
}

/** Vies réelles (recharge d'une vie toutes les 30 min), mises à jour chaque seconde tant qu'elles ne sont pas pleines. */
export function useVies() {
  const [v, setV] = useState<Vies | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef<Vies | null>(null);
  useFocusEffect(useCallback(() => { lireVies().then(x => { ref.current = x; setV(x); setNow(Date.now()); }); }, []));
  const etat = v ? viesActuelles(v, now) : { n: VIES_MAX, prochaine: null };
  const plein = etat.prochaine === null;
  useEffect(() => {
    if (plein) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [plein]);
  const maj = useCallback(async (f: (x: Vies, t: number) => Vies) => {
    const cur = ref.current ?? (await lireVies());
    const next = f(cur, Date.now());
    ref.current = next; setV(next); setNow(Date.now());
    await ecrireVies(next);
    return viesActuelles(next, Date.now()).n;
  }, []);
  const perdre = useCallback(() => maj(perdreVie), [maj]);
  const rendre = useCallback(() => maj(rendreVie), [maj]);
  return { n: etat.n, prochaine: etat.prochaine, ready: v !== null, perdre, rendre };
}

/** « 12:04 » pour un délai en millisecondes. */
export function minSec(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
