import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CHRONO_DUREE, CHRONO_SEUIL, GAIN_DEFAITE, GAIN_VICTOIRE, aiDelay, checkChronoWord, chronoAiPick, clock, deg, endChipColor,
  gaugeSplit, matchOver, pickTarget, roundChipColor, roundWinner, validWords, type ChronoWord,
} from '@/game/duel';
import { useDuelHistory, useNiveau, usePlayerName } from '@/game/duel-store';
import { useWallet } from '@/game/wallet';
import { Bubble } from '@/ui/Bubble';
import { Button } from '@/ui/Button';
import { Icon, images } from '@/ui/bits';
import {
  BigTitle, DuelBg, DuelEnd, DuelGauge, DuelHeader, DuelScreen, INK, NiveauPicker, OpponentChoice, WordChip,
} from '@/ui/duel-ui';
import { T } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';

const GAME = 'Contre-la-montre duel';
type Phase = 'choix' | 'regles' | 'jeu' | 'manche' | 'fin';
type Round = { n: number; target: string; mine: ChronoWord[]; theirs: ChronoWord[]; winner: 'me' | 'opp' | null };
const rand = Math.random;

export default function ChronoDuel() {
  const { adversaire } = useLocalSearchParams<{ adversaire?: string }>();
  const [phase, setPhase] = useState<Phase>(adversaire === 'ia' ? 'regles' : 'choix');
  const [score, setScore] = useState({ me: 0, opp: 0 });
  const [round, setRound] = useState<Round | null>(null);
  const [used, setUsed] = useState<string[]>([]);
  const [niveau, setNiveau] = useNiveau();
  const myName = usePlayerName();
  const history = useDuelHistory('chrono');
  const toast = useToast();

  const startRound = useCallback((n: number, avoid: string[]) => {
    const target = pickTarget(rand, avoid);
    setUsed([...avoid, target]);
    setRound({ n, target, mine: [], theirs: [], winner: null });
    setPhase('jeu');
  }, []);
  const newMatch = useCallback(() => { setScore({ me: 0, opp: 0 }); startRound(1, []); }, [startRound]);

  const endRound = useCallback((mine: ChronoWord[], theirs: ChronoWord[]) => {
    const winner = roundWinner(mine, theirs);
    setRound(r => (r ? { ...r, mine, theirs, winner } : r));
    setScore(s => ({ me: s.me + (winner === 'me' ? 1 : 0), opp: s.opp + (winner === 'opp' ? 1 : 0) }));
    setPhase('manche');
  }, []);

  if (phase === 'choix') {
    return (
      <DuelScreen>
        <OpponentChoice game={GAME} history={history} onAi={() => setPhase('regles')} onSoon={() => toast.show('Bientôt disponible')} />
        <Toast msg={toast.msg} check={false} style={{ bottom: 60 }} />
      </DuelScreen>
    );
  }
  if (phase === 'regles') return <Regles niveau={niveau} setNiveau={setNiveau} onReady={newMatch} />;
  if (phase === 'jeu' && round) return <EnJeu key={round.n + round.target} round={round} score={score} niveau={niveau} myName={myName} onEnd={endRound} />;
  if (phase === 'manche' && round) {
    const over = matchOver(score.me, score.opp);
    return <FinManche round={round} score={score} myName={myName} over={!!over} onNext={() => (over ? setPhase('fin') : startRound(round.n + 1, used))} />;
  }
  if (phase === 'fin' && round) return <Fin round={round} score={score} myName={myName} record={history.record} onRevanche={newMatch} />;
  return <DuelBg />;
}

/* ---------- 3 · Règles ---------- */
function Regles({ niveau, setNiveau, onReady }: { niveau: 'facile' | 'normal'; setNiveau: (n: 'facile' | 'normal') => void; onReady: () => void }) {
  const steps = [
    'Même mot cible et même chrono pour vous deux.',
    `Trouve plus de mots à ${CHRONO_SEUIL}°+ que ton adversaire pour gagner la manche.`,
    'La jauge bascule vers celui qui mène.',
    'Le premier à 3 manches gagne le match.',
  ];
  return (
    <DuelScreen>
      <DuelHeader title="Règles" />
      <ScrollView style={{ flex: 1, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Bubble bg="#FFD45C" radius={27} border={2} inset={6} style={{ width: 54, height: 54, alignItems: 'center', justifyContent: 'center' }}>
            <T size={24} weight={700} color={INK}>14</T>
          </Bubble>
          <BigTitle title={GAME} sub="1 contre 1 · best of 5" />
        </View>
        <Image source={images.nabulo} style={{ width: 110, height: 110, alignSelf: 'center' }} contentFit="contain" accessibilityLabel="Nabulo" />
        <View style={{ gap: 8 }}>
          {steps.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18, backgroundColor: '#FFFFFF' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFD45C', alignItems: 'center', justifyContent: 'center' }}><T size={14} weight={700} color={INK}>{i + 1}</T></View>
              <T size={16} weight={600} color={INK} style={{ flex: 1, lineHeight: 20 }}>{s}</T>
            </View>
          ))}
        </View>
        <NiveauPicker value={niveau} onChange={setNiveau} />
      </ScrollView>
      <Button label="Prêt" variant="yellow" border={2} height={62} fontSize={22} onPress={onReady} accessibilityHint="Lance la première manche contre l’IA" />
    </DuelScreen>
  );
}

/* ---------- 4 · En jeu ---------- */
function EnJeu({ round, score, niveau, myName, onEnd }: {
  round: Round; score: { me: number; opp: number }; niveau: 'facile' | 'normal'; myName: string | null;
  onEnd: (mine: ChronoWord[], theirs: ChronoWord[]) => void;
}) {
  const inset = useSafeAreaInsets();
  const [mine, setMine] = useState<ChronoWord[]>([]);
  const [theirs, setTheirs] = useState<ChronoWord[]>([]);
  const [left, setLeft] = useState(CHRONO_DUREE);
  const [news, setNews] = useState<string>('C’est parti ! Trouve des mots proches de la cible.');
  const [text, setText] = useState('');
  const toast = useToast();
  const input = useRef<TextInputInstance>(null);
  const ref = useRef({ mine: [] as ChronoWord[], theirs: [] as ChronoWord[], done: false });

  // chrono
  useEffect(() => {
    const end = Date.now() + CHRONO_DUREE * 1000;
    const id = setInterval(() => {
      const s = (end - Date.now()) / 1000;
      setLeft(Math.max(0, s));
      if (s <= 0 && !ref.current.done) { ref.current.done = true; clearInterval(id); onEnd(ref.current.mine, ref.current.theirs); }
    }, 250);
    return () => clearInterval(id);
  }, [onEnd]);

  // l'IA joue avec un léger délai
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const play = () => {
      t = setTimeout(() => {
        if (ref.current.done) return;
        const p = chronoAiPick(round.target, niveau, ref.current.theirs.map(w => w.word), rand);
        if (p) {
          ref.current.theirs = [...ref.current.theirs, p];
          setTheirs(ref.current.theirs);
          if (p.temperature >= CHRONO_SEUIL) setNews(`L’IA vient de trouver « ${p.word} » · ${deg(p.temperature)}`);
        }
        play();
      }, aiDelay(niveau, rand));
    };
    play();
    return () => clearTimeout(t);
  }, [round.target, niveau]);

  const send = () => {
    const c = checkChronoWord(round.target, text, mine);
    setText('');
    input.current?.focus();
    if (c.kind === 'vide') return;
    if (c.kind === 'inconnu') { toast.show(`Je ne connais pas « ${c.word} »`); return; }
    if (c.kind === 'deja') { toast.show(`« ${c.word} » est déjà dans ta liste`); return; }
    if (c.kind === 'cible') { toast.show('Pas le mot cible lui-même !'); return; }
    ref.current.mine = [...ref.current.mine, { word: c.word, temperature: c.temperature }];
    setMine(ref.current.mine);
    if (c.kind === 'froid') toast.show(`« ${c.word} » · ${deg(c.temperature)}, il faut ${CHRONO_SEUIL}°+`);
    else if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const good = validWords(mine).sort((a, b) => b.temperature - a.temperature);
  return (
    <View style={{ flex: 1 }}>
      <DuelBg />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, paddingTop: inset.top + 8, paddingBottom: inset.bottom + 10, paddingHorizontal: 16, gap: 10 }}>
          <DuelHeader title={`Manche ${round.n}`} right={
            <Bubble bg="#FFD45C" radius={15} border={2} inset={5} style={{ height: 30, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View><Icon name="clock" size={14} color={INK} width={2.4} /></View>
              <T size={14} weight={700} color={INK} style={{ fontVariant: ['tabular-nums'] }} accessibilityLabel={`Temps restant ${clock(left)}`}>{clock(left)}</T>
            </Bubble>
          } />
          <DuelGauge me={score.me} opp={score.opp} split={gaugeSplit(score.me, score.opp)} myName={myName} />
          <Bubble bg="#FFFFFF" radius={12} border={2} inset={5} style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
            <T size={14} weight={700} color={INK} accessibilityLiveRegion="polite">{news}</T>
          </Bubble>
          <Bubble bg="#FFFFFF" radius={18} border={2} inset={6} style={{ paddingTop: 10, paddingBottom: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <T size={14} weight={600} color={INK}>Autour de</T>
            <T size={26} weight={700} color={INK} numberOfLines={1} style={{ flexShrink: 1 }}>{round.target}</T>
            <T size={18} weight={700} color={INK} accessibilityLabel={`${good.length} mots pour toi, ${validWords(theirs).length} pour l’IA`}>{good.length} – {validWords(theirs).length}</T>
          </Bubble>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7, paddingTop: 4 }} keyboardShouldPersistTaps="handled">
            {good.map(w => <WordChip key={w.word} label={`${w.word} ${deg(w.temperature)}`} bg={roundChipColor(w.temperature)} />)}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              ref={input} value={text} onChangeText={setText} onSubmitEditing={send} placeholder={`Un mot à ${CHRONO_SEUIL}°+`} placeholderTextColor="#7C7399"
              autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="send" submitBehavior="submit" accessibilityLabel="Ton mot"
              style={{ flex: 1, minWidth: 0, height: 50, borderRadius: 16, backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center', fontFamily: 'Fredoka_500Medium', fontSize: 17, color: INK, outlineStyle: 'none' } as object}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Proposer" onPress={send} disabled={!text.trim()}
              style={{ height: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#FFD45C', alignItems: 'center', justifyContent: 'center' }}>
              <T size={17} weight={700} color={INK}>Proposer</T>
            </Pressable>
          </View>
        </View>
        <Toast msg={toast.msg} check={false} style={{ bottom: 70 + inset.bottom }} />
      </KeyboardAvoidingView>
    </View>
  );
}

/* ---------- 5 · Fin de manche ---------- */
function FinManche({ round, score, myName, over, onNext }: { round: Round; score: { me: number; opp: number }; myName: string | null; over: boolean; onNext: () => void }) {
  const a = validWords(round.mine).length, b = validWords(round.theirs).length;
  const title = round.winner === 'me' ? 'Manche pour toi !' : round.winner === 'opp' ? 'Manche pour l’IA' : 'Égalité !';
  const sub = a === b ? `${a} mot${a > 1 ? 's' : ''} partout${round.winner ? ', départagés par le plus chaud' : ''}` : `${a} mot${a > 1 ? 's' : ''} contre ${b}`;
  const chips = validWords(round.mine).sort((x, y) => y.temperature - x.temperature);
  return (
    <DuelScreen>
      <DuelHeader title={`Manche ${round.n} terminée`} />
      <View style={{ flex: 1 }} />
      <BigTitle title={title} sub={sub} />
      <DuelGauge me={score.me} opp={score.opp} split={gaugeSplit(score.me, score.opp)} myName={myName} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7 }}>
        {chips.length ? chips.map(w => <WordChip key={w.word} label={w.word} bg={roundChipColor(w.temperature)} />)
          : <T size={15} weight={600} outline align="center">Aucun mot à {CHRONO_SEUIL}°+ autour de « {round.target} »</T>}
      </View>
      <View style={{ flex: 1 }} />
      <Button label={over ? 'Voir le résultat' : 'Manche suivante'} variant="yellow" border={2} height={60} fontSize={20} onPress={onNext} />
    </DuelScreen>
  );
}

/* ---------- 6 / 7 · Match gagné / perdu ---------- */
function Fin({ round, score, myName, record, onRevanche }: {
  round: Round; score: { me: number; opp: number }; myName: string | null; record: (g: boolean) => Promise<void>; onRevanche: () => void;
}) {
  const { braises, earn } = useWallet();
  const win = score.me > score.opp;
  const gain = win ? GAIN_VICTOIRE : GAIN_DEFAITE;
  const paid = useRef(false);
  useEffect(() => {
    if (paid.current) return;
    paid.current = true;
    earn(gain);
    record(win);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const words = [...(win ? round.mine : round.theirs)].sort((a, b) => b.temperature - a.temperature).slice(0, 5);
  const hi = Math.max(score.me, score.opp), lo = Math.min(score.me, score.opp);
  return (
    <DuelEnd
      win={win} braises={braises} title="Duel · IA" myName={myName} gain={gain}
      subtitle={win ? `tu remportes le contre-la-montre ${hi} manches à ${lo}` : `L’IA gagne ${hi} manches à ${lo}, revanche ?`}
      me={{ value: score.me, label: 'manches' }} opp={{ value: score.opp, label: 'manches' }}
      chipsTitle={win ? 'Tes meilleurs mots de la dernière manche' : 'Les mots de l’IA à la dernière manche'}
      chips={words.map(w => ({ label: `${w.word} ${deg(w.temperature)}`, bg: endChipColor(w.temperature) }))}
      onRevanche={onRevanche}
    />
  );
}
