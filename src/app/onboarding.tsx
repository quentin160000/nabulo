import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { markOnboardingSeen } from '@/game/history';
import { tempColor } from '@/game/temperature';
import { ink, slideGradient, slideStops } from '@/theme/colors';
import { Bubble } from '@/ui/Bubble';
import { Button } from '@/ui/Button';
import { RisingBits, SlidingGradient } from '@/ui/backgrounds';
import { Coin, Icon, images } from '@/ui/bits';
import { T } from '@/ui/Text';

const LAST = 4;

/** Premier lancement : Nabulo s'emmêle les pinceaux, le joueur l'aide à retrouver le mot auquel il pense. */
export default function Onboarding() {
  const { width, height } = useWindowDimensions();
  const inset = useSafeAreaInsets();
  const pager = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  // les illustrations sont dessinées pour un écran de 844 px de haut
  const k = Math.min(1, Math.max(0.72, (height - inset.top - inset.bottom) / 760));

  const finish = () => { markOnboardingSeen(); router.replace('/'); };
  const next = () => {
    if (page >= LAST) return finish();
    pager.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  const screens = [<Rencontre key={0} k={k} />, <Probleme key={1} k={k} />, <Regle key={2} k={k} />, <But key={3} k={k} />, <CoupDePouce key={4} k={k} />];

  return (
    <View style={{ flex: 1, backgroundColor: '#4B33B8' }}>
      <SlidingGradient colors={slideGradient} stops={slideStops} />
      <RisingBits seed={page + 11} />
      <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} style={{ flex: 1 }}>
        {screens.map((s, i) => (
          <View key={i} style={{ width, paddingTop: inset.top + 56, paddingBottom: 6, paddingHorizontal: 20, gap: 16 }}>
            <View style={{ flex: 1 }} />
            {s}
            <View style={{ flex: 1 }} />
          </View>
        ))}
      </ScrollView>
      {page < LAST && (
        <Pressable accessibilityRole="button" accessibilityLabel="Passer l’introduction" onPress={finish} hitSlop={8}
          style={{ position: 'absolute', right: 16, top: inset.top + 8, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#FFFFFF' }}>
          <T size={15} weight={700} color={ink}>Passer</T>
        </Pressable>
      )}
      <View style={{ paddingHorizontal: 20, paddingBottom: inset.bottom + 20, gap: 16 }}>
        <View accessibilityLabel={`Étape ${page + 1} sur 5`} style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {[0, 1, 2, 3, 4].map(i => <View key={i} style={{ width: i === page ? 26 : 10, height: 10, borderRadius: 5, backgroundColor: i === page ? '#FFD45C' : 'rgba(255,255,255,0.45)' }} />)}
        </View>
        <Button label={page === LAST ? 'Aider Nabulo' : 'Suivant'} height={60} fontSize={21} border={2} color={ink} onPress={next}
          trailing={page === LAST ? undefined : <Icon name="chevron" size={22} color={ink} width={2.8} />} />
      </View>
    </View>
  );
}

/* ---------- pièces communes ---------- */
function Say({ children }: { children: React.ReactNode }) {
  return (
    <View>
      <Bubble radius={18} border={2} style={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: 16 }}>
        <T size={19} weight={600} color={ink} align="center" style={{ lineHeight: 25 }}>{children}</T>
      </Bubble>
      {/* pointe de la bulle, vers Nabulo */}
      <View style={{ position: 'absolute', left: '50%', top: -6, marginLeft: -7, width: 13, height: 13, backgroundColor: '#FFFFFF', borderLeftWidth: 2, borderTopWidth: 2, borderColor: '#D9D1F2', transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}
const B = ({ children }: { children: string }) => <T size={19} weight={700} color={ink}>{children}</T>;

function Title({ title, sub }: { title: string; sub: string }) {
  return (
    <View>
      <T size={30} weight={700} outline align="center" style={{ lineHeight: 33 }}>{title}</T>
      <T size={16} weight={600} outline align="center" style={{ marginTop: 6, lineHeight: 21 }}>{sub}</T>
    </View>
  );
}
function Pic({ src, size, label }: { src: number; size: number; label: string }) {
  return <Image source={src} style={{ width: size, height: size, alignSelf: 'center' }} contentFit="contain" accessibilityLabel={label} />;
}
function Card({ children, bg = '#FFFFFF' }: { children: React.ReactNode; bg?: string }) {
  return <Bubble bg={bg} radius={18} border={2} style={{ paddingTop: 10, paddingHorizontal: 14, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>{children}</Bubble>;
}

/* ---------- les 5 écrans ---------- */
function Rencontre({ k }: { k: number }) {
  return (
    <View style={{ gap: 16 }}>
      <Pic src={images.nabuloJoie} size={250 * k} label="Nabulo sourit" />
      <Say>Salut ! Moi, c’est <B>Nabulo</B>.</Say>
      <Title title="Un singe de feu" sub="qui a la tête pleine de mots… peut-être un peu trop." />
    </View>
  );
}

const TANGLE: [string, number, number, number, number, number][] = [
  ['pinceau ?', 10, 6, -8, 0.95, 20], ['pingouin ?', 176, 0, 6, 0.8, 19], ['piano ?', 96, 58, -3, 0.9, 22],
  ['pain ?', 236, 70, 9, 0.7, 18], ['sapin ?', 22, 112, 5, 0.75, 18], ['pinson ?', 160, 124, -6, 0.85, 20],
];
function Probleme({ k }: { k: number }) {
  return (
    <View style={{ gap: 16 }}>
      <Pic src={images.nabuloEmbete} size={180 * k} label="Nabulo embêté" />
      <Say>Oups… je m’emmêle encore les pinceaux !</Say>
      <View accessibilityLabel="Des mots qui se mélangent : pinceau, pingouin, piano, pain, sapin, pinson" style={{ height: 170 * k }}>
        {TANGLE.map(([w, x, y, r, a, fs]) => (
          <View key={w} style={{ position: 'absolute', left: x, top: y * k, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 14, backgroundColor: `rgba(255,255,255,${a})`, transform: [{ rotate: `${r}deg` }] }}>
            <T size={fs} weight={700} color={ink}>{w}</T>
          </View>
        ))}
      </View>
      <Title title="Il a un mot en tête" sub="mais impossible de le retrouver. Il a besoin de toi !" />
    </View>
  );
}

function Row({ w, t, label }: { w: string; t: number; label: string }) {
  return (
    <View style={{ height: 54, borderRadius: 16, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 8 }}>
      <T size={21} weight={700} color={ink} style={{ flex: 1 }}>{w}</T>
      <T size={15} weight={600} color="#6B6290">{label}</T>
      <View style={{ minWidth: 92, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: tempColor(t), alignItems: 'center' }}>
        <T size={17} weight={700} color={ink}>{t.toFixed(1).replace('.', ',')} °C</T>
      </View>
    </View>
  );
}
function Regle({ k }: { k: number }) {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pic src={images.nabuloTete} size={96 * k} label="Nabulo" />
        <View style={{ flex: 1 }}>
          <Bubble radius={18} border={2} style={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: 16 }}>
            <T size={19} weight={600} color={ink} align="center" style={{ lineHeight: 25 }}>Propose-moi des mots, je te dis si tu brûles ou si tu gèles.</T>
          </Bubble>
          <View style={{ position: 'absolute', left: -6, top: '50%', marginTop: -7, width: 13, height: 13, backgroundColor: '#FFFFFF', borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#D9D1F2', transform: [{ rotate: '45deg' }] }} />
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Row w="banquise" t={-6.4} label="tu gèles" />
        <Row w="plage" t={24.8} label="tiède" />
        <Row w="soleil" t={47.3} label="chaud" />
        <Row w="flamme" t={81.9} label="tu brûles !" />
      </View>
      <Title title="Plus c’est chaud, plus tu es proche" sub="la température dit à quel point ton mot ressemble au sien." />
    </View>
  );
}

function But({ k }: { k: number }) {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ height: 200 * k, alignItems: 'center' }}>
        <Image source={images.nabuloSaut} autoplay style={{ position: 'absolute', top: -30 * k, width: 240 * k, height: 240 * k }} contentFit="contain" accessibilityLabel="Nabulo saute de joie" />
      </View>
      <Bubble radius={18} border={2} style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 18 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T size={15} weight={700} color={ink}>froid</T><T size={15} weight={700} color={ink}>100 °C</T>
        </View>
        <View style={{ marginTop: 8, height: 22 }}>
          <LinearGradient colors={['#5B8DEF', '#9AD8F5', '#FFC23D', '#FF5A36', '#FFD23F']} locations={[0, 0.35, 0.68, 0.92, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 11 }} />
          <View style={{ position: 'absolute', right: -4, top: -5, width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFD23F', borderWidth: 3, borderColor: '#FFFFFF', boxShadow: `0 2px 0 ${ink}` }} />
        </View>
        <T size={17} weight={700} color={ink} align="center" style={{ marginTop: 10 }}>À 100 °C, c’est le mot exact !</T>
      </Bubble>
      <Card bg="#FFD45C">
        <Coin size={48} />
        <View style={{ flex: 1 }}>
          <T size={19} weight={700} color={ink}>Gagne des brez</T>
          <T size={14} weight={600} color={ink}>un nouveau mot à retrouver chaque jour</T>
        </View>
      </Card>
      <Title title="Retrouve son mot" sub="et Nabulo saute de joie." />
    </View>
  );
}

function CoupDePouce({ k }: { k: number }) {
  return (
    <View style={{ gap: 16 }}>
      <Pic src={images.nabulo} size={230 * k} label="Nabulo" />
      <Say>Tu es coincé ? Je peux te <B>souffler un indice</B>.</Say>
      <Card>
        <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: '#F1EEFA', alignItems: 'center', justifyContent: 'center' }}><Icon name="bulb" size={26} /></View>
        <View style={{ flex: 1 }}>
          <T size={18} weight={700} color={ink}>Indice soufflé</T>
          <T size={13} weight={600} color="#3F3566">révèle un mot brûlant · 60 brez ou une pub</T>
        </View>
      </Card>
      <Title title="Prêt à l’aider ?" sub="240 brez offertes pour commencer." />
    </View>
  );
}
