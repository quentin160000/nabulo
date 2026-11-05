import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useWallet } from '@/game/wallet';
import { ink } from '@/theme/colors';
import { Bubble } from './Bubble';
import { Coin } from './bits';
import { GameBg } from './game';
import { TAB_BAR_SPACE, type Tab } from './TabBar';
import { T } from './Text';
import { Toast } from './Toast';
import type { ReactNode } from 'react';

/* Briques des écrans ouverts depuis l'accueil (planche H-onglets) : en-tête, cartes, onglets. */

export const SOFT = '#3F3566';
const LABEL = '#E6E0FF';

/** Couleurs exactes des bulles de la planche (fond, contour, diagonale, relief). */
export const CARD = {
  jour: { bg: '#6A4BE0', colors: { border: '#8064EB', diag: '#5733E1', relief: '#4019D4' } },
  cours: { bg: '#FFCF5C', colors: { border: '#FFD369', diag: '#FFC845', relief: '#FFBD1F' } },
  duel: { bg: '#FF8AA8', colors: { border: '#FF97B1', diag: '#FF7397', relief: '#FF4D7A' } },
  multi: { bg: '#AE98FF', colors: { border: '#B8A5FF', diag: '#9C81FF', relief: '#7E5BFF' } },
  mini: { bg: '#5FD3DA', colors: { border: '#77DFE6', diag: '#48D2DA', relief: '#25CCD7' } },
  stat: { bg: '#FFFFFF', colors: { border: '#D9D1F2', diag: '#FFFFFF', relief: '#E3DEDE' } },
} as const;
export type CardKind = keyof typeof CARD;

const TAB_ROUTES: Record<Tab, Href> = { accueil: '/', jeux: '/jeux', classement: '/classement', profil: '/profil' };

/** Navigation des onglets : on remplace l'écran au lieu d'empiler (retour à l'accueil = on dépile tout). */
export function goTab(t: Tab) {
  // les onglets vivent dans le groupe (tabs) : on revient à la racine puis on y sélectionne l'onglet
  if (router.canDismiss()) router.dismissAll();
  router.navigate(TAB_ROUTES[t]);
}

/** Solde de braises de la planche : pastille blanche, pièce qui dépasse à gauche, « + » jaune ; ouvre la boutique. */
export function BraisesPill() {
  const { braises } = useWallet();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${braises} braises, ouvrir la boutique`} onPress={() => router.push('/boutique')} hitSlop={4}
      style={{ height: 38, marginLeft: 16, paddingLeft: 32, paddingRight: 6, borderRadius: 19, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Coin size={42} style={{ position: 'absolute', left: -12, top: -2 }} />
      <T size={18} weight={700} color={ink} style={{ minWidth: 30, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{braises}</T>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFD45C', alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"><Path d="M12 5v14M5 12h14" stroke={ink} strokeWidth={4} strokeLinecap="round" /></Svg>
      </View>
    </Pressable>
  );
}

type ScreenProps = {
  title: string; back?: boolean; badge?: number; tab: Tab; children: ReactNode; toast?: string | null; below?: ReactNode;
};

/** Écran violet : en-tête (retour, titre, pastille), contenu défilant, barre d'onglets. */
export function TabScreen({ title, back, badge, tab, children, toast, below }: ScreenProps) {
  const inset = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#4B33B8' }}>
      <GameBg />
      <View style={{ flex: 1, paddingTop: inset.top + 6, paddingBottom: inset.bottom + (back ? 20 : TAB_BAR_SPACE), paddingHorizontal: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2, minHeight: 40 }}>
          {back && (
            <Pressable accessibilityRole="button" accessibilityLabel="Retour" hitSlop={4}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Path d="M15 5l-7 7 7 7" stroke="#FFFFFF" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
          )}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <T size={28} weight={700} outline numberOfLines={1} accessibilityRole="header" style={{ flexShrink: 1 }}>{title}</T>
            {badge ? <Tag label={String(badge)} bg="#FF5A8A" color="#FFFFFF" /> : null}
          </View>
          <BraisesPill />
        </View>
        <ScrollView style={{ flex: 1, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        {below}
      </View>
      <Toast msg={toast ?? null} check={false} style={{ bottom: inset.bottom + 104 }} />
    </View>
  );
}

/** Titre de section en capitales (« Choisis le jeu »). */
export function Label({ children }: { children: string }) {
  return <T size={14} weight={700} color={LABEL} style={{ textTransform: 'uppercase', letterSpacing: 0.84, marginTop: 2, marginBottom: -5, marginLeft: 2 }}>{children}</T>;
}

/** Petite étiquette à plat (« en cours », « Boutique »). */
export function Tag({ label, bg, color = ink }: { label: string; bg: string; color?: string }) {
  return (
    <View style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: 10, backgroundColor: bg, flexShrink: 0 }}>
      <T size={12} weight={700} color={color} numberOfLines={1}>{label}</T>
    </View>
  );
}

/* ---------- icônes de la planche (viewBox 24, trait encre) ---------- */

export type GlyphName = 'calendar' | 'pad' | 'bolt' | 'multi' | 'friend' | 'globe' | 'robot' | 'keyboard' | 'gear' | 'user';
const S = { stroke: ink, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
const GLYPHS: Record<GlyphName, ReactNode> = {
  calendar: <><Rect x={3.5} y={5} width={17} height={15} rx={3} {...S} fill="#FFFFFF" /><Path d="M3.5 10 H20.5" {...S} /><Path d="M8 3 V7 M16 3 V7" {...S} /><Circle cx={12} cy={15} r={2.6} {...S} fill="#FFD23F" /></>,
  pad: <><Path d="M6 8 H18 A4 4 0 0 1 22 12 V14 A4 4 0 0 1 15 16 H9 A4 4 0 0 1 2 14 V12 A4 4 0 0 1 6 8 Z" {...S} fill="#FFFFFF" /><Path d="M7 11 V14 M5.5 12.5 H8.5" {...S} /><Circle cx={16} cy={11.5} r={1} fill={ink} /><Circle cx={18} cy={13.5} r={1} fill={ink} /></>,
  bolt: <Path d="M13 2 L5 13 H11 L10 22 L19 10 H13 Z" {...S} fill="#FFD23F" />,
  multi: <><Circle cx={12} cy={12} r={7} {...S} strokeDasharray="2 3" /><Circle cx={12} cy={4.5} r={2.4} {...S} fill="#FFD23F" /><Circle cx={18.5} cy={16} r={2.4} {...S} fill="#FF8FAB" /><Circle cx={5.5} cy={16} r={2.4} {...S} fill="#7FE3EA" /></>,
  friend: <><Circle cx={9} cy={8} r={3.5} {...S} fill="#FFFFFF" /><Path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6Z" {...S} fill="#FFFFFF" /><Path d="M18 8 V14 M15 11 H21" {...S} /></>,
  globe: <><Circle cx={12} cy={12} r={9} {...S} fill="#FFFFFF" /><Path d="M12 3 C 8 7, 8 17, 12 21 C 16 17, 16 7, 12 3 M3.5 9 H20.5 M3.5 15 H20.5" {...S} /></>,
  robot: <><Rect x={5} y={8} width={14} height={11} rx={3} {...S} fill="#FFFFFF" /><Path d="M12 4 V8" {...S} /><Circle cx={12} cy={3.5} r={1.3} {...S} fill="#FFD23F" /><Circle cx={9.5} cy={13} r={1.4} fill={ink} /><Circle cx={14.5} cy={13} r={1.4} fill={ink} /><Path d="M3 12 V15 M21 12 V15" {...S} /></>,
  keyboard: <><Rect x={3} y={6} width={18} height={12} rx={3} {...S} fill="#FFFFFF" /><Path d="M7 12 h.01 M10.5 12 h.01 M14 12 h.01 M17.5 12 h.01" {...S} strokeWidth={3} /></>,
  gear: <><Circle cx={12} cy={12} r={3} {...S} fill="#FFD23F" /><Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" {...S} /></>,
  user: <><Circle cx={12} cy={8} r={4} {...S} strokeWidth={2.2} /><Path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" {...S} strokeWidth={2.2} /></>,
};

export function Glyph({ name, size = 27 }: { name: GlyphName; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24">{GLYPHS[name]}</Svg>;
}

/** Carré arrondi qui contient une icône (blanc sur les bulles colorées, lavande sur les cartes blanches). */
export function GlyphTile({ name, size = 46, icon = 27, bg = '#FFFFFF' }: { name: GlyphName; size?: number; icon?: number; bg?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 15, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Glyph name={name} size={icon} />
    </View>
  );
}

export function Chevron({ color = ink }: { color?: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Path d="m9 6 6 6-6 6" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

/** Rond blanc avec triangle plein (« Reprendre »). */
export function PlayDot() {
  return (
    <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Svg width={18} height={18} viewBox="0 0 24 24" style={{ marginLeft: 3 }}><Path d="M6 3 L21 12 L6 21 Z" fill={ink} /></Svg>
    </View>
  );
}

type RowProps = {
  kind: CardKind | 'white'; icon: GlyphName; title: string; sub?: string; trailing?: ReactNode;
  onPress?: () => void; label?: string; style?: StyleProp<ViewStyle>; leading?: ReactNode;
};

/** Ligne de la planche : bulle colorée (ou carte blanche à plat), icône, titre, sous-titre, élément de droite. */
export function Row({ kind, icon, title, sub, trailing, onPress, label, style, leading }: RowProps) {
  const light = kind === 'jour';
  const color = light ? '#FFFFFF' : ink;
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {leading ?? <GlyphTile name={icon} bg={kind === 'white' ? '#F1EEFA' : '#FFFFFF'} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T size={18} weight={700} color={color} style={{ lineHeight: 21 }}>{title}</T>
        {sub ? <T size={13} weight={600} color={light ? '#E2DBFF' : SOFT}>{sub}</T> : null}
      </View>
      {trailing === undefined ? <Chevron color={color} /> : trailing}
    </View>
  );
  const box = kind === 'white'
    ? <View style={[{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#FFFFFF' }, style]}>{content}</View>
    : <Bubble {...CARD[kind]} style={[{ paddingTop: 10, paddingHorizontal: 12, paddingBottom: 13 }, style]}>{content}</Bubble>;
  if (!onPress) return box;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label ?? (sub ? `${title}, ${sub}` : title)} onPress={onPress}
      style={({ pressed }) => ({ transform: [{ translateY: pressed ? 2 : 0 }] })}>
      {box}
    </Pressable>
  );
}

/** Sélecteur à plat (« Tous / Seul / À plusieurs »). */
export function Segmented<K extends string>({ options, value, onChange }: { options: readonly (readonly [K, string])[]; value: K; onChange: (k: K) => void }) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)' }}>
      {options.map(([k, lbl]) => {
        const on = k === value;
        return (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={lbl} onPress={() => onChange(k)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 14, backgroundColor: on ? '#FFFFFF' : 'transparent' }}>
            <T size={14} weight={700} color={on ? ink : '#FFFFFF'}>{lbl}</T>
          </Pressable>
        );
      })}
    </View>
  );
}
