/** Couleurs et règles de la maquette (canvas « Jeu de mots feu-glace »). */
export const ink = '#2B2150';
/** Encre des écrans de jeu : hsl(256, 45 %, 16 %) dans la maquette. */
export const gameInk = '#20163B';
/** Encre adoucie des écrans de jeu : hsl(256, 28 %, 34 %). */
export const gameInkSoft = '#4B3E6F';
export const inkSoft = '#6B6290';
export const white = '#FFFFFF';
export const lavender = '#D9D1F2';
export const tagBg = '#F1EEFA';
export const meRow = '#FFF3B0';
/** Panneau clair des écrans de jeu : hsl(256, 66 %, 96 %). */
export const panel = '#F2EEFC';
/** Fond des sections des écrans de jeu : hsl(256, 66 %, 42 %). */
export const bgDeep = '#4A24B2';

export const violet = { deep: '#4B33B8', mid: '#6E4FE6', light: '#9A7BFF' };
export const yellow = { fill: '#FFD45C', fill2: '#F7C843', border: '#FFE38F', relief: '#E3A91C' };

/** Fond violet de l'appli (dégradé vertical). */
export const appGradient = [violet.deep, violet.mid, violet.light] as const;
export const appGradientStops = [0, 0.55, 1] as const;
/** Fond violet animé de l'accueil et de l'onboarding (il glisse lentement). */
export const slideGradient = ['#4B33B8', '#6E4FE6', '#7F55E8', '#9A5BD6', '#7F55E8', '#6E4FE6', '#4B33B8'] as const;
export const slideStops = [0, 0.2, 0.35, 0.5, 0.65, 0.8, 1] as const;
/** Fond chaud des victoires (il glisse). */
export const warmGradient = ['#4B33B8', '#6E4FE6', '#C24A9A', '#FF7A3C', '#FFB13D', '#C24A9A', '#4B33B8'] as const;
export const warmStops = [0, 0.18, 0.36, 0.52, 0.62, 0.78, 1] as const;
/** Fond aluminium (accueil, boutique, panneaux du bas). */
export const alu = ['#D3D6DB', '#EDEEF1', '#C8CBD1', '#E1E3E7', '#CACDD3'] as const;
export const aluStops = [0, 0.28, 0.55, 0.8, 1] as const;
/** Dégradé de la jauge de température. */
export const gaugeGradient = ['#5B8DEF', '#9AD8F5', '#FFC23D', '#FF5A36'] as const;
export const gaugeStops = [0, 0.35, 0.68, 1] as const;

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
