// Garde-fous de livraison : le hors-ligne ne fonctionne que si le service worker
// connaît tous les fichiers de l'app, et la mise à jour que si les versions concordent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { VERSION } from "../../js/version.js";

const racine = fileURLToPath(new URL("../../", import.meta.url));
const sw = readFileSync(`${racine}sw.js`, "utf8");
const fichiersCaches = [...sw.match(/const FICHIERS = \[([\s\S]*?)\];/)[1].matchAll(/"([^"]+)"/g)]
  .map((m) => m[1]);

function lister(dossier) {
  return readdirSync(`${racine}${dossier}`, { withFileTypes: true }).flatMap((entree) =>
    entree.isDirectory() ? lister(`${dossier}/${entree.name}`) : [`${dossier}/${entree.name}`]);
}

test("le cache du service worker porte la version de l'app", () => {
  assert.match(sw, new RegExp(`const CACHE = "reseau-v${VERSION.replaceAll(".", "\\.")}";`));
});

test("tous les fichiers mis en cache existent", () => {
  const manquants = fichiersCaches.filter((f) => f !== "./" && !existsSync(`${racine}${f}`));
  assert.deepEqual(manquants, []);
});

test("tous les scripts, styles et icônes de l'app sont mis en cache", () => {
  const attendus = [...lister("js"), ...lister("css"), ...lister("icons")];
  const oublies = attendus.filter((f) => !fichiersCaches.includes(f));
  assert.deepEqual(oublies, []);
});

test("le manifeste et la page ne référencent que des fichiers existants", () => {
  const manifeste = JSON.parse(readFileSync(`${racine}manifest.webmanifest`, "utf8"));
  const page = readFileSync(`${racine}index.html`, "utf8");
  const references = [
    ...manifeste.icons.map((icone) => icone.src),
    ...[...page.matchAll(/(?:href|src)="([^"#][^"]*)"/g)].map((m) => m[1]),
  ];
  assert.deepEqual(references.filter((f) => !existsSync(`${racine}${f}`)), []);
  assert.equal(manifeste.display, "standalone");
});
