import { useCallback, useEffect, useState } from 'react';
import { DUELS_KEY, NIVEAU_KEY, addRecord, tally, type DuelRecord, type Jeu, type Niveau } from './duel';
import { load, save } from './storage';

/** Historique réel des duels (nabulo:duels) : bilan d'un jeu et ajout d'une partie. */
export function useDuelHistory(jeu: Jeu) {
  const [list, setList] = useState<DuelRecord[]>([]);
  useEffect(() => { load<DuelRecord[]>(DUELS_KEY, []).then(l => setList(Array.isArray(l) ? l : [])); }, []);
  const record = useCallback(async (gagne: boolean) => {
    const cur = await load<DuelRecord[]>(DUELS_KEY, []);
    const next = addRecord(Array.isArray(cur) ? cur : [], jeu, gagne);
    setList(next);
    await save(DUELS_KEY, next);
  }, [jeu]);
  return { list, ...tally(list, jeu), record };
}

/** Niveau de l'IA (facile / normal), gardé d'une partie à l'autre. */
export function useNiveau(): [Niveau, (n: Niveau) => void] {
  const [n, setN] = useState<Niveau>('normal');
  useEffect(() => { load<Niveau>(NIVEAU_KEY, 'normal').then(v => setN(v === 'facile' ? 'facile' : 'normal')); }, []);
  const set = useCallback((v: Niveau) => { setN(v); save(NIVEAU_KEY, v); }, []);
  return [n, set];
}

/** Pseudo du joueur s'il en a choisi un (profil), sinon « Toi ». */
export function usePlayerName(): string | null {
  const [p, setP] = useState<string | null>(null);
  useEffect(() => { load<string | null>('nabulo:pseudo', null).then(v => setP(typeof v === 'string' && v.trim() ? v.trim() : null)); }, []);
  return p;
}
