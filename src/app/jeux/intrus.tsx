import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { rng } from '@/game/lexicon';
import { cleanNeighbors, mancheIntrus, type MancheIntrus } from '@/game/libres-manches';
import { enregistrerScore, finirEnCours, marquerEnCours } from '@/game/libres-stockage';
import { GameBg } from '@/ui/game';
import { Fin, Header, INK, Pill, quitter, Regles, ROSE, useCadre, VERT } from '@/ui/libres-ui';
import { T } from '@/ui/Text';

/* Jeux libres · L'intrus (planche J-jeux-libres-12-lintrus). */

const JEU = 'intrus' as const;
const TITRE = 'L’intrus';
const REGLES = [
  '5 mots s’affichent : 4 vont ensemble, 1 n’a rien à faire là.',
  'Touche l’intrus.',
  'Chaque bonne réponse allonge ta série.',
  'Une erreur et c’est fini.',
];

type Resultat = { serie: number; ancien: number; intrus: string };

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
  const [choix, setChoix] = useState<number | null>(null);
  const fini = useRef(false);

  useEffect(() => { marquerEnCours(JEU, { titre: TITRE, sousTitre: `Série ${serie}`, route: '/jeux/intrus' }); }, [serie]);

  useEffect(() => {
    if (choix === null) return;
    const ok = choix === manche.intrus;
    if (Platform.OS !== 'web') Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    const id = setTimeout(async () => {
      if (ok) {
        vus.current.add(manche.theme);
        setManche(mancheIntrus(rand, vus.current));
        setChoix(null);
      } else if (!fini.current) {
        fini.current = true;
        const ancien = await enregistrerScore(JEU, serie);
        await finirEnCours(JEU);
        onFin({ serie, ancien, intrus: manche.mots[manche.intrus] });
      }
    }, ok ? 700 : 1800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choix]);

  const revele = choix !== null;
  const ok = revele && choix === manche.intrus;
  const message = !revele ? 'Lequel n’a rien à faire là ?' : ok ? 'Bien vu !' : `Raté : l’intrus était « ${manche.mots[manche.intrus]} »`;
  return (
    <View style={{ flex: 1 }}>
      <GameBg />
      <View style={[{ flex: 1, gap: 10 }, cadre]}>
        <Header title={TITRE} onClose={() => { finirEnCours(JEU); quitter(); }} right={<Pill label={`Série ${serie}`} />} />
        <T size={18} weight={700} outline align="center" accessibilityLiveRegion="polite">{message}</T>
        <View style={{ flex: 1, gap: 12, paddingBottom: 8 }}>
          {manche.mots.map((m, i) => {
            const bg = !revele ? '#FFFFFF' : i === manche.intrus ? VERT : i === choix ? ROSE : '#FFFFFF';
            return (
              <Pressable key={m + i} accessibilityRole="button" accessibilityLabel={m} disabled={revele} onPress={() => { if (revele) return; if (i === manche.intrus) setSerie(n => n + 1); setChoix(i); }}
                style={({ pressed }) => ({ flex: 1, maxHeight: 96, borderRadius: 18, borderWidth: 2, borderColor: 'transparent', backgroundColor: bg, justifyContent: 'center', paddingHorizontal: 16, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
                <T size={28} weight={700} color={INK} numberOfLines={1} adjustsFontSizeToFit>{m}</T>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ---------- 4 · Fin ---------- */
function FinIntrus({ res, onReplay }: { res: Resultat; onReplay: () => void }) {
  const record = res.serie > res.ancien;
  const [voisins] = useState(() => cleanNeighbors(res.intrus, 5).map(n => n.word));
  return (
    <Fin
      record={record}
      titre={record ? 'Nouveau record !' : 'Série terminée'}
      sousTitre={record ? `Série de ${res.serie} · ${res.ancien > 0 ? `ancien record ${res.ancien}` : 'premier record'}` : `Série de ${res.serie} · record ${res.ancien}`}
      label="Le mot était"
      mot={res.intrus}
      voisins={voisins}
      lignes={[
        { label: 'Série', value: String(res.serie) },
        { label: 'Record', value: record ? (res.ancien > 0 ? `${res.serie} (ancien ${res.ancien})` : String(res.serie)) : String(res.ancien) },
      ]}
      onReplay={onReplay}
    />
  );
}
