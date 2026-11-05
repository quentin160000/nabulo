/* Coop · Synchro (planche J-coop-21), avec un partenaire IA. */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import {
  RECORD_SYNCHRO, SYNCHRO_ROUNDS, aiAssociate, checkAssociate, closeWords, commonSeed, firstPrompt, synchroLabel, synchroScore,
} from '@/game/coop';
import { rng, temperature } from '@/game/lexicon';
import { warmGradient, warmStops } from '@/theme/colors';
import { SlidingGradient } from '@/ui/backgrounds';
import { Bubble } from '@/ui/Bubble';
import { Confetti } from '@/ui/Confetti';
import { T } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { SynchroDial } from '@/ui/coop-dial';
import { Avatar, CoopButton, fitSize, EndScreen, INK, PartnerPicker, RulesScreen, Screen, TopBar, WordField, useRecord } from '@/ui/coop-kit';

type Phase = 'partner' | 'rules' | 'input' | 'reveal' | 'end';
type Turn = { prompt: string; me: string; ai: string; score: number };

const STEPS = [
  'Un mot s’affiche pour vous deux.',
  'Chacun tape un mot associé, sans voir celui de l’autre.',
  'Plus vos deux mots sont proches entre eux, plus vous marquez.',
  `${SYNCHRO_ROUNDS} manches : visez le meilleur score d’équipe.`,
];

export default function Synchro() {
  const [phase, setPhase] = useState<Phase>('partner');
  const [rand] = useState(() => rng(Date.now()));
  const [prompt, setPrompt] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [ai, setAi] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [final, setFinal] = useState('');
  const [oldRecord, setOldRecord] = useState(0);
  const { record, submit } = useRecord(RECORD_SYNCHRO);
  const toast = useToast();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const used = (extra: string[] = []) => [...turns.flatMap(t => [t.prompt, t.me, t.ai]), ...extra];
  const team = turns.reduce((s, t) => s + t.score, 0);
  const roundNo = turns.length + (phase === 'reveal' ? 0 : 1);

  const cur = useRef<{ prompt: string; me: string | null; ai: string | null }>({ prompt: '', me: null, ai: null });
  /** Les deux mots sont prêts : on révèle. */
  const reveal = () => {
    const { prompt: p, me: m, ai: a } = cur.current;
    if (!m || !a) return;
    setTurns(ts => [...ts, { prompt: p, me: m, ai: a, score: synchroScore(m, a) }]);
    setPhase('reveal');
  };
  /** L'IA réfléchit pendant que le joueur tape. */
  const think = (p: string, past: Turn[]) => {
    cur.current = { prompt: p, me: null, ai: null };
    setMe(null); setAi(null); setText('');
    const prevYou = past.length ? past[past.length - 1].me : null;
    const taken = [...past.flatMap(t => [t.prompt, t.me, t.ai]), p];
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const w = aiAssociate(p, prevYou, taken, rand);
      cur.current.ai = w; setAi(w); reveal();
    }, 1600 + rand() * 1600);
  };
  const start = () => { const p = firstPrompt(rand); setTurns([]); setPrompt(p); setPhase('input'); think(p, []); };

  const validate = () => {
    if (me) return;
    const c = checkAssociate(text, prompt);
    if (!c.ok) {
      toast.show(c.reason === 'plusieurs' ? 'Un seul mot, sans espace' : c.reason === 'interdit' ? 'Pas le mot affiché !' : c.reason === 'inconnu' ? `Je ne connais pas « ${c.word} »` : 'Tape un mot associé');
      return;
    }
    cur.current.me = c.word; setMe(c.word); reveal();
  };
  const next = () => {
    const last = turns[turns.length - 1];
    const following = commonSeed(last.me, last.ai, used());
    if (turns.length >= SYNCHRO_ROUNDS) {
      setFinal(following);
      setOldRecord(submit(team));
      setPhase('end');
      return;
    }
    setPrompt(following); setPhase('input'); think(following, turns);
  };

  if (phase === 'partner') {
    return (
      <Screen>
        <PartnerPicker mode="Synchro" footer={record > 0 ? `Meilleur score avec l’IA : ${record}` : null} onAI={() => setPhase('rules')} onSoon={() => toast.show('Bientôt disponible')} />
        <Toast msg={toast.msg} check={false} style={{ bottom: 90 }} />
      </Screen>
    );
  }
  if (phase === 'rules') return <Screen><RulesScreen n={21} title="Synchro" steps={STEPS} onReady={start} /></Screen>;

  if (phase === 'end') {
    const best = turns.reduce((b, t) => (t.score > b.score ? t : b), turns[0]);
    const isRecord = team > oldRecord;
    return (
      <Screen bg={<><SlidingGradient colors={warmGradient} stops={warmStops} duration={10000} /><Confetti /></>}>
        <EndScreen win title={`Score d’équipe : ${team}`} sub={isRecord ? (oldRecord > 0 ? 'nouveau record avec l’IA' : 'premier record avec l’IA') : `record avec l’IA : ${oldRecord}`}
          caption="Mot trouvé · ses voisins" word={final} chips={closeWords(final, 5)}
          stats={[['Meilleure synchro', `${best.me} / ${best.ai} · ${best.score}°`], ['Record', isRecord && oldRecord > 0 ? `${team} (ancien ${oldRecord})` : String(Math.max(team, oldRecord))]]}
          onReplay={start} />
      </Screen>
    );
  }

  const teamBefore = phase === 'reveal' ? team - (turns[turns.length - 1]?.score ?? 0) : team;
  const header = (
    <TopBar title={`Synchro · manche ${roundNo}`} right={
      <Bubble bg="#FFD45C" radius={15} border={2} inset={5} style={{ height: 30, paddingHorizontal: 10, justifyContent: 'center' }}>
        <T size={14} weight={700} color={INK} numberOfLines={1}>Équipe {teamBefore}</T>
      </Bubble>
    } />
  );

  if (phase === 'input') {
    return (
      <Screen>
        <KeyboardAvoidingView style={{ flex: 1, gap: 10 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {header}
          <T size={17} weight={700} outline align="center">Un mot associé à</T>
          <View style={{ alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 18, borderRadius: 18, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#FFFFFF' }}>
            <T size={fitSize(prompt, 44, 320)} weight={700} color={INK} numberOfLines={1}>{prompt}</T>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
            <Avatar letter="IA" size={36} font={14} />
            <T size={15} weight={700} color="#FFFFFF">{ai ? 'L’IA a choisi son mot' : 'L’IA réfléchit…'}</T>
          </View>
          {me ? <T size={15} weight={700} color="#FFFFFF" align="center">Ton mot : « {me} » · on attend l’IA…</T> : null}
          <View style={{ marginTop: 'auto' }}>
            <WordField value={text} onChange={setText} onSubmit={validate} placeholder="Ton mot associé" action="Valider" disabled={!!me} label="Ton mot associé" />
          </View>
        </KeyboardAvoidingView>
        <Toast msg={toast.msg} check={false} style={{ bottom: 90 }} />
      </Screen>
    );
  }

  // 4 · Révélation
  const t = turns[turns.length - 1];
  const target = Math.max(record, SYNCHRO_ROUNDS * 60);
  const card = (letter: string, color: string, who: string, word: string) => (
    <Bubble bg="#FFFFFF" radius={22} border={2} inset={6} style={{ flex: 1, minWidth: 0, paddingTop: 14, paddingHorizontal: 10, paddingBottom: 16, alignItems: 'center', gap: 6 }}>
      <Avatar letter={letter} color={color} size={60} font={letter.length > 1 ? 22 : 26} />
      <T size={14} weight={600} color={INK} style={{ opacity: 0.65 }}>{who}</T>
      <T size={fitSize(word, 30, 146)} weight={700} color={INK} numberOfLines={1} style={{ lineHeight: 32 }}>{word}</T>
      <View style={{ marginTop: 2, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#FFE9D6' }}>
        <T size={13} weight={700} color="#B4541E">{Math.max(0, Math.round(temperature(word, t.prompt) ?? 0))}° du mot</T>
      </View>
    </Bubble>
  );
  return (
    <Screen>
      {header}
      <View style={{ alignItems: 'center', gap: 4, marginTop: 4 }}>
        <T size={14} weight={700} outline>Le mot de la manche</T>
        <View style={{ paddingVertical: 4, paddingHorizontal: 20, borderRadius: 18, backgroundColor: '#FFFFFF' }}>
          <T size={fitSize(t.prompt, 36, 318)} weight={700} color={INK} numberOfLines={1}>{t.prompt}</T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
        {card('T', '#FFD45C', 'Toi', t.me)}
        {card('IA', '#7CE0B5', 'IA', t.ai)}
      </View>
      <SynchroDial value={t.score} />
      <T size={30} weight={700} outline align="center" style={{ lineHeight: 33 }}>{synchroLabel(t.score)}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)' }}>
        <View style={{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#FFD45C' }}><T size={18} weight={700} color={INK}>+{t.score}</T></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T size={14} weight={700} color="#FFFFFF">Score d’équipe</T>
            <T size={14} weight={700} color="#FFFFFF">{teamBefore} → {team}</T>
          </View>
          <View style={{ marginTop: 6, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
            <LinearGradient colors={['#FFD45C', '#FF9A3C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.min(100, (team / target) * 100)}%`, height: '100%', borderRadius: 5 }} />
          </View>
          {record > 0 ? <T size={12} weight={600} color="rgba(255,255,255,0.8)" style={{ marginTop: 4 }}>record de l’équipe : {record}</T> : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        <T size={13} weight={700} color="#FFFFFF">Manche {turns.length} sur {SYNCHRO_ROUNDS}</T>
        {Array.from({ length: SYNCHRO_ROUNDS }, (_, i) => <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i < turns.length ? '#FFD45C' : 'rgba(255,255,255,0.3)' }} />)}
      </View>
      <View style={{ flexGrow: 1 }} />
      <View style={{ flexDirection: 'row' }}><CoopButton label={turns.length >= SYNCHRO_ROUNDS ? 'Voir le score' : 'Manche suivante'} height={60} fontSize={20} onPress={next} /></View>
    </Screen>
  );
}
