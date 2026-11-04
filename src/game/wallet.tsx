import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { START_BRAISES } from './rules';
import { load, save } from './storage';

type Wallet = { braises: number; ready: boolean; spend(n: number): boolean; earn(n: number): void };
const Ctx = createContext<Wallet | null>(null);
const KEY = 'nabulo:braises';

export function WalletProvider({ children }: { children: ReactNode }) {
  const [braises, setBraises] = useState(START_BRAISES);
  const [ready, setReady] = useState(false);
  useEffect(() => { load(KEY, START_BRAISES).then(v => { setBraises(v); setReady(true); }); }, []);
  const set = useCallback((v: number) => { setBraises(v); save(KEY, v); }, []);
  const spend = useCallback((n: number) => {
    if (braises < n) return false;
    set(braises - n); return true;
  }, [braises, set]);
  const earn = useCallback((n: number) => set(braises + n), [braises, set]);
  const value = useMemo(() => ({ braises, ready, spend, earn }), [braises, ready, spend, earn]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): Wallet {
  const w = useContext(Ctx);
  if (!w) throw new Error('useWallet doit être utilisé dans <WalletProvider>');
  return w;
}
