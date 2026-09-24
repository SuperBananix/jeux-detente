# jeux-detente

Jeux open source affichés dans l'**Espace détente** de RevisionApp (application de révision familiale, Google Apps Script).

L'application ouvre chaque jeu dans une iframe plein écran et gère elle-même le temps de jeu (ticket payé en pièces d'or). Ces pages ne contiennent aucune donnée ni aucun identifiant : ce sont de simples copies statiques des jeux.

| Dossier | Jeu | Auteur | Licence | Modifications |
|---|---|---|---|---|
| `2048/` | 2048 | Gabriele Cirulli — https://github.com/gabrielecirulli/2048 (commit `478b6ec`) | MIT (`2048/LICENSE.txt`) | Textes traduits en français ; liens externes retirés ; glisser du doigt sans défilement de la page (`touch-action`, `overscroll-behavior`) ; fichiers inutiles au jeu retirés (icônes Apple, sources SCSS) ; ajout de `js/pont_app.js` (+ 2 lignes dans `application.js`) : dans l'app, la partie en cours et le record sont synchronisés avec le Google Sheet par `postMessage` |
| `hextris/` | Hextris | Logan Engstrom, Garrett Finucane et contributeurs — https://github.com/Hextris/hextris (commit `3f4847d`) | GPL-3 (`hextris/LICENSE.md`) — ce dépôt public en publie le code source modifié | Textes en français ; retirés : publicité (AdSense), Google Analytics, envoi du score à un serveur externe, chargement d'un script distant, boutons de partage, liens vers les boutiques, police Google Fonts ; `touch-action`/`overscroll-behavior` ajoutés ; ajout de `js/pont_app.js` (+ 1 ligne dans `initialization.js`, 1 dans `save-state.js`) : dans l'app, le record est synchronisé avec le Google Sheet ; élément `#buttonCont` gardé vide (utilisé par `main.js` pour la mise en page) |

Ajouter un jeu : un nouveau dossier ici (avec son fichier de licence d'origine), puis une ligne dans la constante `JEUX_EXTERNES` de `RevisionApp.html`.
