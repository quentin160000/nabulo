import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View, type TextInputInstance } from 'react-native';
import { engine, engineKind } from '@/game/engine';
import { FREE_AD_HINTS_PER_DAY, HINT_COST, bestTemperature, sortGuesses } from '@/game/rules';
import { formatTemp } from '@/game/temperature';
import { useDaily } from '@/game/useDaily';
import { useWallet } from '@/game/wallet';
import { ink, warmGradient } from '@/theme/colors';
import { Bubble } from '@/ui/Bubble';
import { Button } from '@/ui/Button';
import { BraisePill, BulbIcon, HeaderButton, Tag, images } from '@/ui/bits';
import { Confetti } from '@/ui/Confetti';
import { Screen } from '@/ui/Screen';
import { TempChip, TempGauge } from '@/ui/TempGauge';
import { T } from '@/ui/Text';

export default function MotDuJour() {
  const daily = useDaily('fr');
  const { state, ready } = daily;
  const [rulesSeen, setRulesSeen] = useState(false);
  if (!ready) return <Screen><View /></Screen>;
  if (state.solved) return <Victoire daily={daily} />;
  if (state.guesses.length === 0 && !rulesSeen) return <Regles day={state.day} onStart={() => setRulesSeen(true)} />;
  return <EnJeu daily={daily} />;
}

type Daily = ReturnType<typeof useDaily>;

function Header({ day }: { day: number }) {
  const { braises } = useWallet();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <HeaderButton kind="close" label="Quitter la partie" onPress={() => router.back()} />
      <T size={20} weight={700} outline style={{ flex: 1 }}>Mot du jour n°{day}</T>
      <BraisePill value={braises} />
    </View>
  );
}

/* ---------- Règles (premier écran tant qu'aucun essai) ---------- */
function Regles({ day, onStart }: { day: number; onStart: () => void }) {
  const steps = [
    'Un mot secret, le même pour tout le monde aujourd’hui.',
    'Propose des mots : chacun reçoit une température selon son sens.',
    'Plus c’est chaud, plus tu t’approches. 100 °C : tu l’as trouvé !',
    'Coincé ? Un indice coûte 60 braises, ou une pub.',
  ];
  return (
    <Screen>
      <Header day={day} />
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <Image source={images.nabulo} style={{ width: 120, height: 120 }} contentFit="contain" accessibilityLabel="Nabulo" />
        <T size={30} weight={700} outline>Mot du jour</T>
        <T size={15} weight={600} outline>le même pour tout le monde</T>
      </View>
      <View style={{ gap: 10, marginTop: 8 }}>
        {steps.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: '#FFFFFF' }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFD45C', alignItems: 'center', justifyContent: 'center' }}><T size={14} weight={700}>{i + 1}</T></View>
            <T size={15} weight={600} style={{ flex: 1 }}>{s}</T>
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <Button label="Jouer" onPress={onStart} />
    </Screen>
  );
}

/* ---------- En jeu ---------- */
function EnJeu({ daily }: { daily: Daily }) {
  const { state, busy, feedback, last, submit, takeHint } = daily;
  const [text, setText] = useState('');
  const [sheet, setSheet] = useState(false);
  const input = useRef<TextInputInstance>(null);
  const sorted = useMemo(() => sortGuesses(state.guesses), [state.guesses]);
  const best = state.guesses.length ? bestTemperature(state.guesses) : null;
  const lastGuess = state.guesses.find(g => g.word === last) ?? null;

  const send = async () => { const w = text; setText(''); await submit(w); input.current?.focus(); };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1, gap: 10 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Header day={state.day} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image source={images.nabulo} style={{ width: 84, height: 84 }} contentFit="contain" accessibilityLabel="Nabulo" />
          <View style={{ flex: 1 }}><TempGauge best={best} last={lastGuess} /></View>
        </View>
        {feedback && (
          <View accessibilityLiveRegion="polite" style={{ alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)' }}>
            <T size={14} weight={700} outline>
              {feedback.kind === 'unknown' ? `Je ne connais pas « ${feedback.word} »` : feedback.kind === 'repeat' ? `« ${feedback.word} » est déjà dans ta liste` : 'Connexion impossible, réessaie'}
            </T>
          </View>
        )}
        <T size={15} weight={700} outline>Les plus chauds · {state.guesses.length} essai{state.guesses.length > 1 ? 's' : ''}</T>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 6, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
          {sorted.map(g => (
            <View key={g.word} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 12, borderRadius: 14, backgroundColor: g.word === last ? '#FFF3B0' : '#FFFFFF' }}>
              <T size={13} weight={700} color="#6B6290" style={{ width: 26 }}>{g.order}</T>
              <T size={17} weight={700} style={{ flex: 1 }} numberOfLines={1}>{g.word}</T>
              {g.hint && <Tag label="indice" />}
              {/* comme Cémantix : 1000 ‰ = le plus proche, rien en dessous des 1 000 premiers */}
              {g.rank !== null && <T size={12} weight={700} color="#6B6290">{1001 - g.rank}‰</T>}
              <TempChip t={g.temperature} />
            </View>
          ))}
        </ScrollView>
        {/* au-dessus du clavier : tout est à plat */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Indice" onPress={() => setSheet(true)}
            style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <BulbIcon />
          </Pressable>
          <TextInput
            ref={input} value={text} onChangeText={setText} onSubmitEditing={send} placeholder="Tape un mot" placeholderTextColor="#9A93B8"
            autoCapitalize="none" autoCorrect={false} returnKeyType="send" blurOnSubmit={false} accessibilityLabel="Tape un mot"
            style={{ flex: 1, minWidth: 0, height: 52, borderRadius: 16, backgroundColor: '#FFFFFF', paddingHorizontal: 16, fontFamily: 'Fredoka_600SemiBold', fontSize: 20, color: ink, outlineStyle: 'none' } as object}
          />
          <Button label="Envoyer" variant="flat-yellow" height={52} style={{ width: 108 }} disabled={busy || !text.trim()} onPress={send} />
        </View>
        {engineKind === 'local' && <T size={11} weight={500} outline align="center">mode hors ligne · vocabulaire réduit</T>}
      </KeyboardAvoidingView>
      <HintSheet visible={sheet} onClose={() => setSheet(false)} daily={daily} onTake={takeHint} />
    </Screen>
  );
}

/* ---------- Indice : braises ou pub ---------- */
const ALU = ['#D3D6DB', '#EDEEF1', '#C8CBD1', '#E1E3E7', '#CACDD3'] as const;
function HintSheet({ visible, onClose, daily, onTake }: { visible: boolean; onClose: () => void; daily: Daily; onTake: Daily['takeHint'] }) {
  const { braises, spend } = useWallet();
  const [msg, setMsg] = useState<string | null>(null);
  const enough = braises >= HINT_COST;
  const adsLeft = FREE_AD_HINTS_PER_DAY - daily.state.adHintsUsed;
  const take = async (via: 'braises' | 'pub') => {
    if (via === 'braises' && !spend(HINT_COST)) return;
    const h = await onTake(via);
    setMsg(h ? `Indice : « ${h.word} » · ${formatTemp(h.temperature)}` : 'Plus d’indice disponible');
    setTimeout(() => { setMsg(null); onClose(); }, 1400);
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Fermer" style={{ flex: 1, backgroundColor: 'rgba(43,33,80,0.45)' }} onPress={onClose} />
      <View style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', padding: 20, paddingBottom: 34, gap: 12 }}>
        <LinearGradient colors={ALU} locations={[0, 0.28, 0.55, 0.8, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <BulbIcon size={30} />
          <T size={22} weight={700} style={{ flex: 1 }}>{enough ? 'Un indice ?' : 'Pas assez de braises'}</T>
          <BraisePill value={braises} />
        </View>
        <T size={15} weight={600} color="#4A4E57">Tu reçois un mot plus chaud que ton meilleur essai.</T>
        {msg ? (
          <Bubble style={{ padding: 14 }}><T size={18} weight={700} align="center">{msg}</T></Bubble>
        ) : (
          <View style={{ gap: 10 }}>
            <Button label={`Payer ${HINT_COST} braises`} disabled={!enough} onPress={() => take('braises')}
              icon={<Image source={images.braise} style={{ width: 30, height: 30 }} />} />
            <Button label={adsLeft > 0 ? `Regarder une pub (${adsLeft} restantes)` : 'Plus de pub aujourd’hui'} variant="white" disabled={adsLeft <= 0} onPress={() => take('pub')} />
            <Button label="Annuler" variant="flat-white" height={48} onPress={onClose} />
          </View>
        )}
      </View>
    </Modal>
  );
}

/* ---------- Victoire ---------- */
function Victoire({ daily }: { daily: Daily }) {
  const { state, claimReward } = daily;
  const { braises, earn } = useWallet();
  const [closest, setClosest] = useState<{ word: string; temperature: number }[]>([]);
  const [count] = useState(() => new Animated.Value(0));
  const [shown, setShown] = useState(state.rewardClaimed ? state.reward : 0);
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => { engine.closest(state.lang, state.day, 24).then(setClosest).catch(() => {}); }, [state.lang, state.day]);
  useEffect(() => {
    if (state.rewardClaimed) return;
    // les braises montent une par une, puis sont créditées
    const id = count.addListener(({ value }) => setShown(Math.round(value)));
    Animated.timing(count, { toValue: state.reward, duration: Math.min(2400, state.reward * 30), easing: Easing.out(Easing.quad), useNativeDriver: false })
      .start(() => { earn(state.reward); claimReward(); });
    return () => count.removeListener(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(slide, { toValue: 1, duration: 10000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 10000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ])).start();
  }, [slide]);

  const background = (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' }}>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '300%', transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [0, -1200] }) }] }}>
        <LinearGradient colors={warmGradient} style={{ flex: 1 }} />
      </Animated.View>
      <Confetti />
    </View>
  );
  return (
    <Screen background={background}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <HeaderButton kind="close" label="Retour à l’accueil" onPress={() => router.back()} />
        <T size={20} weight={700} outline style={{ flex: 1 }}>Mot du jour n°{state.day}</T>
        <BraisePill value={braises} />
      </View>
      <View style={{ alignItems: 'center', gap: 4, marginTop: 30 }}>
        <Image source={images.nabuloSaut} style={{ width: 170, height: 170 }} contentFit="contain" autoplay accessibilityLabel="Nabulo saute de joie" />
        <T size={40} weight={700} outline>Trouvé !</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 3, borderRadius: 14, backgroundColor: '#FFD45C' }}><T size={22} weight={700}>{state.secret}</T></View>
          <T size={18} weight={700} outline>100 °C</T>
        </View>
        <T size={15} weight={600} outline>en {state.guesses.length} essais{state.hintsUsed ? ` · ${state.hintsUsed} indice${state.hintsUsed > 1 ? 's' : ''}` : ''}</T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)' }}>
        <Image source={images.braise} style={{ width: 52, height: 52 }} />
        <T size={44} weight={700} outline accessibilityLiveRegion="polite">+{shown}</T>
        <T size={15} weight={700} outline>braises{'\n'}gagnées</T>
      </View>
      <T size={15} weight={700} outline>Les mots les plus proches</T>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 6 }}>
        {closest.slice(1).map((c, i) => (
          <View key={c.word} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 40, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#FFFFFF' }}>
            <T size={13} weight={700} color="#6B6290" style={{ width: 22 }}>{i + 1}</T>
            <T size={16} weight={700} style={{ flex: 1 }}>{c.word}</T>
            <TempChip t={c.temperature} />
          </View>
        ))}
      </ScrollView>
      <Button label="Retour à l’accueil" onPress={() => router.back()} />
    </Screen>
  );
}
