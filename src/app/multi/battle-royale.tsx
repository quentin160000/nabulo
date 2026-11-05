import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { neighbors, rng, temperature } from '@/game/lexicon';
import {
  BR_PLAYERS, BR_ROUND_SECONDS, brAiGuess, brEliminate, brOutCount, brRoundCount, brSimulateRest, brSkill, clueCandidates, makePlayers, pickWord,
  type Player,
} from '@/game/multi';
import { normalizeWord } from '@/game/temperature';
import {
  BigTitle, Buttons, Dots, Grow, HeadChip, INK, InputBar, JoyHero, Lobby, MAvatar, MButton, MHeader, MScreen, PRow, RankRow, Rules, SadHero,
  StatRow, Tag, WordReveal, clock, leave, useCountdown,
} from '@/ui/multi-ui';
import { T } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';

/* Battle royale (maquette J-multi-19) — partie d'entraînement : toi + 7 IA, un nouveau mot à chaque manche. */

type Phase = 'salon' | 'regles' | 'jeu' | 'manche' | 'elimine' | 'fin';
type Best = { word: string; temperature: number };
type RoundResult = { secret: string; order: string[]; out: string[]; best: Record<string, Best>; finder: string | null };

const ROUNDS = brRoundCount(BR_PLAYERS);
const deg = (t: number | undefined) => (t === undefined ? '—' : `${Math.round(t)}°`);
/** Couleur de la pastille de température (paliers de la maquette 75/65/58/40° ramenés à l'échelle frWac). */
function heat(t: number | undefined): string {
  if (t === undefined) return '#E2DEEE';
  t = Math.round(t);
  if (t >= 100) return '#FFD23F';
  if (t >= 66) return '#FF7240';
  if (t >= 51) return '#FF9A3C';
  if (t >= 41) return '#FFB35C';
  if (t >= 19) return '#FFD45C';
  return '#9DD8FF';
}
const nth = (n: number) => (n === 1 ? '1er' : `${n}e`);

export default function BattleRoyale() {
  const players = useMemo(() => makePlayers(BR_PLAYERS - 1), []);
  const [rand] = useState(() => rng(Date.now() % 2147483647));
  const [skills, setSkills] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<Phase>('salon');
  const [round, setRound] = useState(0);
  const [secret, setSecret] = useState('');
  const [used, setUsed] = useState<string[]>([]);
  const [alive, setAlive] = useState<string[]>([]);
  const [outRound, setOutRound] = useState<Record<string, number>>({});
  const [lastBest, setLastBest] = useState<Record<string, number>>({});
  const [result, setResult] = useState<RoundResult | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [myRank, setMyRank] = useState(0);

  const startRound = (r: number, usedNow: string[]) => {
    const s = pickWord(rand, usedNow);
    setRound(r); setSecret(s); setUsed([...usedNow, s]); setPhase('jeu');
  };
  const newGame = () => {
    const sk: Record<string, number> = {};
    for (const p of players) if (!p.me) sk[p.id] = brSkill(rand);
    setSkills(sk); setAlive(players.map(p => p.id)); setOutRound({}); setLastBest({}); setWinner(null); setResult(null);
    startRound(0, []);
  };

  const endRound = (best: Record<string, Best>, finder: string | null) => {
    const scored = alive.map(id => ({ id, best: finder === id ? 1000 : best[id]?.temperature ?? -100 }));
    const { order: o, out: elim } = brEliminate(scored, rand);
    const order = o.map(x => x.id);
    // quelqu'un a trouvé le mot : il gagne, tous les autres sortent
    const out = finder ? order.filter(id => id !== finder) : elim.map(x => x.id);
    const nextOut = { ...outRound }, nextBest = { ...lastBest };
    for (const id of out) { nextOut[id] = round + 1; nextBest[id] = best[id]?.temperature ?? -100; }
    const survivors = order.filter(id => !out.includes(id));
    setOutRound(nextOut); setLastBest(nextBest); setAlive(survivors);
    setResult({ secret, order, out, best, finder });
    if (out.includes('me')) {
      setMyRank(order.indexOf('me') + 1);
      if (survivors.length === 1) setWinner(survivors[0]);
      else {
        const sim = brSimulateRest(survivors.map(id => ({ id, skill: skills[id] ?? 0.5 })), round + 2, rand);
        setOutRound({ ...nextOut, ...sim.outRound });
        setWinner(sim.winner);
      }
      setPhase('elimine');
    } else if (survivors.length === 1) { setWinner('me'); setMyRank(1); setPhase('fin'); }
    else setPhase('manche');
  };

  if (phase === 'salon') return <Lobby title="Salon · Battle royale" players={players} min={BR_PLAYERS} max={BR_PLAYERS} secondary="Annuler" onSecondary={leave} onLaunch={() => setPhase('regles')} />;
  if (phase === 'regles') {
    return <Rules title="Battle royale" sub={`Multi · ${BR_PLAYERS} joueurs`} onPlay={newGame} steps={[
      'Tout le monde cherche le même mot secret, en même temps.',
      `Chaque manche dure ${BR_ROUND_SECONDS} secondes.`,
      'À la fin de la manche, les 2 joueurs les plus froids sont éliminés.',
      'Dernier en lice, ou premier à trouver le mot : tu gagnes.',
    ]} />;
  }
  const byId = (id: string) => players.find(p => p.id === id)!;
  if (phase === 'jeu') return <Manche key={round} round={round} secret={secret} alive={alive.map(byId)} skills={skills} rand={rand} onEnd={endRound} />;
  if (phase === 'manche' && result) return <FinManche result={result} round={round} byId={byId} onNext={() => startRound(round + 1, used)} />;
  if (phase === 'elimine' && result) {
    const mine = result.best.me;
    return (
      <MScreen bg="cold">
        <View style={{ flex: 1, minHeight: 0 }}>
          <SadHero title="Éliminé" sub={`${nth(myRank)} sur ${BR_PLAYERS} · manche ${round + 1}`} />
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 4 }} showsVerticalScrollIndicator={false}>
            <WordReveal caption="Le mot était" word={result.secret} chips={clueCandidates(result.secret, 20).slice(0, 5).map(c => c.word)} />
            <View style={{ marginTop: 22, gap: 10 }}>
              <StatRow label="Ton meilleur essai" value={mine ? `${mine.word} · ${deg(mine.temperature)}` : 'aucun'} />
              <StatRow label="Vainqueur" value={winner ? byId(winner).name : '…'} />
            </View>
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 4, paddingBottom: 6 }}>
            <MButton label="Regarder la fin" variant="yellow-mix" height={62} radius={16} relief={6} fontSize={16} onPress={() => setPhase('fin')} />
            <MButton label="Rejouer" height={62} radius={16} relief={6} fontSize={16} onPress={newGame} />
          </View>
        </View>
      </MScreen>
    );
  }
  // fin : classement de la partie
  const win = winner === 'me';
  const lastRound = Math.max(0, ...Object.values(outRound));
  const ranked = [...players].sort((a, b) => {
    if (a.id === winner) return -1;
    if (b.id === winner) return 1;
    return (outRound[b.id] ?? 0) - (outRound[a.id] ?? 0) || (lastBest[b.id] ?? -100) - (lastBest[a.id] ?? -100);
  });
  const found = result?.finder ?? null;
  const right = (p: Player) => {
    if (p.id === winner) return found === p.id && result ? `${result.secret} · 100°` : 'gagnant';
    const r = outRound[p.id];
    return r === lastRound && lastBest[p.id] !== undefined && lastBest[p.id] > -100 ? deg(lastBest[p.id]) : `éliminé m.${r}`;
  };
  return (
    <MScreen bg={win ? 'warm' : 'cold'}>
      <JoyHero sad={!win}
        title={win ? (found === 'me' ? 'Mot trouvé !' : 'Dernier en lice !') : `Vainqueur : ${winner ? byId(winner).name : '…'}`}
        sub={win ? `1er sur ${BR_PLAYERS} · ${found === 'me' ? `mot trouvé à la manche ${round + 1}` : `${round + 1} manches`}` : `tu finis ${nth(myRank)} sur ${BR_PLAYERS}`} />
      <ScrollView style={{ flexGrow: 0, flexShrink: 1, marginTop: 8 }} contentContainerStyle={{ gap: 7 }} showsVerticalScrollIndicator={false}>
        {ranked.map((p, i) => <RankRow key={p.id} rank={i + 1} p={p} right={right(p)} />)}
      </ScrollView>
      <Grow />
      <Buttons>
        <MButton label="Menu" variant="yellow-mix" height={58} fontSize={18} onPress={leave} />
        <MButton label="Rejouer" height={58} fontSize={18} onPress={newGame} />
      </Buttons>
    </MScreen>
  );
}

/* ---------- 3 · En jeu · manche N ---------- */
function Manche({ round, secret, alive, skills, rand, onEnd }: {
  round: number; secret: string; alive: Player[]; skills: Record<string, number>; rand: () => number; onEnd: (best: Record<string, Best>, finder: string | null) => void;
}) {
  const [best, setBest] = useState<Record<string, Best>>({});
  const [finder, setFinder] = useState<string | null>(null);
  const [text, setText] = useState('');
  const toast = useToast();
  const pool = useMemo(() => neighbors(secret, 1500), [secret]);

  // les IA proposent des mots toutes les 3 à 4 secondes en moyenne
  useEffect(() => {
    if (finder) return;
    const id = setInterval(() => {
      const ais = alive.filter(p => !p.me && rand() < 0.3);
      if (!ais.length) return;
      const guesses = ais.map(p => ({ id: p.id, g: brAiGuess(secret, pool, skills[p.id] ?? 0.5, rand) }));
      setBest(b => {
        const n = { ...b };
        for (const { id: pid, g } of guesses) if (!n[pid] || g.temperature > n[pid].temperature) n[pid] = g;
        return n;
      });
      const f = guesses.find(x => x.g.temperature >= 100);
      if (f) setFinder(f.id);
    }, 1000);
    return () => clearInterval(id);
  }, [finder, alive, secret, pool, skills, rand]);

  const left = useCountdown(BR_ROUND_SECONDS, !finder, () => onEnd(best, null), round);
  useEffect(() => {
    if (!finder) return;
    const t = setTimeout(() => onEnd(best, finder), 1200);
    return () => clearTimeout(t);
  }, [finder]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = () => {
    const w = normalizeWord(text);
    if (!w || finder) return;
    const t = temperature(w, secret);
    if (t === null) { toast.show(`Je ne connais pas « ${text.trim()} »`); return; }
    setText('');
    setBest(b => (!b.me || t > b.me.temperature ? { ...b, me: { word: w, temperature: t } } : b));
    if (t >= 100) setFinder('me');
    else toast.show(`« ${w} » : ${deg(t)}`);
  };

  const ranked = [...alive].sort((a, b) => (best[b.id]?.temperature ?? -100) - (best[a.id]?.temperature ?? -100));
  const danger = brOutCount(alive.length);
  const finderP = finder ? alive.find(p => p.id === finder) : null;
  return (
    <MScreen keyboard>
      <MHeader title={`Manche ${round + 1} · ${alive.length} joueurs`} right={<HeadChip label={`⏱ ${clock(left)}`} bg="#FF5A8A" />} />
      <T size={15} weight={700} outline align="center">
        {finderP ? (finderP.me ? 'Tu as trouvé le mot !' : `${finderP.name} a trouvé le mot !`) : danger === 1 ? 'Le dernier saute' : `Les ${danger} derniers sautent`}
      </T>
      <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ gap: 5 }} showsVerticalScrollIndicator={false}>
        {ranked.map((p, i) => {
          const b = best[p.id];
          const bg = p.me ? '#FFF3B0' : i >= ranked.length - danger ? '#FFD6E0' : '#FFFFFF';
          return (
            <PRow key={p.id} p={p} bg={bg} minHeight={44} avatar={30} avatarFont={13} nameSize={16} sub={p.me && b ? b.word : undefined}
              lead={<T size={14} weight={700} color={INK} style={{ width: 22 }}>{i + 1}</T>}
              right={<Tag label={deg(b?.temperature)} bg={heat(b?.temperature)} size={14} />} />
          );
        })}
      </ScrollView>
      <View style={{ flex: 1 }} />
      <InputBar value={text} onChange={setText} onSubmit={send} placeholder="Tape un mot" action="Proposer" disabled={!!finder} />
      <Toast msg={toast.msg} check={false} style={{ bottom: 70 }} />
    </MScreen>
  );
}

/* ---------- 4 · Fin de manche ---------- */
function FinManche({ result, round, byId, onNext }: { result: RoundResult; round: number; byId: (id: string) => Player; onNext: () => void }) {
  const kept = result.order.filter(id => !result.out.includes(id));
  const rank = result.order.indexOf('me') + 1;
  const mine = result.best.me;
  const row = (id: string, i: number, out: boolean) => {
    const p = byId(id), t = result.best[id]?.temperature;
    return (
      <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 40, paddingHorizontal: 12, borderRadius: 14, backgroundColor: out ? 'rgba(255,255,255,0.55)' : p.me ? '#FFF3B0' : '#FFFFFF' }}>
        <T size={15} weight={700} color={INK} align="center" style={{ width: 16, opacity: 0.6 }}>{i + 1}</T>
        <MAvatar p={p} size={28} font={13} />
        <T size={15} weight={700} color={INK} numberOfLines={1} style={[{ flex: 1 }, out && { textDecorationLine: 'line-through', opacity: 0.7 }]}>{p.name}</T>
        <T size={15} weight={700} color={out ? '#B4321E' : INK}>{deg(t)}</T>
      </View>
    );
  };
  return (
    <MScreen>
      <MHeader title={`Manche ${round + 1} terminée`} />
      <Dots total={ROUNDS} current={round} />
      <Grow max={48} />
      <BigTitle title={`${result.out.length} joueur${result.out.length > 1 ? 's' : ''} éliminé${result.out.length > 1 ? 's' : ''}`}
        sub={`il en reste ${kept.length} sur ${BR_PLAYERS} · mot de la manche : ${result.secret}`} />
      <Grow max={48} />
      <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ gap: 6 }} showsVerticalScrollIndicator={false}>
        {kept.map((id, i) => row(id, i, false))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4, marginHorizontal: 2 }}>
          <View style={{ flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.35)' }} />
          <T size={13} weight={700} color="#FFFFFF">éliminés</T>
          <View style={{ flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.35)' }} />
        </View>
        {result.out.map((id, i) => row(id, kept.length + i, true))}
      </ScrollView>
      <Grow max={48} />
      <T size={17} weight={700} outline align="center">
        {mine ? `Tu passes : ${nth(rank)} avec « ${mine.word} » à ${deg(mine.temperature)}` : `Tu passes : ${nth(rank)}`}
      </T>
      <Grow />
      <Buttons><MButton label={`Manche ${round + 2}`} height={60} onPress={onNext} /></Buttons>
    </MScreen>
  );
}
