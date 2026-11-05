import { Pressable, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { ink } from '@/theme/colors';
import type { ReactNode } from 'react';

/* Briques des pages Réglages / Historique / Amis : icônes dans le trait de la planche H-onglets, interrupteur à plat. */

export type ReglageIcon = 'vibre' | 'son' | 'anim' | 'langue' | 'cloche' | 'revoir' | 'reset' | 'info' | 'cadenas' | 'trophee' | 'partage';
const S = { stroke: ink, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
const DRAW: Record<ReglageIcon, ReactNode> = {
  vibre: <><Rect x={7} y={3} width={10} height={18} rx={2.5} {...S} fill="#FFFFFF" /><Path d="M10.5 17.5 H13.5" {...S} /><Path d="M3.5 9 V15 M20.5 9 V15" {...S} stroke="#FF8FAB" strokeWidth={2.4} /></>,
  son: <><Path d="M4 9.5 H7.5 L12.5 5 V19 L7.5 14.5 H4 Z" {...S} fill="#FFD23F" /><Path d="M16 9 C 17.5 10.5, 17.5 13.5, 16 15 M18.5 6.5 C 21.5 9.5, 21.5 14.5, 18.5 17.5" {...S} /></>,
  anim: <><Circle cx={14} cy={12} r={6} {...S} fill="#7FE3EA" /><Path d="M3 8 H6 M2 12 H5.5 M3 16 H6" {...S} /></>,
  langue: <><Rect x={3} y={4.5} width={13} height={10} rx={3} {...S} fill="#FFFFFF" /><Path d="M6.5 14.5 V18 L10 14.5" {...S} fill="#FFFFFF" /><Path d="M11 9.5 H18 A3 3 0 0 1 21 12.5 V16 A3 3 0 0 1 18 19 H17.5 V21.5 L14.5 19 H14 A3 3 0 0 1 11 16 Z" {...S} fill="#FFD23F" /></>,
  cloche: <><Path d="M6 16.5 V11 A6 6 0 0 1 18 11 V16.5 L19.5 18 H4.5 Z" {...S} fill="#FFD23F" /><Path d="M10 20.5 A2 2 0 0 0 14 20.5" {...S} /></>,
  revoir: <><Path d="M4.5 12 A7.5 7.5 0 1 0 7 6.4" {...S} /><Path d="M3.5 4 V8.5 H8" {...S} /><Path d="M10.5 9 L15 12 L10.5 15 Z" {...S} fill="#FFD23F" /></>,
  reset: <><Path d="M5 7 H19 M9.5 7 V4.5 H14.5 V7" {...S} /><Path d="M6.5 7 L7.5 20 H16.5 L17.5 7" {...S} fill="#FF8FAB" /><Path d="M10.5 11 V16 M13.5 11 V16" {...S} /></>,
  info: <><Circle cx={12} cy={12} r={9} {...S} fill="#FFFFFF" /><Path d="M12 11 V16.5" {...S} strokeWidth={2.4} /><Circle cx={12} cy={7.6} r={1.3} fill={ink} /></>,
  cadenas: <><Rect x={5} y={10.5} width={14} height={10} rx={3} {...S} fill="#7FE3EA" /><Path d="M8.5 10.5 V7.5 A3.5 3.5 0 0 1 15.5 7.5 V10.5" {...S} /><Path d="M12 14.5 V16.5" {...S} strokeWidth={2.4} /></>,
  trophee: <><Path d="M7.5 4 H16.5 V9 A4.5 4.5 0 0 1 7.5 9 Z" {...S} fill="#FFD23F" /><Path d="M7.5 6 H4.5 A3 3 0 0 0 7.8 10 M16.5 6 H19.5 A3 3 0 0 1 16.2 10" {...S} /><Path d="M12 13.5 V17 M8.5 20 H15.5 V17.5 H8.5 Z" {...S} fill="#FFFFFF" /></>,
  partage: <><Circle cx={17.5} cy={5.5} r={2.6} {...S} fill="#FFD23F" /><Circle cx={6.5} cy={12} r={2.6} {...S} fill="#FF8FAB" /><Circle cx={17.5} cy={18.5} r={2.6} {...S} fill="#7FE3EA" /><Path d="M8.8 10.7 L15.2 6.8 M8.8 13.3 L15.2 17.2" {...S} /></>,
};

/** Carré lavande avec une icône, comme les `GlyphTile` des cartes blanches. */
export function ReglageTile({ name, bg = '#F1EEFA', size = 46, icon = 27 }: { name: ReglageIcon; bg?: string; size?: number; icon?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 15, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Svg width={icon} height={icon} viewBox="0 0 24 24">{DRAW[name]}</Svg>
    </View>
  );
}

/** Interrupteur à plat : piste lavande (éteint) ou jaune (allumé), pastille blanche cerclée d'encre. */
export function Interrupteur({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }} hitSlop={8}
      onPress={() => onChange(!on)}
      style={{ width: 54, height: 32, borderRadius: 16, padding: 3, backgroundColor: on ? '#FFD45C' : '#E3DEF5', justifyContent: 'center', flexShrink: 0 }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: on ? ink : '#BDB4DD', alignSelf: on ? 'flex-end' : 'flex-start' }} />
    </Pressable>
  );
}
