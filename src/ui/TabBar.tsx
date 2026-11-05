import { Pressable, Text, View } from 'react-native';
import { Icon } from './bits';

export type Tab = 'accueil' | 'jeux' | 'classement' | 'profil';
const TABS: { id: Tab; label: string; icon: 'home' | 'grid' | 'trophy' | 'user' }[] = [
  { id: 'accueil', label: 'Accueil', icon: 'home' },
  { id: 'jeux', label: 'Jeux', icon: 'grid' },
  { id: 'classement', label: 'Classement', icon: 'trophy' },
  { id: 'profil', label: 'Profil', icon: 'user' },
];

/** Barre d'onglets flottante du bas (blanche, onglet actif sur fond lavande). */
export function TabBar({ active, onPress }: { active?: Tab; onPress?: (t: Tab) => void }) {
  return (
    <View accessibilityRole="tablist" style={{ padding: 6, gap: 4, flexDirection: 'row', borderRadius: 26, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E4EF', boxShadow: '0 6px 20px rgba(30,20,70,0.14)' }}>
      {TABS.map(t => {
        const on = t.id === active;
        const color = on ? '#1A1530' : '#8A8499';
        return (
          <Pressable key={t.id} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.label} onPress={() => onPress?.(t.id)}
            style={{ flex: 1, alignItems: 'center', gap: 1, paddingTop: 5, paddingBottom: 6, borderRadius: 20, backgroundColor: on ? '#EFECF7' : 'transparent' }}>
            <View style={{ width: 44, height: 30, alignItems: 'center', justifyContent: 'center' }}><Icon name={t.icon} size={24} color={color} width={on ? 2.2 : 1.8} /></View>
            <Text style={{ fontFamily: on ? 'Inter_700Bold' : 'Inter_500Medium', fontSize: 11, color }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
