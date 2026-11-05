import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, TextInput, View, useWindowDimensions, type ScrollViewInstance, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dayNumberFrom } from '@/game/engine/types';
import { LEVEL_LABEL, MIN_LINK, canClose, hintAfter, judge, links, maillons, maillonsLabel, pairKey, randomPair, shareSquares, shareText, shortDate, solve, towards, type Verdict } from '@/game/lier';
import { DIFFICILE, FACILE, MOYEN, dailyPair, type Level, type Pair } from '@/game/lier-paires';
import { HINT_COST } from '@/game/rules';
import { load, save } from '@/game/storage';
import { normalizeWord } from '@/game/temperature';
import { useWallet } from '@/game/wallet';
import { gameInk, gameInkSoft, warmGradient, warmStops } from '@/theme/colors';
import { Bubble } from '@/ui/Bubble';
import { SlidingGradient } from '@/ui/backgrounds';
import { Coin, Icon, images } from '@/ui/bits';
import { Confetti } from '@/ui/Confetti';
import { GameBg, Sheet, keepFocus } from '@/ui/game';
import { KAV_BEHAVIOR, useMargeBasse } from '@/ui/retours-jeux-clavier';
import { BigButton, Chain, Header, LierIcon, SHADOW, StepsPill, Towards } from '@/ui/lier-bits';
import { Mascot } from '@/ui/Mascot';
import { T } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';

const INK = gameInk;
/** Anciens records (par paire, en liens), repris une fois dans K_RECORDS. */
const K_RECORD_V1 = 'nabulo:record:lier';
/**
 * Records en maillons : `defi:<départ>><arrivée>` pour le défi du jour (même paire pour tous ce jour-là),
 * `facile` / `moyen` / `difficile` pour les paires tirées au hasard (qui ne reviennent presque jamais : un record par
 * paire serait toujours « premier record » ; toutes les paires d'un niveau ont le même minimum de maillons).
 */
const K_RECORDS = 'nabulo:lier:records';
const K_RECENTS = 'nabulo:lier:recents';
const K_ENCOURS = 'nabulo:encours:lier';
const K_PARTIE = 'nabulo:lier:partie';

type Mode = Level | 'defi';
type Game = { start: string; target: string; mids: string[]; level: Mode; day: number };
type Done = { chain: string[]; prevRecord: number | null; level: Mode; best: string[] | null | undefined };
type Phase = 'charge' | 'regles' | 'choix' | 'tirage' | 'jeu' | 'fini' | 'resultat' | 'comparaison' | 'partage' | 'abandon';
type Records = Record<string, number>;
type Feedback = Verdict | { kind: 'indice'; word: string } | null;

const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;
const recordKey = (level: Mode, start: string, target: string) => (level === 'defi' ? `defi:${pairKey(start, target)}` : level);
const FALLBACK: Record<Level, Pair[]> = { facile: FACILE, moyen: MOYEN, difficile: DIFFICILE };

/** Records : reprend une fois les anciens (par paire, comptés en liens = maillons + 1). */
async function loadRecords(): Promise<Records> {
  const cur = await load<Records | null>(K_RECORDS, null);
  if (cur) return cur;
  const old = await load<Records>(K_RECORD_V1, {});
  const next: Records = {};
  for (const [k, v] of Object.entries(old)) if (typeof v === 'number' && k.includes('>')) next[`defi:${k}`] = Math.max(0, v - 1);
  save(K_RECORDS, next);
  return next;
}
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
  const [recents, setRecents] = useState<string[]>([]);
  const [shareFrom, setShareFrom] = useState<Phase>('comparaison');

  useEffect(() => {
    let alive = true;
    type Saved = Partial<Game> & { defi?: boolean };
    Promise.all([loadRecords(), load<string[]>(K_RECENTS, []), load<Saved | null>(K_PARTIE, null)]).then(([r, rec, g]) => {
      if (!alive) return;
      setRecords(r); setRecents(Array.isArray(rec) ? rec : []);
      // reprise d'une partie en cours (le défi n'est repris que le jour même) ; ancien format : `defi` booléen
      const level: Mode = g?.level ?? (g?.defi ? 'defi' : 'moyen');
      const resumable = g && g.start && g.target && Array.isArray(g.mids) && (level !== 'defi' || g.day === day) && (!defiParam || level === 'defi');
      if (resumable) { setGame({ start: g.start!, target: g.target!, mids: g.mids!, level, day: g.day ?? day }); setPhase('jeu'); } else setPhase('regles');
    });
    return () => { alive = false; };
  }, [day, defiParam]);

  const startGame = useCallback((pair: Pair, level: Mode) => {
    setGame({ start: pair[0], target: pair[1], mids: [], level, day });
    setDone(null); setSolution(null); setPhase('jeu');
  }, [day]);

  /** Facile / Moyen / Difficile : nouvelle paire tirée au hasard (jamais une des 30 dernières), sans la montrer avant. */
  const pick = (level: Mode) => {
    if (level === 'defi') { startGame(dailyPair(day), 'defi'); return; }
    setPhase('tirage');
    setTimeout(() => {
      const pair = randomPair(level, Math.random, recents, FALLBACK[level]);
      const next = [pairKey(pair[0], pair[1]), ...recents].slice(0, 30);
      setRecents(next); save(K_RECENTS, next);
      startGame(pair, level);
    }, 40);
  };

  // partie en cours : sauvegardée à chaque coup, avec la carte « Reprendre » de l'accueil
  useEffect(() => {
    if (phase !== 'jeu' || !game) return;
    save(K_PARTIE, game);
    save(K_ENCOURS, {
      titre: game.level === 'defi' ? 'Lier · défi du jour' : `Lier · ${LEVEL_LABEL[game.level]}`,
      sousTitre: `${game.start} → ${game.target} · ${plural(game.mids.length, 'maillon')}`,
      route: game.level === 'defi' ? '/jeux/lier?defi=jour' : '/jeux/lier',
    });
  }, [phase, game]);
  const clearSaved = () => { AsyncStorage.multiRemove([K_PARTIE, K_ENCOURS]).catch(() => {}); };

  const finish = (g: Game) => {
    const chain = [g.start, ...g.mids, g.target];
    const key = recordKey(g.level, g.start, g.target);
    const prev = records[key] ?? null;
    const steps = maillons(chain);
    if (prev === null || steps < prev) {
      const next = { ...records, [key]: steps };
      setRecords(next); save(K_RECORDS, next);
    }
    clearSaved();
    setDone({ chain, prevRecord: prev, level: g.level, best: undefined });
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
  if (phase === 'regles') return <Regles onClose={leave} onPlay={() => (defiParam ? pick('defi') : setPhase('choix'))} />;
  if (phase === 'choix') return <Choix day={day} records={records} onClose={leave} onPick={pick} />;
  if (phase === 'tirage') return <Tirage />;
  if (phase === 'jeu' && game) return <EnJeu game={game} setGame={setGame} onFinish={finish} onAbandon={abandon} />;
  if (phase === 'fini' && done) return <Terminee done={done} onClose={leave} onNext={showResult} computing={done.best === undefined} />;
  if (phase === 'resultat' && done) {
    return <Resultat done={done} onMenu={leave} onNew={() => setPhase('choix')} onShare={() => { setShareFrom('resultat'); setPhase('partage'); }} />;
  }
  if (phase === 'comparaison' && done) {
    return <Comparaison done={done} onClose={leave} onShare={() => { setShareFrom('comparaison'); setPhase('partage'); }}
      onReplay={() => startGame([done.chain[0], done.chain[done.chain.length - 1]], done.level)} />;
  }
  if (phase === 'partage' && done) return <Partage chain={done.chain} level={done.level} onClose={() => setPhase(shareFrom)} />;
  if (phase === 'abandon') return <Abandon solution={solution} onMenu={leave} onNew={() => setPhase('choix')} />;
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
  'Chaque mot ajouté est un maillon : le moins de maillons possible = la meilleure chaîne.',
];
function Regles({ onClose, onPlay }: { onClose: () => void; onPlay: () => void }) {
  return (
    <Frame>
      <Header title="Règles" onClose={onClose} closeLabel="Retour au menu" />
      <View style={{ alignItems: 'center', gap: 6, marginTop: 6 }}>
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

/* ---------- 5 · Choix de la difficulté (les mots ne sont dévoilés qu'en jeu) ---------- */
const LEVELS: { level: Mode; label: string; sub: string; color: string; bg: string }[] = [
  { level: 'defi', label: 'Défi du jour', sub: 'les mêmes mots pour tous, chaque jour', color: '#FFD45C', bg: '#FFF3B0' },
  { level: 'facile', label: 'Facile', sub: 'mots proches · un maillon suffit', color: '#7CE0B5', bg: '#FFFFFF' },
  { level: 'moyen', label: 'Moyen', sub: 'deux maillons au moins', color: '#9DD8FF', bg: '#FFFFFF' },
  { level: 'difficile', label: 'Difficile', sub: 'mots très éloignés', color: '#FF86C8', bg: '#FFFFFF' },
];
function Choix({ day, records, onClose, onPick }: { day: number; records: Records; onClose: () => void; onPick: (l: Mode) => void }) {
  const defi = dailyPair(day);
  return (
    <Frame>
      <Header title="Lier" onClose={onClose} closeLabel="Retour au menu" />
      <Title title="Quelle difficulté ?" sub="les deux mots se découvrent en jeu" />
      <View style={{ gap: 10 }}>
        {LEVELS.map(l => {
          const rec = records[recordKey(l.level, defi[0], defi[1])];
          return (
            <Pressable key={l.level} accessibilityRole="button" accessibilityLabel={`${l.label} : ${l.sub}${rec !== undefined ? `, record ${maillonsLabel(rec)}` : ''}`} onPress={() => onPick(l.level)}
              style={({ pressed }) => ({ minHeight: 72, borderRadius: 18, backgroundColor: l.bg, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.85 : 1 })}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T size={22} weight={700} color={INK} numberOfLines={1}>{l.label}</T>
                <T size={13} weight={500} color={INK} numberOfLines={1} adjustsFontSizeToFit>{l.sub}</T>
              </View>
              {rec !== undefined && (
                <View style={{ flexShrink: 0, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 13, backgroundColor: l.color }}>
                  <T size={14} weight={700} color={INK}>record {rec}</T>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <View style={{ flex: 1 }} />
    </Frame>
  );
}

/** Pendant le tirage d'une paire (le solveur vérifie qu'elle a la bonne difficulté). */
function Tirage() {
  return (
    <Frame>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }} accessibilityLiveRegion="polite">
        <Image source={images.nabulo} style={{ width: 110, height: 110 }} contentFit="contain" accessibilityLabel="Nabulo" />
        <T size={18} weight={700} color="#FFFFFF" align="center" style={SHADOW}>Nabulo choisit deux mots…</T>
      </View>
    </Frame>
  );
}

/* ---------- 2, 6-11 · En jeu ---------- */
function EnJeu({ game, setGame, onFinish, onAbandon }: { game: Game; setGame: (g: Game) => void; onFinish: (g: Game) => void; onAbandon: (g: Game) => void }) {
  const inset = useSafeAreaInsets();
  const bas = useMargeBasse(24 + inset.bottom);
  const { braises, spend } = useWallet();
  const toast = useToast();
  const [text, setText] = useState('');
  const [fb, setFb] = useState<Feedback>(null);
  const [menu, setMenu] = useState(false);
  const [hintSheet, setHintSheet] = useState<'confirm' | 'manque' | null>(null);
  const input = useRef<TextInputInstance>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const chain = useMemo(() => [game.start, ...game.mids], [game]);
  const temps = useMemo(() => links(chain), [chain]);
  const last = chain[chain.length - 1];
  const heat = towards(last, game.target);
  const prevHeat = chain.length > 1 ? towards(chain[chain.length - 2], game.target) : heat;
  const recul = game.mids.length > 0 && heat < prevHeat;
  // le dernier mot touche l'arrivée : le joueur choisit de terminer ou de retirer ce mot
  const closable = canClose(chain, game.target);
  const closing = closable ? links([last, game.target])[0] : undefined;

  // « accepté » s'efface après un instant
  useEffect(() => {
    if (fb?.kind !== 'ok') return;
    const id = setTimeout(() => setFb(f => (f === fb ? null : f)), 2600);
    return () => clearTimeout(id);
  }, [fb]);
  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 30); }, [game.mids.length, fb, closable]);

  const send = () => {
    const v = judge(chain, game.target, text);
    if (v.kind === 'vide') return;
    setText('');
    if (v.kind !== 'ok') { setFb(v); input.current?.focus(); return; }
    if (v.word === normalizeWord(game.target)) { onFinish(game); return; }
    setGame({ ...game, mids: [...game.mids, v.word] });
    setFb(v);
    if (v.done) Keyboard.dismiss(); else input.current?.focus();
  };
  const undo = () => {
    setGame({ ...game, mids: game.mids.slice(0, -1) }); setFb(null);
    setTimeout(() => input.current?.focus(), 60);
  };
  const openHint = () => {
    toast.hide();
    if (fb?.kind === 'indice') { setText(fb.word); input.current?.focus(); return; }
    setHintSheet(braises < HINT_COST ? 'manque' : 'confirm');
  };
  const takeHint = () => {
    const h = hintAfter(chain, game.target);
    if (!h) { setHintSheet(null); toast.show('Pas d’étape possible d’ici : retire le dernier mot'); return; }
    if (!spend(HINT_COST)) { setHintSheet('manque'); return; }
    setHintSheet(null);
    setFb({ kind: 'indice', word: h });
  };

  const placeholder = fb?.kind === 'loin' ? `Essaie un mot plus proche de « ${fb.prev} »` : fb?.kind === 'proche' ? 'Choisis un mot vraiment différent' : `Mot suivant (≥ ${MIN_LINK}°)`;
  const lastLook = fb?.kind === 'ok' ? 'ring' : recul && !closable ? 'pink' : null;
  return (
    <View style={{ flex: 1 }}>
      <GameBg />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={KAV_BEHAVIOR}>
        <View style={{ flex: 1, paddingTop: Math.max(inset.top, 44) + 4, paddingBottom: bas, paddingHorizontal: 16, gap: 10 }}>
          <Header title="Lier" onClose={() => setMenu(true)} closeLabel="Quitter ou abandonner" right={<StepsPill n={game.mids.length} />} />
          <Towards target={game.target} t={heat} />
          <ScrollView ref={scroll} style={{ flex: 1, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 4 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Chain words={chain} target={game.target} complete={false} temps={temps} last={game.mids.length ? lastLook : null} closing={closing} />
            {closable && closing !== undefined
              ? <ClosingNote word={last} target={game.target} t={closing} />
              : <FeedbackView fb={fb} onUseHint={w => { setText(w); input.current?.focus(); }} />}
            {!closable && game.mids.length > 0 && <UndoPill recul={recul} onPress={undo} />}
          </ScrollView>
          {closable ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <BigButton label="Retirer" icon="undo" mix grow={false} height={56} hint={`retire « ${last} » pour tenter une chaîne plus courte`} onPress={undo} />
              <BigButton label="Terminer" icon="check" height={56} hint={`relie « ${last} » à « ${game.target} »`} onPress={() => onFinish(game)} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0, height: 50, borderRadius: 16, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                <TextInput
                  ref={input} value={text} onChangeText={setText} onSubmitEditing={send} placeholder={placeholder} placeholderTextColor="#7C7399"
                  autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="send" submitBehavior="submit" {...keepFocus} accessibilityLabel="Mot suivant"
                  style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center', fontFamily: 'Fredoka_500Medium', fontSize: 17, color: INK, outlineStyle: 'none' } as object}
                />
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Indice, ${HINT_COST} brez`} onPress={openHint}
                style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: '#FFF4D6', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bulb" size={26} color={INK} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Proposer" onPress={send} disabled={!text.trim()}
                style={{ height: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#FFD45C', justifyContent: 'center' }}>
                <T size={17} weight={700} color={INK}>Proposer</T>
              </Pressable>
            </View>
          )}
        </View>
        <Toast msg={toast.msg} check={false} style={{ bottom: 84 + inset.bottom }} />
      </KeyboardAvoidingView>

      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <View>
          <T size={22} weight={700} color={INK} style={{ lineHeight: 24 }}>Quitter la partie ?</T>
          <T size={14} weight={600} color={gameInkSoft}>{game.start} → {game.target} · {plural(game.mids.length, 'maillon')}</T>
        </View>
        <SheetRow title="Quitter" sub="ta chaîne est gardée, tu la reprendras plus tard" onPress={() => { setMenu(false); leave(); }} />
        <SheetRow title="Abandonner" sub="Nabulo te dit en combien de maillons c’était possible" onPress={() => { setMenu(false); onAbandon(game); }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Continuer la partie" onPress={() => setMenu(false)} style={{ paddingTop: 4, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <T size={16} weight={700} color={gameInkSoft}>Continuer</T>
        </Pressable>
      </Sheet>

      <Sheet visible={hintSheet !== null} onClose={() => setHintSheet(null)}>
        {hintSheet === 'confirm' ? (
          <>
            <View>
              <T size={22} weight={700} color={INK} style={{ lineHeight: 24 }}>Utiliser un indice</T>
              <T size={14} weight={600} color={gameInkSoft}>Nabulo te souffle un mot proche de « {last} » qui rapproche de « {game.target} »</T>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Payer ${HINT_COST} brez`} onPress={takeHint}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#FFFFFF', boxShadow: 'inset 0 -5px 0 #E4DEF5' }}>
              <Coin size={44} />
              <View style={{ flex: 1 }}>
                <T size={18} weight={700} color={INK}>Payer {HINT_COST} brez</T>
                <T size={13} weight={600} color={gameInkSoft}>il t’en restera {Math.max(0, braises - HINT_COST)}</T>
              </View>
              <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#FF5A36' }}><T size={15} weight={700} color="#FFFFFF">Utiliser</T></View>
            </Pressable>
          </>
        ) : (
          <>
            <View>
              <T size={22} weight={700} color={INK} style={{ lineHeight: 24 }}>Il te manque {Math.max(0, HINT_COST - braises)} brez</T>
              <T size={14} weight={600} color={gameInkSoft}>ta chaîne reste en pause, tu ne perds rien</T>
            </View>
            <SheetRow title="Voir la boutique" sub="des brez pour tes prochains indices" onPress={() => { setHintSheet(null); router.push('/boutique'); }} />
          </>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel="Annuler" onPress={() => setHintSheet(null)} style={{ paddingTop: 4, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <T size={16} weight={700} color={gameInkSoft}>Annuler</T>
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

/** « Retirer le dernier mot » : toujours disponible dès qu'un mot est posé. */
function UndoPill({ recul, onPress }: { recul: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Retirer le dernier mot" accessibilityHint={recul ? 'ce mot t’éloigne de l’arrivée' : undefined} onPress={onPress}
      style={({ pressed }) => ({ alignSelf: 'flex-end', transform: [{ translateY: pressed ? 2 : 0 }] })}>
      <Bubble bg="#FFFFFF" radius={16} border={2} inset={5} style={{ minHeight: 48, paddingLeft: 12, paddingRight: 16, paddingBottom: 3, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View><LierIcon name="undo" size={24} strokeWidth={3.2} /></View>
        <T size={16} weight={700} color={INK}>Retirer le dernier mot</T>
      </Bubble>
    </Pressable>
  );
}

/** La chaîne peut se refermer : on l'annonce, le joueur choisit en bas (Terminer / Retirer). */
function ClosingNote({ word, target, t }: { word: string; target: string; t: number }) {
  return (
    <View style={{ gap: 2 }} accessibilityLiveRegion="polite">
      <T size={17} weight={700} color="#FFFFFF" align="center" style={SHADOW}>« {word} » touche « {target} » à {Math.round(t)}°</T>
      <T size={14} weight={600} color="#FFFFFF" align="center" style={SHADOW}>Termine ta chaîne, ou retire ce mot pour en tenter une plus courte.</T>
    </View>
  );
}

const BANNER: Record<'loin' | 'proche' | 'deja' | 'inconnu', string> = { loin: '#FF5A8A', proche: '#FF9A3C', deja: '#9C6BFF', inconnu: '#9C6BFF' };
function FeedbackView({ fb, onUseHint }: { fb: Feedback; onUseHint: (w: string) => void }) {
  if (fb?.kind === 'ok') {
    return <T size={15} weight={700} color="#FFFFFF" align="center" style={SHADOW} accessibilityLiveRegion="polite">« {fb.word} » est à {Math.round(fb.temperature)}° de « {fb.prev} » : accepté</T>;
  }
  if (fb?.kind === 'indice') {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`Indice : ${fb.word}. Toucher pour l’écrire`} onPress={() => onUseHint(fb.word)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: INK, backgroundColor: '#FFF3B0' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={13} weight={700} color={INK}>Indice · une bonne étape suivante</T>
          <T size={22} weight={700} color={INK} numberOfLines={1} adjustsFontSizeToFit>{fb.word}</T>
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
          <Bubble bg="#FFB3C7" radius={16} border={2} inset={5} style={{ flexShrink: 1, paddingVertical: 6, paddingHorizontal: 16 }}>
            <T size={21} weight={700} color={INK} numberOfLines={1} adjustsFontSizeToFit style={{ textDecorationLine: 'line-through' }}>{fb.word}</T>
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
  return null;
}

/* ---------- 3 · Chaîne terminée ---------- */
function Terminee({ done, onClose, onNext, computing }: { done: Done; onClose: () => void; onNext: () => void; computing: boolean }) {
  const temps = links(done.chain);
  return (
    <Frame>
      <Header title="Lier" onClose={onClose} closeLabel="Retour au menu" right={<StepsPill n={maillons(done.chain)} />} />
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
/** Contour encre du texte blanc de la victoire (text-shadow 0 3px + 2 px de chaque côté dans la maquette). */
const OUTLINE = { textShadowColor: INK, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 } as const;
const OUTLINE_SM = { textShadowColor: INK, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 } as const;

/**
 * Tailles de l'écran de victoire selon la hauteur disponible : les valeurs de la maquette (772 px entre la barre d'état
 * et la marge du bas), puis deux crans plus serrés pour les téléphones plus petits ou à grandes encoches.
 */
function winSizes(avail: number) {
  if (avail >= 760) return { pad: 40, nabulo: 160, title: 38, word: 46, gap: 14, stats: 22, sub: 18 };
  if (avail >= 660) return { pad: 16, nabulo: 124, title: 34, word: 42, gap: 12, stats: 14, sub: 17 };
  return { pad: 6, nabulo: 96, title: 30, word: 38, gap: 10, stats: 10, sub: 16 };
}

function Resultat({ done, onMenu, onNew, onShare }: { done: Done; onMenu: () => void; onNew: () => void; onShare: () => void }) {
  const inset = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const steps = maillons(done.chain);
  const z = winSizes(height - (Math.max(inset.top, 44) + 4) - (24 + inset.bottom));
  const img = z.nabulo * 1.6;
  // record = la chaîne la plus courte : moins d'étapes, c'est mieux
  const prev = done.prevRecord;
  const record = prev === null || steps < prev;
  const egal = prev !== null && steps === prev;
  // records par niveau pour les paires tirées au hasard, par paire pour le défi du jour
  const scope = done.level === 'defi' ? '' : ` · ${LEVEL_LABEL[done.level]}`;
  const badge = record ? (prev === null ? 'Premier record !' : 'Record battu !') : egal ? 'Record égalé !' : 'Pas de record cette fois';
  return (
    <Frame bg={<><SlidingGradient colors={warmGradient} stops={warmStops} duration={10000} /><Confetti /></>}>
      {/* haut : Nabulo qui saute (l'image déborde de sa boîte comme dans la maquette), titre, record */}
      <View style={{ paddingTop: z.pad, paddingHorizontal: 4, paddingBottom: 10, alignItems: 'center', gap: 4 }}>
        <View style={{ width: z.nabulo, height: z.nabulo, marginBottom: 10 }}>
          <Image source={images.nabuloSaut} autoplay style={{ position: 'absolute', left: -z.nabulo * 0.3, top: -z.nabulo * 0.5625, width: img, height: img }} contentFit="contain" accessibilityLabel="Nabulo saute de joie, le poing en l’air" />
        </View>
        <T size={z.title} weight={700} color="#FFFFFF" align="center" style={[{ lineHeight: Math.round(z.title * 1.05) }, OUTLINE]}>{record ? 'Nouveau record !' : 'Chaîne terminée'}</T>
        <T size={z.sub} weight={600} color="#FFFFFF" align="center" style={OUTLINE}>{record ? (prev === null ? 'ton premier record' : 'tu as battu ton record') : 'le plus court gagne'}</T>
      </View>
      {/* milieu : défile au lieu de passer sous les boutons quand l'écran est trop court */}
      <ScrollView style={{ flex: 1, marginHorizontal: -16 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: z.gap }} showsVerticalScrollIndicator={false}>
        <View accessible accessibilityLabel={`Ta chaîne : ${maillonsLabel(steps)}. ${badge}`} style={{ alignItems: 'center', gap: 10 }}>
          <T size={17} weight={700} color="#FFFFFF" align="center" style={OUTLINE_SM}>Ta chaîne</T>
          <Bubble bg="#FFFFFF" radius={26} border={3} inset={8} style={{ minWidth: 150, paddingTop: 2, paddingBottom: 10, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 10 }}>
            <T size={z.word * 1.7} weight={700} color={INK} numberOfLines={1}>{steps}</T>
            <T size={Math.round(z.word * 0.62)} weight={700} color={INK} numberOfLines={1}>{steps > 1 ? 'maillons' : 'maillon'}</T>
          </Bubble>
          <Bubble bg={record ? '#FFD45C' : '#FFFFFF'} radius={15} border={2} inset={5} style={{ paddingVertical: 6, paddingHorizontal: 14, alignItems: 'center' }}>
            <T size={18} weight={700} color={INK} numberOfLines={1}>{badge}</T>
          </Bubble>
        </View>
        <View style={{ marginTop: z.stats, gap: 10 }}>
          {record
            ? <><Stat label={`Nouveau record${scope}`} value={maillonsLabel(steps)} /><Stat label="Ancien record" value={prev === null ? '—' : maillonsLabel(prev)} /></>
            : <><Stat label={`Ton record${scope}`} value={maillonsLabel(prev ?? steps)} /><Stat label="Pour le battre" value={`${maillonsLabel(steps - (prev ?? steps) + 1)} de moins`} /></>}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 4, paddingBottom: 6, flexDirection: 'row', gap: 8 }}>
        <BigButton label="Menu" icon="home" mix fontSize={14} onPress={onMenu} />
        <BigButton label="Partager" icon="share" mix fontSize={14} onPress={onShare} />
        <BigButton label="Rejouer" icon="refresh" fontSize={14} onPress={onNew} />
      </View>
    </Frame>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(255,255,255,0.92)', boxShadow: 'inset 0 -5px 0 rgba(20,10,60,0.18)' }}>
      <T size={17} weight={600} color={INK} numberOfLines={1}>{label}</T>
      <T size={17} weight={700} color={INK} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1 }}>{value}</T>
    </View>
  );
}

/* ---------- 12 · Comparaison : la chaîne du joueur et la longueur du plus court chemin (sans le dévoiler) ---------- */
function Comparaison({ done, onClose, onShare, onReplay }: { done: Done; onClose: () => void; onShare: () => void; onReplay: () => void }) {
  const best = done.best ?? done.chain;
  return (
    <Frame>
      <Header title="Résultat" onClose={onClose} closeLabel="Retour au menu" />
      <Title title={`Ta chaîne : ${maillonsLabel(maillons(done.chain))}`} sub={`le plus court possible : ${maillonsLabel(maillons(best))}`} />
      <ScrollView style={{ flex: 1, marginHorizontal: -16 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
        <T size={15} weight={700} color="#FFFFFF" align="center" style={SHADOW}>Ta chaîne</T>
        <Chain words={done.chain} target={done.chain[done.chain.length - 1]} complete temps={links(done.chain)} compact />
        <T size={15} weight={600} color="#FFFFFF" align="center" style={[SHADOW, { marginTop: 4 }]}>
          Nabulo connaît une chaîne plus courte de {maillonsLabel(done.chain.length - best.length)}. Rejoue pour la trouver !
        </T>
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <BigButton label="Partager" icon="share" mix height={56} onPress={onShare} />
        <BigButton label="Rejouer" icon="refresh" height={56} onPress={onReplay} />
      </View>
    </Frame>
  );
}

/* ---------- 13 · Abandon : la longueur d'une chaîne possible, sans ses mots ---------- */
function Abandon({ solution, onMenu, onNew }: { solution: string[] | null; onMenu: () => void; onNew: () => void }) {
  const sub = solution === null ? 'Nabulo cherche une chaîne…'
    : solution.length ? `Nabulo connaît une chaîne en ${maillonsLabel(maillons(solution))} : à toi de la trouver une prochaine fois`
      : 'Nabulo n’a pas trouvé de chaîne cette fois';
  return (
    <Frame>
      <Header title="Lier" onClose={onMenu} closeLabel="Retour au menu" />
      <View style={{ flex: 1 }} />
      <View style={{ alignSelf: 'center' }}><Mascot mood="froid" size={110} /></View>
      <Title title="Pas de souci !" sub={sub} />
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <BigButton label="Menu" icon="home" mix grow={false} height={56} onPress={onMenu} />
        <BigButton label="Nouvelle chaîne" icon="refresh" height={56} onPress={onNew} />
      </View>
    </Frame>
  );
}

/* ---------- 14 · Partage ---------- */
function Partage({ chain, level, onClose }: { chain: string[]; level: Mode; onClose: () => void }) {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const [date] = useState(() => new Date());
  const message = shareText(chain, date, level);
  const squares = shareSquares(chain);
  // carrés de 44 px (40 + contour 2 px) sur une ligne ; plus petits si la chaîne est longue
  const room = Math.min(width, 430) - 32 - 4 - 28;
  const side = Math.max(26, Math.min(44, Math.floor((room - 6 * (squares.length - 1)) / squares.length)));
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
        <T size={14} weight={700} color={gameInkSoft} align="center">{level === 'defi' ? `Nabulo · Défi du jour · ${shortDate(date)}` : `Nabulo · Lier · ${LEVEL_LABEL[level]}`}</T>
        <T size={17} weight={700} color={INK} align="center" style={{ marginTop: 6 }}>J’ai relié « {chain[0]} » à « {chain[chain.length - 1]} »</T>
        <T size={26} weight={700} color={INK} align="center" style={{ marginBottom: 8 }}>en {maillonsLabel(maillons(chain))} 🔗</T>
        <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }} accessibilityRole="image" accessibilityLabel={`${squares.length} cases : la force de chaque lien`}>
          {squares.map((c, i) => <View key={i} style={{ width: side, height: side, borderRadius: 10, backgroundColor: c }} />)}
        </View>
        <T size={20} weight={700} color={INK} align="center" style={{ marginTop: 10 }}>Tu fais mieux ?</T>
        <T size={13} weight={600} color={gameInkSoft} align="center" style={{ marginTop: 4 }}>les couleurs montrent la force de chaque lien, sans dévoiler les mots de ta chaîne</T>
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
