import { useState } from 'react';
import { View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { gameInk } from '@/theme/colors';
import { T } from './Text';

/*
 * Case de mot qui ne coupe jamais le mot.
 *
 * `adjustsFontSizeToFit` + `numberOfLines={1}` coupait la première ou la dernière lettre : le web l'ignore (le texte
 * déborde puis `overflow: hidden` le rogne), iOS réduit parfois trop peu, et les lettres grasses de Fredoka dépassent
 * de leur chasse (la boîte du texte coupe ce dépassement). Ici on mesure le mot une fois à une taille de référence,
 * on en déduit la taille qui tient dans la place disponible, et on laisse une petite marge de chaque côté du texte.
 */

const REF = 50;            // taille de mesure
const MARGE = 0.97;        // on vise 97 % de la place

type Props = {
  mot: string;
  /** Taille maximale (celle de la maquette). */
  size: number;
  /** Taille minimale (le mot est alors coupé par « … » plutôt que rogné). */
  min?: number;
  weight?: 500 | 600 | 700;
  color?: string;
  align?: 'center' | 'left';
  /** Hauteur de ligne prévue pour `size` ; mise à l'échelle avec la taille retenue. */
  lineHeight?: number;
  letterSpacing?: number;
  /** Style du conteneur (qui prend toute la largeur que son parent lui donne). */
  style?: StyleProp<ViewStyle>;
  /** Boîte autour du mot (fond blanc qui épouse le mot) ; `retrait` = sa marge intérieure + contour horizontaux. */
  boite?: StyleProp<ViewStyle>;
  retrait?: number;
  /** Style ajouté au texte (ombres…). */
  styleTexte?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

export function MotAjuste({ mot, size, min = 12, weight = 700, color = gameInk, align = 'center', lineHeight, letterSpacing, style, boite, retrait = 0, styleTexte, accessibilityLabel }: Props) {
  const [dispo, setDispo] = useState(0);
  const [mesure, setMesure] = useState<{ mot: string; w: number } | null>(null);
  const pad = Math.ceil(size * 0.08) + 1;   // place pour les lettres qui dépassent de leur chasse
  const pret = dispo > 0 && mesure?.mot === mot && mesure.w > 0;
  let fs = size;
  if (pret) {
    const place = Math.max(0, dispo - retrait - 2 * pad);
    const ls = letterSpacing ? letterSpacing * mot.length : 0;
    fs = Math.max(min, Math.min(size, Math.floor(((place - ls) * REF / mesure.w) * MARGE * 2) / 2));
  }
  const lh = lineHeight ? Math.round(lineHeight * fs / size) : undefined;
  const texte = (
    <T size={fs} weight={weight} color={color} numberOfLines={1} accessibilityLabel={accessibilityLabel}
      style={[{ paddingHorizontal: pad, maxWidth: '100%' }, lh ? { lineHeight: lh } : null, letterSpacing ? { letterSpacing } : null, styleTexte]}>
      {mot}
    </T>
  );
  return (
    <View onLayout={e => setDispo(e.nativeEvent.layout.width)}
      style={[{ alignSelf: 'stretch', alignItems: align === 'center' ? 'center' : 'flex-start', opacity: pret ? 1 : 0 }, style]}>
      {/* mesure hors écran, à taille fixe, sans limite de largeur */}
      <View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'hidden' }}>
        <View style={{ width: 4000, flexDirection: 'row', alignItems: 'flex-start' }}>
          <T key={mot} size={REF} weight={weight} onLayout={e => { const w = e.nativeEvent.layout.width; setMesure(m => (m?.mot === mot && m.w === w ? m : { mot, w })); }}>{mot}</T>
        </View>
      </View>
      {boite ? <View style={[{ maxWidth: '100%' }, boite]}>{texte}</View> : texte}
    </View>
  );
}
