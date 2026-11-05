import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, TextInput, View, type ScrollViewInstance, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dayNumberFrom } from '@/game/engine/types';
import { MIN_LINK, closeWords, hintAfter, judge, links, pairKey, shareSquares, shareText, shortDate, solve, towards, type Verdict } from '@/game/lier';
import { dailyPair, pairsFor, type Level, type Pair } from '@/game/lier-paires';
import { HINT_COST } from '@/game/rules';
import { load, save } from '@/game/storage';
import { useWallet } from '@/game/wallet';
import { gameInk, gameInkSoft, warmGradient, warmStops } from '@/theme/colors';
import { Bubble } from '@/ui/Bubble';
import { SlidingGradient } from '@/ui/backgrounds';
import { Coin, images } from '@/ui/bits';
import { Confetti } from '@/ui/Confetti';
import { GameBg, Sheet, useKeyboardVisible, keepFocus } from '@/ui/game';
import { BigButton, Chain, Header, LierIcon, SHADOW, StepsPill, Towards, WordChip } from '@/ui/lier-bits';
import { Mascot } from '@/ui/Mascot';
import { T } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';

const INK = gameInk;
const K_RECORD = 'nabulo:record:lier';
const K_ENCOURS = 'nabulo:encours:lier';
const K_PARTIE = 'nabulo:lier:partie';

type Game = { start: string; target: string; mids: string[]; defi: boolean; day: number };
type Done = { chain: string[]; prevRecord: number | null; defi: boolean; best: string[] | null | undefined };
type Phase = 'charge' | 'regles' | 'choix' | 'jeu' | 'fini' | 'resultat' | 'comparaison' | 'partage' | 'abandon';
type Records = Record<string, number>;
type Feedback = Verdict | { kind: 'indice'; word: string } | null;

const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;
const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function Lier() {
  const params = useLocalSearchParams<{ defi?: string }>();
  const defiParam = params.defi === 'jour';
  const [day] = useState(() => dayNumberFrom(new Date()));
  const [phase, setPhase] = useState<Phase>('charge');
  const [game, setGame] = useState<Game | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [solution, setSolution] = useState<string[] | null>(null);
  const [records, setRecords] = useState<Records>({});
  const [round, setRound] = useState(0);
  const [shareFrom, setShareFrom] = useState<Phase>('comparaison');

  useEffect(() => {
    let alive = true;
    Promise.all([load<Records>(K_RECORD, {}), load<Game | null>(K_PARTIE, null)]).then(([r, g]) => {
      if (!alive) return;
      setRecords(r);
      // reprise d'une partie en cours (le défi n'est repris que le jour même)
      const resumable = g && g.start && g.target && Array.isArray(g.mids) && (!g.defi || g.day === day) && (!defiParam || g.defi);
      if (resumable) { setGame(g); setPhase('jeu'); } else setPhase('regles');
    });
    return () => { alive = false; };
  }, [day, defiParam]);

  const startGame = useCallback((pair: Pair, defi: boolean) => {
    setGame({ start: pair[0], target: pair[1], mids: [], defi, day });
    setDone(null); setSolution(null); setPhase('jeu');
  }, [day]);

  // partie en cours : sauvegardée à chaque coup, avec la carte « Reprendre » de l'accueil
  useEffect(() => {
    if (phase !== 'jeu' || !game) return;
    save(K_PARTIE, game);
    save(K_ENCOURS, {
      titre: game.defi ? 'Lier · défi du jour' : 'Lier',
      sousTitre: `${game.start} → ${game.target} · ${plural(game.mids.length, 'étape')}`,
      route: game.defi ? '/jeux/lier?defi=jour' : '/jeux/lier',
    });
  }, [phase, game]);
  const clearSaved = () => { AsyncStorage.multiRemove([K_PARTIE, K_ENCOURS]).catch(() => {}); };

  const finish = (g: Game) => {
    const chain = [g.start, ...g.mids, g.target];
    const key = pairKey(g.start, g.target);
    const prev = records[key] ?? null;
    const steps = chain.length - 1;
    if (prev === null || steps < prev) {
      const next = { ...records, [key]: steps };
      setRecords(next); save(K_RECORD, next);
    }
    clearSaved();
    setDone({ chain, prevRecord: prev, defi: g.defi, best: undefined });
    setPhase('fini');
    // la meilleure chaîne se calcule après l'affichage de « Chaîne terminée ! »
    setTimeout(() => setDone(d => (d && d.chain === chain ? { ...d, best: solve(g.start, g.target) } : d)), 50);
  };

  const abandon = (g: Game) => {
    clearSaved();
    setSolution(null);
    setPhase('abandon');
    setTimeout(() => setSolution(solve(g.start, g.target) ?? []), 50);
  };

  const showResult = () => {
    if (!done) return;
    const best = done.best ?? null;
    setPhase(best && best.length < done.chain.length ? 'comparaison' : 'resultat');
  };

  if (phase === 'charge') return <GameBg />;
  if (phase === 'regles') return <Regles onClose={leave} onPlay={() => (defiParam ? startGame(dailyPair(day), true) : setPhase('choix'))} />;
  if (phase === 'choix') return <Choix day={day} round={round} records={records} onClose={leave} onPick={startGame} />;
  if (phase === 'jeu' && game) return <EnJeu game={game} setGame={setGame} onFinish={finish} onAbandon={abandon} />;
  if (phase === 'fini' && done) return <Terminee done={done} onClose={leave} onNext={showResult} computing={done.best === undefined} />;
  if (phase === 'resultat' && done) return <Resultat done={done} onMenu={leave} onNew={() => { setRound(r => r + 1); setPhase('choix'); }} />;
  if (phase === 'comparaison' && done) {
    return <Comparaison done={done} onClose={leave} onShare={() => { setShareFrom('comparaison'); setPhase('partage'); }}
      onReplay={() => startGame([done.chain[0], done.chain[done.chain.length - 1]], done.defi)} />;
  }
  if (phase === 'partage' && done) return <Partage chain={done.chain} onClose={() => setPhase(shareFrom)} />;
  if (phase === 'abandon') return <Abandon solution={solution} onMenu={leave} onNew={() => { setRound(r => r + 1); setPhase('choix'); }} />;
  return <GameBg />;
}

/* Cadre commun des planches : contenu de 16 px de côté, 48 px du haut (sous la barre d'état), 24 px du bas. */
function Frame({ children, bottom = 24, bg }: { children: React.ReactNode; bottom?: number; bg?: React.ReactNode }) {
  const inset = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      {bg ?? <GameBg />}
      <View style={{ flex: 1, paddingTop: Math.max(inset.top, 44) + 4, paddingBottom: bottom + inset.bottom, paddingHorizontal: 16, gap: 10 }}>
        {children}
      </View>
    </View>
  );
}

const Title = ({ title, sub }: { title: string; sub?: string }) => (
  <View style={{ alignItems: 'center' }}>
    <T size={30} weight={700} color="#FFFFFF" align="center" style={[{ lineHeight: 33 }, SHADOW]}>{title}</T>
    {sub ? <T size={15} weight={600} color="#FFFFFF" align="center" style={SHADOW}>{sub}</T> : null}
  </View>
);

/* ---------- 1 · Règles ---------- */
const RULES = [
  'Un mot de départ et un mot d’arrivée.',
  `Ajoute des mots un par un : chacun doit être à ${MIN_LINK}° ou plus du précédent.`,
  'La chaîne est finie quand tu touches le mot d’arrivée.',
  'Le moins d’étapes possible = la meilleure chaîne.',
];
function Regles({ onClose, onPlay }: { onClose: () => void; onPlay: () => void }) {
  return (
    <Frame>
      <Header title="Règles" onClose={onClose} closeLabel="Retour au menu" />
      <View style={{ alignItems: 'center', gap: 6, marginTop: 6 }}>
        <Bubble bg="#FFD45C" radius={27} border={2} inset={6} style={{ width: 54, height: 54, alignItems: 'center', justifyContent: 'center' }}>
          <T size={24} weight={700} color={INK}>13</T>
        </Bubble>
        <Title title="Lier" sub="Jeux libres · rejouable à volonté" />
      </View>
      <Image source={images.nabulo} style={{ width: 110, height: 110, alignSelf: 'center' }} contentFit="contain" accessibilityLabel="Nabulo" />
      <View style={{ gap: 8 }}>
        {RULES.map((r, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18, backgroundColor: '#FFFFFF' }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFD45C', alignItems: 'center', justifyContent: 'center' }}>
              <T size={14} weight={700} color={INK}>{i + 1}</T>
            </View>
            <T size={16} weight={600} color={INK} style={{ flex: 1, lineHeight: 20 }}>{r}</T>
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row' }}><BigButton label="Jouer" height={62} fontSize={22} onPress={onPlay} /></View>
    </Frame>
  );
}

/* ---------- 5 · Choix des mots à lier ---------- */
const LEVELS: { level: Level; label: string; sub?: string; color: string }[] = [
  { level: 'facile', label: 'Facile', sub: 'mots proches', color: '#7CE0B5' },
  { level: 'moyen', label: 'Moyen', color: '#9DD8FF' },
  { level: 'difficile', label: 'Difficile', sub: 'mots très éloignés', color: '#FF86C8' },
];
function Choix({ day, round, records, onClose, onPick }: { day: number; round: number; records: Records; onClose: () => void; onPick: (p: Pair, defi: boolean) => void }) {
  const defi = dailyPair(day);
  const pairs = pairsFor(day, round);
  const card = (key: string, label: string, pair: Pair, sub: string | undefined, color: string, bg: string, isDefi: boolean) => {
    const rec = records[pairKey(pair[0], pair[1])];
    return (
      <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${label} : ${pair[0]} vers ${pair[1]}${rec ? `, record ${rec}` : ''}`} onPress={() => onPick(pair, isDefi)}
        style={({ pressed }) => ({ borderRadius: 18, borderWidth: 2, borderColor: 'transparent', backgroundColor: bg, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.85 : 1 })}>
        <View style={{ flex: 1 }}>
          <T size={13} weight={700} color={INK}>{label}</T>
          <T size={21} weight={700} color={INK}>{pair[0]} → {pair[1]}</T>
          {sub ? <T size={13} weight={500} color={INK}>{sub}</T> : null}
        </View>
        <View style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 13, borderWidth: 2, borderColor: 'transparent', backgroundColor: color }}>
          <T size={14} weight={700} color={INK}>{rec ? `record ${rec}` : '—'}</T>
        </View>
      </Pressable>
    );
  };
  return (
    <Frame>
      <Header title="Lier" onClose={onClose} closeLabel="Retour au menu" />
      <Title title="Quels mots lier ?" sub="relie deux mots par une chaîne de mots proches" />
      <View style={{ gap: 10 }}>
        {card('defi', 'Défi du jour', defi, 'le même pour tous', '#FFD45C', '#FFF3B0', true)}
        {LEVELS.map(l => card(l.level, l.label, pairs[l.level], l.sub, l.color, '#FFFFFF', false))}
      </View>
      <View style={{ flex: 1 }} />
    </Frame>
  );
}

/* ---------- 2, 6-11 · En jeu ---------- */
function EnJeu({ game, setGame, onFinish, onAbandon }: { game: Game; setGame: (g: Game) => void; onFinish: (g: Game) => void; onAbandon: (g: Game) => void }) {
  const inset = useSafeAreaInsets();
  const kb = useKeyboardVisible();
  const { braises, spend } = useWallet();
  const toast = useToast();
  const [text, setText] = useState('');
  const [fb, setFb] = useState<Feedback>(null);
  const [menu, setMenu] = useState(false);
  const input = useRef<TextInputInstance>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const chain = useMemo(() => [game.start, ...game.mids], [game]);
  const temps = useMemo(() => links(chain), [chain]);
  const last = chain[chain.length - 1];
  const heat = towards(last, game.target);
  const prevHeat = chain.length > 1 ? towards(chain[chain.length - 2], game.target) : heat;
  const recul = game.mids.length > 0 && heat < prevHeat;

  // « accepté » s'efface après un instant pour laisser la place à « Retirer le dernier mot »
  useEffect(() => {
    if (fb?.kind !== 'ok') return;
    const id = setTimeout(() => setFb(f => (f === fb ? null : f)), 2600);
    return () => clearTimeout(id);
  }, [fb]);
  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 30); }, [game.mids.length, fb]);

  const send = () => {
    const v = judge(chain, game.target, text);
    if (v.kind === 'vide') return;
    setText('');
    input.current?.focus();
    if (v.kind !== 'ok') { setFb(v); return; }
    const next = { ...game, mids: v.word === game.target ? game.mids : [...game.mids, v.word] };
    setGame(next);
    if (v.done) { onFinish(next); return; }
    setFb(v);
  };
  const undo = () => { setGame({ ...game, mids: game.mids.slice(0, -1) }); setFb(null); };
  const hint = () => {
    if (fb?.kind === 'indice') return;
    if (braises < HINT_COST) { toast.show(`Il te manque ${HINT_COST - braises} braises pour un indice`); return; }
    const h = hintAfter(chain, game.target);
    if (!h) { toast.show('Pas d’étape possible d’ici : retire le dernier mot'); return; }
    if (!spend(HINT_COST)) return;
    setFb({ kind: 'indice', word: h });
  };

  const placeholder = fb?.kind === 'loin' ? `Essaie un mot plus proche de « ${fb.prev} »` : fb?.kind === 'proche' ? 'Choisis un mot vraiment différent' : `Mot suivant (≥ ${MIN_LINK}°)`;
  const lastLook = fb?.kind === 'ok' || fb?.kind === 'indice' ? 'ring' : recul ? 'pink' : null;
  return (
    <View style={{ flex: 1 }}>
      <GameBg />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, paddingTop: Math.max(inset.top, 44) + 4, paddingBottom: (kb && Platform.OS !== 'web' ? 10 : 24) + inset.bottom, paddingHorizontal: 16, gap: 10 }}>
          <Header title="Lier" onClose={() => setMenu(true)} closeLabel="Quitter ou abandonner" right={<StepsPill n={game.mids.length} />} />
          <Towards target={game.target} t={heat} />
          <ScrollView ref={scroll} style={{ flex: 1, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 4 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Chain words={chain} target={game.target} complete={false} temps={temps} last={game.mids.length ? lastLook : null} />
            <FeedbackView fb={fb} recul={recul} canUndo={game.mids.length > 0} onUndo={undo} onUseHint={w => { setText(w); input.current?.focus(); }} />
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0, height: 50, borderRadius: 16, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
              <TextInput
                ref={input} value={text} onChangeText={setText} onSubmitEditing={send} placeholder={placeholder} placeholderTextColor="#7C7399"
                autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="send" submitBehavior="submit" {...keepFocus} accessibilityLabel="Mot suivant"
                style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center', fontFamily: 'Fredoka_500Medium', fontSize: 17, color: INK, outlineStyle: 'none' } as object}
              />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Indice, ${HINT_COST} braises`} onPress={hint}
              style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: '#FFF4D6', alignItems: 'center', justifyContent: 'center' }}>
              <LierIcon name="bulb" size={26} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Proposer" onPress={send} disabled={!text.trim()}
              style={{ height: 50, paddingHorizontal: 14, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#FFD45C', justifyContent: 'center' }}>
              <T size={17} weight={700} color={INK}>Proposer</T>
            </Pressable>
          </View>
        </View>
        <Toast msg={toast.msg} check={false} style={{ bottom: 84 + inset.bottom }} />
      </KeyboardAvoidingView>

      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <View>
          <T size={22} weight={700} color={INK} style={{ lineHeight: 24 }}>Quitter la partie ?</T>
          <T size={14} weight={600} color={gameInkSoft}>{game.start} → {game.target} · {plural(game.mids.length, 'étape')}</T>
        </View>
        <SheetRow title="Quitter" sub="ta chaîne est gardée, tu la reprendras plus tard" onPress={() => { setMenu(false); leave(); }} />
        <SheetRow title="Abandonner" sub="Nabulo te montre une chaîne possible" onPress={() => { setMenu(false); onAbandon(game); }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Continuer la partie" onPress={() => setMenu(false)} style={{ paddingTop: 4, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <T size={16} weight={700} color={gameInkSoft}>Continuer</T>
        </Pressable>
      </Sheet>
    </View>
  );
}

function SheetRow({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={sub} onPress={onPress}
      style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#FFFFFF', boxShadow: 'inset 0 -5px 0 #E4DEF5' }}>
      <T size={18} weight={700} color={INK}>{title}</T>
      <T size={13} weight={600} color={gameInkSoft}>{sub}</T>
    </Pressable>
  );
}

const BANNER: Record<'loin' | 'proche' | 'deja' | 'inconnu', string> = { loin: '#FF5A8A', proche: '#FF9A3C', deja: '#9C6BFF', inconnu: '#9C6BFF' };
function FeedbackView({ fb, recul, canUndo, onUndo, onUseHint }: { fb: Feedback; recul: boolean; canUndo: boolean; onUndo: () => void; onUseHint: (w: string) => void }) {
  if (fb?.kind === 'ok') {
    return <T size={15} weight={700} color="#FFFFFF" align="center" style={SHADOW} accessibilityLiveRegion="polite">« {fb.word} » est à {Math.round(fb.temperature)}° de « {fb.prev} » : accepté</T>;
  }
  if (fb?.kind === 'indice') {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`Indice : ${fb.word}. Toucher pour l’écrire`} onPress={() => onUseHint(fb.word)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: INK, backgroundColor: '#FFF3B0' }}>
        <View style={{ flex: 1 }}>
          <T size={13} weight={700} color={INK}>Indice · une bonne étape suivante</T>
          <T size={22} weight={700} color={INK}>{fb.word}</T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 13, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#FFD45C' }}>
          <T size={15} weight={700} color={INK}>−{HINT_COST}</T>
          <Coin size={20} />
        </View>
      </Pressable>
    );
  }
  if (fb && fb.kind !== 'vide') {
    const tag = fb.kind === 'deja' ? 'déjà utilisé' : fb.kind === 'inconnu' ? 'inconnu' : `${Math.round(fb.temperature)}°`;
    const msg = fb.kind === 'loin' ? `Trop loin de « ${fb.prev} »` : fb.kind === 'proche' ? `Trop proche de « ${fb.prev} »` : fb.kind === 'deja' ? 'Déjà dans ta chaîne' : 'Nabulo ne connaît pas ce mot';
    return (
      <View style={{ gap: 10 }} accessibilityLiveRegion="polite">
        <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Bubble bg="#FFB3C7" radius={16} border={2} inset={5} style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
            <T size={21} weight={700} color={INK} style={{ textDecorationLine: 'line-through' }}>{fb.word}</T>
          </Bubble>
          <View style={{ paddingVertical: 2, paddingHorizontal: 9, borderRadius: 9, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#FFFFFF' }}>
            <T size={14} weight={700} color={INK}>{tag}</T>
          </View>
        </View>
        <Bubble bg={BANNER[fb.kind]} radius={16} border={2} inset={5} style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
          <T size={17} weight={700} color="#FFFFFF" align="center" style={{ textShadowColor: INK, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 }}>{msg}</T>
        </Bubble>
      </View>
    );
  }
  if (!canUndo) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Retirer le dernier mot" accessibilityHint={recul ? 'ce mot t’éloigne de l’arrivée' : undefined} onPress={onUndo} hitSlop={6} style={{ alignSelf: 'flex-end' }}>
      <Bubble bg="#FFFFFF" radius={14} border={2} inset={5} style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
        <T size={14} weight={700} color={INK}>↶ Retirer le dernier mot</T>
      </Bubble>
    </Pressable>
  );
}

/* ---------- 3 · Chaîne terminée ---------- */
function Terminee({ done, onClose, onNext, computing }: { done: Done; onClose: () => void; onNext: () => void; computing: boolean }) {
  const temps = links(done.chain);
  return (
    <Frame>
      <Header title="Lier" onClose={onClose} closeLabel="Retour au menu" right={<StepsPill n={done.chain.length - 1} />} />
      <T size={24} weight={700} color="#FFFFFF" align="center" style={SHADOW}>Chaîne terminée !</T>
      <ScrollView style={{ flex: 1, marginHorizontal: -16 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        <Chain words={done.chain} target={done.chain[done.chain.length - 1]} complete temps={temps} />
      </ScrollView>
      <View style={{ flexDirection: 'row', opacity: computing ? 0.6 : 1 }}>
        <BigButton label="Voir le résultat" icon="arrow" fontSize={19} onPress={computing ? undefined : onNext} />
      </View>
    </Frame>
  );
}

/* ---------- 4 · Fin · résultat ---------- */
const NEIGHBOR_COLORS = ['#FF5A36', '#FF7240', '#FF9A3C', '#FFB35C', '#FFD45C'];
function Resultat({ done, onMenu, onNew }: { done: Done; onMenu: () => void; onNew: () => void }) {
  const target = done.chain[done.chain.length - 1];
  const steps = done.chain.length - 1;
  const near = useMemo(() => closeWords(target), [target]);
  const weakest = Math.round(Math.min(...links(done.chain)));
  const outline = { textShadowColor: INK, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 };
  return (
    <Frame bg={<><SlidingGradient colors={warmGradient} stops={warmStops} duration={10000} /><Confetti /></>}>
      <View style={{ paddingTop: 40, paddingHorizontal: 4, paddingBottom: 10, alignItems: 'center', gap: 4 }}>
        <View style={{ width: 160, height: 160, marginBottom: 10 }}>
          <Image source={images.nabuloSaut} autoplay style={{ position: 'absolute', left: -48, top: -90, width: 256, height: 256 }} contentFit="contain" accessibilityLabel="Nabulo saute de joie, le poing en l’air" />
        </View>
        <T size={38} weight={700} color="#FFFFFF" align="center" style={[{ lineHeight: 40 }, outline]}>Chaîne de {plural(steps, 'étape')}</T>
        <T size={18} weight={600} color="#FFFFFF" align="center" style={outline}>ton record : {plural(done.prevRecord ?? steps, 'étape')}</T>
      </View>
      <View style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 4, justifyContent: 'center', gap: 14 }}>
        <T size={17} weight={700} color="#FFFFFF" align="center" style={SHADOW}>Mot trouvé · ses voisins</T>
        <View style={{ alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 16, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#FFFFFF' }}>
          <T size={46} weight={700} color={INK} numberOfLines={1} adjustsFontSizeToFit style={{ lineHeight: 51 }}>{target}</T>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
          {near.map((w, i) => (
            <Bubble key={w} bg={NEIGHBOR_COLORS[i]} radius={13} border={2} inset={4} style={{ paddingVertical: 6, paddingHorizontal: 13 }}>
              <T size={18} weight={700} color={INK}>{w}</T>
            </Bubble>
          ))}
        </View>
        <View style={{ marginTop: 22, gap: 10 }}>
          <Stat label="Étapes" value={String(steps)} />
          <Stat label="Lien le plus faible" value={`${weakest}°`} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 4, paddingBottom: 6, flexDirection: 'row', gap: 10 }}>
        <BigButton label="Menu" icon="home" mix grow={false} onPress={onMenu} />
        <BigButton label="Nouvelle chaîne" icon="refresh" onPress={onNew} />
      </View>
    </Frame>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(255,255,255,0.92)', boxShadow: 'inset 0 -5px 0 rgba(20,10,60,0.18)' }}>
      <T size={17} weight={600} color={INK}>{label}</T>
      <T size={17} weight={700} color={INK}>{value}</T>
    </View>
  );
}

/* ---------- 12 · Comparaison avec la meilleure chaîne ---------- */
function Comparaison({ done, onClose, onShare, onReplay }: { done: Done; onClose: () => void; onShare: () => void; onReplay: () => void }) {
  const best = done.best ?? done.chain;
  const label = (c: string) => <T size={15} weight={700} color="#FFFFFF" align="center" style={SHADOW}>{c}</T>;
  return (
    <Frame>
      <Header title="Résultat" onClose={onClose} closeLabel="Retour au menu" />
      <Title title={`Ta chaîne : ${plural(done.chain.length - 1, 'étape')}`} sub={`le plus court possible : ${plural(best.length - 1, 'étape')}`} />
      <ScrollView style={{ flex: 1, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }} showsVerticalScrollIndicator={false}>
        {label('Ta chaîne')}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
          {done.chain.map((w, i) => <WordChip key={w + i} word={w} bg={i === 0 ? '#FFD45C' : i === done.chain.length - 1 ? '#FFD23F' : '#FFFFFF'} />)}
        </View>
        {label('La meilleure chaîne')}
        <Chain words={best} target={best[best.length - 1]} complete temps={links(best)} compact />
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <BigButton label="Partager" icon="share" mix height={56} onPress={onShare} />
        <BigButton label="Rejouer" icon="refresh" height={56} onPress={onReplay} />
      </View>
    </Frame>
  );
}

/* ---------- 13 · Abandon · une solution ---------- */
function Abandon({ solution, onMenu, onNew }: { solution: string[] | null; onMenu: () => void; onNew: () => void }) {
  return (
    <Frame>
      <Header title="Lier" onClose={onMenu} closeLabel="Retour au menu" />
      <View style={{ flex: 1 }} />
      <View style={{ alignSelf: 'center' }}><Mascot mood="froid" size={110} /></View>
      <Title title="Pas de souci !" sub={solution === null ? 'Nabulo cherche une chaîne…' : solution.length ? 'voici une chaîne possible' : 'Nabulo n’a pas trouvé de chaîne cette fois'} />
      {solution && solution.length > 0 && <Chain words={solution} target={solution[solution.length - 1]} complete temps={links(solution)} compact />}
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <BigButton label="Menu" icon="home" mix grow={false} height={56} onPress={onMenu} />
        <BigButton label="Nouvelle chaîne" icon="refresh" height={56} onPress={onNew} />
      </View>
    </Frame>
  );
}

/* ---------- 14 · Partage ---------- */
function Partage({ chain, onClose }: { chain: string[]; onClose: () => void }) {
  const toast = useToast();
  const [date] = useState(() => new Date());
  const message = shareText(chain, date);
  const send = () => { Share.share({ message }).catch(() => {}); };
  const copy = async () => {
    const clip = Platform.OS === 'web' ? (globalThis as { navigator?: { clipboard?: { writeText(s: string): Promise<void> } } }).navigator?.clipboard : undefined;
    if (clip) { try { await clip.writeText(message); toast.show('Copié !'); return; } catch { /* on passe par le partage */ } }
    send();
  };
  return (
    <Frame>
      <Header title="Partager" onClose={onClose} closeLabel="Retour au résultat" />
      <View style={{ flex: 1 }} />
      <Bubble bg="#FFFFFF" radius={18} border={2} inset={6} style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
        <T size={15} weight={700} color={INK} align="center">Nabulo · Lier · {shortDate(date)}</T>
        <T size={26} weight={700} color={INK} align="center" style={{ marginTop: 4, marginBottom: 8 }}>{plural(chain.length - 1, 'étape')}</T>
        <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }} accessibilityLabel="Force de chaque lien">
          {shareSquares(chain).map((c, i) => <View key={i} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: c }} />)}
        </View>
        <T size={13} weight={600} color={INK} align="center" style={{ marginTop: 8 }}>les couleurs montrent la force de chaque lien, sans dévoiler les mots</T>
      </Bubble>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <BigButton label="Copier" mix height={56} onPress={copy} />
        <BigButton label="Envoyer" height={56} onPress={send} />
      </View>
      <Toast msg={toast.msg} style={{ bottom: 100 }} />
    </Frame>
  );
}
