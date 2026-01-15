/**
 * Waypoint Background Service Worker
 *
 * Minimal by design. Most logic lives in the popup/options pages.
 * The service worker handles:
 * - Extension installation/update events
 * - Future: message passing between content scripts and popup
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Waypoint installed');
  } else if (details.reason === 'update') {
    console.log(`Waypoint updated to ${chrome.runtime.getManifest().version}`);
  }
});
