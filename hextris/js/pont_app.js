// =====================================================================
// Pont entre Hextris et RevisionApp (24/09/2026)
//
// Même protocole que le 2048 (voir 2048/js/pont_app.js), en plus simple :
// Hextris est un jeu rapide, seul le RECORD est gardé dans le Google Sheet
// (onglet SAUVEGARDES_JEUX, ligne « hextris »). La partie en cours reste,
// comme dans le jeu d'origine, dans le navigateur.
//
//  1. au démarrage, le jeu attend la sauvegarde du Sheet (JEU_CHARGER) ;
//     si un adulte a demandé une remise à zéro (jeton « raz » changé), il
//     efface ses records et sa partie locale ; puis il ajoute le record du
//     Sheet à ses trois meilleurs scores s'il est plus haut ;
//  2. à chaque fin de partie, et une fois au démarrage, il envoie son
//     meilleur score à l'app (JEU_ETAT), qui l'écrit dans le Sheet.
//
// Ouvert directement (hors de l'app), le jeu fonctionne comme l'original.
// =====================================================================
(function () {
  var dansApp = false;
  try { dansApp = window.parent && window.parent !== window; } catch (e) { dansApp = false; }

  var ID_JEU = 'hextris';
  var CLE_RAZ = 'razVu';                // dernier jeton de remise à zéro reçu du Sheet
  var DELAI_MAX_ATTENTE_MS = 4000;      // sans réponse de l'app : on joue avec le stockage local

  window.pontApp = {
    actif: dansApp,
    demarrerApresSynchro: function (lancer) { lancer(); },
    signalerRecord: function () {}
  };
  if (!dansApp) return;

  function lire(cle) { try { return localStorage.getItem(cle); } catch (e) { return null; } }
  function ecrire(cle, v) { try { localStorage.setItem(cle, v); } catch (e) { /* stockage refusé */ } }
  function effacer(cle) { try { localStorage.removeItem(cle); } catch (e) { /* stockage refusé */ } }

  function recordsLocaux() {
    try {
      var hs = JSON.parse(lire('highscores') || '[]');
      return Array.isArray(hs) ? hs : [];
    } catch (e) { return []; }
  }

  function meilleurScore() {
    var hs = (window.highscores && window.highscores.length) ? window.highscores : recordsLocaux();
    var m = 0;
    for (var i = 0; i < hs.length; i++) m = Math.max(m, parseInt(hs[i], 10) || 0);
    return m;
  }

  window.pontApp.signalerRecord = function () {
    try {
      window.parent.postMessage({
        type: 'JEU_ETAT',
        jeu: ID_JEU,
        etat: '',                       // la partie en cours n'est pas envoyée
        record: meilleurScore(),
        majLe: Date.now(),
        raz: lire(CLE_RAZ) || ''        // le Sheet ignore un envoi portant un ancien jeton
      }, '*'); // l'origine de l'app Apps Script n'est pas fixe : l'app, elle, vérifie la nôtre
    } catch (e) { /* le record reste dans le navigateur */ }
  };

  function appliquerSauvegardeServeur(d) {
    if (!d || !d.trouve) return;
    var jeton = typeof d.raz === 'string' ? d.raz : '';
    if (jeton !== (lire(CLE_RAZ) || '')) {
      // Remise à zéro demandée par un adulte dans le Sheet (colonne F).
      effacer('highscores');
      ecrire('saveState', '{}');
      ecrire(CLE_RAZ, jeton);
    }
    var recordServeur = parseInt(d.record, 10) || 0;
    if (recordServeur > 0) {
      var hs = recordsLocaux().map(function (x) { return parseInt(x, 10) || 0; });
      if (hs.indexOf(recordServeur) === -1) hs.push(recordServeur);
      hs.sort(function (a, b) { return b - a; });
      ecrire('highscores', JSON.stringify(hs.slice(0, 3)));
    }
  }

  function afficherAttente(visible) {
    var id = 'pontAppAttente';
    var el = document.getElementById(id);
    if (visible && !el) {
      el = document.createElement('div');
      el.id = id;
      el.textContent = 'Chargement…';
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;display:flex;'
        + 'align-items:center;justify-content:center;font-size:22px;font-family:sans-serif;'
        + 'color:#2c3e50;background:#ecf0f1;z-index:9999;';
      document.body.appendChild(el);
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
      window.pontApp.signalerRecord(); // le Sheet récupère un record local plus haut que le sien
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
