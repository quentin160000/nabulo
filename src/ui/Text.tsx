import { createContext, useContext, type ReactNode } from 'react';
import { StyleSheet, Text as RNText, type LayoutChangeEvent, type TextProps, type TextStyle } from 'react-native';
import { ink } from '@/theme/colors';

/**
 * Métriques de Fredoka (hhea = OS/2 typo, mesurées avec fontTools sur les .ttf 500/600/700) : ascendante 0,974 em,
 * descendante 0,236 em → boîte de 1,21 em, ligne de base à 0,974 em. Avec une hauteur de ligne de 1,21 em, le milieu des
 * capitales (0,974 − 0,35 = 0,624 em) tombe à 0,019 em du milieu de la boîte : le texte est centré verticalement, à
 * l'identique sur iOS, Android (sans marge de police) et le web.
 *
 * Encre réelle des glyphes (gras) : É/À/Â montent à 0,93 em, g/p/j/ç descendent à −0,23 em — tout tient dans la boîte
 * de 1,21 em, mais pas dans une boîte plus serrée ; « j » déborde de 0,13 em à gauche de sa chasse, « Î » de 0,08 em des
 * deux côtés, et l'ombre « outline » descend de 2 px sous la boîte.
 *
 * Pourquoi des lettres étaient coupées :
 * - iOS dessine le texte dans le calque de la vue : tout ce qui dépasse le cadre du Text (débord de « j », ombre sous
 *   les « g », accents quand la ligne est plus serrée que 1,21 em) est rogné. Une ligne plus basse que 1,21 em est en
 *   plus calée en bas sur iOS (pas de décalage de ligne de base), donc les accents sautent.
 * - Android et le web centrent une ligne serrée (demi-interligne négatif) : les accents et les jambages sortent alors
 *   de la boîte et sont rognés par tout parent `overflow: 'hidden'` (bulles, boutons, boîtes de mot).
 *
 * Correction, ici une fois pour toutes :
 * 1. hauteur de ligne jamais sous ⌈1,21 em⌉ ; une hauteur demandée plus petite (titres serrés des maquettes) est
 *    rendue par des marges négatives symétriques, donc la boîte occupée et le centrage restent ceux de la maquette ;
 * 2. une marge de dessin verticale autour du texte : padding + marge négative égale. La mise en page ne bouge pas
 *    d'un pixel, mais la vue est assez haute pour contenir l'encre réelle des glyphes et l'ombre ;
 * 3. horizontalement, seulement un padding pour les mots qui commencent ou finissent par j/î/ï (voir plus bas).
 */
export const LINE = 1.21;
/** Débord horizontal maximal des glyphes de Fredoka hors de leur chasse (« j » gras : 0,132 em). */
const SIDE = 0.14;
/** Marge verticale de sécurité (glyphes rares jusqu'à 0,998 em, arrondis de pixels). */
const EDGE = 0.06;

const FAMILY = { 500: 'Fredoka_500Medium', 600: 'Fredoka_600SemiBold', 700: 'Fredoka_700Bold' } as const;

type Props = TextProps & { size?: number; weight?: 500 | 600 | 700; color?: string; outline?: boolean; align?: TextStyle['textAlign'] };

/** Vrai à l'intérieur d'un T : un T imbriqué est un fragment de texte, sans boîte propre. */
const Nested = createContext(false);

const num = (...v: unknown[]) => {
  for (const x of v) if (x !== undefined && x !== null) return typeof x === 'number' ? x : NaN;
  return 0;
};

/** Espace insécable avant ! ? : ; » et après « : jamais de ponctuation seule en début de ligne. */
const NBSP = (t: string) => t.replace(/ ([!?:;»])/g, '\u00A0$1').replace(/« /g, '«\u00A0');
const insecable = (c: ReactNode): ReactNode =>
  typeof c === 'string' ? NBSP(c) : Array.isArray(c) ? c.map(x => (typeof x === 'string' ? NBSP(x) : x)) : c;

/** Hauteur de ligne naturelle de Fredoka, arrondie vers le haut comme Android (`CustomLineHeightSpan`). */
export const lineFor = (size: number) => Math.ceil(size * LINE);

/** Texte Fredoka. `outline` = texte blanc avec l'ombre encre de la maquette. */
export function T({ size = 16, weight = 600, color, outline, align, style, onLayout, children, ...rest }: Props) {
  const kids = insecable(children);
  const nested = useContext(Nested);
  const s: TextStyle = StyleSheet.flatten(style) ?? {};
  const fontSize = typeof s.fontSize === 'number' ? s.fontSize : size;
  const natural = lineFor(fontSize);
  const asked = typeof s.lineHeight === 'number' ? s.lineHeight : natural;
  const lineHeight = Math.max(asked, natural);

  const base: TextStyle = {
    fontFamily: FAMILY[weight], fontSize: size, color: color ?? (outline ? '#FFFFFF' : ink), textAlign: align,
    includeFontPadding: false, textAlignVertical: 'center',
    ...(outline ? { textShadowColor: ink, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 } : null),
  };
  const merged: TextStyle = { ...base, ...s, lineHeight };

  // Fragment imbriqué : pas de `textAlignVertical` (sur le web il devient `vertical-align: middle` et décale le
  // fragment sous la ligne de base du texte parent).
  if (nested) return <RNText {...rest} onLayout={onLayout} style={{ ...merged, textAlignVertical: undefined }}>{kids}</RNText>;

  // Boîtes peintes (fond, bordure) : agrandir la vue se verrait, on garde le comportement simple.
  const painted = s.backgroundColor !== undefined || s.borderWidth !== undefined || s.borderTopWidth !== undefined || s.borderBottomWidth !== undefined;
  const sh = merged.textShadowOffset ?? { width: 0, height: 0 };
  const blur = merged.textShadowRadius ?? 0;
  const v = painted ? 0 : Math.ceil(fontSize * EDGE);
  const top = v + Math.max(0, -(sh.height ?? 0)) + blur;
  const bottom = v + Math.max(0, sh.height ?? 0) + blur;

  const fixedH = s.height !== undefined;
  // Ligne serrée demandée : la boîte de mise en page reste de `asked` px, centrée sur la ligne naturelle.
  const squeeze = fixedH || painted ? 0 : (lineHeight - asked) / 2;

  const box: { -readonly [K in keyof TextStyle]: TextStyle[K] } = {};
  // Axe vertical
  const mt = num(s.marginTop, s.marginVertical, s.margin), mb = num(s.marginBottom, s.marginVertical, s.margin);
  const pt = num(s.paddingTop, s.paddingVertical, s.padding), pb = num(s.paddingBottom, s.paddingVertical, s.padding);
  const vOk = [mt, mb, pt, pb].every(Number.isFinite) && ['minHeight', 'maxHeight', 'height'].every(k => typeof s[k as 'height'] !== 'string');
  let dy = { top: 0, bottom: 0 };
  if (vOk && (top || bottom || squeeze)) {
    box.paddingTop = pt + top; box.paddingBottom = pb + bottom;
    box.marginTop = mt - top - squeeze; box.marginBottom = mb - bottom - squeeze;
    for (const k of ['height', 'minHeight', 'maxHeight'] as const) if (typeof s[k] === 'number') box[k] = (s[k] as number) + top + bottom;
    dy = { top, bottom };
  }
  // Axe horizontal : pas de marge négative (elle rétrécit les boîtes qui s'ajustent à leur texte et provoque des
  // « … »). Seuls j, î, ï, Î, Ï débordent de leur chasse : quand le texte commence ou finit par l'un d'eux, on ajoute un
  // padding symétrique (le centrage est conservé, la boîte s'élargit de quelques px pour ces mots seulement).
  const pl = num(s.paddingLeft, s.paddingHorizontal, s.padding), pr = num(s.paddingRight, s.paddingHorizontal, s.padding);
  const txt = typeof kids === 'string' ? kids : Array.isArray(kids) && kids.every(x => typeof x === 'string' || typeof x === 'number') ? kids.join('') : '';
  const overhang = /^[jîïÎÏ]|[îïÎÏ]$/.test(txt.trim());
  const side = painted || !overhang ? 0 : Math.ceil(fontSize * SIDE);
  if (side && Number.isFinite(pl) && Number.isFinite(pr) && s.paddingStart === undefined && s.paddingEnd === undefined) {
    box.paddingLeft = pl + side; box.paddingRight = pr + side;
  }

  // onLayout voit la boîte de mise en page, sans la marge de dessin.
  const layout = onLayout && (dy.top || dy.bottom)
    ? (e: LayoutChangeEvent) => {
      const l = e.nativeEvent.layout;
      onLayout({ ...e, nativeEvent: { ...e.nativeEvent, layout: { ...l, y: l.y + dy.top, height: l.height - dy.top - dy.bottom } } });
    }
    : onLayout;

  return (
    <Nested.Provider value>
      <RNText {...rest} onLayout={layout} style={[merged, box]}>{kids}</RNText>
    </Nested.Provider>
  );
}
