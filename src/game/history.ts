import type { DailyState } from './useDaily';
import { load, save } from './storage';

const ONBOARDING_KEY = 'nabulo:onboarding-vu';
export const dailyKey = (day: number) => `nabulo:mdj:fr:${day}`;

export const onboardingSeen = () => load<boolean>(ONBOARDING_KEY, false);
export const markOnboardingSeen = () => save(ONBOARDING_KEY, true);

/** Nombre de jours d'affilée où le mot du jour a été trouvé (en comptant aujourd'hui s'il est trouvé). */
export async function streak(today: number): Promise<number> {
  const todayState = await load<DailyState | null>(dailyKey(today), null);
  let n = todayState?.solved ? 1 : 0;
  for (let d = today - 1; d > 0; d--) {
    const s = await load<DailyState | null>(dailyKey(d), null);
    if (!s?.solved) break;
    n++;
  }
  return n;
}

/** Temps restant avant minuit, au format de la maquette (« 3 h 40 »). */
export function untilMidnight(now = new Date()): string {
  const m = new Date(now); m.setHours(24, 0, 0, 0);
  const min = Math.max(0, Math.round((m.getTime() - now.getTime()) / 60000));
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}

/** Date courte de la maquette (« 31 oct. »). */
export function shortDate(d = new Date()): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
