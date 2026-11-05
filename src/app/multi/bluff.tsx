import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { neighbors, rng } from '@/game/lexicon';
import {
  BLUFF_ROUNDS, bluffAiClue, bluffAiVote, bluffOutcome, bluffWordOf, checkBluffClue, clueCandidates, makePlayers, newBluffRound, pickIn,
  rankByScore, tallyVotes, type BluffRound, type Player,
} from '@/game/multi';
import { images } from '@/ui/bits';
import { Bubble } from '@/ui/Bubble';
import {
  BigTitle, Buttons, Dots, Grow, HeadChip, INK, InputBar, JoyHero, Lobby, MAvatar, MButton, MHeader, MScreen, PRow, RankRow, Rules, Tag,
  clock, leave, useCountdown,
} from '@/ui/multi-ui';
import { T } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';

/* Le bluff · l'imposteur (maquette J-multi-18) — partie d'entraînement : toi + 4 IA. */

type Phase = 'salon' | 'regles' | 'secret' | 'indices' | 'vote' | 'revelation' | 'fin';
const AI_COUNT = 4;
const MEMO_S = 10, CLUE_S = 30, VOTE_S = 20;
const SH = { textShadowColor: '#2B2150', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 } as const;
const pts = (n: number) => `${n} pt${n > 1 ? 's' : ''}`;
const nameOf = (p: Player) => (p.me ? 'toi' : p.name);

export default function Bluff() {
  const players = useMemo(() => makePlayers(AI_COUNT), []);
  const [rand] = useState(() => rng(Date.now() % 2147483647));
  const [phase, setPhase] = useState<Phase>('salon');
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState<BluffRound | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [used, setUsed] = useState<string[]>([]);
  const [caught, setCaught] = useState(0);

  const startRound = (i: number, usedNow: string[]) => {
    const r = newBluffRound(players, rand, i, usedNow);
    setRound(r); setIndex(i); setUsed([...usedNow, r.secret]); setPhase('secret');
  };
  const newGame = () => { setScores({}); setCaught(0); startRound(0, []); };
  const endRound = (r: BluffRound) => {
    const o = bluffOutcome(r);
    setScores(s => { const n = { ...s }; for (const [id, g] of Object.entries(o.gains)) n[id] = (n[id] ?? 0) + g; return n; });
    if (o.found && r.votes.me === r.imposter) setCaught(c => c + 1);
    setRound(r); setPhase('revelation');
  };

  if (phase === 'salon') return <Lobby title="Salon · Le bluff" players={players} min={4} max={8} secondary="Inviter" onLaunch={() => setPhase('regles')} />;
  if (phase === 'regles') {
    return <Rules n={18} title="Le bluff · l’imposteur" sub="Multi · 4 à 8 joueurs" onPlay={newGame} steps={[
      'Tout le monde reçoit le même mot… sauf un : l’imposteur, qui a un mot proche.',
      'Personne ne sait qui est l’imposteur, pas même lui.',
      'Chacun à son tour donne un mot-indice.',
      'Votez pour démasquer l’imposteur. S’il passe inaperçu, c’est lui qui marque.',
    ]} />;
  }
  if (phase === 'fin') return <Fin players={players} scores={scores} caught={caught} onReplay={newGame} />;
  if (!round) return null;
  const my = scores.me ?? 0;
  if (phase === 'secret') return <Secret key={index} players={players} round={round} index={index} score={my} onDone={() => setPhase('indices')} />;
  if (phase === 'indices') return <Indices key={index} players={players} round={round} index={index} rand={rand} onDone={r => { setRound(r); setPhase('vote'); }} />;
  if (phase === 'vote') return <Vote key={index} players={players} round={round} index={index} rand={rand} onDone={endRound} />;
  return <Revelation players={players} round={round} index={index} total={my}
    onNext={() => (index + 1 >= BLUFF_ROUNDS ? setPhase('fin') : startRound(index + 1, used))} />;
}

/* ---------- 3 · Ton mot secret ---------- */
function Secret({ players, round, index, score, onDone }: { players: Player[]; round: BluffRound; index: number; score: number; onDone: () => void }) {
  const word = bluffWordOf(round, 'me');
  const left = useCountdown(MEMO_S, true, onDone, index);
  const tips = useMemo(() => {
    const good = clueCandidates(word, 30, [round.secret, round.fake])[4]?.word;
    const bad = neighbors(word, 1)[0]?.word;
    return { good, bad };
  }, [word, round.secret, round.fake]);
  return (
    <MScreen>
      <MHeader title={`Manche ${index + 1} / ${BLUFF_ROUNDS}`} right={<HeadChip label={`${score} pts`} />} />
      <Dots total={BLUFF_ROUNDS} current={index} />
      <Bubble bg="#FFFFFF" radius={26} border={2} inset={6} style={{ marginTop: 18, paddingTop: 30, paddingHorizontal: 16, paddingBottom: 28, alignItems: 'center', gap: 6, overflow: 'visible' }}>
        <Image source={images.nabulo} style={{ position: 'absolute', right: -10, top: -46, width: 92, height: 92 }} contentFit="contain" accessible={false} />
        <T size={15} weight={700} color={INK} style={{ opacity: 0.6 }}>Ton mot secret</T>
        <T size={66} weight={700} color={INK} numberOfLines={1} adjustsFontSizeToFit style={{ lineHeight: 70, letterSpacing: 0.5 }}>{word}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#F1EEFA' }}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#5B4FA8" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M3 3l18 18" /><Path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-2.6 3.2M6.3 7.6C4.2 9.2 3 12 3 12s4 6 9 6a8.6 8.6 0 0 0 3.4-.7" /><Path d="M9.9 10a3 3 0 0 0 4.2 4.1" />
          </Svg>
          <T size={13} weight={700} color="#5B4FA8">Ne le montre à personne</T>
        </View>
      </Bubble>
      <Grow max={34} />
      <View style={{ paddingVertical: 14, paddingHorizontal: 12, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)' }}>
        <T size={17} weight={700} color="#FFFFFF" align="center" style={SH}>Es-tu l’imposteur ? Peut-être…</T>
        <T size={13} weight={600} color="rgba(255,255,255,0.9)" align="center" style={{ marginTop: 2, marginBottom: 12 }}>
          Un des {players.length} joueurs a un mot proche, mais pas le même. Même lui ne le sait pas.
        </T>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {players.map(p => (
            <View key={p.id} style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 4 }}>
              <View>
                <MAvatar p={p} size={44} font={19} />
                <View style={{ position: 'absolute', right: -4, bottom: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#2B2150', alignItems: 'center', justifyContent: 'center' }}>
                  <T size={12} weight={700} color="#FFFFFF">?</T>
                </View>
              </View>
              <T size={12} weight={700} color="#FFFFFF" numberOfLines={1}>{p.name}</T>
            </View>
          ))}
        </View>
      </View>
      <Grow max={34} />
      {tips.good && tips.bad ? (
        <View style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#FFFFFF' }}>
          <T size={14} weight={700} color={INK} style={{ marginBottom: 8 }}>Prépare ton indice</T>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#D8F5E6' }}><T size={13} weight={700} color="#1E7A4A">{tips.good}</T></View>
              <T size={13} weight={600} color={INK}>assez proche pour tes alliés</T>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#FFE0D6' }}><T size={13} weight={700} color="#B4321E">{tips.bad}</T></View>
              <T size={13} weight={600} color={INK} style={{ flexShrink: 1 }}>trop évident : l’imposteur devine</T>
            </View>
          </View>
        </View>
      ) : null}
      <Grow max={34} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <T size={13} weight={700} color="#FFFFFF">Mémorise-le</T>
        <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
          <View style={{ width: `${(left / MEMO_S) * 100}%`, height: '100%', borderRadius: 4, backgroundColor: '#FFD45C' }} />
        </View>
        <T size={13} weight={700} color="#FFFFFF">{clock(left)}</T>
      </View>
      <Grow />
      <Buttons><MButton label="J’ai retenu" height={60} onPress={onDone} /></Buttons>
    </MScreen>
  );
}

/* ---------- 4 · Tour d'indices ---------- */
function Indices({ players, round, index, rand, onDone }: { players: Player[]; round: BluffRound; index: number; rand: () => number; onDone: (r: BluffRound) => void }) {
  const [clues, setClues] = useState<Record<string, string>>({});
  const [text, setText] = useState('');
  const toast = useToast();
  const turn = round.order.find(id => !clues[id]) ?? null;
  const byId = (id: string) => players.find(p => p.id === id)!;
  const mine = turn === 'me';
  const word = bluffWordOf(round, 'me');

  const give = (id: string, w: string) => setClues(c => ({ ...c, [id]: w }));
  useEffect(() => {
    if (turn === null) { const t = setTimeout(() => onDone({ ...round, clues }), 1100); return () => clearTimeout(t); }
    if (turn === 'me') return;
    const t = setTimeout(() => give(turn, bluffAiClue({ ...round, clues }, turn, rand)), 1300 + rand() * 1500);
    return () => clearTimeout(t);
  }, [turn]); // eslint-disable-line react-hooks/exhaustive-deps

  const left = useCountdown(CLUE_S, mine, () => {
    give('me', bluffAiClue({ ...round, clues }, 'me', rand));
    toast.show('Temps écoulé : un indice a été choisi pour toi');
  }, `${index}-${mine}`);

  const send = () => {
    const c = checkBluffClue({ ...round, clues }, 'me', text);
    if (!c.ok) {
      if (c.reason !== 'vide') toast.show(c.reason === 'inconnu' ? `Je ne connais pas « ${text.trim()} »` : c.reason === 'evident' ? 'Trop évident : choisis un autre mot' : 'Cet indice a déjà été donné');
      return;
    }
    setText(''); give('me', c.word);
  };

  return (
    <MScreen keyboard>
      <MHeader title={`Manche ${index + 1} · indices`} right={<HeadChip label={`⏱ ${clock(mine ? left : CLUE_S)}`} />} />
      <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ gap: 7 }} showsVerticalScrollIndicator={false}>
        {round.order.map(id => {
          const p = byId(id);
          return <PRow key={id} p={p} avatar={36} avatarFont={16} right={<Tag label={clues[id] ?? '…'} bg="#FFF3B0" size={16} />} />;
        })}
      </ScrollView>
      <T size={16} weight={700} outline align="center">
        {turn === null ? 'Tous les indices sont donnés !' : mine ? `À toi : un mot lié à « ${word} »` : `${byId(turn).name} cherche un indice…`}
      </T>
      <View style={{ flex: 1 }} />
      <InputBar value={text} onChange={setText} onSubmit={send} placeholder="Ton indice" action="Envoyer" disabled={!mine} />
      <Toast msg={toast.msg} check={false} style={{ bottom: 70 }} />
    </MScreen>
  );
}

/* ---------- 5 · Vote ---------- */
function Vote({ players, round, index, rand, onDone }: { players: Player[]; round: BluffRound; index: number; rand: () => number; onDone: (r: BluffRound) => void }) {
  const ai = useMemo(() => {
    const v: Record<string, string> = {};
    for (const p of players) if (!p.me) v[p.id] = bluffAiVote(round, players, p.id, rand);
    return v;
  }, [players, round, rand]);
  const [shown, setShown] = useState<Record<string, string>>({});
  const [pick, setPick] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const ts = Object.entries(ai).map(([voter, target]) => setTimeout(() => setShown(s => ({ ...s, [voter]: target })), 1500 + rand() * 6000));
    return () => ts.forEach(clearTimeout);
  }, [ai, rand]);
  const allIn = Object.keys(shown).length === Object.keys(ai).length;
  useEffect(() => {
    if (!locked || !pick || !allIn) return;
    const t = setTimeout(() => onDone({ ...round, votes: { ...ai, me: pick } }), 700);
    return () => clearTimeout(t);
  }, [locked, pick, allIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const others = players.filter(p => !p.me);
  const left = useCountdown(VOTE_S, !locked, () => { setPick(p => p ?? pickIn(rand, others).id); setLocked(true); }, index);
  const counts = tallyVotes({ ...round, votes: shown });
  const clues = round.order.map(id => round.clues[id]).filter(Boolean);

  return (
    <MScreen>
      <MHeader title={`Manche ${index + 1} · vote`} right={<HeadChip label={`⏱ ${clock(left)}`} />} />
      <BigTitle title="Qui est l’imposteur ?" sub={locked ? (allIn ? 'dépouillement…' : 'les IA votent…') : 'touche un joueur'} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7 }}>
        {clues.map(c => <Tag key={c} label={c} bg="#FFF3B0" size={16} />)}
      </View>
      <View style={{ gap: 7 }}>
        {others.map(p => {
          const sel = pick === p.id, n = counts[p.id] ?? 0;
          return (
            <PRow key={p.id} p={p} avatar={36} avatarFont={16} bg={sel ? '#FFF3B0' : '#FFFFFF'} selected={sel}
              sub={round.clues[p.id] ? `« ${round.clues[p.id]} »` : undefined}
              onPress={locked ? undefined : () => setPick(p.id)}
              right={<Tag label={sel ? 'ton vote' : `${n} vote${n > 1 ? 's' : ''}`} bg={sel ? '#FFD45C' : '#FFFFFF'} size={14} />} />
          );
        })}
      </View>
      <Grow />
      <Buttons><MButton label={locked ? 'Vote envoyé' : 'Valider mon vote'} height={58} fontSize={19} disabled={!pick || locked} onPress={() => setLocked(true)} /></Buttons>
    </MScreen>
  );
}

/* ---------- 6 · Révélation ---------- */
function Mask() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M2 8c3-2 7-2 10 0 3-2 7-2 10 0-1 6-4 8-6.5 8-2 0-2.5-2-3.5-2s-1.5 2-3.5 2C6 16 3 14 2 8z" fill="#2B2150" />
      <Circle cx={7.5} cy={10.5} r={1.6} fill="#FFB35C" /><Circle cx={16.5} cy={10.5} r={1.6} fill="#FFB35C" />
    </Svg>
  );
}

function Revelation({ players, round, index, total, onNext }: { players: Player[]; round: BluffRound; index: number; total: number; onNext: () => void }) {
  const o = bluffOutcome(round);
  const imp = players.find(p => p.id === round.imposter)!;
  const byId = (id: string) => players.find(p => p.id === id)!;
  const gain = o.gains.me ?? 0;
  const voters = players.length - 1;
  const clue = round.clues[imp.id] ?? '…';
  const last = index + 1 >= BLUFF_ROUNDS;
  return (
    <MScreen>
      <MHeader title={`Manche ${index + 1} · résultat`} />
      <Dots total={BLUFF_ROUNDS} current={index} />
      <Grow max={48} />
      <View style={{ alignSelf: 'center' }}>
        <MAvatar p={imp} size={104} font={48} />
        <View style={{ position: 'absolute', right: -8, bottom: -4, width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}><Mask /></View>
      </View>
      <BigTitle title={imp.me ? 'Tu étais l’imposteur !' : `${imp.name} était l’imposteur !`}
        sub={o.found ? `démasqué par ${o.against} joueur${o.against > 1 ? 's' : ''} sur ${voters}` : `passé inaperçu · ${o.against} vote${o.against > 1 ? 's' : ''} sur ${voters}`} />
      <Grow max={48} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0, paddingTop: 10, paddingHorizontal: 8, paddingBottom: 12, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', gap: 2 }}>
          <T size={12} weight={700} color={INK} style={{ opacity: 0.6 }}>Le mot de tous</T>
          <T size={26} weight={700} color={INK} numberOfLines={1} adjustsFontSizeToFit>{round.secret}</T>
        </View>
        <T size={24} weight={700} outline>≠</T>
        <View style={{ flex: 1, minWidth: 0, paddingTop: 10, paddingHorizontal: 8, paddingBottom: 12, borderRadius: 18, backgroundColor: '#FFD6E0', alignItems: 'center', gap: 2 }}>
          <T size={12} weight={700} color={INK} style={{ opacity: 0.6 }}>{imp.me ? 'Ton mot' : `Le mot d’${imp.name}`}</T>
          <T size={26} weight={700} color={INK} numberOfLines={1} adjustsFontSizeToFit>{round.fake}</T>
        </View>
      </View>
      <View style={{ alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)' }}>
        <T size={14} weight={700} color="#FFFFFF">{imp.me ? 'Ton' : 'Son'} indice « {clue} » {o.found ? (imp.me ? 't’a trahi' : 'l’a trahi') : 'est passé inaperçu'}</T>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 14, rowGap: 8 }}>
        {round.order.filter(id => id !== imp.id && round.votes[id]).map(id => (
          <View key={id} accessibilityLabel={`${nameOf(byId(id))} a voté pour ${nameOf(byId(round.votes[id]))}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MAvatar p={byId(id)} size={30} font={14} />
            <T size={13} weight={700} color="#FFFFFF">→</T>
            <MAvatar p={byId(round.votes[id])} size={24} font={11} />
          </View>
        ))}
      </View>
      <Grow max={48} />
      <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ paddingVertical: 5, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#FFD45C' }}><T size={20} weight={700} color={INK}>+{pts(gain)}</T></View>
        <T size={15} weight={700} outline>pour toi · total {pts(total)}</T>
      </View>
      <Grow />
      <Buttons><MButton label={last ? 'Voir le classement' : 'Manche suivante'} height={60} onPress={onNext} /></Buttons>
    </MScreen>
  );
}

/* ---------- 7 · Fin · classement ---------- */
function Fin({ players, scores, caught, onReplay }: { players: Player[]; scores: Record<string, number>; caught: number; onReplay: () => void }) {
  const ranked = rankByScore(players, scores);
  const rank = ranked.findIndex(p => p.me) + 1;
  const win = rank === 1;
  const sub = `${BLUFF_ROUNDS} manches · tu as démasqué ${caught} imposteur${caught > 1 ? 's' : ''}`;
  return (
    <MScreen bg={win ? 'warm' : 'cold'}>
      <JoyHero title={win ? 'Victoire !' : `${rank}e sur ${players.length}`} sub={sub} sad={!win} />
      <ScrollView style={{ flexGrow: 0, flexShrink: 1, marginTop: 8 }} contentContainerStyle={{ gap: 7 }} showsVerticalScrollIndicator={false}>
        {ranked.map((p, i) => <RankRow key={p.id} rank={i + 1} p={p} right={`${scores[p.id] ?? 0} pts`} />)}
      </ScrollView>
      <Grow />
      <Buttons>
        <MButton label="Menu" variant="yellow-mix" height={58} fontSize={18} onPress={leave} />
        <MButton label="Rejouer" height={58} fontSize={18} onPress={onReplay} />
      </Buttons>
    </MScreen>
  );
}
