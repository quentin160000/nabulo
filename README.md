# Thermo·Mot

Jeu de mots chauds et froids (iOS + Android), en Expo / React Native + Supabase.
V1 en cours : **Mot du jour** jouable de bout en bout.

## Lancer l'appli

```bash
npm install
npx expo start          # puis « i » (iOS), « a » (Android) ou « w » (navigateur)
```

Sans configuration, l'appli utilise le **moteur local** : similarités précalculées pour 30 mots du jour,
vocabulaire réduit (~15 000 mots, vecteurs fastText élagués de spaCy). C'est fait pour développer, pas pour jouer pour de vrai.

## Brancher Supabase (moteur de production)

1. Créer un projet Supabase, puis appliquer `supabase/migrations/*.sql` (éditeur SQL ou `supabase db push`).
2. Télécharger les vecteurs fastText français `cc.fr.300.vec` (https://fasttext.cc/docs/en/crawl-vectors.html).
3. Charger le vocabulaire et le programme des mots du jour :
   ```bash
   pip install numpy "psycopg[binary]"
   export DATABASE_URL="postgresql://postgres:<mot de passe>@db.<projet>.supabase.co:5432/postgres"
   python scripts/seed_supabase.py --vec cc.fr.300.vec --lang fr --limit 60000 --days 400 --secrets scripts/secrets_fr.txt
   ```
4. Copier `.env.example` en `.env` et remplir l'URL et la clé « anon ». L'appli bascule seule sur Supabase.

Le mot secret ne quitte jamais le serveur : l'appli n'appelle que `guess_word`, `hint_word`, `closest_words`, `reveal_word`.

## Organisation

```
src/app/            écrans (Expo Router) : accueil, mot-du-jour
src/ui/             composants de la maquette : Bubble (relief), Button (jaune / à plat), TempGauge, Confetti…
src/theme/colors.ts couleurs et règle des bulles (contour plus clair, coupe en biais, relief enfoncé)
src/game/           règles, températures, partie du jour (sauvegardée), braises
src/game/engine/    moteur de température : local (dev) et Supabase (prod)
supabase/           schéma SQL et fonctions
scripts/            construction des données locales, chargement Supabase
tests/              tests du moteur et des règles (vitest)
```

## Vérifier

```bash
npm run typecheck && npm run lint && npm test
```

## Règles de design reprises de la maquette

- Bulles : contour plus clair que le fond, fond coupé en biais, relief enfoncé en bas, pas de contour noir.
- Boutons principaux : jaune en relief. Boutons au-dessus du clavier et « J'ai déjà un compte » : à plat.
- Choix de mots, étiquettes, boutons d'en-tête, pastille de braises, lignes de classement : à plat.
- Tison : neutre sur les écrans sans émotion, saute de joie à la victoire, triste sous la pluie à la défaite.
