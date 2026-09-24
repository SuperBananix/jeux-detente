// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  // RevisionApp (24/09/2026) : dans l'app, on attend la sauvegarde du Sheet
  // avant de lancer la partie (voir pont_app.js). Hors de l'app : immédiat.
  window.pontApp.demarrerApresSynchro(function () {
    new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  });
});
