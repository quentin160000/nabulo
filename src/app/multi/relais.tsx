import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, type ScrollViewInstance } from 'react-native';
import { rng } from '@/game/lexicon';
import { RELAIS_HEARTS, RELAIS_MIN, bestLink, checkRelais, makePlayers, pickWord, relaisAiWord, type Link } from '@/game/multi';
import { load, save } from '@/game/storage';
import {
  CalmHero, InputBar, Lobby, MAvatar, MButton, MHeader, MScreen, PRow, Rules, StatRow, Tag, WordReveal, leave,
} from '@/ui/multi-ui';
import { T } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';

/* Le relais (maquette J-multi-20) — partie d'entraînement en équipe : toi + 3 IA. */

type Phase = 'salon' | 'regles' | 'jeu' | 'fin';
const AI_COUNT = 3;
const RECORD_KEY = 'nabulo:record:relais';
const deg = (t: number) => `${Math.round(t)}°`;
/** Couleur d'un lien : paliers de la maquette (75° et 40° sur l'ancienne échelle fastText) ramenés à frWac. */
const heat = (t: number) => (t >= 66 ? '#FF7240' : t >= 19 ? '#FFB35C' : t >= RELAIS_MIN ? '#FFD45C' : '#9DD8FF');

export default function Relais() {
  const players = useMemo(() => makePlayers(AI_COUNT), []);
  // ordre de passage : les IA puis toi (l'IA 1 lance la chaîne)
  const order = useMemo(() => [...players.slice(1), players[0]], [players]);
  const [rand] = useState(() => rng(Date.now() % 2147483647));
  const [phase, setPhase] = useState<Phase>('salon');
  const [chain, setChain] = useState<Link[]>([]);
  const [lost, setLost] = useState(0);
  const [record, setRecord] = useState({ before: 0, now: 0 });
  const [game, setGame] = useState(0);

  const newGame = () => {
    setChain([{ by: order[0].id, word: pickWord(rand), temperature: null }]);
    setLost(0); setGame(g => g + 1); setPhase('jeu');
  };
  const finish = async (n: number) => {
    const before = await load<number>(RECORD_KEY, 0);
    const now = Math.max(before, n);
    if (now > before) await save(RECORD_KEY, now);
    setRecord({ before, now }); setPhase('fin');
  };

  if (phase === 'salon') return <Lobby title="Salon · Le relais" players={players} min={3} max={8} secondary="Inviter" onLaunch={() => setPhase('regles')} />;
  if (phase === 'regles') {
    return <Rules n={20} title="Le relais" sub="Multi · en équipe" onPlay={newGame} steps={[
      'Chacun à son tour ajoute un mot à la chaîne.',
      `Ton mot doit être à ${RELAIS_MIN}° ou plus du dernier mot.`,
      'Un mot trop froid coûte un cœur à l’équipe.',
      `${RELAIS_HEARTS} cœurs perdus et c’est fini : visez la plus longue chaîne.`,
    ]} />;
  }
  if (phase === 'jeu') {
    return <Jeu key={game} order={order} chain={chain} setChain={setChain} lost={lost} setLost={setLost} rand={rand} onEnd={() => finish(chain.length)} />;
  }

  const n = chain.length;
  const link = bestLink(chain);
  const mood = n > record.before && n >= 5 ? 'joy' : n < 5 ? 'sad' : 'calm';
  return (
    <MScreen bg={mood === 'joy' ? 'warm' : mood === 'sad' ? 'cold' : 'warm-calm'}>
      <View style={{ flex: 1, minHeight: 0 }}>
        <CalmHero mood={mood} title={`Chaîne de ${n} mot${n > 1 ? 's' : ''}`}
          sub={`${RELAIS_HEARTS} cœurs perdus · ${n > record.before && record.before > 0 ? 'nouveau record de l’équipe !' : `record de l’équipe : ${record.now}`}`} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 4 }} showsVerticalScrollIndicator={false}>
          <WordReveal caption="Le premier mot" word={chain[0]?.word ?? ''} chips={chain.slice(1, 6).map(l => l.word)} />
          <View style={{ marginTop: 22, gap: 10 }}>
            <StatRow label="Chaîne" value={`${n} mot${n > 1 ? 's' : ''}`} />
            <StatRow label="Meilleur lien" value={link ? `${link.from} → ${link.to} · ${deg(link.temperature)}` : '—'} />
          </View>
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 4, paddingBottom: 6 }}>
          <MButton label="Menu" variant="yellow-mix" height={62} radius={16} relief={6} fontSize={16} onPress={leave} />
          <MButton label="Rejouer" height={62} radius={16} relief={6} fontSize={16} onPress={newGame} />
        </View>
      </View>
    </MScreen>
  );
}

function Jeu({ order, chain, setChain, lost, setLost, rand, onEnd }: {
  order: ReturnType<typeof makePlayers>; chain: Link[]; setChain: (c: Link[]) => void; lost: number; setLost: (n: number) => void; rand: () => number; onEnd: () => void;
}) {
  const [turn, setTurn] = useState(1);
  const [text, setText] = useState('');
  const toast = useToast();
  const scroll = useRef<ScrollViewInstance>(null);
  const player = order[turn % order.length];
  const over = lost >= RELAIS_HEARTS;
  const last = chain[chain.length - 1];
  const byId = (id: string) => order.find(p => p.id === id)!;

  const play = (word: string, who: string) => {
    const c = checkRelais(chain, word);
    if (!c.ok && c.reason !== 'froid') return c;
    if (c.ok) setChain([...chain, { by: who, word: c.word, temperature: c.temperature }]);
    else { setLost(lost + 1); toast.show(`« ${c.word} » : ${deg(c.temperature)}, trop froid · un cœur perdu`); }
    setTurn(t => t + 1);
    return c;
  };

  useEffect(() => {
    if (over) { const t = setTimeout(onEnd, 1600); return () => clearTimeout(t); }
    if (player.me) return;
    const t = setTimeout(() => play(relaisAiWord(chain, rand), player.id), 1600 + rand() * 1600);
    return () => clearTimeout(t);
  }, [turn, over]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = () => {
    if (!text.trim()) return;
    const c = play(text, 'me');
    if (!c.ok && c.reason === 'inconnu') { toast.show(`Je ne connais pas « ${text.trim()} »`); return; }
    if (!c.ok && c.reason === 'deja') { toast.show('Ce mot est déjà dans la chaîne'); return; }
    setText('');
  };

  return (
    <MScreen keyboard>
      <MHeader title="Le relais" right={
        <T size={22} weight={700} color="#FF5A8A" accessibilityLabel={`${RELAIS_HEARTS - lost} cœurs sur ${RELAIS_HEARTS}`}
          style={{ letterSpacing: 2, textShadowColor: '#2B2150', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 }}>
          {'♥'.repeat(Math.max(0, RELAIS_HEARTS - lost))}<T size={22} weight={700} color="rgba(255,255,255,0.6)">{'♥'.repeat(Math.min(RELAIS_HEARTS, lost))}</T>
        </T>
      } />
      <T size={16} weight={700} outline align="center">Chaîne : {chain.length} mot{chain.length > 1 ? 's' : ''}</T>
      <ScrollView ref={scroll} style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ gap: 4 }} showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        {chain.map((l, i) => (
          <PRow key={i} p={byId(l.by)} label={l.word} minHeight={46} avatar={32} avatarFont={14}
            right={l.temperature === null ? null : <Tag label={deg(l.temperature)} bg={heat(l.temperature)} size={14} />} />
        ))}
      </ScrollView>
      {over ? (
        <><View style={{ flex: 1 }} /><T size={17} weight={700} outline align="center">Plus de cœurs : fin de la chaîne</T><View style={{ flex: 1 }} /></>
      ) : player.me ? (
        <>
          <T size={17} weight={700} outline align="center">À toi : un mot proche de « {last.word} »</T>
          <View style={{ flex: 1 }} />
          <InputBar value={text} onChange={setText} onSubmit={send} placeholder="Mot proche du dernier" action="Proposer" />
        </>
      ) : (
        <>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <MAvatar p={player} size={44} font={19} />
            <T size={17} weight={700} color="#FFFFFF">{player.name} cherche un mot…</T>
          </View>
          <View style={{ flex: 1 }} />
        </>
      )}
      <Toast msg={toast.msg} check={false} style={{ bottom: 70 }} />
    </MScreen>
  );
}
