import { useEffect, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { mix } from '@/theme/colors';
import { T } from './Text';
import { INK } from './coop-kit';

/* Cadran « de synchro » de la planche J-coop-21 (220 px, arc de 270° de 0 à 100°). */
const C = 110, R = 84, START = 135, SPAN = 270;
const pt = (deg: number, r = R) => [C + r * Math.cos((deg * Math.PI) / 180), C + r * Math.sin((deg * Math.PI) / 180)] as const;
const arc = (p: number) => {
  const [x0, y0] = pt(START), [x1, y1] = pt(START + SPAN * p);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${SPAN * p > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};
const TICKS = Array.from({ length: 9 }, (_, i) => START + 27 + i * 27);

export function SynchroDial({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0, alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (!alive) return;
      if (reduce) { setShown(value); return; }
      const t0 = Date.now();
      const step = () => {
        const k = Math.min(1, (Date.now() - t0) / 1100), e = 1 - Math.pow(1 - k, 3);
        setShown(Math.round(value * e));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [value]);
  const p = Math.max(0, Math.min(1, shown / 100));
  const [kx, ky] = pt(START + SPAN * p);
  return (
    <View accessibilityRole="image" accessibilityLabel={`${value} degrés de synchro`} style={{ alignSelf: 'center', width: 220, height: 220, marginTop: -4, marginBottom: -18 }}>
      <Svg width={220} height={220} viewBox="0 0 220 220">
        <Defs>
          <LinearGradient id="sync-g" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor="#5B8DEF" /><Stop offset=".35" stopColor="#9AD8F5" /><Stop offset=".65" stopColor="#FFC23D" /><Stop offset="1" stopColor="#FF5A36" />
          </LinearGradient>
        </Defs>
        <Path d={arc(1)} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={20} strokeLinecap="round" />
        {p > 0.004 ? <Path d={arc(p)} fill="none" stroke="url(#sync-g)" strokeWidth={20} strokeLinecap="round" /> : null}
        {TICKS.map((a, i) => {
          const major = i === 4, [x0, y0] = pt(a, 99), [x1, y1] = pt(a, major ? 105 : 103);
          return <Line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#FFFFFF" strokeOpacity={major ? 0.8 : 0.45} strokeWidth={major ? 2.5 : 1.8} strokeLinecap="round" />;
        })}
        <Circle cx={kx} cy={ky} r={14} fill="#FFFFFF" stroke="#FF7A3C" strokeWidth={5} />
        <Circle cx={110} cy={115} r={60} fill={mix('#FFFFFF', 84, '#3A2A7A')} />
        <Circle cx={110} cy={110} r={60} fill="#FFFFFF" />
        <SvgText x={29.4} y={194.6} textAnchor="middle" fontFamily="Fredoka_700Bold" fontSize={13} fill="#FFFFFF" fillOpacity={0.85}>0°</SvgText>
        <SvgText x={190.6} y={194.6} textAnchor="middle" fontFamily="Fredoka_700Bold" fontSize={13} fill="#FFFFFF" fillOpacity={0.85}>100°</SvgText>
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', left: 50, top: 50, width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
        <T size={50} weight={700} color={INK} style={{ lineHeight: 50 }}>{shown}°</T>
        <T size={13} weight={700} color={INK} style={{ opacity: 0.6, marginTop: 2 }}>de synchro</T>
      </View>
    </View>
  );
}
