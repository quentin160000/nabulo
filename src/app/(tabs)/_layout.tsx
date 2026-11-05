import { Tabs } from 'expo-router';
import { Easing, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBar, type Tab } from '@/ui/TabBar';

const ROUTES: Record<string, Tab> = { index: 'accueil', jeux: 'jeux', classement: 'classement', profil: 'profil' };
const NAMES: Record<Tab, string> = { accueil: 'index', jeux: 'jeux', classement: 'classement', profil: 'profil' };

/** Les 4 onglets : la barre reste fixe en bas ; l'écran glisse du côté de l'onglet choisi (vers la gauche si l'onglet est à gauche). */
export default function TabsLayout() {
  const inset = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: '#4B33B8' },
        // progress vaut -1 pour un onglet à gauche de l'onglet actif, 1 à droite : les deux écrans glissent ensemble
        animation: 'shift',
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: { transform: [{ translateX: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-width, 0, width] }) }] },
        }),
        transitionSpec: { animation: 'timing', config: { duration: 280, easing: Easing.out(Easing.cubic) } },
      }}
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
