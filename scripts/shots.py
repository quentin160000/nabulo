"""Captures de l'appli (version web) pour comparer aux maquettes.

  npx expo export -p web           # construit dist/
  python3 scripts/serve_web.py dist &   # sert dist/ sur http://localhost:8099 (routes sans .html)
  python3 scripts/shots.py /jeux /classement --out design/rendus

Chaque route est capturée en 390×844 (taille des maquettes). Le stockage local est vidé, puis
l'onboarding marqué comme vu, sauf avec --onboarding.
"""
import argparse, os
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument('routes', nargs='+')
ap.add_argument('--out', default='design/rendus')
ap.add_argument('--onboarding', action='store_true')
ap.add_argument('--base', default='http://localhost:8099')
ap.add_argument('--wait', type=int, default=2500)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844})
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(a.base + '/'); pg.wait_for_timeout(800)
    pg.evaluate("() => localStorage.clear()")
    if not a.onboarding:
        pg.evaluate("() => localStorage.setItem('nabulo:onboarding-vu', 'true')")
    for r in a.routes:
        pg.goto(a.base + r); pg.wait_for_timeout(a.wait)
        name = (r.strip('/') or 'accueil').replace('/', '_')
        pg.screenshot(path=f'{a.out}/{name}.png'); print('capture', r, '->', f'{a.out}/{name}.png')
    if errors: print('ERREURS :', *errors, sep='\n  ')
    b.close()
