import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FREE_AD_HINTS_PER_DAY, HINT_COST } from '@/game/rules';
import { useWallet } from '@/game/wallet';
import { ink } from '@/theme/colors';
import { Bubble } from '@/ui/Bubble';
import { AluBackground } from '@/ui/backgrounds';
import { Coin, Icon } from '@/ui/bits';
import { T } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';

const SOFT = '#3F3566';
const WHITE_CARD = { bg: '#FFFFFF', colors: { border: '#D9D1F2', diag: '#F4F3F3', relief: '#E3DEDE' } };
const YELLOW_CARD = { bg: '#FFCF5C', colors: { border: '#FFD369', diag: '#FFC845', relief: '#FFBD1F' } };

export default function Boutique() {
  const inset = useSafeAreaInsets();
  const { braises } = useWallet();
  const toast = useToast();
  const buy = () => toast.show('Les achats arrivent bientôt');
  return (
    <View style={{ flex: 1 }}>
      <AluBackground />
      <View style={{ flex: 1, paddingTop: inset.top + 6, paddingBottom: inset.bottom + 20, paddingHorizontal: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(43,33,80,0.10)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="back" size={22} />
          </Pressable>
          <T size={28} weight={700} color={ink} style={{ flex: 1 }}>Boutique</T>
        </View>

        <ScrollView style={{ flex: 1, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          <Bubble {...YELLOW_CARD} style={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Coin size={56} />
            <View style={{ flex: 1 }}>
              <T size={13} weight={700} color={ink}>Ton solde</T>
              <T size={30} weight={700} color={ink} style={{ lineHeight: 32 }}>{braises} braises</T>
              <T size={13} weight={600} color={SOFT}>on en gagne en jouant chaque jour</T>
            </View>
          </Bubble>

          <Label>Indices</Label>
          <HintCard icon="bolt" title="Mot proche" sub="révèle un mot brûlant · se paie en partie, au moment de l’utiliser" tag={`${HINT_COST} / indice`} tagBg="#FFD45C" />
          <HintCard icon="star" title="Indice gratuit avec une pub" sub={`directement en partie, quand il te manque des braises · ${FREE_AD_HINTS_PER_DAY} par jour`} tag="En partie" tagBg="#7CE0B5" />

          <Label>Recharger</Label>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'stretch', paddingTop: 6 }}>
            <Pack n={100} price="0,99 €" onPress={buy} />
            <Pressable accessibilityRole="button" accessibilityLabel="300 braises pour 1,99 €, le plus choisi" onPress={buy} style={{ flex: 1 }}>
              <LinearGradient colors={['#FFC24A', '#FF7A2E', '#F04E24']} locations={[0, 0.55, 1]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={{ flex: 1, padding: 3, borderRadius: 23 }}>
                <LinearGradient colors={['#FFF8EE', '#FFEBD3']} style={{ flex: 1, borderRadius: 20, boxShadow: 'inset 0 -5px 0 #FFD9AE', paddingTop: 18, paddingHorizontal: 4, paddingBottom: 13, alignItems: 'center', gap: 4 }}>
                  <Coin size={50} />
                  <T size={26} weight={700} color={ink} style={{ lineHeight: 26 }}>300</T>
                  <T size={12} weight={600} color="#B4541E">braises</T>
                  <View style={{ marginTop: 4, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#F04E24' }}><T size={15} weight={700} color="#FFFFFF">1,99 €</T></View>
                  <T size={11} weight={700} color="#B4541E">le plus choisi</T>
                </LinearGradient>
              </LinearGradient>
              <View style={{ position: 'absolute', top: -11, alignSelf: 'center', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#F04E24', borderWidth: 2, borderColor: '#FFFFFF' }}>
                <T size={11} weight={700} color="#FFFFFF" style={{ letterSpacing: 0.66, lineHeight: 13 }}>POPULAIRE</T>
              </View>
            </Pressable>
            <Pack n={800} price="4,99 €" note="meilleur prix" onPress={buy} />
          </View>
          <T size={12} weight={600} color="#4A4E57" align="center">Paiement via l’App Store ou Google Play</T>
        </ScrollView>

      </View>
      <Toast msg={toast.msg} check={false} style={{ bottom: inset.bottom + 104 }} />
    </View>
  );
}

function Label({ children }: { children: string }) {
  return <T size={14} weight={700} color="#4A4E57" style={{ textTransform: 'uppercase', letterSpacing: 0.84, marginTop: 2, marginBottom: -5, marginLeft: 2 }}>{children}</T>;
}

function HintCard({ icon, title, sub, tag, tagBg }: { icon: 'bolt' | 'star'; title: string; sub: string; tag: string; tagBg: string }) {
  return (
    <Bubble {...WHITE_CARD} style={{ paddingTop: 10, paddingHorizontal: 12, paddingBottom: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: '#F1EEFA', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={27} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T size={18} weight={700} color={ink} style={{ lineHeight: 21 }}>{title}</T>
        <T size={13} weight={600} color={SOFT}>{sub}</T>
      </View>
      <View style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: 10, backgroundColor: tagBg }}><T size={12} weight={700} color={ink}>{tag}</T></View>
    </Bubble>
  );
}

function Pack({ n, price, note, onPress }: { n: number; price: string; note?: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${n} braises pour ${price}`} onPress={onPress} style={{ flex: 1 }}>
      <Bubble {...WHITE_CARD} style={{ flex: 1, paddingTop: 10, paddingHorizontal: 4, paddingBottom: 13, alignItems: 'center', gap: 4 }}>
        <Coin size={44} />
        <T size={24} weight={700} color={ink} style={{ lineHeight: 24 }}>{n}</T>
        <T size={12} weight={600} color={SOFT}>braises</T>
        <View style={{ marginTop: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#5BD67A' }}><T size={14} weight={700} color={ink}>{price}</T></View>
        <T size={11} weight={700} color="#C2410C">{note ?? ' '}</T>
      </Bubble>
    </Pressable>
  );
}
