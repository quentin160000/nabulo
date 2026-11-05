import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Easing, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, type TextInputInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AVEUGLE_ALERTE, AVEUGLE_DUREE, GAIN_DEFAITE, GAIN_VICTOIRE, aiDelay, aiSecret, bestGuess, blindAiPick, blindTimeoutWinner, checkBlindGuess, clock, deg,
  endChipColor, fmt1, secretOk, type BlindGuess, type Niveau,
} from '@/game/duel';
import { useDuelHistory, useNiveau, usePlayerName } from '@/game/duel-store';
import { neighbors, temperature } from '@/game/lexicon';
import { moodLabel, moodOf, normalizeWord, tempColor } from '@/game/temperature';
import { useWallet } from '@/game/wallet';
import { gaugeGradient, gaugeStops } from '@/theme/colors';
import { Bubble } from '@/ui/Bubble';
import { Button } from '@/ui/Button';
import { Chip, Icon, images } from '@/ui/bits';
import { BigTitle, DuelBg, DuelEnd, DuelHeader, DuelScreen, INK, NiveauPicker, OpponentChoice, leave } from '@/ui/duel-ui';
import { Mascot } from '@/ui/Mascot';
import { T } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { useKeyboardVisible, keepFocus } from '@/ui/game';

const GAME = 'Duel à l’aveugle';
const SH = '#2B2150';
const SH2 = { textShadowColor: SH, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 } as const;
type Phase = 'choix' | 'version' | 'secret' | 'jeu' | 'fin';
type Version = 'croises' | 'meme';
/** myTarget : le mot que je cherche · aiTarget : celui que cherche l'IA (le même en « même mot »). */
type Match = { version: Version; myTarget: string; aiTarget: string };
type Result = { winner: 'me' | 'opp'; byTime: boolean; mine: BlindGuess[]; theirs: BlindGuess[] };
const rand = Math.random;
const seed = () => Math.floor(Math.random() * 1e9);

export default function DuelAveugle() {
  const { adversaire } = useLocalSearchParams<{ adversaire?: string }>();
  const [phase, setPhase] = useState<Phase>(adversaire === 'ia' ? 'version' : 'choix');
  const [version, setVersion] = useState<Version>('croises');
  const [match, setMatch] = useState<Match | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [niveau, setNiveau] = useNiveau();
  const myName = usePlayerName();
  const history = useDuelHistory('aveugle');
  const toast = useToast();

  const start = (v: Version) => {
    setResult(null);
    if (v === 'croises') { setPhase('secret'); return; }
    const w = aiSecret(seed(), match ? [match.myTarget] : []);
    setMatch({ version: 'meme', myTarget: w, aiTarget: w });
    setPhase('jeu');
  };

  if (phase === 'choix') {
    return (
      <DuelScreen>
        <OpponentChoice game={GAME} history={history} onAi={() => setPhase('version')} onSoon={() => toast.show('Bientôt disponible')} />
        <Toast msg={toast.msg} check={false} style={{ bottom: 60 }} />
      </DuelScreen>
    );
  }
  if (phase === 'version') return <Versions value={version} onChange={setVersion} niveau={niveau} setNiveau={setNiveau} onNext={() => start(version)} />;
  if (phase === 'secret') {
    return <Secret onValid={w => { setMatch({ version: 'croises', aiTarget: w, myTarget: aiSecret(seed(), [w]) }); setPhase('jeu'); }} />;
  }
  if (phase === 'jeu' && match) return <EnJeu key={match.myTarget + match.aiTarget} match={match} niveau={niveau} onEnd={r => { setResult(r); setPhase('fin'); }} />;
  if (phase === 'fin' && match && result) return <Fin match={match} result={result} myName={myName} record={history.record} onRevanche={() => start(match.version)} />;
  return <DuelBg />;
}

/* ---------- 2 · Choix de la version ---------- */
function Versions({ value, onChange, niveau, setNiveau, onNext }: { value: Version; onChange: (v: Version) => void; niveau: Niveau; setNiveau: (n: Niveau) => void; onNext: () => void }) {
  const card = (v: Version, title: string, desc: string) => (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: value === v }} accessibilityLabel={title} accessibilityHint={desc} onPress={() => onChange(v)}
      style={{ borderRadius: 18, borderWidth: 2, borderColor: 'transparent', backgroundColor: value === v ? '#FFF3B0' : '#FFFFFF', paddingVertical: 12, paddingHorizontal: 14 }}>
      <T size={24} weight={700} color={INK}>{title}</T>
      <T size={15} weight={500} color={INK}>{desc}</T>
    </Pressable>
  );
  return (
    <DuelScreen>
      <DuelHeader title={GAME} />
      <BigTitle title="Quelle version ?" sub="contre l’IA" />
      <View style={{ flex: 1 }} />
      {card('croises', 'Mots croisés', 'Chacun choisit un mot secret pour l’autre. Le premier qui trouve le mot de l’adversaire gagne.')}
      {card('meme', 'Même mot', 'Un mot tiré au hasard, inconnu de vous deux. Le premier qui le trouve gagne.')}
      <View style={{ flex: 1 }} />
      <NiveauPicker value={niveau} onChange={setNiveau} />
      <Button label="Continuer" variant="yellow" border={2} height={60} fontSize={20} onPress={onNext} />
    </DuelScreen>
  );
}

/* ---------- 3 · Mots croisés · ton mot secret ---------- */
function Secret({ onValid }: { onValid: (w: string) => void }) {
  const inset = useSafeAreaInsets();
  const [text, setText] = useState('');
  const toast = useToast();
  const kb = useKeyboardVisible();
  const ok = () => {
    const r = secretOk(text);
    if (r === 'vide') return;
    if (r === 'inconnu') { toast.show(`Je ne connais pas « ${normalizeWord(text)} »`); return; }
    if (r === 'rare') { toast.show('Choisis un seul mot, de 3 lettres ou plus'); return; }
    Keyboard.dismiss();
    onValid(normalizeWord(text));
  };
  return (
    <View style={{ flex: 1 }}>
      <DuelBg />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, paddingTop: inset.top + 8, paddingBottom: inset.bottom + 10, paddingHorizontal: 16, gap: 10 }}>
          <DuelHeader title="Mots croisés" />
          <BigTitle title="Choisis un mot pour l’IA" sub="elle devra le trouver" />
          {!kb || Platform.OS === 'web' ? <Image source={images.nabulo} style={{ width: 100, height: 100, alignSelf: 'center' }} contentFit="contain" accessibilityLabel="Nabulo" /> : null}
          <Bubble bg="#FFFFFF" radius={18} border={2} inset={6} colors={{ diag: '#FFFFFF' }} style={{ paddingTop: 12, paddingBottom: 14, paddingHorizontal: 14 }}>
            <T size={14} weight={600} color={INK}>Un vrai mot du dictionnaire, pas de nom propre.</T>
          </Bubble>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={text} onChangeText={setText} onSubmitEditing={ok} placeholder="lion" placeholderTextColor="#7C7399" autoFocus autoCapitalize="none" autoCorrect={false}
              returnKeyType="done" submitBehavior="submit" {...keepFocus} accessibilityLabel="Ton mot secret" secureTextEntry={false}
              style={{ flex: 1, minWidth: 0, height: 50, borderRadius: 16, backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center', fontFamily: 'Fredoka_500Medium', fontSize: 17, color: INK, outlineStyle: 'none' } as object}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Valider" onPress={ok} disabled={!text.trim()}
              style={{ height: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#FFD45C', alignItems: 'center', justifyContent: 'center' }}>
              <T size={17} weight={700} color={INK}>Valider</T>
            </Pressable>
          </View>
        </View>
        <Toast msg={toast.msg} check={false} style={{ bottom: 70 + inset.bottom }} />
      </KeyboardAvoidingView>
    </View>
  );
}

/* ---------- 4 / 5 · En jeu ---------- */
const barColor = (t: number) => (t >= 100 ? '#FFB020' : t >= 60 ? '#FF5A36' : t >= 40 ? '#FF9A3C' : t >= 20 ? '#5FC3EE' : t >= 0 ? '#9DBDF0' : '#5B8DEF');
const gaugePos = (t: number) => Math.max(0, Math.min(1, (t + 30) / 130));

function EnJeu({ match, niveau, onEnd }: { match: Match; niveau: Niveau; onEnd: (r: Result) => void }) {
  const inset = useSafeAreaInsets();
  const [mine, setMine] = useState<BlindGuess[]>([]);
  const [left, setLeft] = useState(AVEUGLE_DUREE);
  const [last, setLast] = useState<BlindGuess | null>(null);
  const [text, setText] = useState('');
  const toast = useToast();
  const kb = useKeyboardVisible();
  const input = useRef<TextInputInstance>(null);
  const ref = useRef({ mine: [] as BlindGuess[], theirs: [] as BlindGuess[], done: false, warned: false });
  const finish = (winner: 'me' | 'opp', byTime: boolean) => {
    if (ref.current.done) return;
    ref.current.done = true;
    onEnd({ winner, byTime, mine: ref.current.mine, theirs: ref.current.theirs });
  };
  const finishRef = useRef(finish);
  useEffect(() => { finishRef.current = finish; });

  useEffect(() => {
    const end = Date.now() + AVEUGLE_DUREE * 1000;
    const id = setInterval(() => {
      const s = (end - Date.now()) / 1000;
      setLeft(Math.max(0, s));
      if (s <= 0) { clearInterval(id); finishRef.current(blindTimeoutWinner(ref.current.mine, ref.current.theirs), true); }
    }, 250);
    return () => clearInterval(id);
  }, []);

  // l'IA cherche de son côté, avec un léger délai entre deux essais
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const play = () => {
      t = setTimeout(() => {
        if (ref.current.done) return;
        const w = blindAiPick(match.aiTarget, niveau, ref.current.theirs, rand);
        const g = { word: w, temperature: temperature(match.aiTarget, w) ?? -50, order: ref.current.theirs.length };
        ref.current.theirs = [...ref.current.theirs, g];
        if (w === match.aiTarget) { finishRef.current('opp', false); return; }
        if (g.temperature >= AVEUGLE_ALERTE && !ref.current.warned) { ref.current.warned = true; toast.show('Attention, l’IA brûle !'); }
        play();
      }, aiDelay(niveau, rand, 'aveugle'));
    };
    play();
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.aiTarget, niveau]);

  const send = () => {
    const c = checkBlindGuess(match.myTarget, text, mine);
    setText('');
    input.current?.focus();
    if (c.kind === 'vide') return;
    if (c.kind === 'inconnu') { toast.show(`Je ne connais pas « ${c.word} »`); return; }
    if (c.kind === 'deja') { toast.show(`« ${c.word} » est déjà dans ta liste`); return; }
    const next = [...mine, c.guess];
    ref.current.mine = next;
    setMine(next);
    setLast(c.guess);
    if (c.guess.temperature >= 100) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      finish('me', false);
    }
  };

  const rows = useMemo(() => [...mine].sort((a, b) => b.temperature - a.temperature || b.order - a.order).slice(0, 30), [mine]);
  const mood = last ? moodOf(last.temperature) : null;
  const title = match.version === 'croises' ? 'Trouve le mot de l’IA' : 'Même mot';
  return (
    <View style={{ flex: 1 }}>
      <DuelBg />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, paddingTop: inset.top + 10, paddingBottom: inset.bottom + 10, paddingHorizontal: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Quitter le duel" onPress={leave} hitSlop={4}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={20} color="#FFFFFF" />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T size={22} weight={700} color="#FFFFFF" numberOfLines={1} style={[{ lineHeight: 23 }, SH2]}>{title}</T>
              <T size={13} weight={600} color="#FFFFFF">contre l’IA · {mine.length} essai{mine.length > 1 ? 's' : ''}</T>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 15, backgroundColor: '#FFFFFF' }}>
              <Icon name="clock" size={15} color={SH} width={2.4} />
              <T size={15} weight={700} color={SH} style={{ fontVariant: ['tabular-nums'] }} accessibilityLabel={`Temps restant ${clock(left)}`}>{clock(left)}</T>
            </View>
          </View>

          <View style={{ flex: 1, minHeight: 0, justifyContent: kb ? 'center' : 'flex-start', gap: 10, paddingTop: kb ? 0 : 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {mood && last ? <Mascot mood={mood} size={92} /> : <Image source={images.nabulo} style={{ width: 92, height: 92 }} contentFit="contain" accessibilityLabel="Nabulo" />}
              <View style={{ alignItems: 'flex-start', gap: 8, minWidth: 0, flexShrink: 1 }}>
                <T size={30} weight={700} color="#FFFFFF" numberOfLines={1} style={[{ lineHeight: 33, maxWidth: 210 }, SH2]}>{last ? last.word : 'À toi !'}</T>
                {last && mood ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Chip label={fmt1(last.temperature, ' °C')} bg={tempColor(last.temperature)} size={22} color={SH} style={{ paddingHorizontal: 12, paddingVertical: 3, borderRadius: 14, borderWidth: 0 }} />
                    <T size={22} weight={700} color="#FFFFFF" style={SH2}>{moodLabel[mood].replace(' !', '')}</T>
                  </View>
                ) : (
                  <T size={17} weight={600} outline>Propose un premier mot</T>
                )}
              </View>
            </View>
            <Gauge t={last?.temperature ?? null} />
            <View style={[{ borderRadius: 22, backgroundColor: 'rgba(20,10,60,0.35)', padding: 8, gap: 6 }, kb ? { flexShrink: 1, minHeight: 0 } : { flex: 1, minHeight: 0 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 }}>
                <T size={14} weight={600} color="#FFFFFF">Les plus chauds</T>
                {rows.length > 4 ? <T size={14} weight={600} color="#FFFFFF" style={{ opacity: 0.85 }}>glisse ↓</T> : null}
              </View>
              <ScrollView style={kb ? { maxHeight: 186, borderRadius: 14 } : { flex: 1, borderRadius: 14 }} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
                {rows.length === 0 && (
                  <View style={{ height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' }}>
                    <T size={14} weight={600} color="#FFFFFF">tes essais s’afficheront ici</T>
                  </View>
                )}
                {rows.map((g, i) => (
                  <View key={g.word} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingLeft: 6, paddingRight: 10, borderRadius: 14, backgroundColor: i === 0 ? '#FFF3B0' : '#F4F1FF' }}>
                    <View style={{ minWidth: 32, paddingVertical: 2, paddingHorizontal: 5, borderRadius: 9, backgroundColor: '#FFFFFF', alignItems: 'center' }}>
                      <T size={12} weight={700} color={SH}>{i + 1}</T>
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <T size={16} weight={600} color={SH} numberOfLines={1} style={{ lineHeight: 18 }}>{g.word}</T>
                      <View style={{ height: 6, borderRadius: 3, backgroundColor: '#E2DEEE', overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${Math.max(4, Math.round(gaugePos(g.temperature) * 100))}%`, borderRadius: 3, backgroundColor: barColor(g.temperature) }} />
                      </View>
                    </View>
                    <T size={15} weight={700} color={SH} style={{ width: 50, textAlign: 'right' }}>{fmt1(g.temperature)}</T>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              ref={input} value={text} onChangeText={setText} onSubmitEditing={send} placeholder="Tape un mot" placeholderTextColor="#7C7399"
              autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="send" submitBehavior="submit" {...keepFocus} accessibilityLabel="Ton mot"
              style={{ flex: 1, minWidth: 0, height: 52, borderRadius: 17, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center', fontFamily: 'Fredoka_500Medium', fontSize: 20, color: SH, outlineStyle: 'none' } as object}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Proposer" onPress={send} disabled={!text.trim()}
              style={{ height: 52, paddingHorizontal: 16, borderRadius: 17, backgroundColor: '#FFD45C', alignItems: 'center', justifyContent: 'center' }}>
              <T size={18} weight={700} color={SH}>Proposer</T>
            </Pressable>
          </View>
        </View>
        <Toast msg={toast.msg} check={false} style={{ bottom: 72 + inset.bottom }} />
      </KeyboardAvoidingView>
    </View>
  );
}

/** Jauge de température (fond sombre, dégradé froid → chaud, aiguille blanche cerclée). */
function Gauge({ t }: { t: number | null }) {
  const [w, setW] = useState(0);
  const target = t === null ? 0 : gaugePos(t);
  const [p] = useState(() => new Animated.Value(target));
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (!alive) return;
      if (reduce) { p.setValue(target); return; }
      Animated.timing(p, { toValue: target, duration: 1000, easing: Easing.bezier(0.22, 1.1, 0.36, 1), useNativeDriver: false }).start();
    });
    return () => { alive = false; };
  }, [target, p]);
  const track = Math.max(0, w - 28);
  return (
    <View accessibilityRole="image" accessibilityLabel={t === null ? 'Jauge de température vide' : `Jauge de température · ${fmt1(t, ' °C')}`} onLayout={e => setW(e.nativeEvent.layout.width)}
      style={{ height: 32, borderRadius: 16, backgroundColor: 'rgba(20,10,60,0.35)', paddingVertical: 8, paddingHorizontal: 14 }}>
      <View style={{ flex: 1, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
        <Animated.View style={{ height: '100%', width: p.interpolate({ inputRange: [0, 1], outputRange: [0, track] }), overflow: 'hidden', borderRadius: 8 }}>
          <LinearGradient colors={gaugeGradient as unknown as [string, string, ...string[]]} locations={gaugeStops as unknown as [number, number, ...number[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: track, height: '100%' }} />
        </Animated.View>
      </View>
      <Animated.View style={{ position: 'absolute', top: 3, bottom: 3, width: 10, borderRadius: 5, borderWidth: 2, borderColor: SH, backgroundColor: '#FFFFFF', left: p.interpolate({ inputRange: [0, 1], outputRange: [14 - 5, 14 + track - 5] }) }} />
    </View>
  );
}

/* ---------- 6 / 7 · Gagné / perdu ---------- */
function Fin({ match, result, myName, record, onRevanche }: { match: Match; result: Result; myName: string | null; record: (g: boolean) => Promise<void>; onRevanche: () => void }) {
  const { braises, earn } = useWallet();
  const win = result.winner === 'me';
  const gain = win ? GAIN_VICTOIRE : GAIN_DEFAITE;
  const paid = useRef(false);
  useEffect(() => {
    if (paid.current) return;
    paid.current = true;
    earn(gain);
    record(win);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const X = match.myTarget;
  const foundMe = result.mine.some(g => g.temperature >= 100);
  const foundOpp = result.theirs.some(g => g.word === match.aiTarget);
  const near = useMemo(() => neighbors(X, 5), [X]);
  const mb = bestGuess(result.mine);

  let subtitle: string;
  if (result.byTime) subtitle = win ? `temps écoulé : tu étais le plus proche de « ${X} »` : 'temps écoulé : l’IA était la plus proche';
  else if (win) subtitle = match.version === 'croises' ? `tu as trouvé « ${X} », le mot de l’IA, en premier` : `tu as trouvé « ${X} » en premier`;
  else subtitle = match.version === 'croises' ? `L’IA a trouvé ton mot « ${match.aiTarget} » avant toi` : `L’IA a trouvé « ${X} » avant toi`;

  const chip = (word: string, t: number, bg = endChipColor(t)) => ({ label: `${word} ${deg(t)}`, bg });
  const chips = win
    ? [chip(X, 100), ...near.map(n => chip(n.word, n.temperature))]
    : [chip(X, 100), ...near.slice(0, 3).filter(n => n.word !== mb?.word).map(n => chip(n.word, n.temperature)), ...(mb && mb.word !== X ? [chip(mb.word, mb.temperature, '#FFB35C')] : [])];
  const chipsTitle = win || !mb ? `Les plus proches de « ${X} »` : `Ton meilleur essai : « ${mb.word} » à ${deg(mb.temperature)}`;

  return (
    <DuelEnd
      win={win} braises={braises} title="Duel · IA" myName={myName} gain={gain} subtitle={subtitle}
      me={{ value: result.mine.length, label: foundMe ? 'essais' : 'essais · pas trouvé' }}
      opp={{ value: result.theirs.length, label: foundOpp ? 'essais' : 'essais · pas trouvé' }}
      chipsTitle={chipsTitle} chips={chips} onRevanche={onRevanche}
    />
  );
}
