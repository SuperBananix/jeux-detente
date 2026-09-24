// =====================================================================
// Pont entre le 2048 et RevisionApp (24/09/2026)
//
// Quand le jeu est ouvert DANS l'application (iframe de l'Espace détente) :
//  1. au démarrage, il attend la sauvegarde gardée dans le Google Sheet
//     (message JEU_CHARGER envoyé par l'app), la compare à celle de ce
//     navigateur et garde la plus récente — puis seulement il lance la partie ;
//  2. après chaque coup, il envoie son état à l'app (message JEU_ETAT), qui
//     l'écrit dans le Sheet (onglet SAUVEGARDES_JEUX).
// Résultat : la partie en cours et le record suivent Martin d'un navigateur
// ou d'un appareil à l'autre.
//
// Ouvert directement (hors de l'app), le jeu fonctionne exactement comme
// l'original : stockage du navigateur seul, aucun message envoyé.
//
// Seul fichier ajouté au jeu d'origine, avec deux lignes de application.js.
// =====================================================================
(function () {
  var dansApp = false;
  try { dansApp = window.parent && window.parent !== window; } catch (e) { dansApp = false; }

  var ID_JEU = '2048';
  var CLE_MAJ = 'gameStateMaj';         // horodatage (ms) de la partie stockée ici
  var DELAI_MAX_ATTENTE_MS = 4000;      // sans réponse de l'app : on joue avec le stockage local

  window.pontApp = { actif: dansApp, demarrerApresSynchro: function (lancer) { lancer(); } };
  if (!dansApp) return;

  // --- 1. Envoi de l'état à l'app après chaque modification -----------------
  var proto = LocalStorageManager.prototype;
  var origSetGameState = proto.setGameState;
  var origClearGameState = proto.clearGameState;
  var origSetBestScore = proto.setBestScore;

  function envoyerEtat(sm) {
    try {
      window.parent.postMessage({
        type: 'JEU_ETAT',
        jeu: ID_JEU,
        etat: sm.storage.getItem(sm.gameStateKey) || '',   // '' = aucune partie en cours
        record: Number(sm.storage.getItem(sm.bestScoreKey)) || 0,
        majLe: Number(sm.storage.getItem(CLE_MAJ)) || 0
      }, '*'); // l'origine de l'app Apps Script n'est pas fixe : l'app, elle, vérifie la nôtre
    } catch (e) { /* rien à faire : la sauvegarde locale reste en place */ }
  }

  proto.setGameState = function (etat) {
    origSetGameState.call(this, etat);
    this.storage.setItem(CLE_MAJ, String(Date.now()));
    envoyerEtat(this);
  };
  proto.clearGameState = function () {
    origClearGameState.call(this);
    this.storage.setItem(CLE_MAJ, String(Date.now()));
    envoyerEtat(this);
  };
  proto.setBestScore = function (score) {
    origSetBestScore.call(this, score);
    envoyerEtat(this);
  };

  // --- 2. Au démarrage : récupérer la sauvegarde du Sheet ---------------------
  function appliquerSauvegardeServeur(d) {
    // Même stockage que celui qu'utilisera le jeu (localStorage, ou la mémoire
    // si le navigateur refuse le stockage dans une iframe).
    var st = new LocalStorageManager().storage;
    if (!d || !d.trouve) return;

    var majServeur = Number(d.majLe) || 0;
    var majLocale = Number(st.getItem(CLE_MAJ)) || 0;
    if (majServeur > majLocale) {
      var etat = typeof d.etat === 'string' ? d.etat : '';
      var valide = etat === '';
      if (!valide) {
        try { valide = !!JSON.parse(etat).grid; } catch (e) { valide = false; }
      }
      if (valide) {
        if (etat) st.setItem('gameState', etat); else st.removeItem('gameState');
        st.setItem(CLE_MAJ, String(majServeur));
      }
    }
    var recordServeur = Number(d.record) || 0;
    if (recordServeur > (Number(st.getItem('bestScore')) || 0)) {
      st.setItem('bestScore', String(recordServeur));
    }
  }

  function afficherAttente(visible) {
    var id = 'pontAppAttente';
    var el = document.getElementById(id);
    if (visible && !el) {
      el = document.createElement('div');
      el.id = id;
      el.textContent = 'Chargement de ta partie…';
      el.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;display:flex;'
        + 'align-items:center;justify-content:center;font-size:20px;font-weight:bold;'
        + 'color:#776e65;background:rgba(238,228,218,0.7);z-index:200;border-radius:6px;';
      var conteneur = document.querySelector('.game-container');
      if (conteneur) conteneur.appendChild(el);
    } else if (!visible && el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  window.pontApp.demarrerApresSynchro = function (lancer) {
    var lance = false;
    function lancerUneFois(d) {
      if (lance) return;  // une réponse tardive de l'app est ignorée
      lance = true;
      window.removeEventListener('message', ecouter);
      try { appliquerSauvegardeServeur(d); } catch (e) { /* on joue avec le local */ }
      afficherAttente(false);
      lancer();
    }
    function ecouter(e) {
      if (e.source !== window.parent) return;
      var d = e.data;
      if (!d || typeof d !== 'object' || d.type !== 'JEU_CHARGER' || d.jeu !== ID_JEU) return;
      lancerUneFois(d);
    }
    window.addEventListener('message', ecouter);
    afficherAttente(true);
    setTimeout(function () { lancerUneFois(null); }, DELAI_MAX_ATTENTE_MS);
    window.parent.postMessage({ type: 'JEU_PRET', jeu: ID_JEU }, '*');
  };
})();
