"""Charge le vocabulaire, le programme des mots du jour et leurs voisins dans Supabase (projet « nabulo »).

À lancer depuis TON ordinateur (le serveur de Claude ne peut pas joindre la base) :

  1. Télécharge le modèle word2vec frWac (Fauconnier) depuis Hugging Face :
     https://huggingface.co/Word2vec/fauconnier_frWac_non_lem_no_postag_no_phrase_200_cbow_cut100/tree/main
     → fichier frWac_non_lem_no_postag_no_phrase_200_cbow_cut100.bin (environ 120 Mo), à mettre dans scripts/data/
  2. Supabase › projet nabulo › bouton « Connect » › « Session pooler » : copie l'adresse (postgresql://postgres.<ref>:…@aws-…pooler.supabase.com:5432/postgres)
     et remplace [YOUR-PASSWORD] par le mot de passe de la base (Settings › Database pour le réinitialiser).
  3. Dans PowerShell, à la racine du projet :
       pip install numpy "psycopg[binary]"
       $env:DATABASE_URL = "postgresql://..."
       python scripts/seed_supabase.py --model scripts/data/frWac_non_lem_no_postag_no_phrase_200_cbow_cut100.bin

Options : --limit (mots gardés, les plus fréquents d'abord, défaut 80 000), --days (jours programmés, défaut 500),
--secrets (liste des mots du jour, un par ligne, défaut scripts/secrets_fr.txt), --dry-run (vérifie sans écrire).
Accepte aussi des vecteurs fastText au format texte (.vec).
"""
import argparse, os, re
import numpy as np

WORD = re.compile(r"^[a-zàâäçéèêëîïôöùûüÿœæ]+(?:-[a-zàâäçéèêëîïôöùûüÿœæ]+)?$")


def read_w2v_bin(path, limit):
    """Format binaire de word2vec : « n dim\\n » puis, par mot, « mot<espace> » et dim float32. Mots par fréquence."""
    words, vecs = [], []
    with open(path, 'rb') as f:
        n, dim = map(int, f.readline().split())
        size = 4 * dim
        for _ in range(n):
            w = bytearray()
            while True:
                c = f.read(1)
                if c == b' ' or not c: break
                if c != b'\n': w += c
            v = np.frombuffer(f.read(size), dtype=np.float32)
            word = w.decode('utf-8', errors='ignore')
            if WORD.match(word) and len(word) >= 2:
                words.append(word); vecs.append(v)
                if len(words) >= limit: break
    return words, np.vstack(vecs)


def read_vec(path, limit):
    words, vecs = [], []
    with open(path, encoding='utf-8') as f:
        dim = int(next(f).split()[1])
        for line in f:
            w, *rest = line.rstrip().split(' ')
            if not WORD.match(w) or len(rest) != dim: continue
            words.append(w); vecs.append(np.asarray(rest, dtype=np.float32))
            if len(words) >= limit: break
    return words, np.vstack(vecs)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True, help='frWac .bin (word2vec) ou .vec (fastText texte)')
    ap.add_argument('--lang', default='fr')
    ap.add_argument('--limit', type=int, default=80000)
    ap.add_argument('--days', type=int, default=500)
    ap.add_argument('--secrets', default=os.path.join(os.path.dirname(__file__), 'secrets_fr.txt'))
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()

    words, M = (read_w2v_bin if a.model.endswith('.bin') else read_vec)(a.model, a.limit)
    M = M.astype(np.float32); M /= np.linalg.norm(M, axis=1, keepdims=True) + 1e-9
    idx = {w: i for i, w in enumerate(words)}
    secrets = [s.strip().lower() for s in open(a.secrets, encoding='utf-8') if s.strip()]
    missing = [s for s in secrets if s not in idx]
    if missing:
        print(f'{len(missing)} mots du jour absents du vocabulaire, ignorés : {missing[:15]}')
        secrets = [s for s in secrets if s in idx]
    print(f'{len(words)} mots × {M.shape[1]} dimensions, {len(secrets)} mots du jour')
    for probe in [('musique', 'chanson'), ('musique', 'voiture'), ('médicament', 'consentement'), ('braise', 'feu')]:
        if all(p in idx for p in probe):
            print(f'  contrôle {probe[0]} / {probe[1]} : {float(M[idx[probe[0]]] @ M[idx[probe[1]]]) * 100:.1f} °C')
    if a.dry_run: return

    import psycopg
    with psycopg.connect(os.environ['DATABASE_URL']) as db, db.cursor() as cur:
        cur.execute('delete from daily_words where lang = %s', (a.lang,))
        cur.execute('delete from words where lang = %s', (a.lang,))
        with cur.copy('copy words (lang, word, embedding) from stdin') as cp:
            for w, v in zip(words, M):
                cp.write_row((a.lang, w, '[' + ','.join(f'{x:.5f}' for x in v) + ']'))
        print('vocabulaire chargé')
        for day in range(1, a.days + 1):
            s = secrets[(day - 1) % len(secrets)]
            sims = M @ M[idx[s]]
            top = np.argsort(-sims)[:1000]
            cur.execute('insert into daily_words (lang, day, word) values (%s, %s, %s)', (a.lang, day, s))
            with cur.copy('copy daily_neighbors (lang, day, rank, word, similarity) from stdin') as cp:
                for r, i in enumerate(top, 1):
                    cp.write_row((a.lang, day, r, words[i], float(sims[i])))
            if day % 50 == 0: print(f'  jour {day}/{a.days}')
        db.commit()
    print(f'Terminé : {len(words)} mots, {a.days} jours pour « {a.lang} ».')


if __name__ == '__main__':
    main()
