import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { rng } from '@/game/lexicon';
import { etatReponse, mancheIntrus, INTRUS_DUREE, type MancheIntrus } from '@/game/libres-manches';
import { enregistrerScore, finirEnCours, marquerEnCours } from '@/game/libres-stockage';
import { GameBg } from '@/ui/game';
import { vibrationsActives } from '@/game/reglages';
import { Compteur, FinSerie, Header, quitter, Regles, ROSE, TimerBar, useCadre, VERT } from '@/ui/libres-ui';
import { MotAjuste } from '@/ui/libres-mot';
import { T } from '@/ui/Text';

/* Jeux libres · L'intrus (planche J-jeux-libres-12-lintrus). */

const JEU = 'intrus' as const;
const TITRE = 'L’intrus';
/** Secondes par manche (5 mots à lire, donc plus que Plus chaud) ; le temps repart à chaque manche. Temps écoulé = erreur. */
const DUREE = INTRUS_DUREE;
const REGLES = [
  '5 mots s’affichent : 4 vont ensemble, 1 n’a rien à faire là.',
  `Touche l’intrus en moins de ${DUREE} s : le temps repart à chaque manche.`,
  'Chaque bonne réponse allonge ta série.',
  'Une erreur ou le temps écoulé, et c’est fini.',
];

type Resultat = { serie: number; ancien: number; temps: boolean };

export default function Intrus() {
  const [phase, setPhase] = useState<'regles' | 'jeu' | 'fin'>('regles');
  const [partie, setPartie] = useState(0);
  const [res, setRes] = useState<Resultat | null>(null);
  if (phase === 'regles') return <Regles titre={TITRE} regles={REGLES} onPlay={() => setPhase('jeu')} />;
  if (phase === 'fin' && res) return <FinIntrus res={res} onReplay={() => { setPartie(p => p + 1); setPhase('jeu'); }} />;
  return <EnJeu key={partie} onFin={r => { setRes(r); setPhase('fin'); }} />;
}

/* ---------- 2 · En jeu / 3 · Erreur ---------- */
function EnJeu({ onFin }: { onFin: (r: Resultat) => void }) {
  const cadre = useCadre();
  const [rand] = useState(() => rng(Date.now()));
  const vus = useRef(new Set<string>());
  const [serie, setSerie] = useState(0);
  const [manche, setManche] = useState<MancheIntrus>(() => mancheIntrus(rand));
  const [choix, setChoix] = useState<number | null | undefined>(undefined); // undefined = en attente, null = temps écoulé
  const [reste, setReste] = useState(DUREE);
  const fini = useRef(false);

  useEffect(() => { marquerEnCours(JEU, { titre: TITRE, sousTitre: `Série ${serie}`, route: '/jeux/intrus' }); }, [serie]);

  // minuteur de la manche (même principe que Plus chaud : temps écoulé = erreur, la série s'arrête)
  useEffect(() => {
    if (choix !== undefined) return;
    const debut = Date.now();
    const id = setInterval(() => {
      const r = Math.max(0, DUREE - (Date.now() - debut) / 1000);
      setReste(r);
      if (r <= 0) { clearInterval(id); setChoix(null); }
    }, 100);
    return () => clearInterval(id);
  }, [manche, choix]);

  useEffect(() => {
    if (choix === undefined) return;
    const ok = choix === manche.intrus;
    if (Platform.OS !== 'web' && vibrationsActives()) Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    const id = setTimeout(async () => {
      if (ok) {
        vus.current.add(manche.theme);
        setManche(mancheIntrus(rand, vus.current));
        setReste(DUREE);
        setChoix(undefined);
      } else if (!fini.current) {
        fini.current = true;
        const ancien = await enregistrerScore(JEU, serie);
        await finirEnCours(JEU);
        onFin({ serie, ancien, temps: choix === null });
      }
    }, ok ? 700 : 1800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choix]);

  const revele = choix !== undefined;
  const ok = revele && choix === manche.intrus;
  const message = !revele ? 'Lequel n’a rien à faire là ?' : ok ? 'Bien vu !' : choix === null ? 'Temps écoulé !' : 'Raté !';
  return (
    <View style={{ flex: 1 }}>
      <GameBg />
      <View style={[{ flex: 1, gap: 10 }, cadre]}>
        <Header title={TITRE} onClose={() => { finirEnCours(JEU); quitter(); }} right={<Compteur valeur={serie} />} />
        {/* la barre reste à sa place, figée, pendant la correction */}
        <TimerBar label="Temps" value={`${Math.ceil(reste)} s`} frac={reste / DUREE} />
        <T size={18} weight={700} outline align="center" accessibilityLiveRegion="polite">{message}</T>
        <View style={{ flex: 1, gap: 12, paddingBottom: 8 }}>
          {manche.mots.map((m, i) => {
            const etat = etatReponse(i, manche.intrus, choix);
            const bg = etat === 'bon' ? VERT : etat === 'faux' ? ROSE : '#FFFFFF';
            return (
              <Pressable key={m + i} accessibilityRole="button" accessibilityLabel={m} disabled={revele} onPress={() => { if (revele) return; if (i === manche.intrus) setSerie(n => n + 1); setChoix(i); }}
                style={({ pressed }) => ({ flex: 1, maxHeight: 96, borderRadius: 18, borderWidth: 2, borderColor: 'transparent', backgroundColor: bg, justifyContent: 'center', paddingHorizontal: 16, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
                <MotAjuste mot={m} size={28} align="left" />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ---------- 4 · Fin : la série et le record, mis en valeur ---------- */
function FinIntrus({ res, onReplay }: { res: Resultat; onReplay: () => void }) {
  return <FinSerie serie={res.serie} ancien={res.ancien} temps={res.temps} onReplay={onReplay} />;
}
