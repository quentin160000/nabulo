/** Couleurs et règles de la maquette (canvas « Jeu de mots feu-glace »). */
export const ink = '#2B2150';
export const inkSoft = '#6B6290';
export const white = '#FFFFFF';
export const lavender = '#D9D1F2';
export const tagBg = '#F1EEFA';
export const meRow = '#FFF3B0';

export const violet = { deep: '#4B33B8', mid: '#6E4FE6', light: '#9A7BFF' };
export const yellow = { fill: '#FFD45C', fill2: '#F7C843', border: '#FFE38F', relief: '#E3A91C' };

/** Fond violet de l'appli. */
export const appGradient = [violet.deep, violet.mid, violet.light] as const;
/** Fond chaud des victoires (il glisse). */
export const warmGradient = ['#4B33B8', '#6E4FE6', '#C24A9A', '#FF7A3C', '#FFB13D', '#C24A9A', '#4B33B8'] as const;
/** Fond froid des défaites (avec la pluie). */
export const coldGradient = ['#3B3F8C', '#4A5AA8', '#5E7BBE', '#8FA6D6', '#4A5AA8', '#3B3F8C'] as const;

/** Mélange deux couleurs hexadécimales : équivalent de color-mix(in srgb, a p%, b). */
export function mix(a: string, p: number, b: string): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (v: number, s: number) => (v >> s) & 255;
  const m = (s: number) => Math.round(ch(pa, s) * p / 100 + ch(pb, s) * (1 - p / 100));
  return '#' + [16, 8, 0].map(s => m(s).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Règle des bulles : contour plus clair que le fond, coupe en biais, relief enfoncé en bas. */
export function bubble(bg: string) {
  const isWhite = bg.toUpperCase() === '#FFFFFF';
  return {
    border: isWhite ? lavender : mix(bg, 55, '#FFFFFF'),
    diag: mix(bg, 95, '#3A2A7A'),
    relief: mix(bg, 84, '#3A2A7A'),
  };
}
