"""Construit les données du moteur local (développement hors ligne).

Source : vecteurs fastText élagués du modèle spaCy fr_core_news_md (20 000 mots les plus fréquents).
Sortie : assets/data/fr-dev.json
  - words   : vocabulaire accepté (minuscules, lettres, accents, tirets)
  - secrets : pour chaque mot secret, la similarité cosinus de chaque mot du vocabulaire, codée sur 1 octet
              (-1 → 0, +1 → 254) puis en base64, dans l'ordre de `words`.

Usage : pip install spacy fr_core_news_md ; python scripts/build_dev_data.py
"""
import base64, json, re, sys
from pathlib import Path
import numpy as np
import spacy

SECRETS = ['braise', 'montagne', 'océan', 'cuisine', 'volcan', 'hiver', 'chat', 'forêt', 'musique', 'jardin',
           'soleil', 'neige', 'voyage', 'étoile', 'pluie', 'café', 'livre', 'plage', 'château', 'fleur',
           'train', 'pain', 'rivière', 'nuage', 'orage', 'désert', 'feu', 'glace', 'lune', 'ville']
WORD = re.compile(r"^[a-zàâäçéèêëîïôöùûüÿœæ]+(?:-[a-zàâäçéèêëîïôöùûüÿœæ]+)?$")

nlp = spacy.load('fr_core_news_md')
vec, S = nlp.vocab.vectors, nlp.vocab.strings
kept = list(vec.key2row.items())[:vec.shape[0]]          # les 20 000 premières clés = mots conservés, par fréquence
words, rows = [], []
for key, row in kept:
    w = S[key]
    if WORD.match(w) and len(w) >= 2 and w not in words:
        words.append(w); rows.append(row)
# mots secrets absents des 20 000 : on reprend la ligne vers laquelle spaCy les a rattachés
for s in SECRETS:
    if s not in words and nlp.vocab[s].has_vector:
        words.append(s); rows.append(vec.key2row[S[s]])
M = vec.data[rows].astype(np.float32)
M /= np.linalg.norm(M, axis=1, keepdims=True) + 1e-9
index = {w: i for i, w in enumerate(words)}
out = {'lang': 'fr', 'source': 'fastText (spaCy fr_core_news_md)', 'words': words, 'secrets': {}}
for s in SECRETS:
    if s not in index: print('absent du vocabulaire :', s, file=sys.stderr); continue
    sims = M @ M[index[s]]
    q = np.clip(np.round((sims + 1) * 127), 0, 254).astype(np.uint8)
    out['secrets'][s] = base64.b64encode(q.tobytes()).decode()
dst = Path(__file__).resolve().parent.parent / 'assets' / 'data' / 'fr-dev.json'
dst.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
print(len(words), 'mots,', len(out['secrets']), 'mots secrets ->', dst, round(dst.stat().st_size / 1e6, 2), 'Mo')
