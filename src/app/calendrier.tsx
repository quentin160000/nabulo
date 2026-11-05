import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { engine } from '@/game/engine';
import { PALIER_JOURS, bonusPalier, etatSerie, prochainPalier } from '@/game/serie';
import { ink } from '@/theme/colors';
import { Bubble } from '@/ui/Bubble';
import { images } from '@/ui/bits';
import { CARD, Label, SOFT, TabScreen, Tag } from '@/ui/onglets-bits';
import { T } from '@/ui/Text';

const JAUNE = '#FFD45C';
const MAUVE = '#6A4BE0';
const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const JOURS_LONGS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
/** 1er janvier 2026 = mot n°1 : rien avant. */
const DEBUT = { an: 2026, mois: 0 };

type Etat = Awaited<ReturnType<typeof etatSerie>>;
const jours = (n: number) => `${n} jour${n > 1 ? 's' : ''}`;

export default function Calendrier() {
  const now = new Date();
  const today = engine.dayNumber(now);
  const [etat, setEtat] = useState<Etat | null>(null);
  const [vue, setVue] = useState({ an: now.getFullYear(), mois: now.getMonth() });
  useFocusEffect(useCallback(() => { etatSerie(today).then(e => setEtat(e)).catch(() => {}); }, [today, setEtat]));

  const serie = etat?.serie ?? 0;
  const prochain = prochainPalier(serie);
  // palier tout juste atteint : la barre reste pleine jusqu'au prochain jour trouvé
  const pile = serie > 0 && serie % PALIER_JOURS === 0;
  const fait = pile ? PALIER_JOURS : PALIER_JOURS - prochain.reste;
  const paliers = useMemo(() => {
    const max = Math.max(4 * PALIER_JOURS, prochain.jours + 2 * PALIER_JOURS);
    return Array.from({ length: max / PALIER_JOURS }, (_, i) => (i + 1) * PALIER_JOURS);
  }, [prochain.jours]);

  return (
    <TabScreen title="Calendrier" back tab="accueil">
      {/* série en cours */}
      <Bubble {...CARD.jour} style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <T size={13} weight={700} color="#E2DBFF">Série en cours</T>
            <T size={32} weight={700} color="#FFFFFF" style={{ lineHeight: 34 }} accessibilityRole="header">{etat ? jours(serie) : ' '}</T>
            <T size={14} weight={600} color="#E2DBFF">
              {!etat ? ' ' : !etat.aujourdhui && serie > 0 ? 'trouve le mot du jour pour la garder'
                : `${pile ? `+${bonusPalier(serie)} brez gagnées · ` : ''}encore ${jours(prochain.reste)} pour +${prochain.bonus} brez`}
            </T>
          </View>
          {serie >= PALIER_JOURS ? (
            // l'image du saut a de grandes marges : même cadrage que l'écran de victoire, ramené à 86 px
            <View style={{ width: 86, height: 86 }}>
              <Image source={images.nabuloSaut} autoplay style={{ position: 'absolute', left: -26, top: -40, width: 138, height: 138 }} contentFit="contain" accessibilityLabel="Nabulo saute de joie" />
            </View>
          ) : <Image source={images.nabulo} style={{ width: 86, height: 86 }} contentFit="contain" accessibilityLabel="Nabulo" />}
        </View>
        <View accessible accessibilityRole="progressbar" accessibilityLabel={`${fait} sur ${PALIER_JOURS} jours vers le palier de ${prochain.jours} jours`}
          style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, height: 14, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${(fait / PALIER_JOURS) * 100}%`, borderRadius: 7, backgroundColor: JAUNE }} />
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: '#FFFFFF' }}>
            <T size={14} weight={700} color={ink}>{fait}/{PALIER_JOURS}</T>
          </View>
        </View>
      </Bubble>

      {/* records */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {([[etat ? jours(etat.meilleure) : '–', 'meilleure série'], [etat ? String(etat.trouves.size) : '–', `mot${(etat?.trouves.size ?? 0) > 1 ? 's' : ''} trouvé${(etat?.trouves.size ?? 0) > 1 ? 's' : ''}`]] as const).map(([v, l]) => (
          <Bubble key={l} {...CARD.stat} style={{ flex: 1, minWidth: 0, paddingTop: 10, paddingHorizontal: 6, paddingBottom: 13, alignItems: 'center' }}>
            <View accessible accessibilityLabel={`${l} : ${v}`} style={{ alignItems: 'center' }}>
              <T size={24} weight={700} color={ink}>{v}</T>
              <T size={12} weight={600} color={SOFT} numberOfLines={1}>{l}</T>
            </View>
          </Bubble>
        ))}
      </View>

      <Mois an={vue.an} mois={vue.mois} today={today} now={now} trouves={etat?.trouves ?? null} onChange={setVue} />

      {/* paliers */}
      <Label>Récompenses de série</Label>
      <View style={{ gap: 8 }}>
        {paliers.map(j => {
          const atteint = serie >= j;
          return (
            <View key={j} accessible accessibilityLabel={`${j} jours de suite : ${bonusPalier(j)} brez, ${atteint ? 'atteint' : 'à venir'}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 20, backgroundColor: atteint ? '#FFF3B0' : '#FFFFFF' }}>
              <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: atteint ? JAUNE : '#F1EEFA', alignItems: 'center', justifyContent: 'center' }}>
                <Flamme size={26} eteinte={!atteint} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T size={18} weight={700} color={ink} style={{ lineHeight: 21 }}>{j} jours de suite</T>
                <T size={13} weight={600} color={SOFT}>+{bonusPalier(j)} brez</T>
              </View>
              <Tag label={atteint ? 'atteint' : j === prochain.jours ? `encore ${jours(prochain.reste)}` : 'à venir'} bg={atteint ? '#7CE0B5' : j === prochain.jours ? JAUNE : '#F1EEFA'} />
            </View>
          );
        })}
        <T size={13} weight={600} color="#E6E0FF" align="center" style={{ marginTop: 2 }}>
          Un bonus tous les {PALIER_JOURS} jours trouvés d’affilée, de plus en plus gros.{'\n'}Un jour manqué et la série repart à 0.
        </T>
      </View>
    </TabScreen>
  );
}

/* ---------- calendrier du mois ---------- */

type MoisProps = { an: number; mois: number; today: number; now: Date; trouves: Set<number> | null; onChange: (v: { an: number; mois: number }) => void };

function Mois({ an, mois, today, now, trouves, onChange }: MoisProps) {
  const premier = new Date(an, mois, 1);
  const nb = new Date(an, mois + 1, 0).getDate();
  const decalage = (premier.getDay() + 6) % 7; // semaine qui commence le lundi
  const cases: (number | null)[] = [...Array(decalage).fill(null), ...Array.from({ length: nb }, (_, i) => i + 1)];
  while (cases.length % 7) cases.push(null);
  const titre = premier.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const avant = an > DEBUT.an || (an === DEBUT.an && mois > DEBUT.mois);
  const apres = an < now.getFullYear() || (an === now.getFullYear() && mois < now.getMonth());
  const aller = (d: number) => { const x = new Date(an, mois + d, 1); onChange({ an: x.getFullYear(), mois: x.getMonth() }); };
  const trouvesDuMois = trouves ? cases.filter(d => d !== null && trouves.has(engine.dayNumber(new Date(an, mois, d)))).length : 0;

  return (
    <Bubble {...CARD.stat} style={{ paddingTop: 10, paddingHorizontal: 10, paddingBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Fleche sens="prec" actif={avant} onPress={() => aller(-1)} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <T size={19} weight={700} color={ink} style={{ textTransform: 'capitalize' }} accessibilityRole="header">{titre}</T>
          <T size={12} weight={600} color={SOFT}>{trouves ? `${trouvesDuMois} mot${trouvesDuMois > 1 ? 's' : ''} trouvé${trouvesDuMois > 1 ? 's' : ''}` : ' '}</T>
        </View>
        <Fleche sens="suiv" actif={apres} onPress={() => aller(1)} />
      </View>

      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        {JOURS.map((j, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }} accessibilityLabel={JOURS_LONGS[i]}>
            <T size={12} weight={700} color={SOFT}>{j}</T>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
        {cases.map((d, i) => {
          if (d === null) return <View key={`v${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
          const n = engine.dayNumber(new Date(an, mois, d));
          const trouve = !!trouves?.has(n);
          const estAujourdhui = n === today;
          const futur = n > today || n < 1;
          const manque = !trouve && !futur && !estAujourdhui;
          const date = new Date(an, mois, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
          return (
            <View key={d} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2.5 }}
              accessible accessibilityLabel={`${date} : ${trouve ? 'mot trouvé' : estAujourdhui ? 'aujourd’hui, pas encore trouvé' : futur ? 'à venir' : 'manqué'}`}>
              <View style={{
                flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                backgroundColor: trouve ? JAUNE : 'transparent',
                borderWidth: estAujourdhui ? 2.5 : 0, borderColor: MAUVE,
              }}>
                <T size={15} weight={700} color={trouve ? ink : futur ? '#CFC9DE' : manque ? '#A79FBF' : ink} style={{ marginTop: trouve ? -6 : 0 }}>{d}</T>
                {trouve && <View style={{ position: 'absolute', bottom: 3 }}><Flamme size={13} /></View>}
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
        <Legende pastille={<View style={{ width: 14, height: 14, borderRadius: 5, backgroundColor: JAUNE }} />} label="trouvé" />
        <Legende pastille={<View style={{ width: 14, height: 14, borderRadius: 5, borderWidth: 2, borderColor: MAUVE }} />} label="aujourd’hui" />
        <Legende pastille={<T size={13} weight={700} color="#A79FBF">7</T>} label="manqué" />
      </View>
    </Bubble>
  );
}

function Legende({ pastille, label }: { pastille: React.ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {pastille}
      <T size={12} weight={600} color={SOFT}>{label}</T>
    </View>
  );
}

function Fleche({ sens, actif, onPress }: { sens: 'prec' | 'suiv'; actif: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={sens === 'prec' ? 'Mois précédent' : 'Mois suivant'} accessibilityState={{ disabled: !actif }}
      disabled={!actif} onPress={onPress} hitSlop={4}
      style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#F1EEFA', alignItems: 'center', justifyContent: 'center', opacity: actif ? 1 : 0.35 }}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path d={sens === 'prec' ? 'M15 5l-7 7 7 7' : 'm9 5 7 7-7 7'} stroke={ink} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

/** Petite flamme (jour trouvé, palier atteint) ; grise quand le palier n'est pas encore atteint. */
function Flamme({ size, eteinte }: { size: number; eteinte?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2.5c.8 3.6 5.8 5.6 5.8 11.3a5.8 5.8 0 0 1-11.6 0c0-2.9 1.6-4.6 2.7-6.3.2 1.9 1 2.9 2 3.2-.5-3 .2-5.8 1.1-8.2z"
        fill={eteinte ? '#D9D1F2' : '#FF7A2E'} stroke={eteinte ? '#B3AACB' : '#C2410C'} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M12 13.2c.6 1.5 2.4 2.2 2.4 4.1a2.4 2.4 0 0 1-4.8 0c0-1.3.9-2.2 1.4-2.9.2.6.5.9.9 1-.1-.8-.1-1.5.1-2.2z" fill={eteinte ? '#FFFFFF' : '#FFD45C'} />
    </Svg>
  );
}
