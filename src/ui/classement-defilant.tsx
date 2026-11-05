import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import { animationsReduites } from '@/game/reglages';

type Props<R> = {
  rows: R[];
  /** Hauteur d'une ligne et écart entre deux lignes (px) : sert à boucler sans à-coup. */
  rowHeight: number; gap: number;
  renderRow: (row: R, index: number, key: string) => ReactNode;
  keyOf: (row: R) => string;
  /** Durée d'un tour complet de la liste (maquette : 28 s). */
  lap?: number;
  /** Délai avant le premier défilement automatique (ms). */
  startDelay?: number;
  /** Reprise du défilement automatique après un geste du joueur (ms). */
  resumeDelay?: number;
  accessibilityLabel?: string;
};

/**
 * Classement qui défile tout seul, lentement et en boucle (deux copies de la liste à la suite),
 * mais qu'on peut faire défiler au doigt à tout moment : le défilement automatique s'arrête
 * pendant le geste et reprend quelques secondes après, là où le joueur a laissé la liste.
 * « Réduire les animations » : simple liste à faire défiler, sans mouvement automatique.
 */
export function ClassementDefilant<R>({ rows, rowHeight, gap, renderRow, keyOf, lap = 28000, startDelay = 1600, resumeDelay = 3000, accessibilityLabel }: Props<R>) {
  const ref = useRef<ScrollViewInstance>(null);
  const [listH, setListH] = useState(0);
  const [reduce, setReduce] = useState<boolean | null>(null);
  const cycle = rows.length * (rowHeight + gap); // hauteur d'une copie, écart compris
  const loops = reduce === false && listH > 0 && cycle > listH + gap;
  const y = useRef(0); // position actuelle (geste ou automatique)
  const expected = useRef<number | null>(null); // dernière position imposée par le défilement automatique
  const pausedUntil = useRef(0);
  const touching = useRef(false);

  useEffect(() => {
    let alive = true;
    animationsReduites().then(r => { if (alive) setReduce(r); }).catch(() => { if (alive) setReduce(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!loops) return;
    const speed = cycle / lap; // px par ms
    let raf = 0;
    let last = 0;
    pausedUntil.current = Date.now() + startDelay;
    const step = (t: number) => {
      const dt = last ? Math.min(64, t - last) : 0;
      last = t;
      if (!touching.current && Date.now() >= pausedUntil.current) {
        let next = y.current + speed * dt;
        if (next >= cycle) next -= cycle; // la seconde copie est identique : on revient sur la première sans saut visible
        if (next < 0) next += cycle;
        y.current = next;
        expected.current = next;
        ref.current?.scrollTo({ y: next, animated: false });
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [loops, cycle, lap, startDelay]);

  const pause = () => { pausedUntil.current = Date.now() + resumeDelay; };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pos = e.nativeEvent.contentOffset.y;
    // un défilement qui ne vient pas de nous = un geste (doigt, molette, élan) : on attend avant de reprendre
    if (expected.current === null || Math.abs(pos - expected.current) > 1.5) pause();
    expected.current = null;
    y.current = pos;
  };

  return (
    <ScrollView
      ref={ref}
      style={{ flex: 1, borderRadius: 16 }}
      contentContainerStyle={{ gap }}
      onLayout={e => setListH(e.nativeEvent.layout.height)}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onTouchStart={() => { touching.current = true; pause(); }}
      onTouchEnd={() => { touching.current = false; pause(); }}
      onTouchCancel={() => { touching.current = false; pause(); }}
      onScrollBeginDrag={() => { touching.current = true; pause(); }}
      onScrollEndDrag={() => { touching.current = false; pause(); }}
      onMomentumScrollEnd={pause}
      showsVerticalScrollIndicator={false}
      accessibilityLabel={accessibilityLabel}
    >
      {rows.map((r, i) => renderRow(r, i, 'a' + keyOf(r)))}
      {loops && rows.map((r, i) => renderRow(r, i, 'b' + keyOf(r)))}
      {/* sans boucle : petit espace en bas pour que la dernière ligne ne colle pas au bord */}
      {!loops && <View style={{ height: 2 }} />}
    </ScrollView>
  );
}
