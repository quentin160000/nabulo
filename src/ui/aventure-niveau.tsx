import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View, useWindowDimensions, type StyleProp, type TextInputInstance, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, G, LinearGradient as SvgGradient, Path, Rect, Stop, SvgXml } from 'react-native-svg';
import { COULEURS_VOISINS } from '@/game/libres-manches';
import { mondeDe, type Monde } from '@/game/aventure';
import { moodLabel, moodOf, tempColor, type Mood } from '@/game/temperature';
import { bubble, gameInk, mix } from '@/theme/colors';
import { LEVEL_BG_XML } from './aventure-decor';
import { Bubble } from './Bubble';
import { images } from './bits';
import { Confetti } from './Confetti';
import { Diagonal, Relief } from './Diagonal';
import { Outlined, useCadre } from './libres-ui';
import { Mascot } from './Mascot';
import { T } from './Text';

/* Briques des écrans de niveau de l'aventure (planche Niveaux-Parcours). */

export const INK = gameInk;
const fill = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const;
const shadow = (dy = 2) => ({ textShadowColor: INK, textShadowOffset: { width: 0, height: dy }, textShadowRadius: 0 });

/* ---------- Fond du monde ---------- */
/** Dégradé du monde ; `decor` ajoute le décor (lune, nuages, arc-en-ciel, soleil…) recadré pour couvrir l'écran. */
export function LevelBg({ monde, decor }: { monde: Monde; decor?: boolean }) {
  const { width, height } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={fill}>
      <LinearGradient colors={monde.fond as unknown as [string, string, string]} locations={[0, 0.55, 1]} style={fill} />
      {decor && <SvgXml xml={LEVEL_BG_XML[monde.n - 1]} width={width} height={height} preserveAspectRatio="xMidYMid slice" style={fill} />}
    </View>
  );
}

/** Étincelle à 4 branches (positions en % de la largeur et px du haut, comme la maquette). */
export function Sparkle({ left, top, size, opacity }: { left: string; top: number; size: number; opacity: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: left as `${number}%`, top, opacity }}>
      <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 1 C13 9 15 11 23 12 C15 13 13 15 12 23 C11 15 9 13 1 12 C9 11 11 9 12 1Z" fill="#FFFFFF" /></Svg>
    </View>
  );
}

/* ---------- Icônes des consignes ---------- */
export type IconeConsigne = 'essais' | 'oeil' | 'cible' | 'interdit' | 'lien' | 'chrono' | 'points';
export function Icone({ name, size = 18 }: { name: IconeConsigne; size?: number }) {
  const p = { stroke: '#2B2150', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <View>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {name === 'essais' && <><Path {...p} d="M4 20l4-1 11-11-3-3L5 16z" fill="#FFD45C" /><Path {...p} d="M14 7l3 3" /></>}
        {name === 'oeil' && <><Path {...p} d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" fill="#E6DCFF" /><Circle {...p} cx={12} cy={12} r={3} fill="#2B2150" /></>}
        {name === 'cible' && <><Circle {...p} cx={12} cy={12} r={8} fill="#FFD0C2" /><Circle {...p} cx={12} cy={12} r={4} fill="#FF7240" /></>}
        {name === 'interdit' && <><Circle {...p} cx={12} cy={12} r={8} fill="#FFD0C2" /><Path {...p} d="M6.5 6.5l11 11" /></>}
        {name === 'lien' && <Path {...p} d="M9 15l6-6M7 11l-2 2a3 3 0 0 0 4 4l2-2M17 13l2-2a3 3 0 0 0-4-4l-2 2" />}
        {name === 'chrono' && <><Circle {...p} cx={12} cy={13} r={8} fill="#FFD45C" /><Path {...p} d="M12 9v4l2.5 2M9.5 2.5h5" /></>}
        {name === 'points' && <Path {...p} d="M4 19V9M10 19V5M16 19v-7M22 19H2" strokeWidth={2.6} />}
      </Svg>
    </View>
  );
}

/* ---------- 1 · Objectif ---------- */
/** Nuage numéroté de la maquette (98 × 86, agrandi 1,5 fois). */
function Nuage({ n }: { n: number }) {
  const parts = (f: string, sw?: number) => (
    <>
      <Rect x={12} y={50} width={86} height={36} rx={18} fill={f} stroke={sw ? '#2B2150' : undefined} strokeWidth={sw} />
      {[[30, 54, 19], [53, 40, 23], [78, 44, 19], [94, 62, 13], [16, 66, 13]].map(([cx, cy, r]) => (
        <Circle key={`${cx}`} cx={cx} cy={cy} r={r} fill={f} stroke={sw ? '#2B2150' : undefined} strokeWidth={sw} />
      ))}
    </>
  );
  return (
    <View style={{ width: 98, height: 86, marginBottom: 26, transform: [{ scale: 1.5 }] }}>
      <Svg width={98} height={86} viewBox="0 0 110 96" style={{ overflow: 'visible' }}>
        <Defs>
          <SvgGradient id="cg" gradientUnits="userSpaceOnUse" x1={0} y1={20} x2={0} y2={88}>
            <Stop offset={0} stopColor="#FFFFFF" /><Stop offset={0.55} stopColor="#FFFFFF" /><Stop offset={1} stopColor="#E6F0FC" />
          </SvgGradient>
        </Defs>
        <G transform="translate(0 4)">{parts('#2B2150', 9)}</G>
        {parts('#2B2150', 9)}
        {parts('url(#cg)')}
        <Path d="M37 34.2 A17 17 0 0 1 45.8 24.6" fill="none" stroke="#C6DCF5" strokeWidth={4} strokeLinecap="round" />
      </Svg>
      <T size={28} weight={700} color="#2B2150" align="center" style={{ position: 'absolute', left: 2, right: 0, top: 38 - 4, lineHeight: 34 }}>{n}</T>
    </View>
  );
}

/** Morceau de consigne : texte normal ou mis en valeur (jaune). */
export type Morceau = string | { b: string };

export function Consigne({ bg, icon, children }: { bg: string; icon: IconeConsigne; children: string }) {
  return (
    <Bubble bg={bg} radius={16} border={3} inset={5} style={{ paddingVertical: 11, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icone name={icon} />
      <T size={18} weight={700} color={INK} style={{ flex: 1, lineHeight: 22 }}>{children}</T>
    </Bubble>
  );
}

export function Objectif({ n, monde, titre, intro, consignes, perdu, onStart, onClose }: {
  n: number; monde: Monde; titre: string; intro: Morceau[]; consignes: [IconeConsigne, string][]; perdu: string; onStart: () => void; onClose: () => void;
}) {
  const cadre = useCadre();
  return (
    <Pressable style={{ flex: 1 }} onPress={onStart} accessibilityRole="button" accessibilityLabel={`Niveau ${n}, ${titre}. Touche l’écran pour commencer`}>
      <LevelBg monde={monde} decor />
      <View style={[{ flex: 1, gap: 10 }, cadre]}>
        <View style={{ flexDirection: 'row', marginBottom: -40, zIndex: 2 }}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Revenir à la carte" hitSlop={8}>
            <Bubble bg="#FFFFFF" radius={15} border={3} inset={5} style={{ height: 30, paddingHorizontal: 10, justifyContent: 'center' }}>
              <T size={14} weight={700} color={INK}>✕</T>
            </Bubble>
          </Pressable>
        </View>
        <View style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Sparkle left="82%" top={14} size={16} opacity={0.9} />
          <Sparkle left="90%" top={52} size={10} opacity={0.7} />
          <Sparkle left="6%" top={210} size={12} opacity={0.6} />
          <View style={{ paddingTop: 30, paddingHorizontal: 4, paddingBottom: 10, alignItems: 'center', gap: 6 }}>
            <Nuage n={n} />
            <View accessibilityRole="header" style={{ alignItems: 'center' }}>
              <Outlined size={17} w={1.5} dy={2}>{`Monde ${monde.n} · ${monde.nom}`}</Outlined>
              <Outlined size={36} w={1.5} dy={2} lh={38}>{titre}</Outlined>
            </View>
          </View>
          <View style={{ flex: 1, paddingTop: 10, paddingHorizontal: 4, paddingBottom: 6, justifyContent: 'center', gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image source={images.nabulo} style={{ width: 110, height: 110 }} contentFit="contain" accessibilityLabel="Nabulo" />
              <T size={23} weight={600} color="#FFFFFF" style={[{ flex: 1, lineHeight: 28 }, shadow()]}>
                {intro.map((m, i) => (typeof m === 'string' ? m : <T key={i} size={23} weight={700} color="#FFF27A" style={[{ lineHeight: 28 }, shadow()]}>{m.b}</T>))}
              </T>
            </View>
            <Consigne bg="#FFD45C" icon={consignes[0][0]}>{consignes[0][1]}</Consigne>
            <Consigne bg="#FF86C8" icon={consignes[1][0]}>{consignes[1][1]}</Consigne>
            <Bubble bg="#FF5A8A" radius={16} border={3} inset={5} style={{ marginTop: 8, paddingVertical: 12, paddingHorizontal: 14 }}>
              <T size={17} weight={700} color="#FFFFFF" style={[{ lineHeight: 21 }, shadow(1)]}>{perdu}</T>
            </Bubble>
          </View>
        </View>
        <T size={16} weight={700} color="#FFFFFF" align="center" style={shadow()}>Touche l’écran pour commencer</T>
      </View>
    </Pressable>
  );
}

/* ---------- 2 · En jeu : briques communes ---------- */
/** Pastille en relief (« ✎ 12 / 30 », « Série 3 / 5 », « 760 pts »). */
export function Pastille({ label, bg = '#FFFFFF', icon, a11y, color = INK }: { label: string; bg?: string; icon?: ReactNode; a11y?: string; color?: string }) {
  return (
    <Bubble bg={bg} radius={15} border={3} inset={5} style={{ height: 30, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View accessible accessibilityLabel={a11y ?? label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        {icon}
        <T size={14} weight={700} color={color}>{label}</T>
      </View>
    </Bubble>
  );
}

/** Crayon ✎ et coche ✓ des pastilles d'en-tête. */
export function MiniIcone({ name }: { name: 'crayon' | 'coche' | 'chrono' }) {
  return (
    <View>
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        {name === 'crayon' && <Path d="M4 20l4-1 11-11-3-3L5 16z M14 7l3 3" stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />}
        {name === 'coche' && <Path d="M5 12l5 5 9-10" stroke={INK} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />}
        {name === 'chrono' && <><Circle cx={12} cy={14} r={8} stroke={INK} strokeWidth={2.6} /><Path d="M12 14 V10 M9.5 3 H14.5 M12 3 V6" stroke={INK} strokeWidth={2.6} strokeLinecap="round" /></>}
      </Svg>
    </View>
  );
}

/** En-tête des niveaux : ✕ blanc à plat, « Niveau N » et nom du type, pastille à droite. */
export function EnTete({ n, titre, right, onClose }: { n: number; titre: string; right?: ReactNode; onClose: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quitter le niveau" onPress={onClose} hitSlop={4}
        style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <T size={20} weight={700} color={INK}>✕</T>
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T size={12} weight={700} color="#FFFFFF" style={[{ opacity: 0.9 }, shadow()]}>Niveau {n}</T>
        <T size={18} weight={700} color="#FFFFFF" numberOfLines={1} style={[{ lineHeight: 19 }, shadow()]}>{titre}</T>
      </View>
      {right}
    </View>
  );
}

/** Pastilles d'erreurs (✕ rose = erreur faite, · blanc = encore permise). */
export function Erreurs({ faites, max }: { faites: number; max: number }) {
  return (
    <View accessible accessibilityLabel={`${faites} erreur${faites > 1 ? 's' : ''} sur ${max}`} style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
      {Array.from({ length: max }, (_, i) => <Pastille key={i} label={i < faites ? '✕' : '·'} bg={i < faites ? '#FF5A8A' : '#FFFFFF'} />)}
    </View>
  );
}

/** Champ et bouton au-dessus du clavier, à plat. */
export function Saisie({ value, onChange, onSubmit, placeholder, inputRef }: {
  value: string; onChange: (s: string) => void; onSubmit: () => void; placeholder: string; inputRef: React.RefObject<TextInputInstance | null>;
}) {
  const envoyer = () => { onSubmit(); inputRef.current?.focus(); };
  return (
    <View style={{ marginTop: 'auto', flexDirection: 'row', gap: 8 }}>
      <TextInput
        // sur le web, react-native-web retire le focus après « Entrée » sauf avec blurOnSubmit={false}
        {...(Platform.OS === 'web' ? ({ blurOnSubmit: false } as object) : null)}
        ref={inputRef} value={value} onChangeText={onChange} onSubmitEditing={envoyer} placeholder={placeholder} placeholderTextColor="#7C7399"
        autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="send" submitBehavior="submit" accessibilityLabel="Ton mot"
        style={{
          flex: 1, minWidth: 0, height: 50, borderRadius: 16, backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 0,
          includeFontPadding: false, textAlignVertical: 'center', fontFamily: 'Fredoka_500Medium', fontSize: 17, color: INK, outlineStyle: 'none',
        } as object}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Proposer" onPress={envoyer}
        style={{ height: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#FFD45C', alignItems: 'center', justifyContent: 'center' }}>
        <T size={17} weight={700} color={INK}>Proposer</T>
      </Pressable>
    </View>
  );
}

/* ---------- Mot secret : dernier essai, jauge, liste ---------- */
const fr1 = (t: number) => t.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const gaugePos = (t: number) => Math.max(0, Math.min(1, (t + 30) / 130));
const barColor = (t: number) => (t >= 100 ? '#FFB020' : t >= 60 ? '#FF5A36' : t >= 40 ? '#FF9A3C' : t >= 20 ? '#5FC3EE' : t >= 0 ? '#9DBDF0' : '#5B8DEF');

export function DernierEssai({ word, t }: { word: string | null; t: number | null }) {
  const mood: Mood = t === null ? 'tiede' : moodOf(t);
  return (
    <View accessible accessibilityLabel={word && t !== null ? `${word}, ${fr1(t)} degrés, ${moodLabel[mood]}` : 'Propose un premier mot'}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <Mascot mood={mood} size={80} />
      <View style={{ alignItems: 'flex-start', gap: 6 }}>
        <T size={28} weight={700} color="#FFFFFF" numberOfLines={1} style={[{ lineHeight: 31 }, shadow(3)]}>{word ?? 'À toi !'}</T>
        {t !== null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ paddingVertical: 2, paddingHorizontal: 10, borderRadius: 13, borderWidth: 3, borderColor: 'transparent', backgroundColor: tempColor(t) }}>
              <T size={20} weight={700} color={INK}>{fr1(t)} °C</T>
            </View>
            <T size={20} weight={700} color="#FFFFFF" style={shadow(3)}>{moodLabel[mood]}</T>
          </View>
        )}
      </View>
    </View>
  );
}

/** Jauge froid → chaud de la maquette : dégradé coupé à la température, aiguille blanche. */
export function Jauge({ t }: { t: number | null }) {
  const [w, setW] = useState(0);
  const pos = t === null ? 0 : gaugePos(t);
  return (
    <View style={{ height: 34, borderRadius: 17, backgroundColor: 'rgba(30,18,90,0.38)', paddingVertical: 8, paddingHorizontal: 14 }}
      onLayout={e => setW(e.nativeEvent.layout.width - 28)}>
      <View style={{ flex: 1, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
        <View style={{ width: `${pos * 100}%`, height: '100%', overflow: 'hidden', borderRadius: 9 }}>
          <LinearGradient colors={['#5B8DEF', '#9AD8F5', '#FFC23D', '#FF5A36']} locations={[0, 0.35, 0.68, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: w || 1, height: '100%' }} />
        </View>
      </View>
      {t !== null && <View style={{ position: 'absolute', left: 14 + w * pos - 5, top: 4, bottom: 4, width: 10, borderRadius: 5, borderWidth: 3, borderColor: 'transparent', backgroundColor: '#FFFFFF' }} />}
    </View>
  );
}

export type Ligne = { word: string; t: number; rank: number | null };
/** « Les plus chauds » : 4 lignes visibles, on glisse pour voir les autres. */
export function PlusChauds({ lignes, dernier }: { lignes: Ligne[]; dernier: string | null }) {
  return (
    <View style={{ backgroundColor: 'rgba(30,18,90,0.38)', borderRadius: 22, padding: 8, gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 }}>
        <T size={14} weight={600} color="#FFFFFF">Les plus chauds</T>
        <T size={14} weight={600} color="#FFFFFF" style={{ opacity: 0.85 }}>glisse ↓</T>
      </View>
      <ScrollView style={{ height: 202, borderRadius: 14 }} contentContainerStyle={{ gap: 6 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {lignes.map(l => {
          const top = l.rank !== null && l.rank <= 10;
          const last = l.word === dernier;
          return (
            <View key={l.word} accessible accessibilityLabel={`${l.word}, ${fr1(l.t)} degrés${l.rank ? `, rang ${l.rank}` : ''}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 14, borderWidth: 3, paddingLeft: 6, paddingRight: 10,
                backgroundColor: top ? '#FFE3E0' : '#F4F1FF', borderColor: top ? '#FF3B30' : last ? '#FFD45C' : 'transparent' }}>
              <View style={{ minWidth: 36, paddingVertical: 2, paddingHorizontal: 5, borderRadius: 9, borderWidth: 2, borderColor: 'transparent', backgroundColor: top ? '#FF3B30' : l.rank === null ? '#E2DEEE' : '#FFFFFF', alignItems: 'center' }}>
                <T size={12} weight={700} color={top ? '#FFFFFF' : INK}>{l.rank ?? '—'}</T>
              </View>
              <Mascot mood={moodOf(l.t)} size={38} animate={false} />
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <T size={16} weight={600} color={INK} numberOfLines={1} style={{ lineHeight: 18 }}>{l.word}</T>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: '#E2DEEE', overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${Math.max(4, gaugePos(l.t) * 100)}%`, backgroundColor: barColor(l.t) }} />
                </View>
              </View>
              <T size={15} weight={700} color={INK} style={{ width: 46, textAlign: 'right' }}>{fr1(l.t)}°</T>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Pastille de degrés des listes « seuil » (paliers de la maquette ramenés à l’échelle frWac). */
export const couleurDegres = (t: number) => (t >= 44 ? '#FF5A36' : t >= 15 ? '#FF9A3C' : t >= 8 ? '#FFB35C' : t >= 0 ? '#7CCDEF' : '#A9C6F2');

/** Carte blanche en relief qu'on touche (Plus chaud ?, L'intrus). `etat` colore la réponse. */
export function Choix({ label, onPress, etat, radius = 22, border = 4, inset = 8, size = 30, style, center = true, sub }: {
  label: string; onPress: () => void; etat?: 'bon' | 'faux' | null; radius?: number; border?: number; inset?: number; size?: number;
  style?: StyleProp<ViewStyle>; center?: boolean; sub?: string;
}) {
  const bg = etat === 'bon' ? '#9BF77A' : etat === 'faux' ? '#FFB3C7' : '#FFFFFF';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { if (Platform.OS !== 'web') Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => [{ flex: 1, transform: [{ translateY: pressed ? 2 : 0 }] }, style]}>
      <Bubble bg={bg} radius={radius} border={border} inset={inset} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: center ? 'center' : 'flex-start', paddingHorizontal: 16, gap: 10 }}>
        <T size={size} weight={700} color={INK} numberOfLines={1} adjustsFontSizeToFit>{label}</T>
        {sub ? <T size={18} weight={700} color={INK} style={{ opacity: 0.7 }}>{sub}</T> : null}
      </Bubble>
    </Pressable>
  );
}

/* ---------- 3 · Gagné / 4 · Perdu ---------- */
const CONFETTIS: [string, number, number, number, string, number][] = [
  ['8%', 20, 8, 14, '#FFD45C', 20], ['22%', 60, 6, 10, '#FF86C8', -30], ['80%', 26, 8, 14, '#7CE0B5', 40], ['90%', 90, 6, 12, '#9DD8FF', -10],
  ['14%', 120, 7, 12, '#FF5A36', 60], ['70%', 140, 6, 10, '#FFFFFF', 15], ['40%', 14, 6, 10, '#FFFFFF', -40], ['60%', 70, 7, 12, '#FFD45C', 70],
];
export type LigneFin = { label: string; value: string };

/** Bouton jaune du bas des écrans de fin (contour 4 px, reflet blanc en haut). */
function FinButton({ label, onPress }: { label: string; onPress: () => void }) {
  // « Carte » est le bouton secondaire : blanc en relief ; l'action principale reste jaune
  const white = label === 'Carte';
  const look = white
    ? { bg: '#FFFFFF', border: '#D9D1F2', diag: '#F6F3FD', relief: '#E4DEF5' }
    : { bg: '#FFD45C', border: mix('#FFD45C', 55, '#FFFFFF'), diag: '#F7C843', relief: '#E3A91C' };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { if (Platform.OS !== 'web') Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => ({ flex: 1, height: 62, transform: [{ translateY: pressed ? 2 : 0 }] })}>
      <View style={{ flex: 1, borderRadius: 16, borderWidth: 4, borderColor: look.border, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
        <Diagonal bg={look.bg} diag={look.diag} />
        <Relief inset={6} color={look.relief} radius={12} />
        {!white && <View style={{ position: 'absolute', left: 8, right: 8, top: 3, height: 10, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.4)' }} />}
        <T size={16} weight={700} color="#2B2150" align="center" numberOfLines={2}>{label}</T>
      </View>
    </Pressable>
  );
}

export function Fin({ gagne, monde, titre, sousTitre, mot, voisins, lignes, boutons }: {
  gagne: boolean; monde: Monde; titre: string; sousTitre: string; mot: string; voisins: string[]; lignes: LigneFin[];
  boutons: [string, () => void][];
}) {
  const cadre = useCadre();
  return (
    <View style={fill}>
      <LevelBg monde={monde} decor />
      {gagne && <Confetti count={18} />}
      <View style={[{ flex: 1, gap: 10 }, cadre]}>
        <View style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {gagne ? CONFETTIS.map(([left, top, w, h, c, r], i) => (
            <View key={i} pointerEvents="none" style={{ position: 'absolute', left: left as `${number}%`, top, width: w, height: h, borderRadius: 2, backgroundColor: c, transform: [{ rotate: `${r}deg` }] }} />
          )) : null}
          {gagne ? <><Sparkle left="84%" top={20} size={18} opacity={0.95} /><Sparkle left="10%" top={40} size={12} opacity={0.8} /></> : <Sparkle left="86%" top={24} size={12} opacity={0.5} />}
          <View style={{ paddingTop: 40, paddingHorizontal: 4, paddingBottom: 10, alignItems: 'center', gap: 4 }}>
            <Mascot mood={gagne ? 'trouve' : monde.froid} size={160} />
            <View accessible accessibilityRole="header" accessibilityLabel={`${titre}. ${sousTitre}`} style={{ alignItems: 'center', gap: 4 }}>
              <Outlined size={gagne ? 38 : 34} lh={Math.round((gagne ? 38 : 34) * 1.05)}>{titre}</Outlined>
              <Outlined size={18} weight={600}>{sousTitre}</Outlined>
            </View>
          </View>
          <View style={{ flex: 1, minHeight: 0, paddingVertical: 14, paddingHorizontal: 4, justifyContent: 'center', gap: 14 }}>
            <Outlined size={17} w={1.5} dy={2}>{gagne ? 'Mot trouvé · ses voisins' : 'Le mot était'}</Outlined>
            <View style={{ alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 16, borderRadius: 16, borderWidth: 4, borderColor: 'transparent', backgroundColor: '#FFFFFF' }}>
              <T size={46} weight={700} color={INK} numberOfLines={1} adjustsFontSizeToFit style={{ lineHeight: 51 }}>{mot}</T>
            </View>
            <View accessible accessibilityLabel={`Voisins : ${voisins.join(', ')}`} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              {voisins.map((v, i) => (
                <Bubble key={v} bg={COULEURS_VOISINS[i % COULEURS_VOISINS.length]} radius={13} border={3} inset={4} style={{ paddingVertical: 6, paddingHorizontal: 13 }}>
                  <T size={18} weight={700} color={INK}>{v}</T>
                </Bubble>
              ))}
            </View>
            <View style={{ marginTop: 22, gap: 10 }}>
              {lignes.map(l => (
                <View key={l.label} accessible accessibilityLabel={`${l.label} : ${l.value}`}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 15, borderWidth: 3, borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(255,255,255,0.92)', boxShadow: 'inset 0 -5px 0 rgba(20,10,60,0.18)' }}>
                  <T size={17} weight={600} color={INK}>{l.label}</T>
                  <T size={17} weight={700} color={INK}>{l.value}</T>
                </View>
              ))}
            </View>
          </View>
          <View style={{ paddingHorizontal: 4, paddingBottom: 6, flexDirection: 'row', gap: 10 }}>
            {boutons.map(([label, onPress]) => <FinButton key={label} label={label} onPress={onPress} />)}
          </View>
        </View>
      </View>
    </View>
  );
}

export { bubble, mondeDe };
