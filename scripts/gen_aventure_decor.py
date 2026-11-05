"""Génère src/ui/aventure-decor.ts à partir des maquettes A1-Carte et Niveaux-Parcours."""
import re, base64, json, random

ROOT = '/home/claude/code/thermo-mot'
s = open(f'{ROOT}/design/maquettes/A1-Carte.dc.html').read()
big = max(re.findall(r'<svg.*?</svg>', s, flags=re.S), key=len)
cut = big.index('<path d="M195.0 2460.0')
decor = big[:cut] + '</svg>'
# texte détouré : paint-order n'est pas géré par react-native-svg → contour puis remplissage
def text_fix(m):
    attrs, body = m.group(1), m.group(2)
    attrs = re.sub(r'font-family="[^"]*"', 'font-family="Fredoka_700Bold"', attrs)
    attrs = attrs.replace(' paint-order="stroke"', '')
    fill_only = re.sub(r' stroke="[^"]*"', '', attrs)
    fill_only = re.sub(r' stroke-width="[^"]*"', '', fill_only)
    stroke_l = re.sub(r'fill="[^"]*"', 'fill="#2B2150" stroke-linejoin="round"', attrs)
    return f'<text{stroke_l}>{body}</text><text{fill_only}>{body}</text>'
decor = re.sub(r'<text([^>]*)>([^<]*)</text>', text_fix, decor)
decor = re.sub(r'\s+aria-hidden="true"', '', decor)
decor = re.sub(r' style="display: block"', '', decor)
decor = re.sub(r'>\s+<', '><', decor)

rest = big[cut:]
d = re.search(r'<path d="([^"]+)"', rest).group(1)
start = re.match(r'M([\d.]+) ([\d.]+)', d)
segs = re.findall(r'C[^C]+', d)
segs = [x.strip() for x in segs]
nodes = [(float(start.group(1)), float(start.group(2)))]
for sg in segs:
    nums = re.findall(r'-?[\d.]+', sg)
    nodes.append((float(nums[-2]), float(nums[-1])))
assert len(nodes) == 30, len(nodes)

# fonds des niveaux (mondes 1 à 4)
n = open(f'{ROOT}/design/maquettes/Niveaux-Parcours.dc.html').read()
bgs = []
for m in re.finditer(r'url\((?:&quot;|"|\')?data:image/svg\+xml;base64,([^)"\'&]+)', n):
    if m.group(1) not in bgs: bgs.append(m.group(1))
bgs = [base64.b64decode(b).decode() for b in bgs]
bgs = [re.sub(r"\s*preserveAspectRatio='[^']*'", '', b) for b in bgs]

# monde 5 (volcan au crépuscule) : même écriture que les autres fonds
r = random.Random(5)
parts = []
for _ in range(60):
    x, y, k = r.randint(0, 300), r.randint(0, 540), r.choice([1, 2, 3])
    parts.append(f'<path d="M{x}.0 {y}.0 q1 {k}.0 {k+1}.0 {k+1}.0 q-{k}.0 1 -{k+1}.0 {k+1}.0 q-1 -{k}.0 -{k+1}.0 -{k+1}.0 q{k}.0 -1 {k+1}.0 -{k+1}.0 z" fill="#FFE6C7" opacity="{r.uniform(.55,.95):.2f}"/>')
for _ in range(26):
    x, y = r.randint(0, 300), r.randint(0, 540)
    parts.append(f'<circle cx="{x}.0" cy="{y}.0" r="2.0" fill="#FFB35C" opacity="0.85"/><circle cx="{x}.0" cy="{y}.0" r="0.9" fill="#FFE070"/>')
for (x, y, sc) in [(40, 230, .9), (262, 300, .8), (250, 120, 1.1), (60, 420, 1.2)]:
    parts.append(f'<g transform="translate({x}.0 {y}.0) scale({sc})" opacity="0.6"><path d="M-40 10 a14 14 0 0 1 4 -24 a18 18 0 0 1 30 -10 a20 20 0 0 1 34 6 a14 14 0 0 1 14 28 z" fill="#8E7A9E" stroke-linejoin="round"/><path d="M-30 4 h52" stroke="#DCEBFA" stroke-width="4.2" stroke-linecap="round" opacity="0.8"/></g>')
for (x, y) in [(150, 470), (40, 360), (200, 260), (90, 160)]:
    parts.append(f'<path d="M{x}.0 {y}.0 q6 -6 12 0 t12 0 t12 0" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.45"/>')
bgs.append("<svg xmlns='http://www.w3.org/2000/svg' width='300' height='540' viewBox='0 0 300 540'>" + ''.join(parts) + '</svg>')

out = ['/* Fichier généré à partir des maquettes A1-Carte et Niveaux-Parcours : ne pas modifier à la main. */', '']
out.append('export const MAP_W = 390, MAP_H = 2650;')
out.append('/** Décor de la carte (ciel des 5 mondes, îles, nuages, étiquettes), sans le chemin ni les niveaux. */')
out.append('export const MAP_XML = ' + json.dumps(decor, ensure_ascii=False) + ';')
out.append('/** Centre de chaque niveau (1 à 30) sur la carte. */')
out.append('export const NODES: readonly (readonly [number, number])[] = ' + json.dumps([[round(a, 1), round(b, 1)] for a, b in nodes]) + ';')
out.append('/** Courbes du chemin : la n-ième va du niveau n au niveau n + 1. */')
out.append('export const SEGMENTS: readonly string[] = ' + json.dumps(segs) + ';')
out.append('/** Fonds des écrans de niveau (300 × 540, recadrés pour couvrir l’écran), monde 1 à 5. */')
out.append('export const LEVEL_BG_XML: readonly string[] = ' + json.dumps(bgs, ensure_ascii=False) + ';')
open(f'{ROOT}/src/ui/aventure-decor.ts', 'w').write('\n'.join(out) + '\n')
print(len(decor), nodes[:3], len(bgs))
