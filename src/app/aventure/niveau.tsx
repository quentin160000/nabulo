import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, View, type ScrollViewInstance, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CHRONO_MIN, LIEN_MIN, NOMS_TYPES, TOTAL, VIES_MAX, etoiles, mondeDe, niveau, rang, recompense, relance, reussi, temp, voisinsDe,
  type Monde, type Niveau,
} from '@/game/aventure';
import { minSec, useProgression, useVies } from '@/game/aventure-etat';
import { known, rng } from '@/game/lexicon';
import { essaiChrono, mancheIntrus, manchePlusChaud, motsTrouves, type Essai, type MancheIntrus, type ManchePlusChaud } from '@/game/libres-manches';
import { judge, links } from '@/game/lier';
import { moodOf, normalizeWord } from '@/game/temperature';
import { useWallet } from '@/game/wallet';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { images } from '@/ui/bits';
import { Bubble } from '@/ui/Bubble';
import {
  Choix, DernierEssai, EnTete, Erreurs, Fin, INK, Jauge, LevelBg, MiniIcone, Objectif, Pastille, PlusChauds, Saisie, couleurDegres,
  type IconeConsigne, type Ligne, type LigneFin, type Morceau,
} from '@/ui/aventure-niveau';
import { Mascot } from '@/ui/Mascot';
import { useCadre } from '@/ui/libres-ui';
import { T } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';

/* Aventure (V2) · Écrans de niveau : objectif, en jeu, gagné, perdu (planche Niveaux-Parcours). */

type Resultat = { gagne: boolean; titre: string; sousTitre: string; mot: string; lignes: LigneFin[]; note: number; score: number };
type JeuProps = { nv: Niveau; monde: Monde; bonus: number; essai: number; onFin: (r: Resultat) => void; onClose: () => void };

const s = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const deg = (t: number) => `${Math.round(t)}°`;
const shadow = { textShadowColor: INK, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 };

function retourCarte() {
  if (router.canGoBack()) router.back(); else router.replace('/aventure' as Href);
}

export default function NiveauRoute() {
  const { n } = useLocalSearchParams<{ n?: string }>();
  const num = Math.min(TOTAL, Math.max(1, parseInt(n ?? '1', 10) || 1));
  return <NiveauEcran key={num} n={num} />;
}

/* ---------- Consignes de l'écran « Objectif » ---------- */
function objectif(nv: Niveau): { intro: Morceau[]; consignes: [IconeConsigne, string][]; perdu: string } {
  switch (nv.type) {
    case 'secret': return {
      intro: ['Trouve le ', { b: 'mot secret' }, ' du niveau'],
      consignes: [['essais', `${nv.essais} essais pour le trouver`], ['oeil', 'Chaque mot proposé affiche sa température : plus c’est chaud, plus tu es proche']],
      perdu: `Perdu si tu ne l’as pas trouvé en ${nv.essais} essais · −1 vie`,
    };
    case 'seuil': return {
      intro: ['Approche-toi du mot secret jusqu’à ', { b: `${nv.seuil}°` }],
      consignes: [['cible', `Pas besoin de le trouver : un seul mot à ${nv.seuil}° ou plus suffit`], ['essais', `${nv.essais} essais`]],
      perdu: `Perdu si aucun de tes mots n’atteint ${nv.seuil}° en ${nv.essais} essais · −1 vie`,
    };
    case 'plus-chaud': return {
      intro: ['Entre deux mots, choisis le ', { b: 'plus proche' }, ' du mot affiché'],
      consignes: [['cible', `${nv.bonnes} bonnes réponses pour gagner`], ['interdit', `${s(nv.erreurs, 'erreur')} et c’est perdu`]],
      perdu: `Perdu si tu fais ${s(nv.erreurs, 'erreur')} · −1 vie`,
    };
    case 'intrus': return {
      intro: ['Parmi 5 mots, trouve celui qui ', { b: 'n’a rien à voir' }, ' avec les autres'],
      consignes: [['cible', `${nv.series} séries à réussir`], ['interdit', nv.erreurs === 1 ? 'Une erreur et c’est perdu' : `${nv.erreurs} erreurs et c’est perdu`]],
      perdu: `Perdu si tu fais ${s(nv.erreurs, 'erreur')} · −1 vie`,
    };
    case 'lier': return {
      intro: ['Relie ', { b: `« ${nv.depart} »` }, ' à ', { b: `« ${nv.arrivee} »` }, ' par une chaîne de mots'],
      consignes: [['lien', `Chaque mot doit être proche du précédent (${LIEN_MIN}° ou plus)`], ['cible', `Arrive en ${nv.max} mots maximum`]],
      perdu: `Perdu si tu dépasses ${nv.max} mots sans arriver · −1 vie`,
    };
    case 'chrono': return {
      intro: ['Trouve ', { b: `${nv.mots} mots proches` }, ` de « ${nv.mot} »`],
      consignes: [['chrono', `${nv.duree} secondes`], ['cible', `Un mot compte s’il est à ${CHRONO_MIN}° ou plus de « ${nv.mot} »`]],
      perdu: `Perdu si le temps est écoulé avant ${nv.mots} mots · −1 vie`,
    };
    case 'points': return {
      intro: ['Trouve le ', { b: 'mot secret' }, ' en gardant au moins ', { b: `${nv.minimum.toLocaleString('fr-FR')} points` }],
      consignes: [['points', `Tu pars avec ${nv.depart.toLocaleString('fr-FR')} points`], ['points', `Chaque essai coûte ${nv.cout} points`]],
      perdu: `Perdu si tu tombes sous ${nv.minimum.toLocaleString('fr-FR')} points avant de le trouver · −1 vie`,
    };
  }
}

/* ---------- Écran du niveau ---------- */
function NiveauEcran({ n }: { n: number }) {
  const nv = niveau(n)!;
  const monde = mondeDe(n);
  const [phase, setPhase] = useState<'objectif' | 'jeu' | 'gagne' | 'perdu'>('objectif');
  const [essai, setEssai] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [res, setRes] = useState<Resultat | null>(null);
  const [vRestantes, setVRestantes] = useState(VIES_MAX);
  const { victoire } = useProgression();
  const vies = useVies();
  const { earn, spend } = useWallet();
  const toast = useToast(2400);
  const inset = useSafeAreaInsets();
  const obj = useMemo(() => objectif(nv), [nv]);
  const voisins = useMemo(() => (res ? voisinsDe(res.mot) : []), [res]);

  const plusDeVies = () => toast.show(`Plus de vies · prochaine dans ${vies.prochaine ? minSec(vies.prochaine) : '30:00'}`);
  const commencer = () => { if (vies.ready && vies.n <= 0) { plusDeVies(); return; } setPhase('jeu'); };

  const finir = async (r: Resultat) => {
    Keyboard.dismiss();
    if (Platform.OS !== 'web') Haptics.notificationAsync(r.gagne ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    if (r.gagne) {
      const { avant } = await victoire(n, r.note, r.score);
      const prime = reussi(avant, n) ? 0 : recompense(n);
      if (prime) earn(prime);
      setRes(nv.type === 'secret' ? { ...r, lignes: [...r.lignes, { label: 'Récompense', value: prime ? `+${prime} braises` : 'déjà gagnée' }] } : r);
      setPhase('gagne');
    } else {
      setVRestantes(await vies.perdre());
      setRes(r);
      setPhase('perdu');
    }
  };

  const reessayer = () => {
    if (vies.n <= 0) { plusDeVies(); return; }
    setBonus(0); setRes(null); setEssai(e => e + 1); setPhase('jeu');
  };
  const option = relance(nv);
  const relancer = async () => {
    if (!option) return;
    if (!spend(option.prix)) { toast.show(`Il te faut ${option.prix} braises`); return; }
    await vies.rendre();
    setBonus(b => b + 1); setPhase('jeu');
  };

  if (phase === 'objectif') {
    return (
      <View style={{ flex: 1 }}>
        <Objectif n={n} monde={monde} titre={NOMS_TYPES[nv.type]} intro={obj.intro} consignes={obj.consignes} perdu={obj.perdu} onStart={commencer} onClose={retourCarte} />
        <Toast msg={toast.msg} check={false} style={{ bottom: 70 + inset.bottom }} />
      </View>
    );
  }

  if (phase === 'gagne' && res) {
    const suivant = n < TOTAL ? () => router.replace(`/aventure/niveau?n=${n + 1}` as Href) : () => { setRes(null); setEssai(e => e + 1); setPhase('objectif'); };
    return <Fin gagne monde={monde} titre={res.titre} sousTitre={res.sousTitre} mot={res.mot} voisins={voisins} lignes={res.lignes}
      boutons={[['Carte', retourCarte], [n < TOTAL ? 'Niveau suivant' : 'Rejouer', suivant]]} />;
  }

  const jeu: JeuProps = { nv, monde, bonus, essai, onFin: finir, onClose: retourCarte };
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }} pointerEvents={phase === 'perdu' ? 'none' : 'auto'}>
        <Jeu key={essai} {...jeu} />
      </View>
      {phase === 'perdu' && res && (
        <Fin gagne={false} monde={monde} titre={res.titre} sousTitre={res.sousTitre} mot={res.mot} voisins={voisins}
          lignes={[...res.lignes, { label: 'Vies restantes', value: `${vRestantes} / ${VIES_MAX}` }]}
          boutons={[['Réessayer', reessayer], option ? [`${option.label} · ${option.prix} braises`, relancer] : ['Carte', retourCarte]]} />
      )}
      <Toast msg={toast.msg} check={false} style={{ bottom: 90 + inset.bottom }} />
    </View>
  );
}

function Jeu(p: JeuProps) {
  switch (p.nv.type) {
    case 'secret': case 'seuil': case 'points': return <MotSecret {...p} />;
    case 'plus-chaud': return <PlusChaud {...p} />;
    case 'intrus': return <Intrus {...p} />;
    case 'lier': return <Lier {...p} />;
    case 'chrono': return <Chrono {...p} />;
  }
}

/** Cadre des écrans « en jeu » avec clavier. */
function CadreClavier({ monde, children, toast }: { monde: Monde; children: React.ReactNode; toast: string | null }) {
  const cadre = useCadre(10);
  const inset = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <LevelBg monde={monde} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[{ flex: 1, gap: 10 }, cadre]}>{children}</View>
        <Toast msg={toast} check={false} style={{ bottom: 70 + inset.bottom }} />
      </KeyboardAvoidingView>
    </View>
  );
}

/** Garde : on ne signale la fin qu'une fois par événement (une relance rouvre la partie). */
function useFinUnique(onFin: (r: Resultat) => void, bonus: number) {
  const fini = useRef(false);
  useEffect(() => { fini.current = false; }, [bonus]);
  return (r: Resultat) => { if (fini.current) return; fini.current = true; onFin(r); };
}

/* ---------- Types 1, 2 et 7 : mot secret, seuil, mot secret à points ---------- */
function MotSecret({ nv, monde, bonus, onFin, onClose }: JeuProps) {
  const mot = nv.type === 'secret' || nv.type === 'seuil' || nv.type === 'points' ? nv.mot : '';
  const [essais, setEssais] = useState<Ligne[]>([]);
  const [dernier, setDernier] = useState<string | null>(null);
  const [text, setText] = useState('');
  const toast = useToast(1800);
  const input = useRef<TextInputInstance>(null);
  const fin = useFinUnique(onFin, bonus);
  const tries = nv.type === 'secret' || nv.type === 'seuil' ? nv.essais + 5 * bonus : 0;
  const points = nv.type === 'points' ? nv.depart - nv.cout * essais.length : 0;
  const tries2 = essais.length;
  const tri = useMemo(() => [...essais].sort((a, b) => b.t - a.t), [essais]);
  const best = tri[0] ?? null;
  const last = essais.find(e => e.word === dernier) ?? null;

  const proposer = () => {
    const w = normalizeWord(text);
    if (!w) return;
    if (!known(w)) { toast.show(`Je ne connais pas « ${text.trim()} »`); input.current?.focus(); return; }
    if (essais.some(e => e.word === w)) { toast.show(`« ${w} » est déjà dans ta liste`); setText(''); input.current?.focus(); return; }
    toast.hide();
    const t = w === mot ? 100 : temp(mot, w);
    const ligne: Ligne = { word: w, t, rank: rang(mot, w) };
    const tous = [...essais, ligne];
    setEssais(tous); setDernier(w); setText(''); input.current?.focus();
    if (Platform.OS !== 'web') Haptics.impactAsync(t >= 60 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    const k = tous.length;
    const meilleur = [...tous].sort((a, b) => b.t - a.t)[0];
    if (nv.type === 'secret') {
      if (w === mot) fin({ gagne: true, titre: 'Bravo !', sousTitre: `Niveau ${nv.n} réussi · ${s(k, 'essai')}`, mot, lignes: [{ label: 'Essais', value: `${k} / ${tries}` }], note: etoiles(k, tries), score: tries - k + 1 });
      else if (k >= tries) {
        const m = [...tous].sort((a, b) => b.t - a.t)[0];
        fin({ gagne: false, titre: 'Essais épuisés', sousTitre: `Niveau ${nv.n} · ${k} essais sur ${tries}`, mot, lignes: [{ label: 'Meilleur essai', value: `${m.word} · ${deg(m.t)}` }], note: 0, score: 0 });
      }
    } else if (nv.type === 'seuil') {
      if (t >= nv.seuil) fin({ gagne: true, titre: 'Objectif atteint !', sousTitre: `Niveau ${nv.n} · ${deg(t)} au ${k === 1 ? '1er' : `${k}e`} essai`, mot, lignes: [{ label: 'Meilleur', value: `${meilleur.word} · ${deg(meilleur.t)}` }, { label: 'Essais', value: `${k} / ${tries}` }], note: etoiles(k, tries), score: tries - k + 1 });
      else if (k >= tries) fin({ gagne: false, titre: 'Pas assez chaud', sousTitre: `Niveau ${nv.n} · ${deg(meilleur.t)} sur ${nv.seuil}° requis`, mot, lignes: [{ label: 'Meilleur', value: `${meilleur.word} · ${deg(meilleur.t)}` }], note: 0, score: 0 });
    } else if (nv.type === 'points') {
      const sc = nv.depart - nv.cout * k;
      if (w === mot && sc >= nv.minimum) fin({ gagne: true, titre: 'Bravo !', sousTitre: `Niveau ${nv.n} · ${sc} points`, mot, lignes: [{ label: 'Score', value: `${sc} pts` }, { label: 'Essais', value: String(k) }], note: sc >= 800 ? 3 : sc >= 650 ? 2 : 1, score: sc });
      else if (sc < nv.minimum) fin({ gagne: false, titre: w === mot ? 'Trouvé… trop tard' : 'Plus assez de points', sousTitre: `Niveau ${nv.n} · ${sc} pts sur ${nv.minimum}`, mot, lignes: [{ label: 'Score', value: `${sc} pts · ${s(k, 'essai')}` }], note: 0, score: 0 });
    }
  };

  const titre = nv.type === 'seuil' ? `Seuil · objectif ${nv.seuil}°` : NOMS_TYPES[nv.type];
  const pill = nv.type === 'points'
    ? <Pastille label={`${points.toLocaleString('fr-FR')} pts`} bg="#FFD45C" a11y={`${points} points`} />
    : <Pastille label={`${tries2} / ${tries}`} icon={<MiniIcone name="crayon" />} a11y={`${tries2} essais sur ${tries}`} />;
  const placeholder = nv.type === 'points' ? `Chaque essai coûte ${nv.cout} pts` : 'Tape un mot';

  return (
    <CadreClavier monde={monde} toast={toast.msg}>
      <EnTete n={nv.n} titre={titre} right={pill} onClose={onClose} />
      {nv.type === 'seuil' ? (
        <>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T size={13} weight={700} color="#FFFFFF" style={shadow}>Meilleur : {best ? deg(best.t) : '—'}</T>
              <T size={13} weight={700} color="#FFFFFF" style={shadow}>Objectif {nv.seuil}°</T>
            </View>
            <SeuilBar frac={best ? Math.max(0, best.t) / nv.seuil : 0} />
          </View>
          {last && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Mascot mood={moodOf(last.t)} size={70} />
              <View style={{ gap: 4 }}>
                <T size={28} weight={700} color="#FFFFFF" style={[{ lineHeight: 31 }, shadow]}>{last.word}</T>
                <View style={{ flexDirection: 'row' }}><Pastille label={deg(last.t)} bg={couleurDegres(last.t)} /></View>
              </View>
            </View>
          )}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 5 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {tri.map((e, i) => (
              <View key={e.word} accessible accessibilityLabel={`${e.word}, ${deg(e.t)}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#F4F1FF', borderWidth: 2, borderColor: e.word === dernier ? '#FFD45C' : 'transparent' }}>
                <T size={14} weight={700} color={INK} style={{ width: 22 }}>{i + 1}</T>
                <T size={18} weight={600} color={INK} numberOfLines={1} style={{ flex: 1 }}>{e.word}</T>
                <View style={{ paddingVertical: 2, paddingHorizontal: 10, borderRadius: 9, backgroundColor: couleurDegres(e.t) }}><T size={15} weight={700} color={INK}>{deg(e.t)}</T></View>
              </View>
            ))}
          </ScrollView>
        </>
      ) : (
        <>
          <DernierEssai word={last?.word ?? null} t={last?.t ?? null} />
          <Jauge t={last?.t ?? null} />
          <PlusChauds lignes={tri} dernier={dernier} />
        </>
      )}
      <Saisie value={text} onChange={setText} onSubmit={proposer} placeholder={placeholder} inputRef={input} />
    </CadreClavier>
  );
}

/** Barre « Meilleur / Objectif » du type Seuil. */
function SeuilBar({ frac }: { frac: number }) {
  const f = Math.max(0, Math.min(1, frac));
  return (
    <View style={{ height: 18, borderRadius: 9, borderWidth: 3, borderColor: 'transparent', backgroundColor: 'rgba(255,255,255,0.85)' }}>
      <View style={{ width: `${f * 100}%`, height: '100%', borderRadius: 6, overflow: 'hidden' }}>
        <LinearGradientBar />
      </View>
      <View style={{ position: 'absolute', left: `${f * 100}%`, top: -6, bottom: -6, width: 4, marginLeft: -2, borderRadius: 2, backgroundColor: INK }} />
    </View>
  );
}
function LinearGradientBar() {
  return <LinearGradient colors={['#5B8DEF', '#FFD45C', '#FF5A36']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />;
}

/* ---------- Type 3 : Plus chaud ? ---------- */
function PlusChaud({ nv, monde, bonus, essai, onFin, onClose }: JeuProps) {
  const cfg = nv.type === 'plus-chaud' ? nv : { bonnes: 8, erreurs: 3, serie: 0, n: nv.n };
  const cadre = useCadre();
  const [rand] = useState(() => rng(nv.n * 7919 + essai));
  const [vus] = useState(() => new Set<string>());
  const tirer = (k: number) => { const m = manchePlusChaud(rand, cfg.serie + k, vus); vus.add(m.cible); return m; };
  const [manche, setManche] = useState<ManchePlusChaud>(() => tirer(0));
  const [bonnes, setBonnes] = useState(0);
  const [erreurs, setErreurs] = useState(0);
  const [choix, setChoix] = useState<number | null>(null);
  const fin = useFinUnique(onFin, bonus);
  const errMax = cfg.erreurs + bonus;

  const choisir = (i: number) => {
    if (choix !== null) return;
    setChoix(i);
    const ok = i === manche.bonne;
    const b = bonnes + (ok ? 1 : 0), e = erreurs + (ok ? 0 : 1);
    if (Platform.OS !== 'web') Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    setTimeout(() => {
      setBonnes(b); setErreurs(e); setChoix(null);
      if (b >= cfg.bonnes) {
        fin({ gagne: true, titre: e === 0 ? 'Sans faute !' : 'Gagné !', sousTitre: `Niveau ${nv.n} · ${b} bonnes réponses sur ${b + e}`, mot: manche.cible,
          lignes: [{ label: 'Bonnes réponses', value: `${b} / ${b + e}` }, { label: 'Erreurs', value: `${e} / ${errMax}` }], note: e === 0 ? 3 : e < errMax - 1 ? 2 : 1, score: b });
        return;
      }
      setManche(tirer(b + e));
      if (e >= errMax) fin({ gagne: false, titre: s(e, 'erreur'), sousTitre: `Niveau ${nv.n} · ${b} bonne${b > 1 ? 's' : ''} réponse${b > 1 ? 's' : ''}`, mot: manche.cible, lignes: [{ label: 'Bonnes réponses', value: `${b} / ${cfg.bonnes}` }], note: 0, score: 0 });
    }, 900);
  };

  return (
    <View style={{ flex: 1 }}>
      <LevelBg monde={monde} />
      <View style={[{ flex: 1, gap: 10 }, cadre]}>
        <EnTete n={nv.n} titre={NOMS_TYPES['plus-chaud']} onClose={onClose}
          right={<Pastille label={`${bonnes} / ${cfg.bonnes}`} icon={<MiniIcone name="coche" />} a11y={`${bonnes} bonnes réponses sur ${cfg.bonnes}`} />} />
        <Erreurs faites={erreurs} max={errMax} />
        <Bubble bg="#FFFFFF" radius={18} border={3} inset={6} style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
          <T size={13} weight={600} color={INK} align="center">Le mot cible est</T>
          <T size={32} weight={700} color={INK} align="center" style={{ lineHeight: 39 }}>{manche.cible}</T>
        </Bubble>
        <T size={17} weight={700} color="#FFFFFF" align="center" style={shadow}>Lequel est le plus proche ?</T>
        <View style={{ flex: 1, gap: 16, paddingBottom: 8 }}>
          {manche.mots.map((m, i) => (
            <Choix key={`${manche.cible}-${m}`} label={m} onPress={() => choisir(i)}
              etat={choix === null ? null : i === manche.bonne ? 'bon' : i === choix ? 'faux' : null}
              sub={choix === null ? undefined : `${manche.temps[i]}°`} />
          ))}
        </View>
        <T size={15} weight={700} color="#FFFFFF" align="center" style={shadow}>Touche le mot le plus chaud</T>
      </View>
    </View>
  );
}

/* ---------- Type 4 : L'intrus ---------- */
function Intrus({ nv, monde, bonus, essai, onFin, onClose }: JeuProps) {
  const cfg = nv.type === 'intrus' ? nv : { series: 5, erreurs: 2 };
  const cadre = useCadre();
  const [rand] = useState(() => rng(nv.n * 7919 + essai));
  const [vus] = useState(() => new Set<string>());
  const tirer = () => { const m = mancheIntrus(rand, vus); vus.add(m.theme); return m; };
  const [manche, setManche] = useState<MancheIntrus>(() => tirer());
  const [reussies, setReussies] = useState(0);
  const [fautes, setFautes] = useState(0);
  const [choix, setChoix] = useState<number | null>(null);
  const fin = useFinUnique(onFin, bonus);
  const erreurs = Math.max(0, fautes - bonus); // « Annuler » efface la dernière erreur

  const choisir = (i: number) => {
    if (choix !== null) return;
    setChoix(i);
    const ok = i === manche.intrus;
    const r = reussies + (ok ? 1 : 0), f = fautes + (ok ? 0 : 1), e = Math.max(0, f - bonus);
    if (Platform.OS !== 'web') Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    setTimeout(() => {
      setReussies(r); setFautes(f); setChoix(null);
      if (r >= cfg.series) {
        fin({ gagne: true, titre: `${cfg.series} séries sur ${cfg.series} !`, sousTitre: `Niveau ${nv.n} · ${s(e, 'erreur')}`, mot: manche.theme,
          lignes: [{ label: 'Séries', value: `${r} / ${cfg.series}` }, { label: 'Erreurs', value: `${e} / ${cfg.erreurs}` }], note: e === 0 ? 3 : e < cfg.erreurs - 1 ? 2 : 1, score: r });
        return;
      }
      setManche(tirer());
      if (e >= cfg.erreurs) fin({ gagne: false, titre: s(e, 'erreur'), sousTitre: `Niveau ${nv.n} · ${r} série${r > 1 ? 's' : ''} réussie${r > 1 ? 's' : ''}`, mot: manche.theme, lignes: [{ label: 'Séries', value: `${r} / ${cfg.series}` }], note: 0, score: 0 });
    }, 1000);
  };

  return (
    <View style={{ flex: 1 }}>
      <LevelBg monde={monde} />
      <View style={[{ flex: 1, gap: 10 }, cadre]}>
        <EnTete n={nv.n} titre={NOMS_TYPES.intrus} onClose={onClose} right={<Pastille label={`Série ${Math.min(reussies + 1, cfg.series)} / ${cfg.series}`} />} />
        <Erreurs faites={erreurs} max={cfg.erreurs} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image source={images.nabulo} style={{ width: 60, height: 60 }} contentFit="contain" accessibilityLabel="Nabulo" />
          <T size={17} weight={700} color="#FFFFFF" style={shadow}>Lequel n’a rien à faire là ?</T>
        </View>
        <View style={{ flex: 1, gap: 12, paddingBottom: 8 }}>
          {manche.mots.map((m, i) => (
            <Choix key={`${manche.theme}-${m}`} label={m} onPress={() => choisir(i)} radius={18} border={3} inset={6} size={28} center={false} style={{ maxHeight: 96 }}
              etat={choix === null ? null : i === manche.intrus ? 'bon' : i === choix ? 'faux' : null} />
          ))}
        </View>
      </View>
    </View>
  );
}

/* ---------- Type 5 : Lier ---------- */
function Lier({ nv, monde, bonus, onFin, onClose }: JeuProps) {
  const cfg = nv.type === 'lier' ? nv : { depart: '', arrivee: '', max: 5 };
  const [chaine, setChaine] = useState<string[]>([cfg.depart]);
  const [text, setText] = useState('');
  const toast = useToast(2200);
  const input = useRef<TextInputInstance>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const fin = useFinUnique(onFin, bonus);
  const max = cfg.max + bonus;
  const poses = chaine.length - 1;
  const temps = links(chaine);

  const proposer = () => {
    const v = judge(chaine, cfg.arrivee, text);
    if (v.kind === 'vide') return;
    if (v.kind !== 'ok') {
      toast.show(v.kind === 'inconnu' ? `Je ne connais pas « ${v.word} »`
        : v.kind === 'deja' ? `« ${v.word} » est déjà dans la chaîne`
        : v.kind === 'loin' ? `« ${v.word} » est trop loin de « ${v.prev} » (${deg(v.temperature)})`
        : `« ${v.word} » est trop proche de « ${v.prev} »`);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (v.kind !== 'inconnu') setText('');
      input.current?.focus();
      return;
    }
    toast.hide();
    const c = [...chaine, v.word];
    setChaine(c); setText(''); input.current?.focus();
    const k = c.length - 1;
    if (v.done) {
      const complete = v.word === normalizeWord(cfg.arrivee) ? c : [...c, normalizeWord(cfg.arrivee)];
      const faible = Math.min(...links(complete));
      fin({ gagne: true, titre: 'Chaîne terminée !', sousTitre: `Niveau ${nv.n} · ${s(k, 'étape')}`, mot: cfg.arrivee,
        lignes: [{ label: 'Étapes', value: `${k} / ${max}` }, { label: 'Lien le plus faible', value: deg(faible) }], note: etoiles(k, cfg.max), score: cfg.max - k + 1 });
    } else if (k >= max) {
      fin({ gagne: false, titre: 'Chaîne cassée', sousTitre: `Niveau ${nv.n} · ${s(k, 'étape')} sans arriver`, mot: cfg.arrivee, lignes: [{ label: 'Étapes', value: `${k} / ${max}` }], note: 0, score: 0 });
    }
  };

  return (
    <CadreClavier monde={monde} toast={toast.msg}>
      <EnTete n={nv.n} titre={NOMS_TYPES.lier} onClose={onClose} right={<Pastille label={`Étapes ${poses} / ${max}`} />} />
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 2 }} keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        {chaine.map((w, i) => (
          <View key={w} style={{ gap: 2 }}>
            {i > 0 && <Lien label={deg(temps[i - 1])} />}
            <Maillon word={w} bg={i === 0 ? '#FFD45C' : '#FFFFFF'} />
          </View>
        ))}
        <Lien label="encore …" />
        <View style={{ alignSelf: 'center', minWidth: 160, paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16, borderWidth: 3, borderStyle: 'dashed', borderColor: INK, backgroundColor: 'rgba(255,255,255,0.6)' }}>
          <T size={20} weight={700} color={INK} align="center">{cfg.arrivee}</T>
        </View>
      </ScrollView>
      <Saisie value={text} onChange={setText} onSubmit={proposer} placeholder={`Mot suivant (≥ ${LIEN_MIN}°)`} inputRef={input} />
    </CadreClavier>
  );
}
function Maillon({ word, bg }: { word: string; bg: string }) {
  return (
    <Bubble bg={bg} radius={16} border={3} inset={5} style={{ alignSelf: 'center', minWidth: 160, paddingVertical: 6, paddingHorizontal: 16 }}>
      <T size={20} weight={700} color={INK} align="center">{word}</T>
    </Bubble>
  );
}
function Lien({ label }: { label: string }) {
  return (
    <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, height: 26 }}>
      <View style={{ width: 4, height: 26, borderRadius: 2, backgroundColor: '#FFFFFF' }} />
      <T size={13} weight={700} color="#FFFFFF" style={shadow}>{label}</T>
    </View>
  );
}

/* ---------- Type 6 : Contre-la-montre ---------- */
function Chrono({ nv, monde, bonus, onFin, onClose }: JeuProps) {
  const cfg = nv.type === 'chrono' ? nv : { mot: '', mots: 6, duree: 60 };
  const [essais, setEssais] = useState<Essai[]>([]);
  const [text, setText] = useState('');
  const [reste, setReste] = useState(cfg.duree);
  const toast = useToast(1800);
  const input = useRef<TextInputInstance>(null);
  const fin = useFinUnique(onFin, bonus);
  const trouves = motsTrouves(essais);
  const etat = useRef({ reste: cfg.duree, trouves: 0, fini: false, ecoule: 0 });
  useEffect(() => { etat.current.trouves = trouves; }, [trouves]);

  // une relance ajoute 15 s et relance le chrono
  const bonusVu = useRef(bonus);
  useEffect(() => {
    if (bonus === bonusVu.current) return;
    bonusVu.current = bonus;
    etat.current.reste += 15; etat.current.fini = false; setReste(etat.current.reste);
  }, [bonus]);

  useEffect(() => {
    if (etat.current.fini) return;
    let avant = Date.now();
    const id = setInterval(() => {
      const now = Date.now(), dt = (now - avant) / 1000; avant = now;
      if (etat.current.fini) return;
      etat.current.reste = Math.max(0, etat.current.reste - dt);
      etat.current.ecoule += dt;
      setReste(etat.current.reste);
      if (etat.current.reste <= 0) {
        etat.current.fini = true;
        const t = etat.current.trouves;
        fin({ gagne: false, titre: 'Temps écoulé', sousTitre: `Niveau ${nv.n} · ${t} mot${t > 1 ? 's' : ''} sur ${cfg.mots}`, mot: cfg.mot, lignes: [{ label: `Mots à ${CHRONO_MIN}°+`, value: `${t} / ${cfg.mots}` }], note: 0, score: 0 });
      }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bonus]);

  const proposer = () => {
    if (etat.current.fini) return;
    const v = essaiChrono(cfg.mot, text, essais);
    if (!v.ok) {
      if (v.raison !== 'vide') {
        toast.show(v.raison === 'inconnu' ? `Je ne connais pas « ${text.trim()} »` : v.raison === 'cible' ? 'C’est le mot cible !' : `« ${text.trim().toLowerCase()} » est déjà proposé`);
        if (v.raison !== 'inconnu') setText('');
      }
      input.current?.focus();
      return;
    }
    toast.hide();
    const tous = [...essais, v.essai];
    setEssais(tous); setText(''); input.current?.focus();
    if (Platform.OS !== 'web') Haptics.impactAsync(v.essai.temperature >= CHRONO_MIN ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    const t = motsTrouves(tous);
    if (t >= cfg.mots) {
      etat.current.fini = true;
      const r = Math.ceil(etat.current.reste);
      fin({ gagne: true, titre: 'Dans les temps !', sousTitre: `Niveau ${nv.n} · ${t} mots en ${Math.round(etat.current.ecoule)} s`, mot: cfg.mot,
        lignes: [{ label: `Mots à ${CHRONO_MIN}°+`, value: `${t} / ${cfg.mots}` }, { label: 'Temps restant', value: `${r} s` }], note: r >= 30 ? 3 : r >= 15 ? 2 : 1, score: r });
    }
  };

  const sec = Math.ceil(reste);
  const tri = [...essais].sort((a, b) => b.temperature - a.temperature);
  return (
    <CadreClavier monde={monde} toast={toast.msg}>
      <EnTete n={nv.n} titre={NOMS_TYPES.chrono} onClose={onClose}
        right={<Pastille label={`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`} bg="#FFD45C" icon={<MiniIcone name="chrono" />} a11y={`${sec} secondes restantes`} />} />
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T size={13} weight={700} color="#FFFFFF" style={shadow}>Temps</T>
          <T size={13} weight={700} color="#FFFFFF" style={shadow}>{sec} s</T>
        </View>
        <View style={{ height: 18, borderRadius: 9, borderWidth: 3, borderColor: 'transparent', backgroundColor: 'rgba(255,255,255,0.85)' }}>
          <View style={{ width: `${Math.max(0, Math.min(1, reste / cfg.duree)) * 100}%`, height: '100%', borderRadius: 6, backgroundColor: '#FFD45C' }} />
        </View>
      </View>
      <Bubble bg="#FFFFFF" radius={18} border={3} inset={6} style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
        <View accessible accessibilityLabel={`Autour de ${cfg.mot} : ${trouves} sur ${cfg.mots}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T size={13} weight={600} color={INK}>Autour de</T>
          <T size={26} weight={700} color={INK} numberOfLines={1} style={{ flexShrink: 1 }}>{cfg.mot}</T>
          <T size={22} weight={700} color={INK}>{trouves} / {cfg.mots}</T>
        </View>
      </Bubble>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }} keyboardShouldPersistTaps="handled">
        {tri.map(e => (
          <View key={e.word} accessible accessibilityLabel={`${e.word}, ${e.temperature} degrés`}
            style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, borderWidth: 2.5, borderColor: 'transparent', backgroundColor: e.temperature >= CHRONO_MIN ? (e.temperature >= 70 ? '#FF9A3C' : '#FFB35C') : '#E7E2F3' }}>
            <T size={15} weight={700} color={INK}>{e.word} {e.temperature}°</T>
          </View>
        ))}
      </ScrollView>
      <Saisie value={text} onChange={setText} onSubmit={proposer} placeholder={`Un mot à ${CHRONO_MIN}°+`} inputRef={input} />
    </CadreClavier>
  );
}
