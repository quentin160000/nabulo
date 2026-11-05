import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Easing, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, TextInput, View,
  type TextInputInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { engine } from '@/game/engine';
import { FREE_AD_HINTS_PER_DAY, HINT_COST, bestTemperature, sortGuesses, type Guess } from '@/game/rules';
import { moodLabel, moodOf, tempColor } from '@/game/temperature';
import { useDaily } from '@/game/useDaily';
import { useWallet } from '@/game/wallet';
import { bgDeep, gameInk, gameInkSoft, gaugeGradient, gaugeStops, panel, warmGradient, warmStops } from '@/theme/colors';
import { Bubble } from '@/ui/Bubble';
import { Button } from '@/ui/Button';
import { SlidingGradient } from '@/ui/backgrounds';
import { Chip, Coin, CoinPill, HeaderButton, Icon, images } from '@/ui/bits';
import { Confetti } from '@/ui/Confetti';
import { Mascot } from '@/ui/Mascot';
import { T } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { GameBg, Section, Sheet, useKeyboardVisible, keepFocus } from '@/ui/game';

const INK = gameInk;
const SH3 = { textShadowColor: INK, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 } as const;
const fmt = (t: number, unit = '°') => t.toFixed(1).replace('.', ',') + unit;

export default function MotDuJour() {
  const daily = useDaily('fr');
  const { state, ready } = daily;
  const [rulesSeen, setRulesSeen] = useState(false);
  if (!ready) return <GameBg />;
  if (state.solved) return <Victoire daily={daily} />;
  if (state.guesses.length === 0 && !rulesSeen) return <Regles day={state.day} onStart={() => setRulesSeen(true)} />;
  return <EnJeu daily={daily} />;
}

type Daily = ReturnType<typeof useDaily>;

/* ---------- 1 · Règles (tant qu'aucun essai) ---------- */
const SCALE: [string, string, string][] = [
  ['Glacial', '#5B8DEF', 'sous 0'], ['Froid', '#A9C6F2', '0 à 20'], ['Tiède', '#7CCDEF', '20 à 40'],
  ['Chaud', '#FF9A3C', '40 à 60'], ['Brûlant', '#FF5A36', '60 à 99'], ['Trouvé', '#FFD23F', '100'],
];
function Regles({ day, onStart }: { day: number; onStart: () => void }) {
  const inset = useSafeAreaInsets();
  const steps = [
    'Propose un mot : il reçoit une température selon son sens.',
    'Plus il fait chaud, plus tu es proche du mot secret.',
    'Essais illimités : ton score, c’est ton nombre d’essais.',
    `Un indice coûte ${HINT_COST} braises, se paie en partie et baisse ton score.`,
  ];
  return (
    <View style={{ flex: 1 }}>
      <GameBg />
      <View style={{ flex: 1, paddingTop: inset.top + 14, paddingBottom: inset.bottom + 18, paddingHorizontal: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <HeaderButton kind="close" label="Retour à l’accueil" onPress={() => router.back()} />
          <T size={24} weight={700} outline color="#FFFFFF" style={{ flex: 1, textShadowColor: INK }}>Nabulo</T>
          <T size={15} weight={600} outline style={{ textShadowColor: INK }}>n°{day}</T>
        </View>
        <ScrollView style={{ flex: 1, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 6 }}>
            <Image source={images.nabulo} style={{ width: 110, height: 110 }} contentFit="contain" accessibilityLabel="Nabulo" />
            <View>
              <T size={30} weight={700} color="#FFFFFF" style={[{ lineHeight: 33 }, SH3]}>Mot du jour</T>
              <T size={16} weight={600} outline style={{ textShadowColor: INK }}>le même pour tout le monde</T>
            </View>
          </View>
          <Section title="Comment jouer">
            {steps.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, backgroundColor: panel }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFD45C', alignItems: 'center', justifyContent: 'center' }}><T size={13} weight={700} color={INK}>{i + 1}</T></View>
                <T size={15} weight={600} color={INK} style={{ flex: 1, lineHeight: 18 }}>{s}</T>
              </View>
            ))}
          </Section>
          <Section title="Échelle des températures" right="°C">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingTop: 2, paddingHorizontal: 4, paddingBottom: 4 }}>
              {SCALE.map(([l, c, r]) => (
                <View key={l} style={{ alignItems: 'center', gap: 3 }}>
                  <Chip label={l} bg={c} />
                  <T size={12} weight={600} color="#FFFFFF">{r}</T>
                </View>
              ))}
            </View>
          </Section>
        </ScrollView>
        <Button label={`Jouer le mot n°${day}`} variant="yellow-mix" border={4} radius={17} onPress={onStart} />
      </View>
    </View>
  );
}

/* ---------- 2 · En jeu ---------- */
/** Rang comme Cémantix : 1 = le plus proche ; « — » hors des 1 000 plus proches. */
const rankText = (g: Guess) => (g.temperature >= 100 ? '1' : g.rank === null ? '—' : String(g.rank));
const barColor = (t: number) => (t >= 100 ? '#FFB020' : t >= 60 ? '#FF5A36' : t >= 40 ? '#FF9A3C' : t >= 20 ? '#5FC3EE' : t >= 0 ? '#9DBDF0' : '#5B8DEF');
const gaugePos = (t: number) => Math.max(0, Math.min(1, (t + 30) / 130));

function EnJeu({ daily }: { daily: Daily }) {
  const inset = useSafeAreaInsets();
  const { state, busy, feedback, last, submit, takeHint } = daily;
  const { braises, spend } = useWallet();
  const [text, setText] = useState('');
  const [sheet, setSheet] = useState<'confirm' | 'manque' | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const toast = useToast();
  const input = useRef<TextInputInstance>(null);
  const rows = useMemo(() => sortGuesses(state.guesses).slice(0, 20), [state.guesses]);
  const lastGuess = state.guesses.find(g => g.word === last) ?? state.guesses[state.guesses.length - 1] ?? null;
  const prevBest = useRef(state.guesses.length ? bestTemperature(state.guesses) : -100);
  const [record, setRecord] = useState(false);
  const kb = useKeyboardVisible();

  useEffect(() => {
    if (feedback) toast.show(feedback.kind === 'unknown' ? `Je ne connais pas « ${feedback.word} »` : feedback.kind === 'repeat' ? `« ${feedback.word} » est déjà dans ta liste` : 'Connexion impossible, réessaie');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback]);
  useEffect(() => {
    if (!lastGuess) return;
    const isRecord = lastGuess.temperature > prevBest.current && state.guesses.length > 1 && !lastGuess.hint;
    setRecord(isRecord);
    prevBest.current = Math.max(prevBest.current, lastGuess.temperature);
  }, [lastGuess, state.guesses.length]);

  const send = async () => { const w = text; setText(''); setFlash(null); await submit(w); input.current?.focus(); };
  const openHint = () => { toast.hide(); setSheet(braises < HINT_COST ? 'manque' : 'confirm'); };
  const adsLeft = Math.max(0, FREE_AD_HINTS_PER_DAY - state.adHintsUsed);
  const hint = async (via: 'braises' | 'pub') => {
    if (via === 'braises' && !spend(HINT_COST)) { setSheet('manque'); return; }
    setSheet(null);
    const h = await takeHint(via);
    if (!h) { toast.show('Plus d’indice pour ce mot'); return; }
    if (via === 'braises') setFlash(`−${HINT_COST}`); else toast.show('Indice offert, merci !');
  };

  const mood = lastGuess ? moodOf(lastGuess.temperature) : null;
  return (
    <View style={{ flex: 1 }}>
      <GameBg />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, paddingTop: inset.top + 14, paddingBottom: 10 + inset.bottom, paddingHorizontal: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <HeaderButton kind="menu" label="Retour à l’accueil" onPress={() => router.back()} />
            <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
              <T size={24} weight={700} outline style={{ lineHeight: 25, textShadowColor: INK }}>Nabulo</T>
              <T size={14} weight={600} outline style={{ textShadowColor: INK }}>n°{state.day} · {state.guesses.length} essai{state.guesses.length > 1 ? 's' : ''}</T>
            </View>
            <CoinPill value={braises} flash={flash} onPress={() => router.push('/boutique')} />
          </View>

          {/* clavier ouvert : tout est centré ; clavier fermé : le classement prend toute la place libre */}
          <View style={{ flex: 1, minHeight: 0, justifyContent: kb ? 'center' : 'flex-start', gap: 10, paddingTop: kb ? 0 : 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {mood && lastGuess ? <Mascot mood={mood} size={96} /> : <Image source={images.nabulo} style={{ width: 96, height: 96 }} contentFit="contain" accessibilityLabel="Nabulo" />}
              <View style={{ alignItems: 'flex-start', gap: 8, minWidth: 0, flexShrink: 1 }}>
                <T size={30} weight={700} color="#FFFFFF" numberOfLines={1} style={[{ maxWidth: 200, lineHeight: 33 }, SH3]}>{lastGuess ? lastGuess.word : 'À toi !'}</T>
                {lastGuess && mood ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 6 }}>
                    <Chip label={fmt(lastGuess.temperature, ' °C')} bg={tempColor(lastGuess.temperature)} size={24} style={{ paddingHorizontal: 12, borderRadius: 14 }} />
                    <T size={24} weight={700} color="#FFFFFF" style={SH3}>{moodLabel[mood].replace(' !', '')}</T>
                  </View>
                ) : (
                  <T size={17} weight={600} outline style={{ textShadowColor: INK }}>Propose un premier mot</T>
                )}
              </View>
            </View>

            <Gauge t={lastGuess?.temperature ?? null} record={record} />

            <Section title="Les plus chauds" right={rows.length > 4 ? 'glisse ↓' : undefined} padding={8} gap={6} style={kb ? { flexShrink: 1, minHeight: 0 } : { flex: 1, minHeight: 0 }}>
              <ScrollView style={kb ? { maxHeight: 202, borderRadius: 14 } : { flex: 1, borderRadius: 14 }} contentContainerStyle={{ gap: 6 }}
                keyboardDismissMode="on-drag" onTouchStart={() => { if (kb) Keyboard.dismiss(); }} snapToInterval={52} decelerationRate="fast">
                {rows.length === 0 && (
                  <View style={{ height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' }}>
                    <T size={14} weight={600} color="#FFFFFF">tes essais s’afficheront ici, du plus chaud au plus froid</T>
                  </View>
                )}
                {rows.map(g => <GuessRow key={g.word} g={g} last={g.word === lastGuess?.word} />)}
              </ScrollView>
            </Section>
          </View>

          {/* au-dessus du clavier : le champ garde son relief, les boutons sont à plat */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              ref={input} value={text} onChangeText={setText} onSubmitEditing={send} placeholder="Tape un mot" placeholderTextColor="#7C7399"
              autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="send" submitBehavior="submit" {...keepFocus} accessibilityLabel="Ton mot"
              style={{
                flex: 1, minWidth: 0, height: 52, borderRadius: 17, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 0,
                includeFontPadding: false, textAlignVertical: 'center',
                fontFamily: 'Fredoka_500Medium', fontSize: 21, color: INK, outlineStyle: 'none',
              } as object}
            />
            <Pressable accessibilityRole="button" accessibilityLabel={`Indice, ${HINT_COST} braises`} onPress={openHint}
              style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: '#FFF4D6', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="bulb" size={28} color={INK} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Proposer" onPress={send} disabled={busy || !text.trim()}
              style={{ height: 52, paddingHorizontal: 14, borderRadius: 17, backgroundColor: '#FFD45C', alignItems: 'center', justifyContent: 'center' }}>
              <T size={18} weight={700} color={INK}>Proposer</T>
            </Pressable>
          </View>
        </View>
        <Toast msg={toast.msg} check={!feedback} style={{ bottom: 76 + inset.bottom }} />
      </KeyboardAvoidingView>

      <Sheet visible={sheet !== null} onClose={() => setSheet(null)}>
        {sheet === 'confirm' ? (
          <>
            <View>
              <T size={22} weight={700} color={INK} style={{ lineHeight: 24 }}>Utiliser un indice</T>
              <T size={14} weight={600} color={gameInkSoft}>Mot proche : révèle un mot brûlant, tout près du mot secret</T>
            </View>
            <Option onPress={() => hint('braises')} lead={<Coin size={44} />} title={`Payer ${HINT_COST} braises`} sub={`il t’en restera ${Math.max(0, braises - HINT_COST)}`}
              tag={<View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#FF5A36' }}><T size={15} weight={700} color="#FFFFFF">Utiliser</T></View>} />
            <Option onPress={() => hint('pub')} disabled={adsLeft <= 0}
              lead={<View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#F1EEFA', alignItems: 'center', justifyContent: 'center' }}><Icon name="video" size={24} color={INK} /></View>}
              title="Regarder une pub" sub={`tu gardes tes braises · ${adsLeft > 0 ? `encore ${adsLeft} aujourd’hui` : 'plus de pub aujourd’hui'}`}
              tag={<View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#7CE0B5' }}><T size={15} weight={700} color={INK}>Gratuit</T></View>} />
            <Pressable accessibilityRole="button" onPress={() => setSheet(null)} style={{ paddingTop: 4, alignItems: 'center' }}>
              <T size={16} weight={700} color={gameInkSoft}>Annuler</T>
            </Pressable>
          </>
        ) : (
          <>
            <View>
              <T size={22} weight={700} color={INK} style={{ lineHeight: 24 }}>Il te manque {Math.max(0, HINT_COST - braises)} braises</T>
              <T size={14} weight={600} color={gameInkSoft}>ta partie reste en pause, tu ne perds rien</T>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Regarder une pub" disabled={adsLeft <= 0} onPress={() => hint('pub')} style={{ opacity: adsLeft > 0 ? 1 : 0.5 }}>
              <Bubble bg={panel} radius={18} inset={5} style={{ paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}><Icon name="video" size={24} color={INK} /></View>
                <View style={{ flex: 1 }}>
                  <T size={17} weight={700} color={INK}>Regarder une pub</T>
                  <T size={13} weight={600} color={gameInkSoft}>1 indice offert · {adsLeft > 0 ? `encore ${adsLeft} aujourd’hui` : 'plus de pub aujourd’hui'}</T>
                </View>
                <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#7CE0B5' }}><T size={13} weight={700} color={INK}>Gratuit</T></View>
              </Bubble>
            </Pressable>
            <PackPopulaire onPress={() => { setSheet(null); toast.show('Les achats arrivent bientôt'); }} />
            <Pressable accessibilityRole="button" onPress={() => { setSheet(null); router.push('/boutique'); }} style={{ alignItems: 'center' }}>
              <T size={15} weight={700} color="#6A4BE0">Voir tous les packs</T>
            </Pressable>
          </>
        )}
      </Sheet>
    </View>
  );
}

function GuessRow({ g, last }: { g: Guess; last: boolean }) {
  const r = rankText(g);
  const top10 = !g.hint && g.temperature < 100 && r !== '—' && +r <= 10;
  const rowBg = g.hint ? '#FFF4D6' : last ? '#FFF3B0' : top10 ? '#FFE3E0' : panel;
  const rankBg = g.hint ? '#FFD45C' : g.temperature >= 100 ? '#FFD23F' : r === '—' ? '#E2DEEE' : top10 ? '#FF3B30' : '#FFFFFF';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 14, backgroundColor: rowBg, paddingLeft: 6, paddingRight: 10 }}>
      <View style={{ minWidth: 36, paddingVertical: 2, paddingHorizontal: 5, borderRadius: 9, borderWidth: 2, borderColor: 'transparent', backgroundColor: rankBg, alignItems: 'center' }}>
        <T size={12} weight={700} color={top10 ? '#FFFFFF' : INK}>{r}</T>
      </View>
      <Mascot mood={moodOf(g.temperature)} size={38} animate={false} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <T size={16} weight={600} color={INK} numberOfLines={1} style={{ lineHeight: 18, flexShrink: 1 }}>{g.word}</T>
          {g.hint && <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 7, backgroundColor: '#FF5A36' }}><T size={10} weight={700} color="#FFFFFF" style={{ letterSpacing: 0.5, lineHeight: 12 }}>INDICE</T></View>}
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: '#E2DEEE', overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${Math.max(4, Math.min(100, gaugePos(g.temperature) * 100))}%`, borderRadius: 3, backgroundColor: barColor(g.temperature) }} />
        </View>
      </View>
      <T size={15} weight={700} color={INK} style={{ width: 46, textAlign: 'right' }}>{fmt(g.temperature)}</T>
    </View>
  );
}

/** Jauge horizontale : dégradé froid → chaud rempli jusqu'à la température, aiguille blanche, « Record ! » au-dessus. */
function Gauge({ t, record }: { t: number | null; record: boolean }) {
  const [w, setW] = useState(0);
  const target = t === null ? 0 : gaugePos(t);
  const [p] = useState(() => new Animated.Value(target));
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (!alive) return;
      if (reduce) { p.setValue(target); return; }
      Animated.timing(p, { toValue: target, duration: 1300, easing: Easing.bezier(0.22, 1.1, 0.36, 1), useNativeDriver: false }).start();
    });
    return () => { alive = false; };
  }, [target, p]);
  useEffect(() => {
    pop.setValue(0);
    if (record) Animated.sequence([Animated.delay(1100), Animated.spring(pop, { toValue: 1, useNativeDriver: false, friction: 5 })]).start();
  }, [record, t, pop]);
  const track = Math.max(0, w - 28);
  const left = p.interpolate({ inputRange: [0, 1], outputRange: [14 - 5, 14 + track - 5] });
  const fillW = p.interpolate({ inputRange: [0, 1], outputRange: [0, track] });
  return (
    <View accessibilityRole="image" accessibilityLabel={t === null ? 'Jauge de température vide' : `Jauge de température · ${fmt(t, ' °C')}`} onLayout={e => setW(e.nativeEvent.layout.width)}
      style={{ height: 34, borderRadius: 17, backgroundColor: bgDeep, paddingVertical: 8, paddingHorizontal: 14 }}>
      <View style={{ flex: 1, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
        <Animated.View style={{ height: '100%', width: fillW, overflow: 'hidden' }}>
          <LinearGradient colors={gaugeGradient as unknown as [string, string, ...string[]]} locations={gaugeStops as unknown as [number, number, ...number[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: track, height: '100%' }} />
        </Animated.View>
      </View>
      <Animated.View style={{ position: 'absolute', left, top: 0, bottom: 0, width: 10 }}>
        <Animated.View style={{ position: 'absolute', left: -25, top: -26, width: 60, paddingVertical: 1, borderRadius: 9, backgroundColor: '#FFD23F', alignItems: 'center', opacity: pop, transform: [{ scale: pop }] }}>
          <T size={11} weight={700} color={INK}>Record !</T>
        </Animated.View>
        <View style={{ position: 'absolute', left: 0, top: 4, bottom: 4, width: 10, borderRadius: 5, backgroundColor: '#FFFFFF' }} />
      </Animated.View>
    </View>
  );
}

function Option({ onPress, lead, title, sub, tag, disabled }: { onPress: () => void; lead: React.ReactNode; title: string; sub: string; tag: React.ReactNode; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#FFFFFF', boxShadow: 'inset 0 -5px 0 #E4DEF5', opacity: disabled ? 0.5 : 1 }}>
      {lead}
      <View style={{ flex: 1 }}>
        <T size={18} weight={700} color={INK}>{title}</T>
        <T size={13} weight={600} color={gameInkSoft}>{sub}</T>
      </View>
      {tag}
    </Pressable>
  );
}

/** Pack de 300 braises mis en avant (contour en dégradé orange, étiquette « POPULAIRE »). */
export function PackPopulaire({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="300 braises pour 1,99 €" onPress={onPress} style={{ marginTop: 6 }}>
      <LinearGradient colors={['#FFC24A', '#FF7A2E', '#F04E24']} locations={[0, 0.55, 1]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }}
        style={{ padding: 3, borderRadius: 21, boxShadow: 'inset 0 -5px 0 rgba(20,10,60,0.18)' }}>
        <LinearGradient colors={['#FFF8EE', '#FFEBD3']} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18 }}>
          <Coin size={44} />
          <View style={{ flex: 1 }}>
            <T size={20} weight={700} color={INK} style={{ lineHeight: 22 }}>300 braises</T>
            <T size={13} weight={600} color="#B4541E">l’indice s’utilise tout de suite</T>
          </View>
          <View style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#F04E24' }}><T size={16} weight={700} color="#FFFFFF">1,99 €</T></View>
        </LinearGradient>
      </LinearGradient>
      <View style={{ position: 'absolute', top: -11, right: 16, paddingHorizontal: 9, paddingVertical: 2, borderRadius: 9, backgroundColor: '#F04E24', borderWidth: 2, borderColor: '#FFFFFF' }}>
        <T size={11} weight={700} color="#FFFFFF" style={{ letterSpacing: 0.66, lineHeight: 13 }}>POPULAIRE</T>
      </View>
    </Pressable>
  );
}

/* ---------- Victoire ---------- */
function Victoire({ daily }: { daily: Daily }) {
  const inset = useSafeAreaInsets();
  const { state, claimReward } = daily;
  const { braises, earn } = useWallet();
  const [closest, setClosest] = useState<{ word: string; temperature: number }[]>([]);
  const gain = state.reward;
  const fresh = !state.rewardClaimed;
  const [oldCoins] = useState(() => (fresh ? braises : braises - gain));
  const [shownGain, setShownGain] = useState(fresh ? 0 : gain);
  const [shownCoins, setShownCoins] = useState(fresh ? oldCoins : braises);
  const [a] = useState(() => ({
    pop: new Animated.Value(fresh ? 0 : 1), rise: new Animated.Value(fresh ? 0 : 1), gain: new Animated.Value(fresh ? 0 : 1),
    count: new Animated.Value(0), solde: new Animated.Value(0), list: new Animated.Value(fresh ? 0 : 1), bump: new Animated.Value(0),
    fly: Array.from({ length: 8 }, () => new Animated.Value(0)), scroll: new Animated.Value(0),
  }));
  const [listH, setListH] = useState(0);

  useEffect(() => { engine.closest(state.lang, state.day, 24).then(setClosest).catch(() => {}); }, [state.lang, state.day]);
  useEffect(() => {
    if (!fresh) return;
    // même minutage que la maquette : Nabulo, le titre, le gain, puis les braises qui comptent et volent vers le solde
    const dur = Math.min(2600, Math.max(800, gain * 50));
    const start = 1300;
    const idC = a.count.addListener(({ value }) => setShownGain(Math.round(value * gain)));
    const idS = a.solde.addListener(({ value }) => setShownCoins(Math.round(oldCoins + value * gain)));
    const springy = Easing.out(Easing.back(1.6));
    Animated.parallel([
      Animated.timing(a.pop, { toValue: 1, duration: 600, delay: 100, easing: springy, useNativeDriver: true }),
      Animated.timing(a.rise, { toValue: 1, duration: 500, delay: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(a.gain, { toValue: 1, duration: 500, delay: 900, easing: springy, useNativeDriver: true }),
      Animated.timing(a.count, { toValue: 1, duration: dur, delay: start, easing: Easing.linear, useNativeDriver: false }),
      Animated.timing(a.solde, { toValue: 1, duration: dur, delay: start + 500, easing: Easing.linear, useNativeDriver: false }),
      ...a.fly.map((f, i) => Animated.timing(f, { toValue: 1, duration: 900, delay: start + (i * dur) / 8, easing: Easing.bezier(0.3, 0.6, 0.4, 1), useNativeDriver: true })),
      Animated.sequence([Animated.delay(start + 500 + dur), Animated.timing(a.bump, { toValue: 1, duration: 175, useNativeDriver: true }), Animated.timing(a.bump, { toValue: 0, duration: 175, useNativeDriver: true })]),
      Animated.timing(a.list, { toValue: 1, duration: 500, delay: start + dur + 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(() => { earn(gain); claimReward(); });
    return () => { a.count.removeListener(idC); a.solde.removeListener(idS); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // la liste défile toute seule, en boucle
  const mine = useMemo(() => new Set(state.guesses.map(g => g.word)), [state.guesses]);
  const rows = closest;
  const contentH = rows.length * 43;
  useEffect(() => {
    if (!contentH || contentH <= listH) return;
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then(r => {
      if (r) return;
      a.scroll.setValue(0);
      loop = Animated.loop(Animated.timing(a.scroll, { toValue: 1, duration: 28000, easing: Easing.linear, useNativeDriver: true }));
      loop.start();
    });
    return () => loop?.stop();
  }, [contentH, listH, a.scroll]);

  const rise = (v: Animated.Value) => ({ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] });
  const row = (c: { word: string; temperature: number }, i: number, key: string) => (
    <View key={key} style={{ height: 38, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: c.word === state.secret ? '#FFD23F' : mine.has(c.word) ? '#FFF3B0' : 'rgba(255,255,255,0.92)' }}>
      <T size={13} weight={700} color="#6B6290" style={{ width: 22, textAlign: 'right' }}>{i + 1}</T>
      <T size={16} weight={700} color="#2B2150" style={{ flex: 1 }} numberOfLines={1}>{c.word}</T>
      <T size={15} weight={700} color="#B8381A">{fmt(c.temperature)}</T>
    </View>
  );
  const share = () => Share.share({ message: `Nabulo · Mot du jour n°${state.day} trouvé en ${state.guesses.length} essais${state.hintsUsed ? ` (${state.hintsUsed} indice${state.hintsUsed > 1 ? 's' : ''})` : ''} 🔥` }).catch(() => {});

  return (
    <View style={{ flex: 1 }}>
      <SlidingGradient colors={warmGradient} stops={warmStops} duration={10000} />
      <Confetti />
      <View style={{ flex: 1, paddingTop: inset.top + 6, paddingBottom: inset.bottom + 24, paddingHorizontal: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => router.back()}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={20} color="#FFFFFF" />
          </Pressable>
          <T size={22} weight={700} outline style={{ flex: 1 }}>Mot du jour n°{state.day}</T>
          <Animated.View accessibilityLabel={`Solde : ${shownCoins} braises`} style={{ height: 38, marginLeft: 16, paddingLeft: 32, paddingRight: 12, borderRadius: 19, backgroundColor: '#FFFFFF', justifyContent: 'center', transform: [{ scale: a.bump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }}>
            <Coin size={42} style={{ position: 'absolute', left: -12, top: -2 }} />
            <T size={18} weight={700} color="#2B2150" style={{ minWidth: 36, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{shownCoins}</T>
          </Animated.View>
        </View>

        <View style={{ alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Animated.View style={{ width: 104, height: 104, marginTop: 33, marginBottom: 6, transform: [{ translateY: 52 }, { scale: a.pop }, { translateY: -52 }] }}>
            <Image source={images.nabuloSaut} autoplay style={{ position: 'absolute', left: -31, top: -58, width: 166, height: 166 }} contentFit="contain" accessibilityLabel="Nabulo saute de joie, le poing en l’air" />
          </Animated.View>
          <Animated.View style={[{ alignItems: 'center', gap: 8 }, rise(a.rise)]}>
            <T size={34} weight={700} color="#FFFFFF" style={[{ lineHeight: 36 }, { textShadowColor: '#2B2150', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 }]}>Trouvé !</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ paddingVertical: 3, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#FFD23F', boxShadow: 'inset 0 -4px 0 #E3A91C' }}><T size={22} weight={700} color="#2B2150">{state.secret}</T></View>
              <T size={19} weight={700} color="#FFFFFF">100 °C</T>
            </View>
            <T size={17} weight={600} color="#FFFFFF">en <T size={17} weight={700} color="#FFFFFF">{state.guesses.length} essais</T>{state.hintsUsed ? ` · ${state.hintsUsed} indice${state.hintsUsed > 1 ? 's' : ''}` : ''}</T>
          </Animated.View>
        </View>

        <Animated.View accessibilityRole="text" accessibilityLabel={`${gain} braises gagnées`}
          style={{ alignSelf: 'center', marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingRight: 26, paddingBottom: 14, paddingLeft: 18, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.18)', opacity: a.gain, transform: [{ scale: a.gain }] }}>
          {fresh && a.fly.map((f, i) => (
            <Animated.View key={i} pointerEvents="none" style={{
              position: 'absolute', left: 54 - 15, top: 50 - 15,
              opacity: f.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: f.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, [-30, 20, -10, 34, -24, 8, 28, -16][i], 178] }) },
                { translateY: f.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, -40, -300] }) },
                { scale: f.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.6, 1, 0.5] }) },
              ],
            }}><Coin size={30} /></Animated.View>
          ))}
          <Coin size={72} />
          <View>
            <T size={60} weight={700} color="#FFFFFF" style={{ lineHeight: 62, fontVariant: ['tabular-nums'], textShadowColor: '#2B2150', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0 }}>+{shownGain}</T>
            <T size={18} weight={700} color="#FFFFFF" style={{ marginTop: 4, lineHeight: 18 }}>braises gagnées</T>
          </View>
        </Animated.View>

        <Animated.View style={[{ flex: 1, minHeight: 0, gap: 6 }, rise(a.list)]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
            <T size={14} weight={700} color="#FFFFFF">Les plus proches de « {state.secret} »</T>
            <T size={14} weight={700} color="#FFFFFF" style={{ opacity: 0.85 }}>jaune = tes mots</T>
          </View>
          <View style={{ flex: 1, minHeight: 0, overflow: 'hidden', borderRadius: 16 }} onLayout={e => setListH(e.nativeEvent.layout.height)}>
            <Animated.View style={{ gap: 5, transform: [{ translateY: a.scroll.interpolate({ inputRange: [0, 1], outputRange: [0, -contentH] }) }] }}>
              {rows.map((c, i) => row(c, i, 'a' + c.word))}
              {contentH > listH && rows.map((c, i) => row(c, i, 'b' + c.word))}
            </Animated.View>
          </View>
        </Animated.View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Partager" variant="white" fontSize={18} color="#2B2150" style={{ flex: 1 }} onPress={share} />
          <Button label="Continuer" fontSize={18} color="#2B2150" style={{ flex: 1 }} onPress={() => router.back()} />
        </View>
      </View>
    </View>
  );
}

