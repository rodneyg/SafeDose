// Exported production builds only. The development server has no generated worker.
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(function () {
      // Installation is optional. The online app remains usable if caching fails.
      console.warn('SafeDose offline setup unavailable.');
    });
  });
}
