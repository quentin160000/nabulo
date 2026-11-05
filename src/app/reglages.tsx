import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { DevSettings, Platform, Pressable, View } from 'react-native';
import { oublierReglages, useReglages } from '@/game/reglages';
import { START_BRAISES } from '@/game/rules';
import { resetAll } from '@/game/storage';
import { useWallet } from '@/game/wallet';
import { gameInkSoft, ink } from '@/theme/colors';
import { Button } from '@/ui/Button';
import { images } from '@/ui/bits';
import { Sheet } from '@/ui/game';
import { Label, Row, TabScreen, Tag } from '@/ui/onglets-bits';
import { Interrupteur, ReglageTile, type ReglageIcon } from '@/ui/reglages-bits';
import { T } from '@/ui/Text';
import { useToast } from '@/ui/Toast';
import pkg from '../../package.json';

const VERSION = Constants.expoConfig?.version ?? pkg.version;
type Panneau = 'reset' | 'apropos' | 'confid' | null;

export default function Reglages() {
  const toast = useToast();
  const [r, maj] = useReglages();
  const { braises, earn } = useWallet();
  const [panneau, setPanneau] = useState<Panneau>(null);

  const bascule = (icon: ReglageIcon, title: string, sub: string, on: boolean, set: (v: boolean) => void) => (
    <Row kind="white" icon="gear" leading={<ReglageTile name={icon} />} title={title} sub={sub}
      trailing={<Interrupteur on={on} onChange={set} label={title} />} />
  );

  const revoirIntro = async () => {
    try { await AsyncStorage.removeItem('nabulo:onboarding-vu'); } catch { /* l'onboarding s'ouvre quand même */ }
    if (router.canDismiss()) router.dismissAll();
    router.replace('/onboarding');
  };

  const reinitialiser = async () => {
    setPanneau(null);
    await resetAll();
    oublierReglages();
    if (Platform.OS === 'web') { window.location.assign('/'); return; }
    // le porte-monnaie est en mémoire : on le ramène au solde de départ (sans attendre un redémarrage)
    earn(START_BRAISES - braises);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/onboarding');
    DevSettings.reload();                              // en développement, repart de zéro comme l'appui long à l'accueil
  };

  return (
    <TabScreen title="Réglages" back tab="profil" toast={toast.msg}>
      <Label>Jeu</Label>
      {bascule('vibre', 'Vibrations', 'petit retour au toucher des boutons', r.vibrations, v => maj({ vibrations: v }))}
      {bascule('son', 'Sons', 'pas encore de sons dans le jeu', r.sons, v => maj({ sons: v }))}
      {bascule('anim', 'Réduire les animations', 's’ajoute au réglage du téléphone', r.animationsReduites, v => maj({ animationsReduites: v }))}

      <Label>Préférences</Label>
      <Row kind="white" icon="globe" leading={<ReglageTile name="langue" />} title="Langue" sub="mots et textes du jeu"
        trailing={(
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Tag label="Français" bg="#FFD45C" />
            <Pressable accessibilityRole="button" accessibilityLabel="Anglais, bientôt" hitSlop={6} onPress={() => toast.show('L’anglais arrive bientôt')}>
              <Tag label="Anglais · bientôt" bg="#F1EEFA" color={gameInkSoft} />
            </Pressable>
          </View>
        )} />
      <Row kind="white" icon="calendar" leading={<ReglageTile name="cloche" />} title="Rappel quotidien" sub="pour ne pas rater le mot du jour"
        trailing={<Tag label="bientôt" bg="#F1EEFA" color={gameInkSoft} />} onPress={() => toast.show('Bientôt disponible')}
        label="Rappel quotidien, bientôt disponible" />

      <Label>Ma partie</Label>
      <Row kind="white" icon="gear" leading={<ReglageTile name="revoir" />} title="Revoir l’introduction" sub="Nabulo te réexplique le jeu" onPress={revoirIntro} />
      <Row kind="white" icon="gear" leading={<ReglageTile name="reset" bg="#FFE3EA" />} title="Réinitialiser ma progression" sub="brez, séries, parties, réglages"
        onPress={() => setPanneau('reset')} />

      <Label>Nabulo</Label>
      <Row kind="white" icon="gear" leading={<ReglageTile name="info" />} title="À propos" sub={`version ${VERSION}`} onPress={() => setPanneau('apropos')} />
      <Row kind="white" icon="gear" leading={<ReglageTile name="cadenas" />} title="Confidentialité" sub="pas de compte, tout reste sur ton téléphone" onPress={() => setPanneau('confid')} />

      <Sheet visible={panneau !== null} onClose={() => setPanneau(null)}>
        {panneau === 'reset' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Image source={images.nabuloEmbete} style={{ width: 64, height: 64 }} contentFit="contain" accessibilityLabel="Nabulo embêté" />
              <View style={{ flex: 1 }}>
                <T size={22} weight={700} color={ink} style={{ lineHeight: 24 }}>Tout effacer ?</T>
                <T size={14} weight={600} color={gameInkSoft}>Brez, séries, parties en cours, duels et réglages repartent de zéro. Impossible de revenir en arrière.</T>
              </View>
            </View>
            <Button label="Réinitialiser ma progression" variant="yellow" border={2} color={ink} onPress={reinitialiser} />
            <Pressable accessibilityRole="button" accessibilityLabel="Annuler" onPress={() => setPanneau(null)} style={{ paddingTop: 4, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <T size={16} weight={700} color={gameInkSoft}>Annuler</T>
            </Pressable>
          </>
        )}
        {panneau === 'apropos' && (
          <Info titre="À propos" onClose={() => setPanneau(null)}>
            {`Nabulo, version ${VERSION}.\nUn jeu de mots chaud / froid : Nabulo s’emmêle les pinceaux, tu l’aides à retrouver son mot.`}
            {'\n\n'}
            {'Proximité des mots : modèle frWac de Jean-Philippe Fauconnier, sous licence Creative Commons CC-BY 3.0.'}
          </Info>
        )}
        {panneau === 'confid' && (
          <Info titre="Confidentialité" onClose={() => setPanneau(null)}>
            {'Pas de compte, pas de pseudo obligatoire, pas de pub ciblée.\n\n'}
            {'Tes parties, braises, séries et réglages sont enregistrés sur ce téléphone uniquement.\n\n'}
            {'Pour le mot du jour, tes propositions passent par notre serveur pour calculer leur température : aucune donnée personnelle n’est envoyée avec.'}
          </Info>
        )}
      </Sheet>
    </TabScreen>
  );
}

function Info({ titre, children, onClose }: { titre: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <T size={22} weight={700} color={ink} style={{ lineHeight: 24 }}>{titre}</T>
      <T size={15} weight={600} color={gameInkSoft}>{children}</T>
      <Button label="Fermer" variant="white" border={2} color={ink} onPress={onClose} />
    </>
  );
}
