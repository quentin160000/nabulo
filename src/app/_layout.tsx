import { Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from '@expo-google-fonts/fredoka';
import { Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { engine } from '@/game/engine';
import { known } from '@/game/lexicon';
import { WalletProvider } from '@/game/wallet';
import { Loading } from '@/ui/Loading';

const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Prépare les mots (table du jour, lexique des mini-jeux) pendant l'écran de chargement. */
async function warmUp() {
  const start = Date.now();
  await pause(50);                                   // laisse l'écran s'afficher avant le calcul
  await engine.guess('fr', engine.dayNumber(new Date()), 'feu').catch(() => {});
  await pause(16);
  known('feu');
  const left = 1200 - (Date.now() - start);          // le temps de voir Nabulo faire un tour, sans traîner
  if (left > 0) await pause(left);
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({ Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold, Inter_500Medium, Inter_700Bold });
  const [ready, setReady] = useState(false);
  useEffect(() => { if (loaded || error) SplashScreen.hideAsync(); }, [loaded, error]);
  useEffect(() => { if (loaded || error) warmUp().finally(() => setReady(true)); }, [loaded, error]);
  if (!loaded && !error) return null;
  if (!ready) return <SafeAreaProvider><StatusBar style="light" /><Loading /></SafeAreaProvider>;
  return (
    <SafeAreaProvider>
      <WalletProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        </Stack>
      </WalletProvider>
    </SafeAreaProvider>
  );
}
