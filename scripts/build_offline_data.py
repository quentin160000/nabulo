"""Données hors ligne de l'appli, à partir du modèle word2vec frWac (Fauconnier, 200 dimensions).

Sorties (même vocabulaire, même ordre : du mot le plus fréquent au moins fréquent) :
  assets/data/fr-dev.json : words + secrets (moteur local du mot du jour, utilisé sans Supabase) ;
                            pour chaque mot secret, la similarité de chaque mot codée sur 1 octet ((s+1)×127), en base64.
  assets/data/fr-vec.json : vecteurs normalisés en int8 avec une échelle par mot (lexique des mini-jeux, duels, aventure).

Usage : python scripts/build_offline_data.py scripts/data/frWac_non_lem_no_postag_no_phrase_200_cbow_cut100.bin [--words 25000]
"""
import argparse, base64, json, re, sys
from pathlib import Path
import numpy as np

SECRETS = ['braise', 'montagne', 'océan', 'cuisine', 'volcan', 'hiver', 'chat', 'forêt', 'musique', 'jardin',
           'soleil', 'neige', 'voyage', 'étoile', 'pluie', 'café', 'livre', 'plage', 'château', 'fleur',
           'train', 'pain', 'rivière', 'nuage', 'orage', 'désert', 'feu', 'glace', 'lune', 'ville']
WORD = re.compile(r"^[a-zàâäçéèêëîïôöùûüÿœæ]+(?:-[a-zàâäçéèêëîïôöùûüÿœæ]+)?$")

ap = argparse.ArgumentParser(); ap.add_argument('model'); ap.add_argument('--words', type=int, default=25000)
a = ap.parse_args()
root_dir = Path(__file__).resolve().parent.parent
# mots indispensables même s'ils sont rares : mots du jour, et tous les mots écrits en dur dans les jeux (listes, niveaux, paires)
required = set(SECRETS) | {l.strip() for l in open(root_dir / 'scripts' / 'secrets_fr.txt', encoding='utf-8') if l.strip()}
for ts in (root_dir / 'src' / 'game').glob('*.ts'):
    required |= set(re.findall(r"'([a-zàâäçéèêëîïôöùûüÿœæ-]{3,})'", ts.read_text(encoding='utf-8')))
required = {w.replace('œ', 'oe').replace('æ', 'ae') for w in required}
words, vecs = [], []
with open(a.model, 'rb') as f:
    n, dim = map(int, f.readline().split())
    for _ in range(n):
        w = bytearray()
        while True:
            c = f.read(1)
            if c == b' ' or not c: break
            if c != b'\n': w += c
        v = np.frombuffer(f.read(4 * dim), dtype=np.float32)
        s = w.decode('utf-8', errors='ignore')
        if WORD.match(s) and len(s) >= 2 and (len(words) < a.words or s in required):
            words.append(s); vecs.append(v)
M = np.vstack(vecs).astype(np.float32); M /= np.linalg.norm(M, axis=1, keepdims=True) + 1e-9
index = {w: i for i, w in enumerate(words)}
root = Path(__file__).resolve().parent.parent / 'assets' / 'data'

dev = {'lang': 'fr', 'source': 'word2vec frWac (Fauconnier)', 'words': words, 'secrets': {}}
for s in SECRETS:
    if s not in index: print('absent du vocabulaire :', s, file=sys.stderr); continue
    q = np.clip(np.round((M @ M[index[s]] + 1) * 127), 0, 254).astype(np.uint8)
    dev['secrets'][s] = base64.b64encode(q.tobytes()).decode()
(root / 'fr-dev.json').write_text(json.dumps(dev, ensure_ascii=False, separators=(',', ':')))

scale = (np.abs(M).max(1) / 127).astype(np.float32)
Q = np.clip(np.round(M / scale[:, None]), -127, 127).astype(np.int8)
vec = {'dim': int(M.shape[1]), 'count': len(words), 'scales': base64.b64encode(scale.tobytes()).decode(), 'data': base64.b64encode(Q.tobytes()).decode()}
(root / 'fr-vec.json').write_text(json.dumps(vec, separators=(',', ':')))
for f in ('fr-dev.json', 'fr-vec.json'): print(f, round((root / f).stat().st_size / 1e6, 2), 'Mo')
print(len(words), 'mots ×', M.shape[1], 'dimensions,', len(dev['secrets']), 'mots secrets')
