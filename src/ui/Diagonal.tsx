import { View } from 'react-native';
import Svg, { Polygon, Rect } from 'react-native-svg';

/**
 * Fond des bulles : moitié haut-gauche couleur pleine, moitié bas-droite un peu plus sombre,
 * la coupe allant exactement du coin haut droit au coin bas gauche, quelle que soit la forme.
 */
/** Relief enfoncé du bas, dessiné au-dessus du fond (une ombre intérieure sur le parent serait masquée par le fond en SVG). */
export function Relief({ inset, color, radius }: { inset: number; color: string; radius: number }) {
  return <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: radius, boxShadow: `inset 0 -${inset}px 0 ${color}` }} />;
}

export function Diagonal({ bg, diag }: { bg: string; diag: string }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Rect x={0} y={0} width={100} height={100} fill={bg} />
        <Polygon points="100,0 100,100 0,100" fill={diag} />
      </Svg>
    </View>
  );
}
