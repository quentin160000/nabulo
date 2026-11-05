import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Animated, Easing, KeyboardAvoidingView, Pressable, ScrollView, TextInput, View, useWindowDimensions,
  type StyleProp, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { Player } from '@/game/multi';
import { gameInk, mix, warmGradient, warmStops } from '@/theme/colors';
import { Bubble } from './Bubble';
import { Confetti } from './Confetti';
import { Diagonal, Relief } from './Diagonal';
import { SlidingGradient } from './backgrounds';
import { images } from './bits';
import { T } from './Text';
import { Toast, useToast } from './Toast';
import { keepFocus } from './game';
import { KAV_BEHAVIOR, useMargeBasse } from './retours-jeux-clavier';
import { animationsReduites } from '@/game/reglages';

/* Briques des écrans multi (maquettes J-multi-18 à 20). Encre des maquettes : hsl(256, 45 %, 16 %) = gameInk. */
export const INK = gameInk;
const fill = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const;

export function useReduceMotion() {
  const [r, setR] = useState(false);
  useEffect(() => { animationsReduites().then(setR); }, []);
  return r;
}

/** Retour : écran précédent, ou l'accueil si on est arrivé directement. */
export function leave() { if (router.canGoBack()) router.back(); else router.replace('/'); }

/* ---------- Fonds ---------- */

/** Halos colorés flous du fond multi (positions de la maquette, écran de 390 × 844). */
const BOKEH: [number, number, number, string, number][] = [
  [-80, 40, 260, '#FFD45C', 0.55], [230, -40, 230, '#FF86C8', 0.45], [250, 330, 280, '#5B8DEF', 0.5],
  [-60, 520, 240, '#7CE0B5', 0.5], [150, 640, 220, '#FF7A3C', 0.42],
];

/** Fond sarcelle des modes multi + bokeh. */
export function MultiBg() {
  return (
    <View pointerEvents="none" style={fill}>
      <LinearGradient colors={['#0E5C6E', '#138A8A', '#2FB59A']} locations={[0, 0.52, 1]} style={fill} />
      <Svg width="100%" height="100%" style={fill}>
        <Defs>
          {BOKEH.map(([, , , c, o], i) => (
            <RadialGradient key={i} id={`bk${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={c} stopOpacity={o} />
              <Stop offset="0.7" stopColor={c} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {BOKEH.map(([x, y, s], i) => <Circle key={i} cx={x + s / 2} cy={y + s / 2} r={s / 2} fill={`url(#bk${i})`} />)}
      </Svg>
    </View>
  );
}

const coldGradient = ['#3B3F8C', '#4A5AA8', '#5E7BBE', '#8FA6D6', '#4A5AA8', '#3B3F8C'] as const;
const coldStops = [0, 0.3, 0.52, 0.62, 0.8, 1] as const;

/** Victoire : fond chaud qui glisse + confettis. */
export function WarmBg({ confetti = true }: { confetti?: boolean }) {
  return <><SlidingGradient colors={warmGradient} stops={warmStops} duration={10000} />{confetti && <Confetti />}</>;
}

/** Défaite : fond froid qui glisse + pluie. */
export function ColdBg() {
  return <><SlidingGradient colors={coldGradient} stops={coldStops} duration={10000} /><Rain /></>;
}

const rnd = (i: number, k: number) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };

/** Pluie de la maquette (.ff-rain) : traits de 3 px qui tombent en biais. */
export function Rain({ count = 48 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const drops = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: (i / count) * (width + 120) + rnd(i, 1) * 10, h: [16, 20, 24, 28, 32][Math.floor(rnd(i, 2) * 5)],
    dur: 1500 + rnd(i, 3) * 800, start: rnd(i, 4), v: new Animated.Value(rnd(i, 4)),
  })), [count, width]);
  useEffect(() => {
    if (reduce) return;
    const loops = drops.map(d => {
      const seq = Animated.sequence([
        Animated.timing(d.v, { toValue: 1, duration: d.dur * (1 - d.start), easing: Easing.linear, useNativeDriver: true }),
        Animated.loop(Animated.sequence([
          Animated.timing(d.v, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(d.v, { toValue: 1, duration: d.dur, easing: Easing.linear, useNativeDriver: true }),
        ])),
      ]);
      seq.start();
      return seq;
    });
    return () => loops.forEach(l => l.stop());
  }, [drops, reduce]);
  if (reduce) return null;
  return (
    <View pointerEvents="none" style={[fill, { overflow: 'hidden' }]}>
      {drops.map((d, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: d.x, top: -40, width: 3, height: d.h, borderRadius: 2, backgroundColor: '#CFE0FF',
          transform: [
            { translateX: d.v.interpolate({ inputRange: [0, 1], outputRange: [0, -120] }) },
            { translateY: d.v.interpolate({ inputRange: [0, 1], outputRange: [0, height + 60] }) },
            { rotate: '8deg' },
          ],
        }} />
      ))}
    </View>
  );
}

/* ---------- Mise en page ---------- */

type Bg = 'multi' | 'warm' | 'cold' | 'warm-calm';
/** Écran multi : fond, marges de la maquette (16 px sur les côtés, 10 px entre les blocs). */
export function MScreen({ children, bg = 'multi', keyboard, gap = 10 }: { children: ReactNode; bg?: Bg; keyboard?: boolean; gap?: number }) {
  const inset = useSafeAreaInsets();
  // avec une barre de saisie : 12 px d'air au-dessus du clavier quand il est ouvert
  const bas = useMargeBasse(10 + inset.bottom);
  const body = <View style={{ flex: 1, paddingTop: inset.top + 14, paddingBottom: keyboard ? bas : 24 + inset.bottom, paddingHorizontal: 16, gap }}>{children}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: '#138A8A' }}>
      {bg === 'multi' ? <MultiBg /> : bg === 'cold' ? <ColdBg /> : <WarmBg confetti={bg === 'warm'} />}
      {keyboard ? <KeyboardAvoidingView style={{ flex: 1 }} behavior={KAV_BEHAVIOR}>{body}</KeyboardAvoidingView> : body}
    </View>
  );
}

export const Grow = ({ max }: { max?: number }) => <View style={{ flexGrow: 1, maxHeight: max }} />;

/** En-tête : croix blanche 40 px, titre 18 px, pastille à droite. */
export function MHeader({ title, right, onClose = leave }: { title: string; right?: ReactNode; onClose?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quitter" onPress={onClose} hitSlop={4}
        style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <T size={20} weight={700} color={INK}>✕</T>
      </Pressable>
      <T size={18} weight={700} outline numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>{title}</T>
      {right}
    </View>
  );
}

/** Pastille bulle de l'en-tête (« Code », points, chrono). */
export function HeadChip({ label, bg = '#FFD45C' }: { label: string; bg?: string }) {
  return (
    <Bubble bg={bg} radius={15} border={2} inset={5} style={{ height: 30, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }}>
      <T size={14} weight={700} color={INK} numberOfLines={1} adjustsFontSizeToFit>{label}</T>
    </Bubble>
  );
}

export function BigTitle({ title, sub, size = 30 }: { title: string; sub?: string; size?: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <T size={size} weight={700} outline align="center" style={{ lineHeight: Math.round(size * 1.1) }}>{title}</T>
      {sub ? <T size={15} weight={600} outline align="center">{sub}</T> : null}
    </View>
  );
}

export function MAvatar({ p, size = 38, font }: { p: Pick<Player, 'letter' | 'color'>; size?: number; font?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: p.color, alignItems: 'center', justifyContent: 'center' }}>
      <T size={font ?? Math.round(size * 0.45)} weight={700} color={INK}>{p.letter}</T>
    </View>
  );
}

/** Étiquette à plat (Prêt, IA, mot-indice, température). */
export function Tag({ label, bg, size = 13, color = INK }: { label: string; bg: string; size?: number; color?: string }) {
  return (
    <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 13, borderWidth: 2, borderColor: 'transparent', backgroundColor: bg }}>
      <T size={size} weight={700} color={color} numberOfLines={1}>{label}</T>
    </View>
  );
}

/** Ligne blanche d'un joueur : avatar, nom, élément à droite. */
export function PRow({ p, right, bg = '#FFFFFF', minHeight = 54, avatar = 38, avatarFont, nameSize = 17, lead, label, sub, style, onPress, selected }: {
  p: Player; right?: ReactNode; sub?: string; bg?: string; minHeight?: number; avatar?: number; avatarFont?: number; nameSize?: number; lead?: ReactNode; label?: string;
  style?: StyleProp<ViewStyle>; onPress?: () => void; selected?: boolean;
}) {
  const content = (
    <>
      {lead}
      <MAvatar p={p} size={avatar} font={avatarFont} />
      <T size={nameSize} weight={700} color={INK} numberOfLines={1} style={{ flexShrink: 1 }}>{label ?? p.name}</T>
      {sub ? <T size={14} weight={600} color={INK} numberOfLines={1} style={{ opacity: 0.55, flexShrink: 1 }}>{sub}</T> : null}
      <View style={{ marginLeft: 'auto' }}>{right}</View>
    </>
  );
  const s = [{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18, backgroundColor: bg } as const, style];
  if (!onPress) return <View style={s}>{content}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Voter pour ${p.name}`} accessibilityState={{ selected: !!selected }} onPress={onPress} style={s}>{content}</Pressable>;
}

/** Bouton bulle de la maquette : contour 2 px, coupe en biais, relief de 7 px. */
export function MButton({ label, onPress, variant = 'yellow', height = 56, fontSize = 20, radius = 18, relief = 7, disabled, style }: {
  label: string; onPress?: () => void; variant?: 'yellow' | 'white' | 'yellow-mix'; height?: number; fontSize?: number; radius?: number; relief?: number;
  disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const look = variant === 'white'
    ? { bg: '#FFFFFF', border: '#D9D1F2', diag: mix('#FFFFFF', 95, '#3A2A7A'), relief: mix('#FFFFFF', 84, '#3A2A7A') }
    : { bg: '#FFD45C', border: variant === 'yellow-mix' ? mix('#FFD45C', 55, '#FFFFFF') : '#FFE38F', diag: '#F7C843', relief: '#E3A91C' };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [{ flex: 1, height, opacity: disabled ? 0.55 : 1, transform: [{ translateY: pressed ? 2 : 0 }] }, style]}>
      <View style={{ flex: 1, borderRadius: radius, borderWidth: 2, borderColor: look.border, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
        <Diagonal bg={look.bg} diag={look.diag} />
        <Relief inset={relief} color={look.relief} radius={radius - 2} />
        <T size={fontSize} weight={700} color={INK} numberOfLines={1}>{label}</T>
      </View>
    </Pressable>
  );
}

export const Buttons = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>;

/** Points de progression des manches : passées et en cours en jaune, la manche en cours plus longue. */
export function Dots({ total, current }: { total: number; current: number }) {
  return (
    <View accessibilityLabel={`Manche ${current + 1} sur ${total}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ width: i === current ? 22 : 10, height: 10, borderRadius: 5, backgroundColor: i <= current ? '#FFD45C' : 'rgba(255,255,255,0.3)' }} />
      ))}
    </View>
  );
}

/** Champ + bouton au-dessus du clavier, à plat. */
export function InputBar({ value, onChange, onSubmit, placeholder, action, disabled }: {
  value: string; onChange: (s: string) => void; onSubmit: () => void; placeholder: string; action: string; disabled?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, opacity: disabled ? 0.6 : 1 }}>
      <TextInput
        value={value} onChangeText={onChange} onSubmitEditing={onSubmit} placeholder={placeholder} placeholderTextColor="#7C7399" editable={!disabled}
        autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="send" submitBehavior="submit" {...keepFocus} accessibilityLabel={placeholder}
        style={{
          flex: 1, minWidth: 0, height: 50, borderRadius: 16, backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 0,
          includeFontPadding: false, textAlignVertical: 'center', fontFamily: 'Fredoka_500Medium', fontSize: 17, color: INK, outlineStyle: 'none',
        } as object}
      />
      <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onSubmit} disabled={disabled || !value.trim()}
        style={{ height: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#FFD45C', alignItems: 'center', justifyContent: 'center' }}>
        <T size={17} weight={700} color={INK}>{action}</T>
      </Pressable>
    </View>
  );
}

/** Ligne de classement final (rang, avatar, nom, valeur à droite), la mienne en jaune pâle. */
export function RankRow({ rank, p, right }: { rank: number; p: Player; right: string }) {
  return (
    <PRow p={p} bg={p.me ? '#FFF3B0' : '#FFFFFF'} minHeight={52} avatar={36} avatarFont={16}
      lead={<T size={17} weight={700} color={INK} style={{ width: 26 }}>{rank}</T>}
      right={<T size={17} weight={700} color={INK}>{right}</T>} />
  );
}

/** Mot en bulle colorée (voisins du mot, maillons de la chaîne). */
export function WordBubble({ label, bg }: { label: string; bg: string }) {
  return (
    <Bubble bg={bg} radius={13} border={2} inset={4} style={{ paddingVertical: 6, paddingHorizontal: 13 }}>
      <T size={18} weight={700} color={INK}>{label}</T>
    </Bubble>
  );
}
export const HEAT_ORDER = ['#FF5A36', '#FF7240', '#FF9A3C', '#FFB35C', '#FFD45C'];

/** Ligne de bilan claire (« Ton meilleur essai · feu · 48° »). */
export function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(255,255,255,0.92)', boxShadow: 'inset 0 -5px 0 rgba(20,10,60,0.18)' }}>
      <T size={17} weight={600} color={INK} numberOfLines={1}>{label}</T>
      <T size={17} weight={700} color={INK} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1 }}>{value}</T>
    </View>
  );
}

/* ---------- Héros des écrans de fin ---------- */

const SH_BIG = { textShadowColor: INK, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 } as const;

/** Nabulo qui saute de joie (boîte de 130 px, image de 208 px qui déborde), titre et sous-titre. */
export function JoyHero({ title, sub, sad }: { title: string; sub: string; sad?: boolean }) {
  const reduce = useReduceMotion();
  const [pop] = useState(() => new Animated.Value(reduce ? 1 : 0));
  useEffect(() => { Animated.timing(pop, { toValue: 1, duration: 600, delay: 100, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start(); }, [pop]);
  return (
    <View style={{ alignItems: 'center', gap: 4, marginTop: 10 }}>
      <Animated.View style={{ width: 130, height: 130, marginTop: 42, marginBottom: 8, transform: [{ translateY: 65 }, { scale: pop }, { translateY: -65 }] }}>
        {sad
          ? <Image source={images.nabuloTriste} autoplay style={{ position: 'absolute', left: -39, top: -50, width: 208, height: 208 }} contentFit="contain" accessibilityLabel="Nabulo triste sous la pluie" />
          : <Image source={images.nabuloSaut} autoplay style={{ position: 'absolute', left: -39, top: -73, width: 208, height: 208 }} contentFit="contain" accessibilityLabel="Nabulo saute de joie, le poing en l’air" />}
      </Animated.View>
      <BigTitle title={title} sub={sub} />
    </View>
  );
}

/** Nabulo triste sous la pluie (160 px, image de 232 px), grand titre 34 px. */
export function SadHero({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 4, paddingTop: 40, paddingHorizontal: 4, paddingBottom: 10 }}>
      <View style={{ width: 160, height: 160, marginBottom: 38 }}>
        <Image source={images.nabuloTriste} autoplay style={{ position: 'absolute', left: -36, top: -36, width: 232, height: 232 }} contentFit="contain" accessibilityLabel="Nabulo triste sous la pluie" />
      </View>
      <T size={34} weight={700} color="#FFFFFF" align="center" style={[{ lineHeight: 36 }, SH_BIG]}>{title}</T>
      <T size={18} weight={600} color="#FFFFFF" align="center" style={SH_BIG}>{sub}</T>
    </View>
  );
}

/** Nabulo 160 px (neutre, qui saute ou triste) + grand titre 34 px (fin du relais). */
export function CalmHero({ title, sub, mood = 'calm' }: { title: string; sub: string; mood?: 'calm' | 'joy' | 'sad' }) {
  const img = mood === 'joy' ? images.nabuloSaut : mood === 'sad' ? images.nabuloTriste : images.nabulo;
  const label = mood === 'joy' ? 'Nabulo saute de joie, le poing en l’air' : mood === 'sad' ? 'Nabulo triste sous la pluie' : 'Nabulo';
  return (
    <View style={{ alignItems: 'center', gap: 4, paddingTop: 40, paddingHorizontal: 4, paddingBottom: 10 }}>
      <View style={{ width: 160, height: 160 }}>
        {mood === 'calm'
          ? <Image source={img} style={{ width: 160, height: 160 }} contentFit="contain" accessibilityLabel={label} />
          : <Image source={img} autoplay style={{ position: 'absolute', left: -36, top: -36, width: 232, height: 232 }} contentFit="contain" accessibilityLabel={label} />}
      </View>
      <T size={34} weight={700} color="#FFFFFF" align="center" style={[{ lineHeight: 36 }, SH_BIG]}>{title}</T>
      <T size={18} weight={600} color="#FFFFFF" align="center" style={SH_BIG}>{sub}</T>
    </View>
  );
}

/** « Le mot était » + mot en grand + voisins en bulles. */
export function WordReveal({ caption, word, chips }: { caption: string; word: string; chips: string[] }) {
  return (
    <View style={{ gap: 14 }}>
      <T size={17} weight={700} color="#FFFFFF" align="center" style={{ textShadowColor: INK, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 }}>{caption}</T>
      <View style={{ alignSelf: 'center', maxWidth: '100%', paddingVertical: 4, paddingHorizontal: 16, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#FFFFFF' }}>
        <T size={46} weight={700} color={INK} numberOfLines={1} adjustsFontSizeToFit style={{ lineHeight: 51 }}>{word}</T>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
        {chips.map((c, i) => <WordBubble key={c} label={c} bg={HEAT_ORDER[i % HEAT_ORDER.length]} />)}
      </View>
    </View>
  );
}

/* ---------- Salon et règles communs ---------- */

type Slot = { p: Player; ready: boolean };
/** Remplit le salon d'IA une par une (« En attente » puis « IA »). */
export function useLobbyFill(players: Player[]) {
  const [slots, setSlots] = useState<Slot[]>(() => [{ p: players[0], ready: true }]);
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    players.slice(1).forEach((p, i) => {
      const t = 500 + i * 650;
      timers.push(setTimeout(() => setSlots(s => [...s, { p, ready: false }]), t));
      timers.push(setTimeout(() => setSlots(s => s.map(x => (x.p.id === p.id ? { ...x, ready: true } : x))), t + 700));
    });
    return () => timers.forEach(clearTimeout);
  }, [players]);
  return slots;
}

export function Lobby({ title, players, min, max, secondary, onSecondary, onLaunch }: {
  title: string; players: Player[]; min: number; max: number; secondary: string; onSecondary?: () => void; onLaunch: () => void;
}) {
  const slots = useLobbyFill(players);
  const toast = useToast();
  const all = slots.length === players.length && slots.every(s => s.ready);
  const free = players.length - slots.length;
  return (
    <MScreen>
      <MHeader title={title} right={<HeadChip label="Entraînement" />} />
      <BigTitle title={`${slots.length} joueur${slots.length > 1 ? 's' : ''}`} sub={`minimum ${min} · maximum ${max} · partie d’entraînement avec des IA`} />
      <ScrollView style={{ flex: 1, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 7 }} showsVerticalScrollIndicator={false}>
        {slots.map(({ p, ready }) => (
          <PRow key={p.id} p={p} right={<Tag label={p.me ? 'Prêt' : ready ? 'IA' : 'En attente'} bg={p.me ? '#7CE0B5' : ready ? '#C9C2DD' : '#FFD45C'} />} />
        ))}
        {Array.from({ length: free }, (_, i) => (
          <View key={i} style={{ height: 54, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}>
            <T size={15} weight={700} color="#FFFFFF">place libre</T>
          </View>
        ))}
      </ScrollView>
      <Buttons>
        <MButton label={secondary} variant="white" fontSize={18} onPress={onSecondary ?? (() => toast.show('Bientôt disponible'))} />
        <MButton label="Lancer" disabled={!all} onPress={onLaunch} />
      </Buttons>
      <Toast msg={toast.msg} check={false} style={{ bottom: 90 }} />
    </MScreen>
  );
}

export function Rules({ title, sub, steps, onPlay }: { title: string; sub: string; steps: string[]; onPlay: () => void }) {
  return (
    <MScreen>
      <MHeader title="Règles" />
      <ScrollView style={{ flex: 1, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', gap: 6, marginTop: 6 }}>
          <BigTitle title={title} sub={sub} />
        </View>
        <Image source={images.nabulo} style={{ alignSelf: 'center', width: 110, height: 110 }} contentFit="contain" accessibilityLabel="Nabulo" />
        <View style={{ gap: 8 }}>
          {steps.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18, backgroundColor: '#FFFFFF' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFD45C', alignItems: 'center', justifyContent: 'center' }}>
                <T size={14} weight={700} color={INK}>{i + 1}</T>
              </View>
              <T size={16} weight={600} color={INK} style={{ flex: 1, lineHeight: 20 }}>{s}</T>
            </View>
          ))}
        </View>
      </ScrollView>
      <Buttons><MButton label="Jouer" height={62} fontSize={22} onPress={onPlay} /></Buttons>
    </MScreen>
  );
}

/** Compte à rebours en secondes (s'arrête à 0, appelle onEnd une fois). */
export function useCountdown(seconds: number, running: boolean, onEnd: () => void, key: string | number) {
  const [st, setSt] = useState({ key, left: seconds });
  let left = st.left;
  if (st.key !== key) { left = seconds; setSt({ key, left }); }
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSt(s => ({ ...s, left: Math.max(0, s.left - 1) })), 1000);
    return () => clearInterval(id);
  }, [running, key]);
  useEffect(() => { if (running && left === 0) onEnd(); }, [left, running]); // eslint-disable-line react-hooks/exhaustive-deps
  return left;
}
export const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
