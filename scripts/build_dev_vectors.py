"""Vecteurs compacts pour les mini-jeux hors ligne (similarité entre deux mots quelconques).

Même vocabulaire et même ordre que assets/data/fr-dev.json. Vecteurs fastText (spaCy fr_core_news_md) normalisés,
projetés sur 160 axes (SVD, fidélité des voisins ≈ 0,94), puis codés en int8 par mot avec un facteur d'échelle.
Sortie : assets/data/fr-vec.json  {dim, scales (base64 float32), data (base64 int8)}

Usage : python scripts/build_dev_vectors.py
"""
import base64, json
from pathlib import Path
import numpy as np
import spacy

DIM = 160
root = Path(__file__).resolve().parent.parent
words = json.loads((root / 'assets/data/fr-dev.json').read_text())['words']
nlp = spacy.load('fr_core_news_md'); vec, S = nlp.vocab.vectors, nlp.vocab.strings
M = vec.data[[vec.key2row[S[w]] for w in words]].astype(np.float32)
M /= np.linalg.norm(M, axis=1, keepdims=True) + 1e-9
_, _, Vt = np.linalg.svd(M[np.random.RandomState(0).choice(len(M), min(8000, len(M)), replace=False)], full_matrices=False)
P = M @ Vt[:DIM].T
P /= np.linalg.norm(P, axis=1, keepdims=True) + 1e-9
scale = np.abs(P).max(1).astype(np.float32) / 127
Q = np.clip(np.round(P / scale[:, None]), -127, 127).astype(np.int8)
out = {'dim': DIM, 'count': len(words), 'scales': base64.b64encode(scale.tobytes()).decode(), 'data': base64.b64encode(Q.tobytes()).decode()}
dst = root / 'assets/data/fr-vec.json'
dst.write_text(json.dumps(out, separators=(',', ':')))
print(len(words), 'mots ×', DIM, '->', dst, round(dst.stat().st_size / 1e6, 2), 'Mo')
