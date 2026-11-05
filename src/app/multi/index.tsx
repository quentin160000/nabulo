import { router } from 'expo-router';
import { Label, Row, TabScreen } from '@/ui/onglets-bits';
import { useToast } from '@/ui/Toast';

export default function Multi() {
  const toast = useToast();
  return (
    <TabScreen title="Multi" back tab="accueil" toast={toast.msg}>
      <Label>Coop · à 2</Label>
      <Row kind="multi" icon="multi" title="4 mots + mot-indice" sub="l’un donne un indice, l’autre devine" onPress={() => router.push('/coop/quatre-mots')} />
      <Row kind="multi" icon="multi" title="Synchro" sub="pensez au même mot" onPress={() => router.push('/coop/synchro')} />
      <Label>Groupe · 3 et plus</Label>
      <Row kind="multi" icon="multi" title="Le bluff · l’imposteur" sub="un joueur a un mot différent" onPress={() => router.push('/multi/bluff')} />
      <Row kind="multi" icon="multi" title="Battle royale" sub="8 à 10 joueurs · élimination" onPress={() => router.push('/multi/battle-royale')} />
      <Row kind="white" icon="keyboard" title="Rejoindre un salon" sub="entre le code donné par un ami" onPress={() => toast.show('Bientôt disponible')} />
    </TabScreen>
  );
}
