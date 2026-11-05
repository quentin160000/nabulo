import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { tempColor } from '@/game/temperature';
import { bubble, gameInk } from '@/theme/colors';
import { Bubble } from './Bubble';
import { Diagonal, Relief } from './Diagonal';
import { T } from './Text';
import type { ReactNode } from 'react';

/* Briques visuelles du mini-jeu « Lier » (planches J-jeux-libres-13 et 13b). */

const INK = gameInk;
export const SHADOW = { textShadowColor: '#2B2150', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 } as const;
const L = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 2.8, fill: 'none' };

type IconName = 'arrow' | 'home' | 'refresh' | 'share' | 'bulb';
export function LierIcon({ name, size = 20, color = INK }: { name: IconName; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'arrow' && <><Path d="M5 12 H19" stroke={color} {...L} /><Path d="M13 6 L19 12 L13 18" stroke={color} {...L} /></>}
      {name === 'home' && <Path d="M4 11 L12 4 L20 11 V20 H14 V14 H10 V20 H4 Z" stroke={color} {...L} />}
      {name === 'refresh' && <><Path d="M20 12 A8 8 0 1 1 17.7 6.3" stroke={color} {...L} /><Path d="M20 4 V9 H15" stroke={color} {...L} /></>}
      {name === 'share' && <><Path d="M12 15 V4" stroke={color} {...L} /><Path d="M7 9 L12 4 L17 9" stroke={color} {...L} /><Path d="M5 14 V20 H19 V14" stroke={color} {...L} /></>}
      {name === 'bulb' && <><Path d="M12 2.5a6.5 6.5 0 0 0-3.9 11.7c.7.5 1.1 1.3 1.1 2.1V17h5.6v-.7c0-.8.4-1.6 1.1-2.1A6.5 6.5 0 0 0 12 2.5z" fill="#FFD45C" stroke={color} strokeWidth={2.2} strokeLinejoin="round" /><Path d="M9.5 20h5M10.5 22.5h3" stroke={color} strokeWidth={2.2} strokeLinecap="round" /></>}
    </Svg>
  );
}

/**
 * Gros bouton des planches : jaune (#FFD45C / #F7C843, contour #FFE38F, relief #E3A91C) ou « jaune mélangé »
 * (contour, diagonale et relief calculés). Contour 2 px, relief 7 px, rayon 18.
 */
export function BigButton({ label, onPress, mix, height = 58, fontSize = 18, icon, style, grow = true, hint }: {
  label: string; onPress?: () => void; mix?: boolean; height?: number; fontSize?: number; icon?: IconName; style?: StyleProp<ViewStyle>; grow?: boolean; hint?: string;
}) {
  const look = mix ? { bg: '#FFD45C', ...bubble('#FFD45C') } : { bg: '#FFD45C', border: '#FFE38F', diag: '#F7C843', relief: '#E3A91C' };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint}
      onPress={() => { if (Platform.OS !== 'web') Haptics.selectionAsync(); onPress?.(); }}
      style={({ pressed }) => [{ height, transform: [{ translateY: pressed ? 2 : 0 }] }, grow ? { flex: 1, minWidth: 0 } : null, style]}>
      <View style={{ flex: 1, borderRadius: 18, borderWidth: 2, borderColor: look.border, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: grow ? 8 : 16 }}>
        <Diagonal bg={look.bg} diag={look.diag} />
        <Relief inset={7} color={look.relief} radius={16} />
        {/* la vue (position relative sur le web) garde l'icône au-dessus du fond en position absolue */}
        {icon ? <View><LierIcon name={icon} size={fontSize >= 19 ? 22 : 20} /></View> : null}
        <T size={fontSize} weight={700} color={INK} numberOfLines={1}>{label}</T>
      </View>
    </Pressable>
  );
}

/** En-tête : croix blanche 40 × 40 (rayon 13), titre blanc, pastille à droite. */
export function Header({ title, onClose, right, closeLabel = 'Fermer' }: { title: string; onClose: () => void; right?: ReactNode; closeLabel?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} hitSlop={4}
        style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <T size={20} weight={700} color={INK}>✕</T>
      </Pressable>
      <T size={18} weight={700} color="#FFFFFF" style={[{ flex: 1, minWidth: 0 }, SHADOW]} numberOfLines={1}>{title}</T>
      {right}
    </View>
  );
}

/** Pastille jaune « Étapes 2 ». */
export function StepsPill({ n }: { n: number }) {
  return (
    <Bubble bg="#FFD45C" radius={15} border={2} inset={5} style={{ height: 30, paddingHorizontal: 10, justifyContent: 'center' }}>
      <T size={14} weight={700} color={INK}>Étapes {n}</T>
    </Bubble>
  );
}

/** Jauge « Vers « ordinateur » » : chaleur du dernier mot vers l'arrivée (dégradé sur toute la piste, coupé à droite). */
export function Towards({ target, t }: { target: string; t: number }) {
  const [w, setW] = useState(0);
  return (
    <View accessibilityRole="image" accessibilityLabel={`Vers « ${target} » : ${t}°`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, backgroundColor: 'rgba(30,18,90,0.38)' }}>
      <T size={13} weight={700} color="#FFFFFF" numberOfLines={1} style={{ flexShrink: 1 }}>Vers « {target} »</T>
      <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ flex: 1, minWidth: 60, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
        <View style={{ width: `${t}%`, height: '100%', borderRadius: 6, overflow: 'hidden' }}>
          <LinearGradient colors={['#5B8DEF', '#9AD8F5', '#FFC23D', '#FF5A36']} locations={[0, 0.35, 0.68, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: w, height: '100%' }} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 8, paddingVertical: 1, borderRadius: 9, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#FFD45C' }}>
        <T size={13} weight={700} color={INK}>{t}°</T>
      </View>
    </View>
  );
}

/** Étiquette de température d'un lien (pastille blanche, point coloré). */
export function LinkTag({ t }: { t: number }) {
  return (
    <Bubble bg="#FFFFFF" radius={12} border={2} inset={4} style={{ height: 24, paddingLeft: 5, paddingRight: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tempColor(t) }} />
      <T size={13} weight={700} color={INK}>{Math.round(t)}°</T>
    </Bubble>
  );
}

export type NodeLook = 'start' | 'mid' | 'target' | 'reached' | 'ring' | 'pink';
/** Un mot de la chaîne : 170 px de large au minimum, 36 px de haut. */
export function ChainNode({ word, look, t }: { word: string; look: NodeLook; t?: number }) {
  const label = <T size={18} weight={700} color={INK} numberOfLines={1}>{word}</T>;
  const base = { minWidth: 170, height: 36, paddingHorizontal: 18, borderRadius: 18, alignItems: 'center', justifyContent: 'center' } as const;
  let node: ReactNode;
  if (look === 'start' || look === 'reached' || look === 'pink') {
    const bg = look === 'start' ? '#FFD45C' : look === 'reached' ? '#FFD23F' : '#FFD6E0';
    node = <Bubble bg={bg} radius={18} border={2} inset={5} style={base}>{label}</Bubble>;
  } else if (look === 'mid') {
    node = <View style={[base, { backgroundColor: '#FFFFFF' }]}>{label}</View>;
  } else if (look === 'target') {
    node = <View style={[base, { borderWidth: 2, borderStyle: 'dashed', borderColor: INK, backgroundColor: 'rgba(255,255,255,0.55)' }]}>{label}</View>;
  } else {
    node = (
      <Bubble bg="#FFD45C" radius={23} border={2} inset={5} style={{ minWidth: 184, height: 46, padding: 4 }}>
        <Bubble bg="#FFFFFF" radius={16} border={2} inset={5} style={{ flex: 1, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }}>{label}</Bubble>
      </Bubble>
    );
  }
  return (
    <View style={{ zIndex: 1, alignSelf: 'stretch', alignItems: 'center' }}>
      {node}
      {t !== undefined && (
        <View pointerEvents="none" style={{ position: 'absolute', left: '50%', marginLeft: 102, top: 0, bottom: 0, justifyContent: 'center' }}>
          <LinkTag t={t} />
        </View>
      )}
    </View>
  );
}

/** Lien entre deux mots : barre de 10 px à la couleur de la température, ou pointillés vers l'arrivée. */
export function Link({ t, h = 24 }: { t?: number; h?: number }) {
  return (
    <View style={{ alignSelf: 'stretch', height: h, marginVertical: -3, alignItems: 'center', justifyContent: 'center' }}>
      {t === undefined
        ? <View style={{ width: 0, height: 24, borderLeftWidth: 2, borderStyle: 'dotted', borderColor: 'rgba(255,255,255,0.85)' }} />
        : <View style={{ width: 10, height: h + 6, backgroundColor: tempColor(t) }} />}
    </View>
  );
}

/**
 * Chaîne verticale. `words` = départ + mots posés (+ arrivée si `complete`).
 * `last` : style du dernier mot posé (anneau jaune quand il vient d'être accepté, rose s'il éloigne de l'arrivée).
 */
export function Chain({ words, target, complete, temps, last, compact }: {
  words: string[]; target: string; complete: boolean; temps: number[]; last?: 'ring' | 'pink' | null; compact?: boolean;
}) {
  const h = compact ? 20 : 24;
  return (
    <View accessibilityLabel={`Chaîne : ${words.join(', ')}${complete ? '' : `, puis ${target}`}`}>
      {words.map((w, i) => {
        const isLast = i === words.length - 1;
        const look: NodeLook = i === 0 ? 'start' : complete && isLast ? 'reached' : isLast && !complete && last ? last : 'mid';
        return (
          <View key={w + i}>
            {i > 0 && <Link t={temps[i - 1]} h={h} />}
            <ChainNode word={w} look={look} t={i > 0 ? temps[i - 1] : undefined} />
          </View>
        );
      })}
      {!complete && <><Link /><ChainNode word={target} look="target" /></>}
    </View>
  );
}

/** Petite étiquette de mot (chaîne en ligne, écran de comparaison). */
export function WordChip({ word, bg }: { word: string; bg: string }) {
  return (
    <View style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 13, borderWidth: 2, borderColor: 'transparent', backgroundColor: bg }}>
      <T size={14} weight={700} color={INK}>{word}</T>
    </View>
  );
}
