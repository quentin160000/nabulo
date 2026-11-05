import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { shortDate } from '@/game/history';
import { resultatDuJour } from '@/game/onglets-parties';
import type { DailyState } from '@/game/useDaily';
import { ink, meRow } from '@/theme/colors';
import { Bubble } from '@/ui/Bubble';
import { images } from '@/ui/bits';
import { Mascot } from '@/ui/Mascot';
import { CARD, Glyph, Segmented, SOFT, TabScreen } from '@/ui/onglets-bits';
import { T } from '@/ui/Text';

type Vue = 'jour' | 'amis' | 'mondial';
const VUES = [['jour', 'Jour'], ['amis', 'Amis'], ['mondial', 'Mondial']] as const;

export default function Classement() {
  const [vue, setVue] = useState<Vue>('jour');
  const [res, setRes] = useState<DailyState | null | undefined>(undefined);
  useFocusEffect(useCallback(() => { resultatDuJour().then(setRes); }, []));

  const n = res?.guesses.length ?? 0;
  const solved = !!res?.solved;

  return (
    <TabScreen title="Classement" tab="classement">
      <Segmented options={VUES} value={vue} onChange={setVue} />

      {res !== undefined && (
        <Pressable accessibilityRole="button" accessibilityLabel={solved ? `Jeu du jour trouvé en ${n} essais` : 'Jouer au jeu du jour'}
          onPress={() => router.push('/mot-du-jour')}>
          <Bubble {...CARD.jour} style={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {solved ? <Mascot mood="trouve" size={64} /> : <Image source={images.nabulo} style={{ width: 64, height: 64 }} contentFit="contain" accessibilityLabel="Nabulo" />}
              <View style={{ flex: 1 }}>
                <T size={13} weight={700} color="#FFFFFF">Jeu du jour · {shortDate()}</T>
                <T size={22} weight={700} color="#FFFFFF">{solved ? `Trouvé en ${n} essai${n > 1 ? 's' : ''}` : n > 0 ? 'Pas encore trouvé' : 'Pas encore joué'}</T>
                <T size={13} weight={600} color="#E2DBFF">{solved ? 'ton résultat du jour' : n > 0 ? `${n} essai${n > 1 ? 's' : ''} · à toi de finir` : 'le même mot pour tout le monde'}</T>
              </View>
            </View>
          </Bubble>
        </Pressable>
      )}

      {solved && vue !== 'mondial' && (
        <View style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 20, backgroundColor: meRow, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 34, alignItems: 'center' }}><T size={17} weight={700} color={ink}>–</T></View>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#7CE0B5', alignItems: 'center', justifyContent: 'center' }}><Glyph name="user" size={20} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={18} weight={700} color={ink} style={{ lineHeight: 21 }}>Toi</T>
            <T size={13} weight={600} color={SOFT}>{n} essai{n > 1 ? 's' : ''}</T>
          </View>
        </View>
      )}

      <View style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', gap: 4 }}>
        <T size={16} weight={700} color="#FFFFFF" align="center">
          {vue === 'amis' ? 'Tes amis arriveront avec les comptes joueurs' : 'Le classement arrivera avec les comptes joueurs'}
        </T>
        <T size={13} weight={600} color="#E6E0FF" align="center">
          {vue === 'mondial' ? 'Ton rang parmi tous les joueurs s’affichera ici dès qu’il pourra être calculé.'
            : 'Pour l’instant, seuls tes résultats sont enregistrés, sur ce téléphone.'}
        </T>
      </View>
    </TabScreen>
  );
}
