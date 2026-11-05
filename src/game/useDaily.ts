import { useCallback, useEffect, useRef, useState } from 'react';
import { engine, engineKind, type Lang } from './engine';
import { bestTemperature, braisesFor, type Guess } from './rules';
import { load, save } from './storage';

export type DailyState = {
  day: number; lang: Lang; guesses: Guess[]; solved: boolean; secret: string | null;
  hintsUsed: number; adHintsUsed: number; reward: number; rewardClaimed: boolean;
  /** Moteur qui a produit la partie : une partie locale n'a pas le même mot secret que le serveur. */
  source?: 'supabase' | 'local';
};
export type Feedback = { kind: 'unknown' | 'repeat' | 'error'; word: string } | null;

const keyFor = (lang: Lang, day: number) => `nabulo:mdj:${lang}:${day}`;
const fresh = (lang: Lang, day: number): DailyState =>
  ({ day, lang, guesses: [], solved: false, secret: null, hintsUsed: 0, adHintsUsed: 0, reward: 0, rewardClaimed: false, source: engineKind });

/** Partie du jour, sauvegardée à chaque coup pour la reprendre même après avoir quitté l'appli. */
export function useDaily(lang: Lang = 'fr', date = new Date()) {
  const day = engine.dayNumber(date);
  const [state, setState] = useState<DailyState>(() => fresh(lang, day));
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [last, setLast] = useState<string | null>(null);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    let alive = true;
    load<DailyState>(keyFor(lang, day), fresh(lang, day)).then(s => {
      // une partie jouée avec l'autre moteur (mot secret différent) repart de zéro
      const ok = (s.source ?? 'local') === engineKind ? s : fresh(lang, day);
      if (alive) { setState(ok); setReady(true); }
    });
    return () => { alive = false; };
  }, [lang, day]);

  const commit = useCallback((s: DailyState) => { stateRef.current = s; setState(s); save(keyFor(s.lang, s.day), s); }, []);

  const submit = useCallback(async (raw: string) => {
    const s = stateRef.current;
    if (s.solved || busy || !raw.trim()) return;
    setBusy(true); setFeedback(null);
    try {
      const r = await engine.guess(s.lang, s.day, raw);
      if (!r.known) { setFeedback({ kind: 'unknown', word: r.word }); return; }
      if (s.guesses.some(g => g.word === r.word)) { setFeedback({ kind: 'repeat', word: r.word }); setLast(r.word); return; }
      const guesses = [...s.guesses, { word: r.word, temperature: r.temperature, rank: r.rank, order: s.guesses.length + 1 }];
      const next: DailyState = { ...s, guesses };
      if (r.found) {
        next.solved = true; next.secret = r.word; next.reward = braisesFor(guesses.length);
      }
      setLast(r.word); commit(next);
    } catch { setFeedback({ kind: 'error', word: raw }); }
    finally { setBusy(false); }
  }, [busy, commit]);

  /** Indice : un mot plus chaud que le meilleur essai, ajouté à la liste et marqué comme indice. */
  const takeHint = useCallback(async (via: 'braises' | 'pub') => {
    const s = stateRef.current;
    const h = await engine.hint(s.lang, s.day, bestTemperature(s.guesses), s.guesses.map(g => g.word));
    if (!h) return null;
    const g: Guess = { word: h.word, temperature: h.temperature, rank: null, order: s.guesses.length + 1, hint: true };
    commit({ ...s, guesses: [...s.guesses, g], hintsUsed: s.hintsUsed + 1, adHintsUsed: s.adHintsUsed + (via === 'pub' ? 1 : 0) });
    setLast(h.word);
    return h;
  }, [commit]);

  const claimReward = useCallback(() => { commit({ ...stateRef.current, rewardClaimed: true }); }, [commit]);

  return { state, ready, busy, feedback, last, submit, takeHint, claimReward };
}
