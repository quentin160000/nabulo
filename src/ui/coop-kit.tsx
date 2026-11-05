/* Briques communes des modes coop (planches J-coop-17 et J-coop-21). */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Pressable, ScrollView, TextInput, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { load, save } from '@/game/storage';
import { bubble, gameInk, ink, mix } from '@/theme/colors';
import { SlidingGradient } from './backgrounds';
import { Bubble } from './Bubble';
import { images } from './bits';
import { T } from './Text';
import { keepFocus } from './game';
import { KAV_BEHAVIOR, useMargeBasse } from './retours-jeux-clavier';
import { animationsReduites } from '@/game/reglages';

export const INK = gameInk;
/** Ombre portée des titres blancs : 0 2px 0 #2B2150. */
export const SH2 = { textShadowColor: ink, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 } as const;
const SH3 = { textShadowColor: INK, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 } as const;
const fill = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const;

/** Taille de police pour qu'un mot tienne sur une ligne de `width` px (Fredoka gras ≈ 0,6 em par lettre). */
export function fitSize(word: string, max: number, width: number): number {
  return Math.max(14, Math.min(max, Math.floor(width / (Math.max(1, word.length) * 0.6))));
}

/** Fond bleu des modes coop : #2E5FB8 → #5B6CE0 → #8E7BF2. */
export function CoopBg() {
  return <LinearGradient colors={['#2E5FB8', '#5B6CE0', '#8E7BF2']} locations={[0, 0.55, 1]} style={fill} />;
}

function useReduceMotion() {
  const [r, setR] = useState(false);
  useEffect(() => { animationsReduites().then(setR); }, []);
  return r;
}

const COLD = ['#3B3F8C', '#4A5AA8', '#5E7BBE', '#8FA6D6', '#4A5AA8', '#3B3F8C'] as const;
const COLD_STOPS = [0, 0.3, 0.52, 0.62, 0.8, 1] as const;
const rnd = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

/** Fond froid qui glisse + pluie (défaite, classes .ff-heat et .ff-rain de la maquette). */
export function RainBg({ count = 48 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const drops = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: (i / count) * (width + 130) + rnd(i, 1) * 10, h: [16, 20, 24, 28, 32][Math.floor(rnd(i, 2) * 5)],
    dur: 1500 + rnd(i, 3) * 800, start: rnd(i, 4), v: new Animated.Value(rnd(i, 4)),
  })), [count, width]);
  useEffect(() => {
    if (reduce) return;
    const anims = drops.map(d => {
      const a = Animated.sequence([
        Animated.timing(d.v, { toValue: 1, duration: d.dur * (1 - d.start), easing: Easing.linear, useNativeDriver: true }),
        Animated.loop(Animated.sequence([
          Animated.timing(d.v, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(d.v, { toValue: 1, duration: d.dur, easing: Easing.linear, useNativeDriver: true }),
        ])),
      ]);
      a.start();
      return a;
    });
    return () => anims.forEach(a => a.stop());
  }, [drops, reduce]);
  return (
    <View pointerEvents="none" style={[fill, { overflow: 'hidden' }]}>
      <SlidingGradient colors={COLD} stops={COLD_STOPS} duration={10000} />
      {drops.map((d, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: d.x, top: -40, width: 3, height: d.h, borderRadius: 2, backgroundColor: '#CFE0FF',
          transform: [
            { translateX: d.v.interpolate({ inputRange: [0, 1], outputRange: [0, -120] }) },
            { translateY: d.v.interpolate({ inputRange: [0, 1], outputRange: [0, height + 56] }) },
            { rotate: '8deg' },
          ],
        }} />
      ))}
    </View>
  );
}

/** Bouton ✕ blanc de l'en-tête (40 px, zone tactile élargie à 48). */
export function CloseButton({ label = 'Quitter', onPress }: { label?: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress ?? (() => router.back())} hitSlop={4}
      style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
      <T size={20} weight={700} color={INK}>✕</T>
    </Pressable>
  );
}

/**
 * Mise en page d'un écran coop : marges de la maquette (16 px), espacement de 10 px.
 * `keyboard` : écran avec barre de saisie, remonté au-dessus du clavier avec 12 px d'air.
 */
export function Screen({ children, bg = <CoopBg />, gap = 10, keyboard }: { children: ReactNode; bg?: ReactNode; gap?: number; keyboard?: boolean }) {
  const inset = useSafeAreaInsets();
  const ferme = Math.max(24, inset.bottom + 10);
  const bas = useMargeBasse(ferme);
  const body = <View style={{ flex: 1, paddingTop: inset.top + 14, paddingBottom: keyboard ? bas : ferme, paddingHorizontal: 16, gap }}>{children}</View>;
  return (
    <View style={{ flex: 1 }}>
      {bg}
      {keyboard ? <KeyboardAvoidingView style={{ flex: 1 }} behavior={KAV_BEHAVIOR}>{body}</KeyboardAvoidingView> : body}
    </View>
  );
}

/** En-tête : ✕, titre, et éventuellement un élément à droite. */
export function TopBar({ title, right, onClose }: { title: string; right?: ReactNode; onClose?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <CloseButton onPress={onClose} />
      <T size={18} weight={700} outline numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>{title}</T>
      {right}
    </View>
  );
}

type Look = 'yellow' | 'yellow-mix' | 'white';
const LOOK: Record<Look, { bg: string; border: string; diag: string; relief: string }> = {
  yellow: { bg: '#FFD45C', border: '#FFE38F', diag: '#F7C843', relief: '#E3A91C' },
  'yellow-mix': { bg: '#FFD45C', border: mix('#FFD45C', 55, '#FFFFFF'), diag: '#F7C843', relief: '#E3A91C' },
  white: { bg: '#FFFFFF', ...bubble('#FFFFFF') },
};

/** Bouton à relief de la maquette (contour 2 px). */
export function CoopButton({ label, onPress, look = 'yellow', height = 62, fontSize = 19, radius = 18, inset = 7, disabled, style }: {
  label: string; onPress?: () => void; look?: Look; height?: number; fontSize?: number; radius?: number; inset?: number; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const l = LOOK[look];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [{ height, flex: 1, opacity: disabled ? 0.5 : 1, transform: [{ translateY: pressed ? 2 : 0 }] }, style]}>
      <Bubble bg={l.bg} colors={l} radius={radius} border={2} inset={inset} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
        <T size={fontSize} weight={700} color={INK} numberOfLines={1}>{label}</T>
      </Bubble>
    </Pressable>
  );
}

export function Avatar({ letter, color = '#7CE0B5', size = 38, font }: { letter: string; color?: string; size?: number; font?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <T size={font ?? Math.round(size * 0.45)} weight={700} color={INK}>{letter}</T>
    </View>
  );
}

/** Écran 1 · Avec qui ? (les options humaines affichent « Bientôt disponible »). */
export function PartnerPicker({ mode, footer, onAI, onSoon }: { mode: string; footer: string | null; onAI: () => void; onSoon: () => void }) {
  return (
    <>
      <TopBar title={mode} />
      <View style={{ alignItems: 'center' }}>
        <T size={30} weight={700} outline style={{ lineHeight: 33 }}>Avec qui ?</T>
        <T size={15} weight={600} outline align="center">{mode}</T>
      </View>
      <T size={16} weight={700} outline align="center">Amis</T>
      <Pressable accessibilityRole="button" accessibilityLabel="Inviter un ami" onPress={onSoon}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18, backgroundColor: '#FFFFFF' }}>
        <Avatar letter="+" color="#9DD8FF" font={17} />
        <T size={17} weight={700} color={INK} style={{ flex: 1 }}>Un ami</T>
        <View style={{ paddingVertical: 3, paddingHorizontal: 12, borderRadius: 13, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#FFD45C' }}>
          <T size={13} weight={700} color={INK}>Inviter</T>
        </View>
      </Pressable>
      <T size={16} weight={700} outline align="center">Ou bien</T>
      <View style={{ flexDirection: 'row' }}><CoopButton label="Joueur au hasard" look="yellow-mix" onPress={onSoon} /></View>
      <View style={{ flexDirection: 'row' }}><CoopButton label="Avec une IA" look="white" onPress={onAI} /></View>
      <View style={{ flexGrow: 1 }} />
      {footer ? <T size={14} weight={600} outline align="center">{footer}</T> : null}
    </>
  );
}

/** Écran 2 · Règles. */
export function RulesScreen({ title, steps, onReady }: { title: string; steps: string[]; onReady: () => void }) {
  return (
    <>
      <TopBar title="Règles" />
      <ScrollView style={{ flex: 1, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', gap: 6, marginTop: 6 }}>
          <View style={{ alignItems: 'center' }}>
            <T size={30} weight={700} outline align="center" style={{ lineHeight: 33 }}>{title}</T>
            <T size={15} weight={600} outline>Coop · à 2</T>
          </View>
        </View>
        <Image source={images.nabulo} style={{ width: 110, height: 110, alignSelf: 'center' }} contentFit="contain" accessibilityLabel="Nabulo" />
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
      <View style={{ flexDirection: 'row' }}><CoopButton label="Prêts" fontSize={22} onPress={onReady} /></View>
    </>
  );
}

/** Champ à plat au-dessus du clavier + bouton jaune à plat (Envoyer, Valider). */
export function WordField({ value, onChange, onSubmit, placeholder, action, disabled, label }: {
  value: string; onChange: (s: string) => void; onSubmit: () => void; placeholder: string; action: string; disabled?: boolean; label: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <TextInput value={value} onChangeText={onChange} onSubmitEditing={onSubmit} placeholder={placeholder} placeholderTextColor="#7C7399"
        autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="send" submitBehavior="submit" {...keepFocus} accessibilityLabel={label} editable={!disabled}
        style={{
          flex: 1, minWidth: 0, height: 50, borderRadius: 16, backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 0,
          includeFontPadding: false, textAlignVertical: 'center', fontFamily: 'Fredoka_500Medium', fontSize: 17, color: INK, outlineStyle: 'none',
        } as object} />
      <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onSubmit} disabled={disabled || !value.trim()}
        style={{ height: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#FFD45C', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.6 : 1 }}>
        <T size={17} weight={700} color={INK}>{action}</T>
      </Pressable>
    </View>
  );
}

/** Chips des voisins, du plus chaud au moins chaud (écran de fin). */
const CHIP = ['#FF5A36', '#FF7240', '#FF9A3C', '#FFB35C', '#FFD45C'];
export function NeighborChips({ words }: { words: string[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
      {words.map((w, i) => (
        <Bubble key={w} bg={CHIP[Math.min(i, CHIP.length - 1)]} radius={13} border={2} inset={4} style={{ paddingVertical: 6, paddingHorizontal: 13 }}>
          <T size={18} weight={700} color={INK}>{w}</T>
        </Bubble>
      ))}
    </View>
  );
}

export function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(255,255,255,0.92)', boxShadow: 'inset 0 -5px 0 rgba(20,10,60,0.18)' }}>
      <T size={17} weight={600} color={INK} numberOfLines={1}>{label}</T>
      <T size={17} weight={700} color={INK} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1 }}>{value}</T>
    </View>
  );
}

/** Écran de fin : Nabulo, titre, sous-titre, mot et voisins, stats, Menu / Rejouer. */
export function EndScreen({ win, title, sub, caption, word, chips, stats, onReplay }: {
  win: boolean; title: string; sub: string; caption: string; word: string; chips: string[]; stats: [string, string][]; onReplay: () => void;
}) {
  return (
    <>
      <View style={{ flex: 1, minHeight: 0 }}>
        <View style={{ paddingTop: 40, paddingHorizontal: 4, paddingBottom: 10, alignItems: 'center', gap: 4 }}>
          {win ? (
            <View style={{ width: 160, height: 160, marginBottom: 10 }}>
              <Image source={images.nabuloSaut} autoplay style={{ position: 'absolute', left: -48, top: -90, width: 256, height: 256 }} contentFit="contain" accessibilityLabel="Nabulo saute de joie, le poing en l’air" />
            </View>
          ) : (
            <View style={{ width: 160, height: 160, marginBottom: 38 }}>
              <Image source={images.nabuloTriste} autoplay style={{ position: 'absolute', left: -36, top: -36, width: 232, height: 232 }} contentFit="contain" accessibilityLabel="Nabulo triste sous la pluie" />
            </View>
          )}
          <T size={win ? 38 : 34} weight={700} color="#FFFFFF" align="center" style={[{ lineHeight: Math.round((win ? 38 : 34) * 1.05) }, SH3]}>{title}</T>
          <T size={18} weight={600} color="#FFFFFF" align="center" style={SH3}>{sub}</T>
        </View>
        <View style={{ flexGrow: 1, paddingVertical: 14, paddingHorizontal: 4, justifyContent: 'center', gap: 14 }}>
          <T size={17} weight={700} color="#FFFFFF" align="center" style={{ textShadowColor: INK, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 }}>{caption}</T>
          <View style={{ alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 16, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#FFFFFF' }}>
            <T size={fitSize(word, 46, 320)} weight={700} color={INK} numberOfLines={1}>{word}</T>
          </View>
          <NeighborChips words={chips} />
          <View style={{ marginTop: 22, gap: 10 }}>
            {stats.map(([l, v]) => <StatRow key={l} label={l} value={v} />)}
          </View>
        </View>
      </View>
      <View style={{ paddingHorizontal: 4, paddingBottom: 6, flexDirection: 'row', gap: 10 }}>
        <CoopButton label="Menu" look="yellow-mix" fontSize={16} radius={16} inset={6} onPress={() => router.back()} />
        <CoopButton label="Rejouer" fontSize={16} radius={16} inset={6} onPress={onReplay} />
      </View>
    </>
  );
}

/** Record stocké sur le téléphone (0 = aucun). */
export function useRecord(key: string) {
  const [record, setRecord] = useState<number | null>(null);
  useEffect(() => { load<number>(key, 0).then(setRecord); }, [key]);
  const submit = useCallback((v: number) => {
    const old = record ?? 0;
    if (v > old) { setRecord(v); save(key, v); }
    return old;
  }, [key, record]);
  return { record: record ?? 0, ready: record !== null, submit };
}

/** Flamme de la série (pastille centrale). */
export function Flame({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2.5c1 3.5 5 5.2 5 10.5a5 5 0 0 1-10 0c0-2.8 1.4-4.4 2.4-5.8.5 1.9 1.5 2.8 2.6 2.8 0-2.8-1-4.8 0-7.5z" fill="#FF7A3C" />
      <Path d="M12 11c.6 1.6 2.4 2.4 2.4 4.6a2.4 2.4 0 0 1-4.8 0c0-1.2.6-2 1.1-2.6.3.8.7 1.2 1.3 1.2 0-1.2-.4-2 0-3.2z" fill="#FFD45C" />
    </Svg>
  );
}

const HEART = 'M12 20.5 C5 15.5 2.5 12 2.5 8.6 C2.5 5.8 4.7 3.6 7.4 3.6 C9.3 3.6 11 4.7 12 6.3 C13 4.7 14.7 3.6 16.6 3.6 C19.3 3.6 21.5 5.8 21.5 8.6 C21.5 12 19 15.5 12 20.5 Z';
export function Heart({ full }: { full: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d={HEART} fill={full ? '#FF5A8A' : 'rgba(255,255,255,0.18)'} stroke={full ? '#FFB3CB' : 'rgba(255,255,255,0.55)'} strokeWidth={2} />
    </Svg>
  );
}
