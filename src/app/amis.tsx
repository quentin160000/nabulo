import { Image } from 'expo-image';
import { Share, View } from 'react-native';
import { ink } from '@/theme/colors';
import { Button } from '@/ui/Button';
import { images } from '@/ui/bits';
import { TabScreen } from '@/ui/onglets-bits';
import { ReglageTile } from '@/ui/reglages-bits';
import { T } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

const INVITATION = 'Viens jouer à Nabulo avec moi ! Un jeu de mots chaud / froid : aide Nabulo, le singe de feu, à retrouver le mot auquel il pense. Télécharge Nabulo sur ton téléphone et défie-moi au mot du jour.';

export default function Amis() {
  const toast = useToast();
  const inviter = async () => {
    try { await Share.share({ message: INVITATION }); }
    catch { toast.show('Le partage n’est pas disponible ici'); }
  };
  return (
    <TabScreen title="Amis" back tab="profil" toast={toast.msg}>
      <View style={{ alignItems: 'center', gap: 6, paddingTop: 30 }}>
        <Image source={images.nabuloJoie} style={{ width: 150, height: 150 }} contentFit="contain" accessibilityLabel="Nabulo content" />
        <T size={20} weight={700} outline align="center">Les amis arrivent avec les comptes joueurs</T>
        <T size={14} weight={600} color="#E6E0FF" align="center">
          Pour l’instant, tes parties restent sur ce téléphone.{'\n'}Invite tes amis à télécharger Nabulo : vous pourrez{'\n'}comparer vos mots du jour en attendant.
        </T>
      </View>
      <Button label="Inviter un ami" border={2} color={ink} style={{ marginTop: 14 }} onPress={inviter}
        icon={<ReglageTile name="partage" bg="transparent" size={26} icon={24} />} accessibilityHint="Ouvre le partage du téléphone" />
    </TabScreen>
  );
}
