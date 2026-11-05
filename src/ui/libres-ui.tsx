import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { COULEURS_VOISINS } from '@/game/libres-manches';
import { bubble, gameInk, warmGradient, warmStops } from '@/theme/colors';
import { SlidingGradient } from './backgrounds';
import { Bubble } from './Bubble';
import { Icon, images } from './bits';
import { Confetti } from './Confetti';
import { Diagonal, Relief } from './Diagonal';
import { GameBg } from './game';
import { MotAjuste } from './libres-mot';
import { T } from './Text';
import { animationsReduites } from '@/game/reglages';

/* Briques des jeux libres solo (planches J-jeux-libres-11, 12, 14). */

export const INK = gameInk;
const fill = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const;

export function useReduceMotion() {
  const [r, setR] = useState(false);
  useEffect(() => { animationsReduites().then(setR); }, []);
  return r;
}

/** Retour au menu : la page précédente si elle existe, sinon l'accueil. */
export function quitter() {
  if (router.canGoBack()) router.back(); else router.replace('/');
}

/** Marges de la maquette : 4 px sous la barre d'état, 16 px sur les côtés, 24 px en bas. */
export function useCadre(bas = 24) {
  const inset = useSafeAreaInsets();
  return { paddingTop: Math.max(inset.top, 10) + 4, paddingBottom: inset.bottom + bas, paddingHorizontal: 16 };
}

/** Bouton ✕ de l'en-tête : carré blanc de 40 px, à plat (zone tactile de 48 px). */
export function CloseButton({ onPress, label = 'Quitter la partie' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4}
      style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="close" size={20} color={INK} />
    </Pressable>
  );
}

/** En-tête des écrans de jeu : ✕, titre blanc, pastille à droite. */
export function Header({ title, right, onClose }: { title: string; right?: ReactNode; onClose: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <CloseButton onPress={onClose} />
      <T size={18} weight={700} outline numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>{title}</T>
      {right}
    </View>
  );
}

/** Pastille en relief de l'en-tête (« Série 6 », « ⏱ 0:34 »). */
export function Pill({ label, bg = '#FFD45C', icon, accessibilityLabel }: { label: string; bg?: string; icon?: ReactNode; accessibilityLabel?: string }) {
  return (
    <Bubble bg={bg} radius={15} border={2} inset={5} style={{ height: 30, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View accessible accessibilityLabel={accessibilityLabel ?? label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        {icon}
        <T size={14} weight={700} color={INK} numberOfLines={1}>{label}</T>
      </View>
    </Bubble>
  );
}

/** Compteur de série de l'en-tête : le nombre seul, en grand, dans une bulle jaune (40 px, la hauteur du ✕). */
export function Compteur({ valeur, label = 'Série', bg = '#FFD45C' }: { valeur: number; label?: string; bg?: string }) {
  return (
    <Bubble bg={bg} radius={14} border={2} inset={5} style={{ height: 40, minWidth: 52, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}>
      <View accessible accessibilityLabel={`${label} ${valeur}`} accessibilityLiveRegion="polite">
        <T size={26} weight={700} color={INK} numberOfLines={1}>{valeur}</T>
      </View>
    </Bubble>
  );
}

/** Petit chronomètre (le « ⏱ » de la maquette). */
export function Stopwatch({ size = 13, color = INK }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={14} r={8} stroke={color} strokeWidth={2.6} />
      <Path d="M12 14 V10 M9.5 3 H14.5 M12 3 V6 M18.5 6.5 L20 5" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}

/** Ligne « Temps · 7 s » et sa barre (hauteur 18, fond blanc 85 %, remplissage arrondi à 6). */
export function TimerBar({ label, value, frac, color = '#FFD45C' }: { label: string; value: string; frac: number; color?: string }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`${label} : ${value}`} style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T size={13} weight={700} outline>{label}</T>
        <T size={13} weight={700} outline>{value}</T>
      </View>
      <View style={{ height: 18, borderRadius: 9, borderWidth: 2, borderColor: 'transparent', backgroundColor: 'rgba(255,255,255,0.85)' }}>
        <View style={{ width: `${Math.max(0, Math.min(1, frac)) * 100}%`, height: '100%', borderRadius: 6, backgroundColor: color }} />
      </View>
    </View>
  );
}

/** Icône « rejouer » (flèche circulaire) de la maquette. */
export function ReplayIcon({ size = 20, color = INK }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 12 A8 8 0 1 1 17.7 6.3" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 4 V9 H15" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Bouton jaune des jeux libres : contour 2 px, relief 7 px (« Jouer », « Menu », « Rejouer »). */
export function LButton({ label, onPress, mix, height = 62, fontSize = 22, icon, style, padding = 8 }: {
  label: string; onPress: () => void; mix?: boolean; height?: number; fontSize?: number; icon?: ReactNode; style?: StyleProp<ViewStyle>; padding?: number;
}) {
  const look = mix ? { bg: '#FFD45C', ...bubble('#FFD45C') } : { bg: '#FFD45C', border: '#FFE38F', diag: '#F7C843', relief: '#E3A91C' };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      onPress={() => { if (Platform.OS !== 'web') Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => [{ height, transform: [{ translateY: pressed ? 2 : 0 }] }, style]}>
      <View style={{ flex: 1, borderRadius: 18, borderWidth: 2, borderColor: look.border, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: padding }}>
        <Diagonal bg={look.bg} diag={look.diag} />
        <Relief inset={7} color={look.relief} radius={16} />
        {icon ? <View style={{ width: 20, height: 20, flexShrink: 0 }}>{icon}</View> : null}
        <T size={fontSize} weight={700} color={INK} numberOfLines={1}>{label}</T>
      </View>
    </Pressable>
  );
}

/* ---------- 1 · Règles ---------- */
export function Regles({ titre, regles, onPlay }: { titre: string; regles: string[]; onPlay: () => void }) {
  const cadre = useCadre();
  return (
    <View style={{ flex: 1 }}>
      <GameBg />
      <View style={[{ flex: 1, gap: 10 }, cadre]}>
        <Header title="Règles" onClose={quitter} />
        <ScrollView style={{ flex: 1, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }} showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: 'center', gap: 6, marginTop: 6 }}>
            <View style={{ alignItems: 'center' }}>
              <T size={30} weight={700} outline align="center" style={{ lineHeight: 33 }} accessibilityRole="header">{titre}</T>
              <T size={15} weight={600} outline align="center">Jeux libres · rejouable à volonté</T>
            </View>
          </View>
          <Image source={images.nabulo} style={{ width: 110, height: 110, alignSelf: 'center' }} contentFit="contain" accessibilityLabel="Nabulo" />
          <View style={{ gap: 8 }}>
            {regles.map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18, backgroundColor: '#FFFFFF' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFD45C', alignItems: 'center', justifyContent: 'center' }}>
                  <T size={14} weight={700} color={INK}>{i + 1}</T>
                </View>
                <T size={16} weight={600} color={INK} style={{ flex: 1, lineHeight: 20 }}>{r}</T>
              </View>
            ))}
          </View>
        </ScrollView>
        <LButton label="Jouer" onPress={onPlay} />
      </View>
    </View>
  );
}

/* ---------- Texte détouré (plusieurs ombres de la maquette) ---------- */
/** Texte blanc entouré d'encre : `text-shadow: 0 3px 0, 2px 0 0, -2px 0 0, 0 -2px 0` (ou 2 / 1,5 px pour les petits titres). */
export function Outlined({ children, size, weight = 700, lh, w = 2, dy = 3, color = '#FFFFFF', align = 'center' }: {
  children: ReactNode; size: number; weight?: 600 | 700; lh?: number; w?: number; dy?: number; color?: string; align?: 'center' | 'left';
}) {
  const offs: [number, number][] = [[0, dy], [w, 0], [-w, 0], [0, -w]];
  const style = lh ? { lineHeight: lh } : undefined;
  return (
    <View>
      {offs.map(([x, y], i) => (
        <T key={i} size={size} weight={weight} color={gameInk} align={align} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={[fill, style, { transform: [{ translateX: x }, { translateY: y }] }]}>{children}</T>
      ))}
      <T size={size} weight={weight} color={color} align={align} style={style}>{children}</T>
    </View>
  );
}

/* ---------- Fonds de fin ---------- */
const COLD = ['#3B3F8C', '#4A5AA8', '#5E7BBE', '#8FA6D6', '#4A5AA8', '#3B3F8C'] as const;
const COLD_STOPS = [0, 0.3, 0.52, 0.62, 0.8, 1] as const;
/** Gouttes de la maquette : [left px, hauteur, durée s, avance s]. */
const DROPS: [number, number, number, number][] = [[2,32,2.19,1.80], [12,32,2.18,0.44], [24,28,2.00,1.82], [28,28,1.74,0.21], [48,16,1.98,0.91], [56,32,2.02,1.43], [68,16,1.55,0.44], [73,32,1.52,1.07], [88,32,2.17,1.19], [102,24,1.90,1.52], [110,24,1.83,1.27], [115,24,1.75,0.53], [129,16,1.56,1.76], [141,16,2.18,0.89], [146,16,1.67,2.13], [157,28,1.80,1.63], [174,16,1.95,0.46], [189,24,1.77,0.72], [190,28,2.11,0.27], [203,16,1.51,1.07], [218,20,2.05,0.43], [230,20,2.29,1.77], [239,28,1.59,0.97], [247,16,1.72,2.23], [264,24,2.30,0.05], [267,28,2.30,1.38], [285,16,1.53,0.34], [294,24,1.51,1.40], [302,28,1.56,0.21], [318,20,1.51,0.85], [329,28,1.60,1.35], [339,20,2.19,0.42], [343,24,2.23,1.88], [355,20,1.63,1.45], [371,20,2.05,0.89], [381,32,1.56,0.11], [386,16,1.91,0.59], [401,24,1.84,2.08], [413,24,1.92,2.14], [418,20,1.68,1.29], [437,32,1.56,0.49], [442,16,1.56,0.95], [453,16,1.54,0.65], [468,32,2.28,0.21], [473,28,2.28,1.51], [490,32,2.26,1.36], [493,28,2.23,1.61], [504,16,1.98,0.17]];

/** Pluie de la maquette (.ff-rain) : traits de 3 px qui tombent en biais. Coupée si « réduire les animations ». */
export function Rain() {
  const reduce = useReduceMotion();
  const [vals] = useState(() => DROPS.map(([, , d, a]) => new Animated.Value((a % d) / d)));
  useEffect(() => {
    if (reduce) return;
    const anims = DROPS.map(([, , d, a], i) => {
      const v = vals[i], start = (a % d) / d;
      const seq = Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: d * 1000 * (1 - start), easing: Easing.linear, useNativeDriver: true }),
        Animated.loop(Animated.sequence([
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(v, { toValue: 1, duration: d * 1000, easing: Easing.linear, useNativeDriver: true }),
        ])),
      ]);
      seq.start();
      return seq;
    });
    return () => anims.forEach(a => a.stop());
  }, [reduce, vals]);
  if (reduce) return null;
  return (
    <View pointerEvents="none" style={[fill, { overflow: 'hidden' }]}>
      {DROPS.map(([left, h], i) => (
        <Animated.View key={i} style={{
          position: 'absolute', top: -40, left, width: 3, height: h, borderRadius: 2, backgroundColor: '#CFE0FF',
          transform: [
            { translateX: vals[i].interpolate({ inputRange: [0, 1], outputRange: [0, -120] }) },
            { translateY: vals[i].interpolate({ inputRange: [0, 1], outputRange: [0, 900] }) },
            { rotate: '8deg' },
          ],
        }} />
      ))}
    </View>
  );
}

/** Larme qui perle puis tombe (.tear-fall), sous l'œil de Nabulo triste. */
function Tear({ left, top, fall }: { left: number; top: number; fall: number }) {
  const reduce = useReduceMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 2800, easing: Easing.in(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [reduce, v]);
  if (reduce) return null;
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left, top, width: 8, height: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
      backgroundColor: '#CFE6FF', borderWidth: 1, borderColor: 'rgba(43,33,80,0.25)',
      opacity: v.interpolate({ inputRange: [0, 0.18, 0.48, 1], outputRange: [0, 1, 1, 0] }),
      transform: [
        { translateY: v.interpolate({ inputRange: [0, 0.48, 1], outputRange: [0, 0, fall] }) },
        { scaleX: v.interpolate({ inputRange: [0, 0.18, 0.48, 1], outputRange: [0.3, 1, 1.05, 0.85] }) },
        { scaleY: v.interpolate({ inputRange: [0, 0.18, 0.48, 1], outputRange: [0.3, 1, 1.15, 1.2] }) },
      ],
    }} />
  );
}

/* ---------- 4 · Fin ---------- */
export type LigneFin = { label: string; value: string };
/** Série mise en valeur sur l'écran de fin (à la place du mot et de ses voisins). */
export type SerieFin = { valeur: number; legende: string; badge: string; detail?: string };

/**
 * Écran de fin commun : fond chaud qui glisse + confettis + Nabulo qui saute (record battu),
 * ou fond froid + pluie + Nabulo triste (série terminée sans record).
 */
export function Fin({ record, titre, sousTitre, label, mot, voisins = [], serie, lignes, onReplay }: {
  record: boolean; titre: string; sousTitre: string; label?: string; mot?: string; voisins?: string[]; serie?: SerieFin; lignes: LigneFin[]; onReplay: () => void;
}) {
  const cadre = useCadre();
  // écran bas (< 800 px, ex. 360×740) : Nabulo réduit (160 → 120 px) et moins de marge en haut, pour que tout tienne
  const compact = useWindowDimensions().height < 800;
  const k = compact ? 0.75 : 1, n = 160 * k;
  return (
    <View style={{ flex: 1, backgroundColor: '#4B33B8' }}>
      {record ? (
        <><SlidingGradient colors={warmGradient} stops={warmStops} duration={10000} /><Confetti /></>
      ) : (
        <><SlidingGradient colors={COLD} stops={COLD_STOPS} duration={10000} /><Rain /></>
      )}
      <View style={[{ flex: 1 }, cadre]}>
        <View style={{ paddingTop: compact ? 16 : 40, paddingHorizontal: 4, paddingBottom: 10, alignItems: 'center', gap: 4 }}>
          {record ? (
            <View style={{ width: n, height: n, marginBottom: 10 }}>
              <Image source={images.nabuloSaut} autoplay style={{ position: 'absolute', left: -48 * k, top: -90 * k, width: 256 * k, height: 256 * k }} contentFit="contain" accessibilityLabel="Nabulo saute de joie, le poing en l’air" />
            </View>
          ) : (
            <View style={{ width: n, height: n, marginBottom: 38 * k }}>
              <Image source={images.nabuloTriste} autoplay style={{ position: 'absolute', left: -36 * k, top: -36 * k, width: 232 * k, height: 232 * k }} contentFit="contain" accessibilityLabel="Nabulo triste sous la pluie" />
              <Tear left={93.8 * k} top={103.9 * k} fall={39 * k} />
            </View>
          )}
          <View accessible accessibilityRole="header" accessibilityLabel={`${titre} ${sousTitre}`} style={{ alignItems: 'center', gap: 4 }}>
            <Outlined size={record ? 38 : 34} lh={Math.round((record ? 38 : 34) * 1.05)}>{titre}</Outlined>
            <Outlined size={18} weight={600}>{sousTitre}</Outlined>
          </View>
        </View>

        {/* le milieu défile sur les petits écrans plutôt que de passer sous les boutons ; 18 px d'air avant eux */}
        <ScrollView style={{ flex: 1, minHeight: 0, marginHorizontal: -16 }} showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingTop: 14, paddingBottom: 18, paddingHorizontal: 20, justifyContent: 'center', gap: 14 }}>
          {serie && (
            <View accessible accessibilityLabel={`${serie.legende} : ${serie.valeur}. ${serie.badge}${serie.detail ? `, ${serie.detail}` : ''}`} style={{ alignItems: 'center', gap: 10 }}>
              <Outlined size={17} w={1.5} dy={2}>{serie.legende}</Outlined>
              <Bubble bg="#FFFFFF" radius={26} border={3} inset={8} style={{ minWidth: 150, paddingTop: 2, paddingBottom: 10, paddingHorizontal: 24, alignItems: 'center' }}>
                <T size={84} weight={700} color={INK} numberOfLines={1}>{serie.valeur}</T>
              </Bubble>
              <Bubble bg={record ? '#FFD45C' : '#FFFFFF'} radius={15} border={2} inset={5} style={{ paddingVertical: 6, paddingHorizontal: 14, alignItems: 'center' }}>
                <T size={18} weight={700} color={INK} numberOfLines={1}>{serie.badge}</T>
              </Bubble>
              {serie.detail ? <Outlined size={16} weight={600} w={1.5} dy={2}>{serie.detail}</Outlined> : null}
            </View>
          )}
          {label ? <Outlined size={17} w={1.5} dy={2}>{label}</Outlined> : null}
          {mot ? (
            <MotAjuste mot={mot} size={46} lineHeight={51} retrait={36}
              boite={{ paddingVertical: 4, paddingHorizontal: 16, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#FFFFFF' }} />
          ) : null}
          {voisins.length > 0 && (
            <View accessible accessibilityLabel={`Voisins : ${voisins.join(', ')}`} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              {voisins.map((v, i) => (
                <Bubble key={v} bg={COULEURS_VOISINS[i % COULEURS_VOISINS.length]} radius={13} border={2} inset={4} style={{ paddingVertical: 6, paddingHorizontal: 13 }}>
                  <T size={18} weight={700} color={INK}>{v}</T>
                </Bubble>
              ))}
            </View>
          )}
          <View style={{ marginTop: 22, gap: 10 }}>
            {lignes.map(l => (
              <View key={l.label} accessible accessibilityLabel={`${l.label} : ${l.value}`}
                style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(255,255,255,0.92)', boxShadow: 'inset 0 -5px 0 rgba(20,10,60,0.18)' }}>
                <T size={17} weight={600} color={INK} numberOfLines={1}>{l.label}</T>
                <T size={17} weight={700} color={INK} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1 }}>{l.value}</T>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 4, paddingBottom: 6, flexDirection: 'row', gap: 10 }}>
          <LButton label="Menu" mix height={58} fontSize={18} padding={16} onPress={quitter} icon={<Icon name="home" size={20} color={INK} width={2.8} />} />
          <LButton label="Rejouer" height={58} fontSize={18} style={{ flex: 1, minWidth: 0 }} onPress={onReplay} icon={<ReplayIcon />} />
        </View>
      </View>
    </View>
  );
}

/**
 * Fin des jeux à série (Plus chaud, L'intrus) : la série obtenue en grand et le record (battu, égalé ou à battre),
 * sans mot ni voisins.
 */
export function FinSerie({ serie, ancien, temps, onReplay }: { serie: number; ancien: number; temps?: boolean; onReplay: () => void }) {
  const record = serie > ancien;
  const egal = !record && serie > 0 && serie === ancien;
  return (
    <Fin
      record={record}
      titre={record ? 'Nouveau record !' : temps ? 'Temps écoulé !' : 'Série terminée'}
      sousTitre={record ? (ancien > 0 ? 'Tu as battu ton record' : 'Ton premier record') : temps ? 'Série terminée' : 'Une erreur et c’est fini'}
      serie={{ valeur: serie, legende: 'Ta série', badge: record ? 'Record battu !' : egal ? 'Record égalé !' : 'Pas de record cette fois' }}
      lignes={record
        ? [{ label: 'Nouveau record', value: String(serie) }, { label: 'Ancien record', value: ancien > 0 ? String(ancien) : '—' }]
        : [{ label: 'Ton record', value: String(ancien) }, { label: 'Pour le battre', value: `${ancien - serie + 1} de plus` }]}
      onReplay={onReplay}
    />
  );
}

/** Choix « à plat » des jeux (carte blanche qui devient verte ou rose). */
export const VERT = '#9BF77A', ROSE = '#FFB3C7';
