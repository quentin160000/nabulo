import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { rng } from '@/game/lexicon';
import { manchePlusChaud, type ManchePlusChaud } from '@/game/libres-manches';
import { enregistrerScore, finirEnCours, marquerEnCours } from '@/game/libres-stockage';
import { Bubble } from '@/ui/Bubble';
import { GameBg } from '@/ui/game';
import { vibrationsActives } from '@/game/reglages';
import { Compteur, FinSerie, Header, INK, quitter, Regles, ROSE, TimerBar, useCadre, VERT } from '@/ui/libres-ui';
import { MotAjuste } from '@/ui/libres-mot';
import { T } from '@/ui/Text';

/* Jeux libres · Plus chaud / plus froid (planche J-jeux-libres-11-plus-chaud-plus-froid). */

const JEU = 'plus-chaud' as const;
const TITRE = 'Plus chaud / plus froid';
const DUREE = 10; // secondes par manche
const REGLES = [
  'Un mot cible s’affiche en haut.',
  'Deux mots te sont proposés : touche le plus proche du mot cible.',
  'Chaque bonne réponse allonge ta série.',
  'Une erreur et la série s’arrête. Bats ton record !',
];

type Resultat = { serie: number; ancien: number; temps: boolean };

export default function PlusChaud() {
  const [phase, setPhase] = useState<'regles' | 'jeu' | 'fin'>('regles');
  const [partie, setPartie] = useState(0);
  const [res, setRes] = useState<Resultat | null>(null);
  if (phase === 'regles') return <Regles titre={TITRE} regles={REGLES} onPlay={() => setPhase('jeu')} />;
  if (phase === 'fin' && res) return <FinPlusChaud res={res} onReplay={() => { setPartie(p => p + 1); setPhase('jeu'); }} />;
  return <EnJeu key={partie} onFin={r => { setRes(r); setPhase('fin'); }} />;
}

/* ---------- 2 · En jeu / 3 · Bonne réponse ---------- */
function EnJeu({ onFin }: { onFin: (r: Resultat) => void }) {
  const cadre = useCadre();
  const [rand] = useState(() => rng(Date.now()));
  const vus = useRef(new Set<string>());
  const [serie, setSerie] = useState(0);
  const [manche, setManche] = useState<ManchePlusChaud>(() => manchePlusChaud(rand, 0));
  const [choix, setChoix] = useState<number | null | undefined>(undefined); // undefined = en attente, null = temps écoulé
  const [reste, setReste] = useState(DUREE);
  const fini = useRef(false);

  useEffect(() => { marquerEnCours(JEU, { titre: TITRE, sousTitre: `Série ${serie}`, route: '/jeux/plus-chaud' }); }, [serie]);

  // minuteur de la manche
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

  // après la réponse : manche suivante, ou fin de série
  useEffect(() => {
    if (choix === undefined) return;
    const ok = choix === manche.bonne;
    if (Platform.OS !== 'web' && vibrationsActives()) Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    const id = setTimeout(async () => {
      if (ok) {
        vus.current.add(manche.cible);
        setManche(manchePlusChaud(rand, serie, vus.current));
        setReste(DUREE);
        setChoix(undefined);
      } else if (!fini.current) {
        fini.current = true;
        const ancien = await enregistrerScore(JEU, serie);
        await finirEnCours(JEU);
        onFin({ serie, ancien, temps: choix === null });
      }
    }, ok ? 900 : 1600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choix]);

  const revele = choix !== undefined;
  const ok = revele && choix === manche.bonne;
  const message = !revele ? 'Lequel est le plus proche ?' : ok ? 'Bien vu !' : choix === null ? 'Temps écoulé !' : 'Raté !';
  return (
    <View style={{ flex: 1 }}>
      <GameBg />
      <View style={[{ flex: 1, gap: 10 }, cadre]}>
        <Header title="Plus chaud ?" onClose={() => { finirEnCours(JEU); quitter(); }} right={<Compteur valeur={serie} />} />
        {/* la barre reste à sa place, figée, pendant la correction */}
        <TimerBar label="Temps" value={`${Math.ceil(reste)} s`} frac={reste / DUREE} />
        <Bubble bg="#FFFFFF" radius={18} border={2} inset={6} style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
          <T size={14} weight={600} color={INK} align="center">Le mot cible est</T>
          <MotAjuste mot={manche.cible} size={34} />
        </Bubble>
        {/* hauteur réservée pour la grande taille : rien ne bouge quand le message grossit */}
        <View style={{ height: Math.round(22 * 1.21), justifyContent: 'center' }}>
          <T size={revele ? 22 : 17} weight={700} outline align="center" accessibilityLiveRegion="polite">{message}</T>
        </View>
        <View style={{ flex: 1, gap: 16, paddingBottom: 8 }}>
          {manche.mots.map((m, i) => {
            const bg = !revele ? '#FFFFFF' : i === manche.bonne ? VERT : i === choix ? ROSE : '#FFFFFF';
            return (
              <Pressable key={m + i} accessibilityRole="button" accessibilityLabel={revele ? `${m}, ${manche.temps[i]} degrés` : m} disabled={revele}
                onPress={() => { if (revele) return; if (i === manche.bonne) setSerie(n => n + 1); setChoix(i); }}
                style={({ pressed }) => ({ flex: 1, borderRadius: 22, borderWidth: 2, borderColor: 'transparent', backgroundColor: bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
                <MotAjuste mot={m} size={32} />
                {revele && <T size={20} weight={700} color={INK}>{manche.temps[i]}°</T>}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ---------- 4 · Fin : la série et le record, mis en valeur ---------- */
function FinPlusChaud({ res, onReplay }: { res: Resultat; onReplay: () => void }) {
  return <FinSerie serie={res.serie} ancien={res.ancien} temps={res.temps} onReplay={onReplay} />;
}
