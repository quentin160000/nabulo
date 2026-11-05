import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { statsMotDuJour, type Stats } from '@/game/onglets-parties';
import { useWallet } from '@/game/wallet';
import { ink } from '@/theme/colors';
import { Bubble } from '@/ui/Bubble';
import { Coin } from '@/ui/bits';
import { CARD, Glyph, Row, SOFT, TabScreen, Tag } from '@/ui/onglets-bits';
import { T } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

const moisAnnee = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });

export default function Profil() {
  const toast = useToast();
  const { braises } = useWallet();
  const [stats, setStats] = useState<Stats | null>(null);
  useFocusEffect(useCallback(() => { statsMotDuJour().then(setStats); }, []));
  const soon = () => toast.show('Bientôt disponible');

  const cases: [string, string][] = [
    [String(stats?.serie ?? 0), (stats?.serie ?? 0) > 1 ? 'jours de série' : 'jour de série'],
    [String(stats?.trouves ?? 0), (stats?.trouves ?? 0) > 1 ? 'mots trouvés' : 'mot trouvé'],
    [stats?.essaisMoyens != null ? String(stats.essaisMoyens) : '–', 'essais en moy.'],
  ];

  return (
    <TabScreen title="Profil" tab="profil" toast={toast.msg}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#7CE0B5', alignItems: 'center', justifyContent: 'center' }}>
          <Glyph name="user" size={34} />
        </View>
        <View style={{ flex: 1 }}>
          <T size={24} weight={700} outline>Ton profil</T>
          <T size={14} weight={600} color="#E6E0FF">{stats?.depuis ? `joue depuis ${moisAnnee(stats.depuis)}` : 'tes parties restent sur ce téléphone'}</T>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }} accessible accessibilityLabel={cases.map(([v, l]) => `${v} ${l}`).join(', ')}>
        {cases.map(([v, l]) => (
          <Bubble key={l} {...CARD.stat} style={{ flex: 1, minWidth: 0, paddingTop: 10, paddingHorizontal: 4, paddingBottom: 13, alignItems: 'center' }}>
            <T size={24} weight={700} color={ink}>{v}</T>
            <T size={12} weight={600} color={SOFT} numberOfLines={1}>{l}</T>
          </Bubble>
        ))}
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel={`${braises} braises, ouvrir la boutique`} onPress={() => router.push('/boutique')}
        style={({ pressed }) => ({ transform: [{ translateY: pressed ? 2 : 0 }] })}>
        <Bubble {...CARD.cours} style={{ paddingTop: 10, paddingHorizontal: 12, paddingBottom: 13 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Coin size={46} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T size={18} weight={700} color={ink} style={{ lineHeight: 21 }}>{braises} braises</T>
              <T size={13} weight={600} color={SOFT}>pour les indices</T>
            </View>
            <Tag label="Boutique" bg="#FFFFFF" />
          </View>
        </Bubble>
      </Pressable>

      <Row kind="white" icon="friend" title="Amis" sub="inviter tes amis" onPress={soon} />
      <Row kind="white" icon="bolt" title="Historique des duels" sub="tes victoires et défaites" onPress={soon} />
      <Row kind="white" icon="gear" title="Réglages" sub="langue, sons, notifications, compte" onPress={soon} />
    </TabScreen>
  );
}
