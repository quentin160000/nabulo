/* Coop · Trouve le mot (planche J-coop-17), avec un partenaire IA. */
import { useEffect, useRef, useState } from 'react';
import { Pressable, View, ScrollView } from 'react-native';
import { LIVES, RECORD_QUATRE_MOTS, aiGuess, aiHint, checkHint, closeWords, hintTemperatures, makeSeries, type Series } from '@/game/coop';
import { rng } from '@/game/lexicon';
import { Toast, useToast } from '@/ui/Toast';
import { T } from '@/ui/Text';
import { Bubble } from '@/ui/Bubble';
import {
  Avatar, CloseButton, CoopButton, EndScreen, Flame, Heart, INK, PartnerPicker, RainBg, RulesScreen, Screen, WordField, useRecord,
} from '@/ui/coop-kit';

type Phase = 'partner' | 'rules' | 'give' | 'guess' | 'answer' | 'end';
type Round = { n: number; series: Series; giver: 'me' | 'ai'; hint: string | null; pick: string | null };

const STEPS = [
  '4 mots très proches s’affichent. L’un de vous voit lequel est le bon.',
  'Il tape UN mot-indice, qui n’est pas l’un des 4.',
  'L’autre choisit le mot qu’il croit visé. Puis on inverse.',
  'Faites la plus longue série. 3 erreurs à deux et c’est fini.',
];
const GREEN = '#9BF77A';
const MISS = '#FFA79B';

export default function QuatreMots() {
  const [phase, setPhase] = useState<Phase>('partner');
  const [rand] = useState(() => rng(Date.now()));
  const [round, setRound] = useState<Round | null>(null);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [oldRecord, setOldRecord] = useState(0);
  const { record, submit } = useRecord(RECORD_QUATRE_MOTS);
  const toast = useToast();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const later = (ms: number, f: () => void) => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(f, ms); };

  const newRound = (n: number) => {
    const series = makeSeries(rand);
    const giver = n % 2 === 0 ? 'me' : 'ai';
    setText('');
    setRound({ n, series, giver, hint: null, pick: null });
    if (giver === 'me') { setThinking(false); setPhase('give'); return; }
    setThinking(true); setPhase('guess');
    later(1100 + rand() * 900, () => { setRound(r => (r ? { ...r, hint: aiHint(r.series, rand) } : r)); setThinking(false); });
  };
  const start = () => { setStreak(0); setLives(LIVES); newRound(0); };

  const resolve = (r: Round, pick: string) => {
    const ok = pick === r.series.secret;
    setRound({ ...r, pick });
    if (ok) setStreak(s => s + 1); else setLives(l => l - 1);
    setPhase('answer');
  };
  const sendHint = () => {
    if (!round || thinking) return;
    const c = checkHint(text, round.series.words);
    if (!c.ok) {
      toast.show(c.reason === 'plusieurs' ? 'Un seul mot, sans espace' : c.reason === 'interdit' ? 'Pas un des 4 mots !' : c.reason === 'inconnu' ? `Je ne connais pas « ${c.word} »` : 'Tape un mot-indice');
      return;
    }
    const r = { ...round, hint: c.word };
    setRound(r); setThinking(true);
    later(1200 + rand() * 800, () => { setThinking(false); resolve(r, aiGuess(c.word, r.series.words)); });
  };
  const next = () => {
    if (lives <= 0) { setOldRecord(submit(streak)); setPhase('end'); return; }
    newRound((round?.n ?? 0) + 1);
  };

  if (phase === 'partner') {
    return (
      <Screen>
        <PartnerPicker mode="Trouve le mot" footer={record > 0 ? `Record avec l’IA : série de ${record}` : null} onAI={() => setPhase('rules')} onSoon={() => toast.show('Bientôt disponible')} />
        <Toast msg={toast.msg} check={false} style={{ bottom: 90 }} />
      </Screen>
    );
  }
  if (phase === 'rules') return <Screen><RulesScreen title="Trouve le mot" steps={STEPS} onReady={start} /></Screen>;
  if (!round) return <Screen>{null}</Screen>;

  if (phase === 'end') {
    const best = Math.max(oldRecord, streak);
    return (
      <Screen bg={<RainBg />}>
        <EndScreen win={false} title={`${LIVES} erreurs`} sub={`série de ${streak} · ${streak > oldRecord && streak > 0 ? 'nouveau record !' : `votre record : ${best}`}`}
          caption="Le mot était" word={round.series.secret} chips={closeWords(round.series.secret, 5)}
          stats={[['Série', String(streak)], ['Record avec l’IA', String(best)]]} onReplay={start} />
      </Screen>
    );
  }

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <CloseButton />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View accessibilityLabel={`Série de ${streak}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingLeft: 8, paddingRight: 12, borderRadius: 17, backgroundColor: '#FFFFFF' }}>
          <Flame />
          <T size={20} weight={700} color={INK} style={{ lineHeight: 20 }}>{streak}</T>
          <T size={11} weight={700} color={INK} style={{ lineHeight: 11, opacity: 0.6, marginTop: 4 }}>série</T>
        </View>
      </View>
      <View accessibilityLabel={`${lives} vie${lives > 1 ? 's' : ''} sur ${LIVES}`} style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 8, borderRadius: 17, backgroundColor: 'rgba(43,33,80,0.28)' }}>
        {Array.from({ length: LIVES }, (_, i) => <Heart key={i} full={i < lives} />)}
      </View>
    </View>
  );
  const s = round.series;
  const row = (w: string, opts: { bg?: string; tag?: string; onPress?: () => void } = {}) => {
    const inner = (
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 70, paddingHorizontal: 18, borderRadius: 18, borderWidth: 2, borderColor: 'transparent', backgroundColor: opts.bg ?? '#FFFFFF' }}>
        <T size={26} weight={700} color={INK} style={{ flex: 1, minWidth: 0 }} numberOfLines={1} adjustsFontSizeToFit>{w}</T>
        {opts.tag ? <View style={{ flexShrink: 0, marginLeft: 8, paddingVertical: 2, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#2B2150' }}><T size={13} weight={700} color="#FFFFFF" numberOfLines={1}>{opts.tag}</T></View> : null}
      </View>
    );
    return opts.onPress
      ? <Pressable key={w} accessibilityRole="button" accessibilityLabel={`Choisir ${w}`} onPress={opts.onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>{inner}</Pressable>
      : <View key={w}>{inner}</View>;
  };

  if (phase === 'give') {
    return (
      <Screen keyboard>
        <View style={{ flex: 1, gap: 10 }}>
          {header}
          <T size={17} weight={700} outline align="center">{thinking ? `« ${round.hint} » envoyé · l’IA réfléchit…` : 'Fais deviner le bon mot à l’IA'}</T>
          {/* clavier ouvert : les 4 mots défilent au lieu de pousser le champ contre le clavier */}
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 10 }} keyboardShouldPersistTaps="handled">
            {s.words.map(w => row(w, w === s.secret ? { bg: GREEN, tag: 'le bon' } : {}))}
          </ScrollView>
          <View style={{ marginTop: 'auto', paddingTop: 10 }}>
            <WordField value={text} onChange={setText} onSubmit={sendHint} placeholder="Un seul mot, pas un des 4" action="Envoyer" disabled={thinking} label="Ton mot-indice" />
          </View>
        </View>
        <Toast msg={toast.msg} check={false} style={{ bottom: 90 }} />
      </Screen>
    );
  }

  if (phase === 'guess') {
    return (
      <Screen>
        {header}
        <Bubble bg="#FFF3B0" radius={16} border={2} inset={5} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
          <Avatar letter="IA" size={44} font={17} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={13} weight={600} color={INK}>Indice de l’IA</T>
            <T size={28} weight={700} color={INK} numberOfLines={1} adjustsFontSizeToFit>{round.hint ?? 'réfléchit…'}</T>
          </View>
        </Bubble>
        <T size={17} weight={700} outline align="center">Quel mot vise-t-elle ?</T>
        <View style={{ gap: 10, opacity: round.hint ? 1 : 0.6 }}>
          {s.words.map(w => row(w, round.hint ? { onPress: () => resolve(round, w) } : {}))}
        </View>
        <View style={{ flexGrow: 1 }} />
      </Screen>
    );
  }

  // 5 · Réponse
  const ok = round.pick === s.secret;
  const temps = round.hint ? hintTemperatures(round.hint, s.words) : [];
  return (
    <Screen>
      {header}
      <T size={22} weight={700} outline align="center">{ok ? `Bien joué ! Série ${streak}` : lives > 0 ? `Raté ! Encore ${lives} vie${lives > 1 ? 's' : ''}` : 'Raté ! Plus de vie'}</T>
      <T size={15} weight={600} color="#FFFFFF" align="center">« {round.hint} » : {temps.map(t => `${t.word} ${Math.round(t.temperature)}°`).join(' · ')}</T>
      <View style={{ gap: 10 }}>
        {s.words.map(w => row(w, w === s.secret ? { bg: GREEN } : w === round.pick ? { bg: MISS, tag: round.giver === 'me' ? 'choix de l’IA' : 'ton choix' } : {}))}
      </View>
      <View style={{ flexGrow: 1 }} />
      <View style={{ flexDirection: 'row' }}><CoopButton label={lives > 0 ? 'Suivant' : 'Voir le résultat'} height={60} fontSize={20} onPress={next} /></View>
    </Screen>
  );
}
