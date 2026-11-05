# Nabulo — consignes pour Claude Code

Jeu de mots mobile « chaud / froid » (proximité sémantique, esprit Cémantix). Mascotte : **Nabulo**, un singe de feu
qui s'emmêle les pinceaux ; le joueur l'aide à retrouver le mot auquel il pense. Tout le texte de l'appli est en français.

## Pile
- Expo SDK 58, expo-router (`src/app`), React 19, React Native 0.88, TypeScript strict.
- `expo-linear-gradient`, `react-native-svg`, `expo-image`, `expo-haptics`, AsyncStorage, polices Fredoka (texte) et Inter (onglets).
- Moteur de température : local (hors ligne) ou Supabase si `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` sont définies (`.env`, voir `.env.example`).
- Supabase : projet « nabulo » (réf. `tkneqhacfmnphfqpjjax`, Paris, offre gratuite). Schéma dans `supabase/migrations/` ; données chargées
  depuis le PC avec `scripts/seed_supabase.py` (modèle word2vec frWac, 200 dimensions). Le mot du jour ne quitte jamais le serveur.
- `npx expo install` est parfois bloqué par le proxy : installer avec npm la version listée dans `node_modules/expo/bundledNativeModules.json`.

## Commandes
```
npm run typecheck && npm run lint && npm test        # doit rester vert avant chaque commit
npx expo start                                       # téléphone (Expo Go) ; touche w = navigateur
npx expo export -p web && python3 scripts/serve_web.py dist &   # version web sur http://localhost:8099
python3 scripts/shots.py /mot-du-jour /boutique      # captures 390×844 dans design/rendus/
```

## Maquettes = la référence
- `design/maquettes/*.dc.html` : copies des planches de la canvas de design (390×844 par écran). Les écrans de l'appli
  doivent être **identiques** : recopier les valeurs exactes (couleurs, tailles, rayons, marges, textes), ne pas arrondir.
- Une planche contient souvent plusieurs écrans côte à côte, titrés « 1 · … », « 2 · … ». Les `{{variables}}` viennent de
  `renderVals()` dans le script en bas de la planche ; `<dc-import name="X">` insère la planche `X.dc.html`.
- Images : `/_blob/<id>` dans les maquettes correspond à ces fichiers de `assets/images/` :
  `6189b692…` neutre (Nabulo en pied) · `bbe7bbce…` saut (victoire) · `c7597788…` triste (défaite) · `301fac16…` joie ·
  `36445789…` embêté · `b193484f…` tête · `6c41d1d0…` tour (chargement) · `e043f70f…` braise (pièce).
- Ne pas reproduire les faux éléments de téléphone des maquettes (barre d'état 9:41, clavier dessiné) : le vrai système les affiche.

## Règles de design (non négociables)
- **Bulles** (`src/ui/Bubble.tsx`) : contour plus clair que le fond (`mix(bg, 55, #FFF)`, blanc → `#D9D1F2`), fond coupé
  en biais du **coin haut droit au coin bas gauche** (`Diagonal`, en SVG), relief enfoncé en bas `mix(bg, 84, #3A2A7A)`
  dessiné par-dessus le fond (`Relief`). Contours de 2 ou 3 px selon la maquette.
- **Boutons jaunes** : `#FFD45C` / diagonale `#F7C843`, contour `#FFE38F`, relief `#E3A91C` (`Button variant="yellow"`).
  Pas de boutons verts.
- **À plat** (ni contour ni relief) : boutons et champ au-dessus du clavier (Envoyer, Valider, Proposer, ampoule, « Tape un mot »),
  mots à choisir, « J'ai déjà un compte », boutons d'en-tête, étiquettes, pastille de braises, lignes de classement
  (blanches, la mienne `#FFF3B0`).
- **Texte** : composant `T` (`src/ui/Text.tsx`) ; hauteur de ligne jamais sous 1,21 em (hauteur réelle de Fredoka) : si un écran demande moins, `T` compense par des marges négatives et ajoute une marge de dessin pour que les accents, les jambages (g, p, j) et l'ombre ne soient jamais coupés. Ne pas forcer de `lineHeight` dans un bouton ou une pastille.
  texte verticalement sur toutes les plateformes. Ne pas forcer de `lineHeight` dans un bouton ou une pastille.
- Fonds : violet (jeu, mot du jour, jeux libres), aluminium (accueil, boutique, panneaux), chaud qui glisse + confettis
  (victoire), froid + pluie (défaite), sarcelle `#0E5C6E → #138A8A → #2FB59A` (multi), bleu `#2E5FB8 → #8E7BF2` (coop),
  deux halos (duel).
- Nabulo remplace les smileys partout où il n'y a ni victoire, ni défaite, ni froid, ni chaud ; les petits personnages de
  température (`Mascot`) servent pour les températures.
- Accessibilité : `accessibilityRole` / `accessibilityLabel` sur chaque bouton, cibles ≥ 44 px, animations coupées si
  « réduire les animations » est actif.

## Organisation du code
- `src/app/` : un fichier par écran (route). `src/ui/` : briques visuelles partagées. `src/game/` : logique et données.
- `src/game/lexicon.ts` : similarité entre deux mots quelconques, voisins, tirage — pour les mini-jeux hors ligne.
- `src/game/engine/` : mot du jour (local ou Supabase). `src/game/rules.ts` : barèmes (indice 60 braises, gains).
- Stockage : clés `nabulo:*` (AsyncStorage). En développement, appui long sur « Nabulo » à l'accueil = tout réinitialiser.
- Ne jamais afficher de chiffres inventés (joueurs, classements) : tant qu'une donnée n'existe pas, ne pas la montrer.

## Vérifier avant de livrer
1. `npm run typecheck && npm run lint && npm test`.
2. Export web + `scripts/shots.py` sur les écrans touchés, puis comparer la capture à la maquette.
3. Commits en français, petits et descriptifs.
