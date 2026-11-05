import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBar, type Tab } from '@/ui/TabBar';

const ROUTES: Record<string, Tab> = { index: 'accueil', jeux: 'jeux', classement: 'classement', profil: 'profil' };
const NAMES: Record<Tab, string> = { accueil: 'index', jeux: 'jeux', classement: 'classement', profil: 'profil' };

/** Les 4 onglets : la barre reste fixe en bas, l'écran change en fondu (sans écran blanc ni glissement). */
export default function TabsLayout() {
  const inset = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: 'fade', sceneStyle: { backgroundColor: 'transparent' } }}
      tabBar={({ state, navigateToTab }) => {
        const active = ROUTES[state.routes[state.index].name];
        return (
          <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: inset.bottom + 12 }}>
            <TabBar active={active} onPress={t => { const r = state.routes.find(x => x.name === NAMES[t]); if (r && t !== active) navigateToTab(r.key); }} />
          </View>
        );
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="jeux" />
      <Tabs.Screen name="classement" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
