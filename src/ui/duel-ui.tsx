import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { Niveau } from '@/game/duel';
import { gameInk, warmGradient, warmStops } from '@/theme/colors';
import { Button } from './Button';
import { SlidingGradient } from './backgrounds';
import { Coin, HeaderButton, Icon, images } from './bits';
import { Confetti } from './Confetti';
import { T } from './Text';
import { animationsReduites } from '@/game/reglages';

/* Briques communes des duels (planches J-duel-14 et J-duel-16). */

export const INK = gameInk;
const SHADOW = '#2B2150';
export const ME_COLOR = '#FFD45C';
export const OPP_COLOR = '#7CE0B5';
const fill = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const;

export function useReduceMotion() {
  const [r, setR] = useState(false);
  useEffect(() => { animationsReduites().then(setR); }, []);
  return r;
}

/* ---------- Fonds ---------- */

function Orb({ color, side }: { color: string; side: 'L' | 'R' }) {
  const reduce = useReduceMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduce, v]);
  const k = side === 'L' ? 1 : -1;
  const id = 'orb' + side;
  return (
    <Animated.View style={[
      { position: 'absolute', width: 380, height: 380 },
      side === 'L' ? { left: -90, top: 60 } : { right: -90, bottom: 80 },
      { transform: [
        { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 40 * k] }) },
        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 30 * k] }) },
        { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
      ] },
    ]}>
      <Svg width={380} height={380}>
        <Defs>
          <RadialGradient id={id} cx={190} cy={190} r={268.7} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity={0.9} />
            <Stop offset="0.7" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={190} cy={190} r={190} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** Fond des duels : violet profond et deux halos (orange en haut à gauche, bleu en bas à droite) qui respirent. */
export function DuelBg() {
  return (
    <View pointerEvents="none" style={[fill, { backgroundColor: '#4B33B8', overflow: 'hidden' }]}>
      <Orb color="#FF7A3C" side="L" />
      <Orb color="#6FA2F0" side="R" />
    </View>
  );
}

const coldGradient = ['#3B3F8C', '#4A5AA8', '#5E7BBE', '#8FA6D6', '#4A5AA8', '#3B3F8C'] as const;
const coldStops = [0, 0.3, 0.52, 0.62, 0.8, 1] as const;
const rnd = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

/** Pluie de la défaite (classe .ff-rain) : traits bleu pâle penchés qui tombent en boucle. */
function Rain() {
  const { width, height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const drops = useMemo(() => {
    const n = Math.ceil((width + 130) / 10.7);
    return Array.from({ length: n }, (_, i) => ({
      x: Math.round(i * 10.7 + rnd(i, 1) * 6), h: [16, 20, 24, 28, 32][Math.floor(rnd(i, 2) * 5)],
      dur: 1500 + rnd(i, 3) * 800, phase: rnd(i, 4), v: new Animated.Value(rnd(i, 4)),
    }));
  }, [width]);
  useEffect(() => {
    if (reduce) return;
    const anims = drops.map(d => {
      const seq = Animated.sequence([
        Animated.timing(d.v, { toValue: 1, duration: d.dur * (1 - d.phase), easing: Easing.linear, useNativeDriver: true }),
        Animated.loop(Animated.sequence([
          Animated.timing(d.v, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(d.v, { toValue: 1, duration: d.dur, easing: Easing.linear, useNativeDriver: true }),
        ])),
      ]);
      seq.start();
      return seq;
    });
    return () => anims.forEach(a => a.stop());
  }, [drops, reduce]);
  const fall = Math.max(900, height + 60);
  return (
    <View pointerEvents="none" style={[fill, { overflow: 'hidden' }]}>
      {drops.map((d, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: d.x, top: -40, width: 3, height: d.h, borderRadius: 2, backgroundColor: '#CFE0FF',
          transform: [
            { translateX: d.v.interpolate({ inputRange: [0, 1], outputRange: [0, -120 * fall / 900] }) },
            { translateY: d.v.interpolate({ inputRange: [0, 1], outputRange: [0, fall] }) },
            { rotate: '8deg' },
          ],
        }} />
      ))}
    </View>
  );
}

/** Fond chaud qui glisse + confettis (victoire) ou froid qui glisse + pluie (défaite). */
export function EndBg({ win }: { win: boolean }) {
  return win ? (
    <><SlidingGradient colors={warmGradient} stops={warmStops} duration={10000} /><Confetti /></>
  ) : (
    <><SlidingGradient colors={coldGradient} stops={coldStops} duration={10000} /><Rain /></>
  );
}

/* ---------- En-têtes et titres ---------- */

/** Ligne d'en-tête : bouton blanc à plat (croix) + titre, éléments à droite. */
export function DuelHeader({ title, right, onClose }: { title: string; right?: ReactNode; onClose?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <HeaderButton kind="close" label="Quitter le duel" onPress={onClose ?? leave} />
      <T size={18} weight={700} outline numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>{title}</T>
      {right}
    </View>
  );
}

export function leave() {
  if (router.canGoBack()) router.back(); else router.replace('/');
}

export function BigTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <T size={30} weight={700} outline align="center" style={{ lineHeight: 33 }}>{title}</T>
      {sub ? <T size={15} weight={600} outline align="center">{sub}</T> : null}
    </View>
  );
}

/** Écran de duel : fond à deux halos, marges de la maquette (16 px, 48 en haut, 24 en bas). */
export function DuelScreen({ children, gap = 10, bottom = 24 }: { children: ReactNode; gap?: number; bottom?: number }) {
  const inset = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <DuelBg />
      <View style={{ flex: 1, paddingTop: inset.top + 8, paddingBottom: inset.bottom + bottom, paddingHorizontal: 16, gap }}>{children}</View>
    </View>
  );
}

/* ---------- 1 · Choix de l'adversaire ---------- */

export function OpponentChoice({ game, history, onAi, onSoon }: {
  game: string; history: { victoires: number; defaites: number }; onAi: () => void; onSoon: () => void;
}) {
  const total = history.victoires + history.defaites;
  return (
    <>
      <DuelHeader title={game} />
      <BigTitle title="Contre qui ?" sub={game} />
      <T size={16} weight={700} outline align="center">Amis</T>
      <Pressable accessibilityRole="button" accessibilityLabel="Inviter un ami" onPress={onSoon}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18, backgroundColor: '#FFFFFF' }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#9DD8FF', alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={16} color={INK} /></View>
        <T size={17} weight={700} color={INK}>Un ami</T>
        <View style={{ marginLeft: 'auto', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 13, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#FFD45C' }}>
          <T size={13} weight={700} color={INK}>Inviter</T>
        </View>
      </Pressable>
      <T size={16} weight={700} outline align="center">Ou bien</T>
      <Pressable accessibilityRole="button" accessibilityLabel="Joueur au hasard" onPress={onSoon} style={{ height: 62, borderRadius: 18, overflow: 'hidden' }}>
        <LinearGradient colors={['#FFF0A0', '#FFD45C']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <T size={19} weight={700} color={INK}>Joueur au hasard</T>
        </LinearGradient>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Contre une IA" onPress={onAi}
        style={{ height: 62, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <T size={19} weight={700} color={INK}>Contre une IA</T>
      </Pressable>
      <View style={{ flex: 1 }} />
      {total > 0 ? (
        <T size={14} weight={600} outline align="center">
          Historique contre l’IA : {history.victoires} victoire{history.victoires > 1 ? 's' : ''} · {history.defaites} défaite{history.defaites > 1 ? 's' : ''}
        </T>
      ) : null}
    </>
  );
}

/** Choix du niveau de l'IA (deux pastilles à plat). */
export function NiveauPicker({ value, onChange }: { value: Niveau; onChange: (n: Niveau) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <T size={15} weight={600} outline style={{ flex: 1 }}>Niveau de l’IA</T>
      {(['facile', 'normal'] as const).map(n => (
        <Pressable key={n} accessibilityRole="button" accessibilityLabel={`IA ${n}`} accessibilityState={{ selected: value === n }} onPress={() => onChange(n)}
          style={{ height: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: value === n ? '#FFD45C' : 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
          <T size={16} weight={700} color={value === n ? INK : '#FFFFFF'}>{n === 'facile' ? 'Facile' : 'Normal'}</T>
        </Pressable>
      ))}
    </View>
  );
}

/* ---------- Avatars et jauge de duel ---------- */

/** « Photo de profil » ronde : initiale du pseudo, icône pour le joueur sans pseudo, « IA » pour l'adversaire. */
export function PlayerAvatar({ who, name, size, border = 0 }: { who: 'me' | 'opp'; name: string | null; size: number; border?: number }) {
  const bg = who === 'me' ? ME_COLOR : OPP_COLOR;
  const label = who === 'opp' ? 'IA' : name ? name[0].toUpperCase() : null;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: border, borderColor: '#FFFFFF', backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      {label ? <T size={Math.round(size * (who === 'opp' ? 0.38 : 0.45))} weight={700} color={INK}>{label}</T> : <Icon name="user" size={Math.round(size * 0.55)} color={INK} width={2.4} />}
    </View>
  );
}

/** Jauge de duel : score des manches, photos de profil de part et d'autre, boule blanche qui glisse vers celui qui mène. */
export function DuelGauge({ me, opp, split, myName }: { me: number; opp: number; split: number; myName: string | null }) {
  const [w, setW] = useState(0);
  const [p] = useState(() => new Animated.Value(split));
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) { p.setValue(split); return; }
    Animated.spring(p, { toValue: split, friction: 6, tension: 40, useNativeDriver: false }).start();
  }, [split, p, reduce]);
  const inner = Math.max(0, w - 4);
  return (
    <View style={{ gap: 4 }} accessibilityRole="image" accessibilityLabel={`Score ${me} à ${opp}`}>
      <T size={26} weight={700} outline align="center">{me} – {opp}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <PlayerAvatar who="me" name={myName} size={44} border={3} />
        <View style={{ flex: 1, height: 22 }} onLayout={e => setW(e.nativeEvent.layout.width)}>
          <View style={{ ...fill, borderRadius: 11, overflow: 'hidden', backgroundColor: OPP_COLOR }}>
            <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: p.interpolate({ inputRange: [0, 1], outputRange: [0, w] }), backgroundColor: ME_COLOR }} />
          </View>
          <Animated.View style={{ position: 'absolute', top: -4, width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF', left: p.interpolate({ inputRange: [0, 1], outputRange: [2 - 15, 2 + inner - 15] }) }} />
        </View>
        <PlayerAvatar who="opp" name={null} size={44} border={3} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T size={13} weight={700} outline>{myName ?? 'Toi'}</T>
        <T size={13} weight={700} outline>IA</T>
      </View>
    </View>
  );
}

/** Pastille de mot (fin de manche, fin de partie). */
export function WordChip({ label, bg, radius = 13, px = 12, border = 2 }: { label: string; bg: string; radius?: number; px?: number; border?: number }) {
  return (
    <View style={{ paddingVertical: 5, paddingHorizontal: px, borderRadius: radius, borderWidth: border, borderColor: 'transparent', backgroundColor: bg }}>
      <T size={15} weight={700} color={SHADOW}>{label}</T>
    </View>
  );
}

/* ---------- Victoire / défaite ---------- */

type Side = { value: number; label: string };
export function DuelEnd({ win, braises, title, subtitle, myName, me, opp, gain, chipsTitle, chips, onRevanche }: {
  win: boolean; braises: number; title: string; subtitle: string; myName: string | null; me: Side; opp: Side; gain: number;
  chipsTitle: string; chips: { label: string; bg: string }[]; onRevanche: () => void;
}) {
  const inset = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [a] = useState(() => ({ pop: new Animated.Value(0), rise: new Animated.Value(0), count: new Animated.Value(0), tear: new Animated.Value(0) }));
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduce) { a.pop.setValue(1); a.rise.setValue(1); return; }
    const id = a.count.addListener(({ value }) => setShown(Math.round(value * gain)));
    Animated.parallel([
      Animated.timing(a.pop, { toValue: 1, duration: 600, delay: 100, easing: Easing.out(Easing.back(1.8)), useNativeDriver: true }),
      Animated.timing(a.rise, { toValue: 1, duration: 500, delay: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(a.count, { toValue: 1, duration: gain >= 20 ? 1200 : 600, delay: 1200, easing: Easing.linear, useNativeDriver: false }),
    ]).start();
    const tear = Animated.loop(Animated.timing(a.tear, { toValue: 1, duration: 2800, easing: Easing.in(Easing.quad), useNativeDriver: true }));
    if (!win) tear.start();
    return () => { a.count.removeListener(id); tear.stop(); };
  }, [a, gain, reduce, win]);
  const rise = { opacity: a.rise, transform: [{ translateY: a.rise.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] };
  const card = (side: Side, who: 'me' | 'opp', lead: boolean) => (
    <View style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 20, backgroundColor: lead ? '#FFF3B0' : '#FFFFFF' }}>
      <PlayerAvatar who={who} name={myName} size={46} />
      <T size={15} weight={700} color={SHADOW}>{who === 'me' ? 'Toi' : 'IA'}</T>
      <T size={40} weight={700} color={SHADOW} style={{ lineHeight: 42 }}>{side.value}</T>
      <T size={12} weight={600} color="#6B6290" align="center" numberOfLines={2}>{side.label}</T>
    </View>
  );
  return (
    <View style={{ flex: 1 }}>
      <EndBg win={win} />
      <View style={{ flex: 1, paddingTop: inset.top + 10, paddingBottom: inset.bottom + 22, paddingHorizontal: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={leave} hitSlop={4}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={20} color="#FFFFFF" />
          </Pressable>
          <T size={20} weight={700} outline numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>{title}</T>
          <View accessibilityLabel={`Solde : ${braises} brez`} style={{ height: 36, marginLeft: 16, paddingLeft: 30, paddingRight: 12, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center' }}>
            <Coin size={40} style={{ position: 'absolute', left: -12, top: -2 }} />
            <T size={17} weight={700} color={SHADOW} style={{ fontVariant: ['tabular-nums'] }}>{braises}</T>
          </View>
        </View>

        <View style={{ alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Animated.View style={{ transform: [{ translateY: 56 }, { scale: a.pop }, { translateY: -56 }] }}>
            {win ? (
              <View style={{ width: 112, height: 112, marginTop: 36, marginBottom: 7 }}>
                <Image source={images.nabuloSaut} autoplay style={{ position: 'absolute', left: -33, top: -63, width: 179, height: 179 }} contentFit="contain" accessibilityLabel="Nabulo saute de joie, le poing en l’air" />
              </View>
            ) : (
              <View style={{ width: 112, height: 112, marginBottom: 27 }}>
                <Image source={images.nabuloTriste} autoplay style={{ position: 'absolute', left: -25, top: -25, width: 162, height: 162 }} contentFit="contain" accessibilityLabel="Nabulo triste sous la pluie" />
                {!reduce && (
                  <Animated.View pointerEvents="none" style={{
                    position: 'absolute', left: 65.4, top: 72.2, width: 6, height: 8, borderRadius: 3, backgroundColor: '#CFE6FF', borderWidth: 1, borderColor: 'rgba(43,33,80,0.25)',
                    opacity: a.tear.interpolate({ inputRange: [0, 0.18, 0.48, 1], outputRange: [0, 1, 1, 0] }),
                    transform: [
                      { translateY: a.tear.interpolate({ inputRange: [0, 0.48, 1], outputRange: [0, 0, 28] }) },
                      { scale: a.tear.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0.3, 1, 0.9] }) },
                    ],
                  }} />
                )}
              </View>
            )}
          </Animated.View>
          <Animated.View style={[{ alignItems: 'center', gap: 4 }, rise]}>
            <T size={38} weight={700} outline style={{ lineHeight: 40 }}>{win ? 'Victoire !' : 'Perdu…'}</T>
            <T size={16} weight={600} color="#FFFFFF" align="center" style={{ paddingHorizontal: 12 }}>{subtitle}</T>
          </Animated.View>
        </View>

        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, rise]}>
          {card(me, 'me', win)}
          <T size={18} weight={700} color="#FFFFFF">VS</T>
          {card(opp, 'opp', !win)}
        </Animated.View>

        <View accessibilityLabel={`${gain} brez ${win ? 'gagnées' : 'pour avoir joué'}`}
          style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, paddingRight: 22, paddingBottom: 12, paddingLeft: 14, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.18)' }}>
          <Coin size={58} />
          <View>
            <T size={46} weight={700} outline style={{ lineHeight: 46, fontVariant: ['tabular-nums'] }}>+{reduce ? gain : shown}</T>
            <T size={15} weight={700} color="#FFFFFF" style={{ marginTop: 3, lineHeight: 15 }}>{win ? 'brez gagnées' : 'brez pour avoir joué'}</T>
          </View>
        </View>

        {chips.length > 0 && (
          <>
            <T size={15} weight={600} color="#FFFFFF" align="center">{chipsTitle}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
              {chips.map(c => <WordChip key={c.label} label={c.label} bg={c.bg} radius={12} px={12} border={0} />)}
            </View>
          </>
        )}

        <View style={{ marginTop: 'auto', flexDirection: 'row', gap: 10 }}>
          <Button label="Menu" variant="white" border={2} height={58} fontSize={19} color={SHADOW} style={{ flex: 1 }} onPress={leave} />
          <Button label="Revanche" variant="yellow" border={2} height={58} fontSize={19} color={SHADOW} style={{ flex: 1 }} onPress={onRevanche} />
        </View>
      </View>
    </View>
  );
}
