"""Charge le vocabulaire, le programme des mots du jour et leurs voisins dans Supabase.

À lancer depuis ton ordinateur (pas depuis l'appli) :
  pip install numpy psycopg[binary]
  export DATABASE_URL="postgresql://postgres:<mot de passe>@db.<projet>.supabase.co:5432/postgres"
  python scripts/seed_supabase.py --vec cc.fr.300.vec --lang fr --limit 60000 --days 400 --secrets scripts/secrets_fr.txt

--vec     : vecteurs fastText au format texte (.vec), par exemple cc.fr.300.vec (fasttext.cc). Les mots y sont
            rangés par fréquence : --limit garde les N plus fréquents.
--secrets : liste de mots du jour, un par ligne, dans l'ordre (jour 1, jour 2…). Ils doivent être dans le vocabulaire.
"""
import argparse, os, re, io
import numpy as np
import psycopg

WORD = re.compile(r"^[a-zàâäçéèêëîïôöùûüÿœæ]+(?:-[a-zàâäçéèêëîïôöùûüÿœæ]+)?$")

def read_vec(path, limit):
    words, vecs = [], []
    with open(path, encoding='utf-8') as f:
        next(f)
        for line in f:
            w, *rest = line.rstrip().split(' ')
            if not WORD.match(w) or len(rest) != 300: continue
            words.append(w); vecs.append(np.asarray(rest, dtype=np.float32))
            if len(words) >= limit: break
    M = np.vstack(vecs); M /= np.linalg.norm(M, axis=1, keepdims=True) + 1e-9
    return words, M

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--vec', required=True); ap.add_argument('--lang', default='fr')
    ap.add_argument('--limit', type=int, default=60000); ap.add_argument('--days', type=int, default=400)
    ap.add_argument('--secrets', required=True)
    a = ap.parse_args()
    words, M = read_vec(a.vec, a.limit)
    idx = {w: i for i, w in enumerate(words)}
    secrets = [s.strip().lower() for s in open(a.secrets, encoding='utf-8') if s.strip()]
    missing = [s for s in secrets if s not in idx]
    if missing: raise SystemExit(f'Mots du jour absents du vocabulaire : {missing[:20]}')
    with psycopg.connect(os.environ['DATABASE_URL']) as db, db.cursor() as cur:
        cur.execute('delete from daily_words where lang = %s', (a.lang,))
        cur.execute('delete from words where lang = %s', (a.lang,))
        with cur.copy('copy words (lang, word, embedding) from stdin') as cp:
            for w, v in zip(words, M):
                cp.write_row((a.lang, w, '[' + ','.join(f'{x:.5f}' for x in v) + ']'))
        for day in range(1, a.days + 1):
            s = secrets[(day - 1) % len(secrets)]
            sims = M @ M[idx[s]]
            top = np.argsort(-sims)[:1000]
            cur.execute('insert into daily_words (lang, day, word) values (%s, %s, %s)', (a.lang, day, s))
            with cur.copy('copy daily_neighbors (lang, day, rank, word, similarity) from stdin') as cp:
                for r, i in enumerate(top, 1):
                    cp.write_row((a.lang, day, r, words[i], float(sims[i])))
        db.commit()
    print(f'{len(words)} mots, {a.days} jours chargés pour « {a.lang} »')

if __name__ == '__main__':
    main()
