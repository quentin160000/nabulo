import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, type ScrollViewInstance, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rng } from '@/game/lexicon';
import {
  CHRONO_ALERTE, CHRONO_DUREE, CHRONO_SEUIL, cibleChrono, couleurPastille, essaiChrono, motsTrouves, type Essai,
} from '@/game/libres-manches';
import { vibrationsActives } from '@/game/reglages';
import { enregistrerScore, finirEnCours, marquerEnCours } from '@/game/libres-stockage';
import { Bubble } from '@/ui/Bubble';
import { GameBg, keepFocus } from '@/ui/game';
import { Fin, Header, INK, Pill, quitter, Regles, Stopwatch, TimerBar, useCadre } from '@/ui/libres-ui';
import { MotAjuste } from '@/ui/libres-mot';
import { KAV_BEHAVIOR, useMargeBasse } from '@/ui/retours-jeux-clavier';
import { T } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';

/* Jeux libres · Contre-la-montre (planche J-jeux-libres-14-contre-la-montre). */

const JEU = 'chrono' as const;
const TITRE = 'Contre-la-montre';
const ALERTE = '#FF5A8A';
const REGLES = [
  'Un mot cible et 60 secondes.',
  `Propose un maximum de mots à ${CHRONO_SEUIL}° ou plus du mot cible.`,
  'Les mots trop froids ne comptent pas.',
  'Bats ton record de mots trouvés.',
];
const mots = (n: number) => `${n} mot${n > 1 ? 's' : ''}`;

type Resultat = { trouves: number; ancien: number; cible: string };

export default function Chrono() {
  const [phase, setPhase] = useState<'regles' | 'jeu' | 'fin'>('regles');
  const [partie, setPartie] = useState(0);
  const [res, setRes] = useState<Resultat | null>(null);
  if (phase === 'regles') return <Regles titre={TITRE} regles={REGLES} onPlay={() => setPhase('jeu')} />;
  if (phase === 'fin' && res) return <FinChrono res={res} onReplay={() => { setPartie(p => p + 1); setPhase('jeu'); }} />;
  return <EnJeu key={partie} onFin={r => { setRes(r); setPhase('fin'); }} />;
}

/* ---------- 2 · En jeu / 3 · Dernières secondes ---------- */
function EnJeu({ onFin }: { onFin: (r: Resultat) => void }) {
  const cadre = useCadre(10);
  const inset = useSafeAreaInsets();
  const bas = useMargeBasse(cadre.paddingBottom);
  const [cible] = useState(() => cibleChrono(rng(Date.now())));
  const [essais, setEssais] = useState<Essai[]>([]);
  const [text, setText] = useState('');
  const [reste, setReste] = useState(CHRONO_DUREE);
  const toast = useToast(1800);
  const input = useRef<TextInputInstance>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const trouves = motsTrouves(essais);
  const etat = useRef({ trouves, fini: false });

  useEffect(() => {
    etat.current.trouves = trouves;
    marquerEnCours(JEU, { titre: TITRE, sousTitre: `${mots(trouves)} à ${CHRONO_SEUIL}°+`, route: '/jeux/chrono' });
  }, [trouves]);

  useEffect(() => {
    const debut = Date.now();
    const id = setInterval(async () => {
      const r = Math.max(0, CHRONO_DUREE - (Date.now() - debut) / 1000);
      setReste(r);
      if (r > 0 || etat.current.fini) return;
      clearInterval(id);
      etat.current.fini = true;
      const n = etat.current.trouves;
      const ancien = await enregistrerScore(JEU, n);
      await finirEnCours(JEU);
      onFin({ trouves: n, ancien, cible });
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const proposer = () => {
    if (etat.current.fini) return;
    const v = essaiChrono(cible, text, essais);
    if (!v.ok) {
      if (v.raison !== 'vide') {
        toast.show(v.raison === 'inconnu' ? `Je ne connais pas « ${text.trim()} »` : v.raison === 'cible' ? 'C’est le mot cible !' : `« ${text.trim().toLowerCase()} » est déjà proposé`);
        if (Platform.OS !== 'web' && vibrationsActives()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        if (v.raison !== 'inconnu') setText('');
      }
      input.current?.focus();
      return;
    }
    toast.hide();
    if (Platform.OS !== 'web' && vibrationsActives()) Haptics.impactAsync(v.essai.temperature >= CHRONO_SEUIL ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    setEssais(e => [...e, v.essai]);
    setText('');
    input.current?.focus();
  };

  const s = Math.ceil(reste);
  const alerte = s <= CHRONO_ALERTE;
  return (
    <View style={{ flex: 1 }}>
      <GameBg />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={KAV_BEHAVIOR}>
        <View style={[{ flex: 1, gap: 10 }, cadre, { paddingBottom: bas }]}>
          <Header title={TITRE} onClose={() => { finirEnCours(JEU); quitter(); }}
            right={<Pill label={`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`} bg={alerte ? ALERTE : '#FFD45C'} icon={<Stopwatch />} accessibilityLabel={`${s} secondes restantes`} />} />
          <TimerBar label={alerte ? 'Vite !' : 'Temps'} value={`${s} s`} frac={reste / CHRONO_DUREE} color={alerte ? ALERTE : '#FFD45C'} />
          <Bubble bg="#FFFFFF" radius={18} border={2} inset={6} style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
            <View accessible accessibilityLabel={`Autour de ${cible} : ${mots(trouves)} trouvé${trouves > 1 ? 's' : ''}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <T size={14} weight={600} color={INK}>Autour de</T>
              <MotAjuste mot={cible} size={28} style={{ flex: 1, minWidth: 0, alignSelf: 'auto' }} />
              <T size={22} weight={700} color={INK}>{trouves}</T>
            </View>
          </Bubble>
          <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
            keyboardShouldPersistTaps="handled" onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
            {essais.map(e => (
              <View key={e.word} accessible accessibilityLabel={`${e.word}, ${e.temperature} degrés${e.temperature >= CHRONO_SEUIL ? '' : ', trop froid'}`}
                style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 13, borderWidth: 2, borderColor: 'transparent', backgroundColor: couleurPastille(e.temperature) }}>
                <T size={15} weight={700} color={INK}>{e.word} {e.temperature}°</T>
              </View>
            ))}
          </ScrollView>
          {/* au-dessus du clavier : champ et bouton à plat */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              ref={input} value={text} onChangeText={setText} onSubmitEditing={proposer} placeholder={`Un mot à ${CHRONO_SEUIL}°+`} placeholderTextColor="#7C7399"
              autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="send" submitBehavior="submit" {...keepFocus} accessibilityLabel="Ton mot"
              style={{
                flex: 1, minWidth: 0, height: 50, borderRadius: 16, backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 0,
                includeFontPadding: false, textAlignVertical: 'center', fontFamily: 'Fredoka_500Medium', fontSize: 17, color: INK, outlineStyle: 'none',
              } as object}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Proposer" onPress={proposer}
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

/* ---------- 4 · Fin · temps écoulé ---------- */
function FinChrono({ res, onReplay }: { res: Resultat; onReplay: () => void }) {
  const record = res.trouves > res.ancien;
  const egal = !record && res.trouves > 0 && res.trouves === res.ancien;
  return (
    <Fin
      record={record}
      titre="Temps écoulé !"
      sousTitre={record ? (res.ancien > 0 ? 'Tu as battu ton record' : 'Ton premier record') : `mots à ${CHRONO_SEUIL}° ou plus`}
      serie={{ valeur: res.trouves, legende: 'Mots trouvés', badge: record ? 'Record battu !' : egal ? 'Record égalé !' : 'Pas de record cette fois' }}
      lignes={record
        ? [{ label: 'Nouveau record', value: String(res.trouves) }, { label: 'Ancien record', value: res.ancien > 0 ? String(res.ancien) : '—' }]
        : [{ label: 'Ton record', value: String(res.ancien) }, { label: 'Pour le battre', value: `${res.ancien - res.trouves + 1} de plus` }]}
      onReplay={onReplay}
    />
  );
}
