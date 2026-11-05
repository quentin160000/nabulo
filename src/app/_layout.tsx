import { Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from '@expo-google-fonts/fredoka';
import { Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { engine } from '@/game/engine';
import { known } from '@/game/lexicon';
import { WalletProvider } from '@/game/wallet';
import { Loading } from '@/ui/Loading';

const VIOLET = '#4B33B8';
/** Thème de navigation : fond violet partout, pour qu'aucune transition ne laisse voir de blanc. */
const THEME = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: VIOLET, card: VIOLET } };

const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Prépare les mots (table du jour, lexique des mini-jeux) pendant l'écran de chargement. */
async function warmUp() {
  const start = Date.now();
  await pause(50);                                   // laisse l'écran s'afficher avant le calcul
  // réveille le serveur (ou construit la table locale) sans bloquer plus de 2,5 s si le réseau est lent
  await Promise.race([engine.guess('fr', engine.dayNumber(new Date()), 'feu').catch(() => {}), pause(2500)]);
  await pause(16);
  known('feu');
  const left = 1200 - (Date.now() - start);          // le temps de voir Nabulo faire un tour, sans traîner
  if (left > 0) await pause(left);
}

SplashScreen.preventAutoHideAsync();
// fond de la fenêtre native : c'est lui qu'on voit (en blanc par défaut) pendant les transitions et avant le premier rendu d'un écran
SystemUI.setBackgroundColorAsync(VIOLET).catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({ Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold, Inter_500Medium, Inter_700Bold });
  const [ready, setReady] = useState(false);
  // l'écran de démarrage natif reste affiché jusqu'à ce que Nabulo soit prêt à tourner (au plus 2 s), pour qu'il n'arrive pas après la jauge
  const [shown, setShown] = useState(false);
  const reveal = () => { if (!shown) { setShown(true); SplashScreen.hideAsync(); } };
  useEffect(() => {
    if (!loaded && !error) return;
    const t = setTimeout(() => { setShown(true); SplashScreen.hideAsync(); }, 2000);
    return () => clearTimeout(t);
  }, [loaded, error]);
  // la préparation des mots ne commence qu'une fois l'écran de chargement visible, et il reste au moins 1,2 s
  useEffect(() => { if (shown) warmUp().finally(() => setReady(true)); }, [shown]);
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: VIOLET }} />;
  if (!ready) return <SafeAreaProvider style={{ backgroundColor: VIOLET }}><StatusBar style="light" /><Loading onReady={reveal} /></SafeAreaProvider>;
  return (
    <SafeAreaProvider style={{ backgroundColor: VIOLET }}>
      <ThemeProvider value={THEME}>
      <WalletProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, animation: 'ios_from_right', contentStyle: { backgroundColor: VIOLET } }}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        </Stack>
      </WalletProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
