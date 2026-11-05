import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOTAL, reussi } from '@/game/aventure';
import { minSec, useProgression, useVies } from '@/game/aventure-etat';
import { useWallet } from '@/game/wallet';
import { AventureNav, MAP_H, MAP_W, MapBubble, MapDecor, MapPath, MapTargets, MapTopBar, PlayButton, nodeY, type EtatNiveau } from '@/ui/aventure-carte';
import { Toast, useToast } from '@/ui/Toast';

/* Aventure (V2) · Carte des 5 mondes (planches A1-Carte … A5-Carte). */

export default function Carte() {
  const { width, height } = useWindowDimensions();
  const inset = useSafeAreaInsets();
  const { p, ready } = useProgression();
  const vies = useVies();
  const { braises } = useWallet();
  const toast = useToast(2600);
  const scroll = useRef<ScrollViewInstance>(null);
  const [vue, setVue] = useState(0);

  const W = width, H = (W * MAP_H) / MAP_W, k = W / MAP_W;
  const fini = reussi(p, TOTAL);
  const actuel = p.atteint;
  const etat = useCallback((n: number): EtatNiveau => (n < actuel || (n === actuel && fini) ? 'fait' : n === actuel ? 'actuel' : 'verrou'), [actuel, fini]);

  // la carte s'ouvre sur le niveau actuel (le haut de la pastille vers le milieu de l'écran)
  useEffect(() => {
    if (!ready || !vue) return;
    const y = Math.max(0, Math.min(H - vue, nodeY(actuel) * k - vue * 0.55));
    const id = requestAnimationFrame(() => scroll.current?.scrollTo({ y, animated: false }));
    return () => cancelAnimationFrame(id);
  }, [ready, vue, actuel, H, k]);

  const jouer = (n: number) => {
    if (etat(n) === 'verrou') { toast.show(`Termine d’abord le niveau ${actuel}`); return; }
    if (vies.n <= 0) { toast.show(`Plus de vies · prochaine dans ${vies.prochaine ? minSec(vies.prochaine) : '30:00'}`); return; }
    router.push(`/aventure/niveau?n=${n}` as Href);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#232B66' }} onLayout={e => setVue(e.nativeEvent.layout.height || height)}>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ height: H }} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={{ width: W, height: H }}>
          <MapDecor width={W} />
          <MapPath width={W} actuel={actuel} etat={etat} />
          <MapTargets width={W} etat={etat} onPress={jouer} />
          {!fini && <MapBubble width={W} n={actuel} />}
        </View>
      </ScrollView>
      <MapTopBar top={inset.top} n={actuel} vies={vies.n} prochaine={vies.prochaine ? minSec(vies.prochaine) : null} braises={braises}
        onVies={() => toast.show(vies.prochaine ? `${vies.n} vies · prochaine dans ${minSec(vies.prochaine)}` : 'Toutes tes vies sont là')} />
      <PlayButton n={actuel} bottom={100 + inset.bottom} onPress={() => jouer(actuel)} />
      <AventureNav bottom={12 + inset.bottom} />
      <Toast msg={toast.msg} check={false} style={{ top: inset.top + 76 }} />
    </View>
  );
}
