import { router, type Href } from 'expo-router';
import { memo } from 'react';
import { Platform, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Ellipse, G, Path, Rect, SvgXml, Text as SvgText } from 'react-native-svg';
import { MONDES, TOTAL, estFinDeMonde, mondeDe } from '@/game/aventure';
import { bubble, gameInk } from '@/theme/colors';
import { MAP_H, MAP_W, MAP_XML, NODES, SEGMENTS } from './aventure-decor';
import { Bubble } from './Bubble';
import { Mascot } from './Mascot';
import { T } from './Text';

/* Briques de la carte de l'aventure (planches A1-Carte … A5-Carte). */

const INK = '#2B2150';
const LOCK = '#C9C2DD';
const FONT = 'Fredoka_700Bold';
const CHEMIN = `M${NODES[0][0].toFixed(1)} ${NODES[0][1].toFixed(1)} ${SEGMENTS.join(' ')}`;

/** Décor de la carte : parsé une seule fois. */
export const MapDecor = memo(function MapDecor({ width }: { width: number }) {
  return <SvgXml xml={MAP_XML} width={width} height={(width * MAP_H) / MAP_W} />;
});

export type EtatNiveau = 'fait' | 'actuel' | 'verrou';

/** Chemin, pointillés jaunes jusqu'au niveau actuel, pastilles des 30 niveaux. */
export const MapPath = memo(function MapPath({ width, actuel, etat }: { width: number; actuel: number; etat: (n: number) => EtatNiveau }) {
  const pointilles = actuel > 1 ? `M${NODES[0][0].toFixed(1)} ${NODES[0][1].toFixed(1)} ${SEGMENTS.slice(0, actuel - 1).join(' ')}` : null;
  return (
    <Svg width={width} height={(width * MAP_H) / MAP_W} viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      <Path d={CHEMIN} fill="none" stroke={INK} strokeWidth={24} strokeLinecap="round" opacity={0.22} />
      <Path d={CHEMIN} fill="none" stroke="#FFFFFF" strokeWidth={18} strokeLinecap="round" />
      {pointilles && <Path d={pointilles} fill="none" stroke="#FFD45C" strokeWidth={8} strokeLinecap="round" strokeDasharray="1 14" />}
      {NODES.map(([x, y], i) => <Pastille key={i} n={i + 1} x={x} y={y} etat={etat(i + 1)} />)}
    </Svg>
  );
});

function Pastille({ n, x, y, etat }: { n: number; x: number; y: number; etat: EtatNiveau }) {
  const fin = estFinDeMonde(n);
  const fill = etat === 'actuel' ? '#FFD45C' : etat === 'fait' ? mondeDe(n).couleur : LOCK;
  return (
    <G>
      {etat === 'actuel' && (fin
        ? <Rect x={x - 32} y={y - 32} width={64} height={64} rx={20} fill="none" stroke="#FFFFFF" strokeWidth={5} opacity={0.8} />
        : <Circle cx={x} cy={y} r={28} fill="none" stroke="#FFFFFF" strokeWidth={5} opacity={0.8} />)}
      {fin ? (
        <>
          <Rect x={x - 24} y={y - 24} width={48} height={48} rx={14} fill={fill} stroke={INK} strokeWidth={4} />
          <Path d={`M${x} ${y - 26} l5 -8 l5 6 l5 -6 l5 8 z`} fill="#FFD45C" stroke={INK} strokeWidth={2} strokeLinejoin="round" transform="translate(-10 0)" />
          <Ellipse cx={x} cy={y - 16} rx={15} ry={4} fill="#FFFFFF" opacity={0.35} />
        </>
      ) : (
        <>
          <Circle cx={x} cy={y} r={20} fill={fill} stroke={INK} strokeWidth={4} />
          <Ellipse cx={x} cy={y - 12} rx={11} ry={4} fill="#FFFFFF" opacity={0.35} />
        </>
      )}
      {etat === 'verrou' ? (
        <G transform={`translate(${x} ${y})`}>
          <Rect x={-7} y={-3} width={14} height={11} rx={3} fill="#FFFFFF" stroke={INK} strokeWidth={2.2} />
          <Path d="M-4 -3 v-3 a4 4 0 0 1 8 0 v3" fill="none" stroke={INK} strokeWidth={2.2} />
        </G>
      ) : etat === 'actuel' ? (
        <SvgText x={x} y={y + 6} textAnchor="middle" fontFamily={FONT} fontSize={17} fill={INK}>{n}</SvgText>
      ) : (
        <>
          <SvgText x={x} y={y + 6} textAnchor="middle" fontFamily={FONT} fontSize={17} fill={INK} stroke={INK} strokeWidth={3} strokeLinejoin="round">{n}</SvgText>
          <SvgText x={x} y={y + 6} textAnchor="middle" fontFamily={FONT} fontSize={17} fill="#FFFFFF">{n}</SvgText>
        </>
      )}
    </G>
  );
}

/** Zones tactiles des niveaux (48 px, au-dessus des pastilles). */
export function MapTargets({ width, etat, onPress }: { width: number; etat: (n: number) => EtatNiveau; onPress: (n: number) => void }) {
  const k = width / MAP_W;
  return (
    <>
      {NODES.map(([x, y], i) => {
        const n = i + 1, e = etat(n);
        return (
          <Pressable key={n} onPress={() => onPress(n)} accessibilityRole="button"
            accessibilityLabel={`Niveau ${n}${estFinDeMonde(n) ? ', fin de monde' : ''}, ${e === 'fait' ? 'réussi' : e === 'actuel' ? 'à jouer' : 'verrouillé'}`}
            style={{ position: 'absolute', left: x * k - 24, top: y * k - 24, width: 48, height: 48, borderRadius: 24 }} />
        );
      })}
    </>
  );
}

/** Bulle du personnage au-dessus du niveau actuel. */
export function MapBubble({ width, n }: { width: number; n: number }) {
  const k = width / MAP_W;
  const [x, y] = NODES[Math.min(TOTAL, Math.max(1, n)) - 1];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x * k - 28, top: y * k - 100, width: 56, height: 64, zIndex: 2 }}>
      <Bubble bg="#FFFFFF" radius={28} border={4} inset={5} style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
        <Mascot mood={mondeDe(n).mascotte} size={50} />
      </Bubble>
      <View style={{ alignSelf: 'center', marginTop: -2, width: 0, height: 0, borderLeftWidth: 9, borderRightWidth: 9, borderTopWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#D9D1F2' }} />
    </View>
  );
}

/* ---------- En-tête : personnage du monde, vies, braises ---------- */
export function Coeur({ size = 18 }: { size?: number }) {
  return <View><Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" fill="#FF5A8A" stroke={INK} strokeWidth={2} /></Svg></View>;
}
export function Flamme({ size = 18 }: { size?: number }) {
  return <View><Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 0 2 1 3 2 3 0-3-1-5 1-8z" fill="#FF5A36" stroke={INK} strokeWidth={2} /></Svg></View>;
}

function Pastille2({ children, label, onPress }: { children: React.ReactNode; label: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={!onPress}>
      <Bubble bg="#FFFFFF" radius={18} border={3} inset={5} style={{ height: 36, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        {children}
      </Bubble>
    </Pressable>
  );
}

export function MapTopBar({ top, n, vies, prochaine, braises, onVies }: { top: number; n: number; vies: number; prochaine: string | null; braises: number; onVies: () => void }) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top, zIndex: 3, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Bubble bg="#FFFFFF" radius={16} border={3} inset={5} style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
        <Mascot mood={mondeDe(n).mascotte} size={46} />
      </Bubble>
      <Pastille2 label={`${vies} vies${prochaine ? `, prochaine dans ${prochaine}` : ''}`} onPress={onVies}>
        <Coeur />
        <T size={16} weight={700} color={gameInk}>{vies}</T>
        {prochaine ? <T size={12} weight={700} color="#7C7399" style={{ fontVariant: ['tabular-nums'] }}>{prochaine}</T> : null}
      </Pastille2>
      <Pastille2 label={`${braises} brez, ouvrir la boutique`} onPress={() => router.push('/boutique')}>
        <Flamme />
        <T size={16} weight={700} color={gameInk}>{braises}</T>
      </Pastille2>
      <View style={{ flex: 1 }} />
    </View>
  );
}

/* ---------- Gros bouton « ▶ Niveau N » ---------- */
export function PlayButton({ n, bottom, onPress }: { n: number; bottom: number; onPress: () => void }) {
  const b = bubble('#FFD45C');
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom, zIndex: 3, alignItems: 'center' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Jouer le niveau ${n}`}
        onPress={() => { if (Platform.OS !== 'web') Haptics.selectionAsync(); onPress(); }}
        style={({ pressed }) => ({ transform: [{ translateY: pressed ? 2 : 0 }] })}>
        <Bubble bg="#FFD45C" radius={27} border={4} inset={7} colors={b} style={{ height: 54, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View><Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M7 4l13 8-13 8z" fill={INK} /></Svg></View>
          <T size={20} weight={700} color={gameInk}>Niveau {n}</T>
        </Bubble>
      </Pressable>
    </View>
  );
}

/* ---------- Barre du bas propre à l'aventure ---------- */
type Onglet = 'carte' | 'duel' | 'mini' | 'boutique';
const ONGLETS: { id: Onglet; label: string; route: Href | null }[] = [
  { id: 'carte', label: 'Carte', route: null },
  { id: 'duel', label: 'Duel', route: '/duel' },
  { id: 'mini', label: 'Mini-jeux', route: '/mini-jeux' },
  { id: 'boutique', label: 'Boutique', route: '/boutique' },
];

export function IconeCarte({ size = 24, color = gameInk }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round">
      <Path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="#E6DCFF" /><Path d="M9 4v14M15 6v14" />
    </Svg>
  );
}
function IconeOnglet({ id }: { id: Onglet }) {
  const c = gameInk;
  if (id === 'carte') return <IconeCarte />;
  if (id === 'duel') return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round">
      <Circle cx={7} cy={9} r={4} fill="#FF86C8" /><Circle cx={17} cy={9} r={4} fill="#7FE0B4" /><Path d="M3 20c0-3 2-5 4-5s4 2 4 5M13 20c0-3 2-5 4-5s4 2 4 5" />
    </Svg>
  );
  if (id === 'mini') return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinejoin="round">
      <Rect x={3} y={3} width={8} height={8} rx={2} fill="#FFD45C" /><Rect x={13} y={3} width={8} height={8} rx={2} fill="#9DD8FF" />
      <Rect x={3} y={13} width={8} height={8} rx={2} fill="#7CE0B5" /><Rect x={13} y={13} width={8} height={8} rx={2} fill="#FF86C8" />
    </Svg>
  );
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinejoin="round">
      <Path d="M4 9h16l-1.5 11h-13z" fill="#FFB3A8" /><Path d="M8 9V7a4 4 0 0 1 8 0v2" />
    </Svg>
  );
}

export function AventureNav({ bottom }: { bottom: number }) {
  return (
    <View style={{ position: 'absolute', left: 10, right: 10, bottom, zIndex: 3 }}>
      <Bubble bg="#FFFFFF" radius={24} border={3} inset={6} style={{ padding: 6, flexDirection: 'row', gap: 4 }}>
        {ONGLETS.map(o => {
          const on = o.id === 'carte';
          return (
            <Pressable key={o.id} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={o.label}
              onPress={() => { if (o.route) router.push(o.route); }}
              style={{ flex: 1, height: 64, borderRadius: 16, backgroundColor: on ? '#FFD45C' : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <IconeOnglet id={o.id} />
              <T size={12} weight={700} color={gameInk}>{o.label}</T>
            </Pressable>
          );
        })}
      </Bubble>
    </View>
  );
}

/** Position verticale (en px de carte) du centre d'un niveau. */
export const nodeY = (n: number) => NODES[Math.min(TOTAL, Math.max(1, n)) - 1][1];
export { MAP_H, MAP_W, MONDES };
