# Brief commun aux agents (lire aussi CLAUDE.md)

Dépôt : /home/claude/code/thermo-mot (appli Expo « Nabulo »). Plusieurs agents travaillent EN MÊME TEMPS dans ce dossier.

Règles de cohabitation :
- Ne crée/modifie QUE les fichiers listés dans ta mission. Pour un besoin commun (icône, petite brique), crée un fichier
  à toi (`src/ui/<ta-mission>-*.tsx`, `src/game/<ta-mission>-*.ts`) au lieu de modifier `bits.tsx`, `Button.tsx`, etc.
  Tu peux IMPORTER tout ce qui existe (src/ui/*, src/game/*, src/theme/*).
- Ne fais PAS de commit ni de push, ne touche pas à package.json (aucune nouvelle dépendance).
- `npx tsc --noEmit` / `npx eslint src` vérifient tout le dépôt : ignore les erreurs des fichiers qui ne sont pas à toi,
  mais les tiens doivent être propres (0 erreur, 0 avertissement).
- Export web dans TON dossier et sur TON port (voir ta mission) :
  `npx expo export -p web --output-dir /tmp/<mission>-dist` puis `python3 scripts/serve_web.py /tmp/<mission>-dist <port> &`
  puis `python3 scripts/shots.py <routes> --base http://localhost:<port> --out /tmp/<mission>-shots`.
  Regarde tes captures (outil Read sur le PNG) et compare-les aux aperçus `design/apercus/<planche>.jpg`
  et au code source `design/maquettes/<planche>.dc.html` (valeurs exactes).

Ce qui existe déjà et à réutiliser :
- `src/ui/game.tsx` : GameBg (fond violet), Section (bloc foncé titré), Sheet (panneau alu du bas), useKeyboardVisible.
- `src/ui/Bubble.tsx` (bulle relief + diagonale), `src/ui/Button.tsx` (variants yellow / white / panel / yellow-mix / flat-*),
  `src/ui/bits.tsx` (images Nabulo, Coin, Icon, HeaderButton, CoinPill, Chip, Avatar, IconTile), `src/ui/Mascot.tsx`
  (personnages de température), `src/ui/Confetti.tsx`, `src/ui/backgrounds.tsx` (SlidingGradient, RisingBits, AluBackground),
  `src/ui/Toast.tsx`, `src/ui/TabBar.tsx`, `src/ui/Text.tsx` (T).
- `src/game/lexicon.ts` : temperature(a, b), cosine, neighbors(word, k), known(word), rng(seed), randomWord(rand).
  Échelle des températures = celle du mot du jour (`src/game/temperature.ts` : tempColor, moodOf, formatTemp).
- `src/game/storage.ts` (load/save, clés `nabulo:*`), `src/game/wallet.tsx` (useWallet : braises, earn, spend).
- Écran de référence complet : `src/app/mot-du-jour.tsx` (règles, en jeu, panneau, victoire) — imite sa structure.

Adversaires et coéquipiers : pas encore de serveur temps réel. Les modes à plusieurs se jouent contre/avec une « IA »
(nom affiché « IA », jamais un faux pseudo humain) qui joue avec le lexique (voisins, températures) et un léger délai.
Les options « Un ami », « Au hasard », « Rejoindre un salon » restent visibles comme dans la maquette mais affichent un
Toast « Bientôt disponible ». Aucun chiffre inventé (classements mondiaux, nombre de joueurs) : ne montre que des données
réelles (stockées sur le téléphone) ou rien.

À la fin, réponds avec : la liste des fichiers créés/modifiés, ce qui marche, les écarts restants avec la maquette.
