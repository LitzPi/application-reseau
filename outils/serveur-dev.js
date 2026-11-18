// Petit serveur statique pour le développement local (aucune dépendance).
// Usage : node outils/serveur-dev.js [port]
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = Number(process.argv[2] ?? 5173);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".md": "text/markdown; charset=utf-8",
};

function cheminDemande(url) {
  const chemin = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const relatif = normalize(chemin.endsWith("/") ? `${chemin}index.html` : chemin);
  const absolu = resolve(join(RACINE, relatif));
  return absolu.startsWith(RACINE) ? absolu : null;
}

createServer(async (requete, reponse) => {
  const fichier = cheminDemande(requete.url);
  if (!fichier) {
    reponse.writeHead(403).end("Interdit");
    return;
  }
  try {
    const contenu = await readFile(fichier);
    reponse.writeHead(200, {
      "Content-Type": TYPES[extname(fichier)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    reponse.end(contenu);
  } catch (erreur) {
    const absent = erreur.code === "ENOENT" || erreur.code === "EISDIR";
    reponse.writeHead(absent ? 404 : 500).end(absent ? "Introuvable" : "Erreur du serveur");
    if (!absent) console.error(erreur);
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Serveur de développement : http://localhost:${PORT}`);
});
