// Service worker : rend l'app utilisable hors ligne.
// Changer CACHE en même temps que VERSION (js/version.js) à chaque livraison :
// c'est ce qui déclenche la mise à jour sur le téléphone.

const CACHE = "reseau-v0.3.0";

const FICHIERS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "icons/icone-180.png",
  "icons/icone-192.png",
  "icons/icone-512.png",
  "js/app.js",
  "js/dates.js",
  "js/dialogue.js",
  "js/dom.js",
  "js/evenements.js",
  "js/format.js",
  "js/fusion.js",
  "js/journal.js",
  "js/magasin.js",
  "js/notes.js",
  "js/partage.js",
  "js/sauvegarde.js",
  "js/stockage.js",
  "js/version.js",
  "js/ecrans/accueil.js",
  "js/ecrans/evenement.js",
  "js/ecrans/evenement-nouveau.js",
  "js/ecrans/notes.js",
  "js/ecrans/saisie.js",
  "js/ecrans/sauvegarde.js",
];

const EN_DEVELOPPEMENT = ["localhost", "127.0.0.1"].includes(self.location.hostname);

self.addEventListener("install", (evenement) => {
  // « reload » : ne pas reprendre une copie périmée du cache HTTP.
  const requetes = FICHIERS.map((fichier) => new Request(fichier, { cache: "reload" }));
  evenement.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(requetes)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((nom) => nom !== CACHE).map((nom) => caches.delete(nom))))
      .then(() => self.clients.claim()));
});

async function depuisLeCache(requete) {
  const cache = await caches.open(CACHE);
  const reponse = await cache.match(requete, { ignoreSearch: true });
  if (reponse) return reponse;
  // Toute navigation interne retombe sur la page unique de l'app.
  return requete.mode === "navigate" ? cache.match("index.html") : undefined;
}

async function repondre(requete) {
  if (EN_DEVELOPPEMENT) {
    // Sur le poste de développement : toujours la dernière version, le cache en secours.
    try {
      return await fetch(requete);
    } catch {
      return (await depuisLeCache(requete)) ?? Response.error();
    }
  }
  return (await depuisLeCache(requete)) ?? fetch(requete);
}

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET" || new URL(requete.url).origin !== self.location.origin) return;
  evenement.respondWith(repondre(requete));
});
