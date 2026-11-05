import { useCallback, useEffect, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { gameInk } from '@/theme/colors';
import { Bubble } from './Bubble';
import { Icon } from './bits';
import { T } from './Text';

/** Bandeau sombre de confirmation (« Indice offert, merci ! »), qui disparaît seul. */
export function useToast(duration = 2200) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), duration);
  }, [duration]);
  const hide = useCallback(() => setMsg(null), []);
  return { msg, show, hide };
}

export function Toast({ msg, style, check = true }: { msg: string | null; style?: StyleProp<ViewStyle>; check?: boolean }) {
  if (!msg) return null;
  return (
    <View pointerEvents="none" accessibilityLiveRegion="polite" style={[{ position: 'absolute', left: 16, right: 16, zIndex: 5 }, style]}>
      <Bubble bg={gameInk} radius={18} inset={5} style={{ paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {check && <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#5BD67A', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={14} color="#FFFFFF" /></View>}
        <T size={15} weight={600} color="#FFFFFF" style={{ flex: 1 }}>{msg}</T>
      </Bubble>
    </View>
  );
}
