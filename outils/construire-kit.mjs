// Construit le kit à envoyer à des amis : un dossier zippé à ouvrir dans Claude Code,
// et une page HTML qui explique comment s'en servir.
//
//   node outils/construire-kit.mjs <dossier de sortie>
//
// Produit dans le dossier de sortie :
//   application-reseau-kit.zip       le kit (app à déployer, instructions pour Claude, contrat)
//   Application-Reseau-guide.html    la page à envoyer avec le zip
//
// Le kit est reconstruit à partir des sources du dépôt : relancer ce script après
// chaque évolution de l'app suffit à le tenir à jour.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = resolve(fileURLToPath(new URL("..", import.meta.url)));
const NOM_KIT = "application-reseau-kit";

const sortie = process.argv[2];
if (!sortie) {
  console.error("Usage : node outils/construire-kit.mjs <dossier de sortie>");
  process.exit(1);
}
const dossierSortie = resolve(sortie);
const kit = join(dossierSortie, NOM_KIT);

const lire = (chemin) => readFileSync(join(RACINE, chemin), "utf8");

function copier(source, destination) {
  const cible = join(kit, destination);
  mkdirSync(dirname(cible), { recursive: true });
  cpSync(join(RACINE, source), cible, { recursive: true });
}

function ecrire(destination, contenu) {
  const cible = join(kit, destination);
  mkdirSync(dirname(cible), { recursive: true });
  writeFileSync(cible, contenu);
}

const echapperHtml = (texte) => texte
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Fichiers de l'app : exactement ceux que le service worker met en cache, plus lui-même. */
function fichiersDeLApp() {
  const sw = lire("sw.js");
  const liste = sw.match(/const FICHIERS = \[([\s\S]*?)\];/)?.[1];
  if (!liste) throw new Error("Liste FICHIERS introuvable dans sw.js");
  const fichiers = [...liste.matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((f) => f !== "./");
  return [...fichiers, "sw.js"];
}

/** Contrat de format, avec des consignes génériques à la place de celles du propriétaire. */
function formatPourLeKit() {
  const contrat = lire("docs/format-echange.md");
  const debut = contrat.indexOf("## 9. Consignes de traitement");
  const fin = contrat.indexOf("## 10. ");
  if (debut === -1 || fin === -1) throw new Error("Section 9 introuvable dans docs/format-echange.md");
  return contrat.slice(0, debut) + lire("kit/docs/section-consignes.md") + contrat.slice(fin);
}

function zipper(source, destination) {
  rmSync(destination, { force: true });
  if (process.platform === "win32") {
    execFileSync("powershell.exe", ["-NoProfile", "-Command",
      `Compress-Archive -Path '${source}' -DestinationPath '${destination}' -Force`], { stdio: "inherit" });
  } else {
    execFileSync("zip", ["-rq", destination, NOM_KIT], { cwd: dirname(source), stdio: "inherit" });
  }
}

function verifierKit() {
  const validateur = join(kit, "outils", "valider-retour.mjs");
  const exemples = join(kit, "exemples");
  execFileSync(process.execPath, [validateur,
    join(exemples, "exemple-retour.json"), join(exemples, "exemple-complet.json")], { stdio: "inherit" });
  const manquants = fichiersDeLApp().filter((f) => !existsSync(join(kit, "app", f)));
  if (manquants.length > 0) throw new Error(`Fichiers de l'app manquants : ${manquants.join(", ")}`);
}

// ------------------------------------------------------------ construction

const version = lire("js/version.js").match(/VERSION = "([^"]+)"/)[1];
const prompt = lire("kit/prompt.txt").trim();

rmSync(kit, { recursive: true, force: true });
mkdirSync(kit, { recursive: true });

copier("kit/CLAUDE.md", "CLAUDE.md");
copier("kit/installation", "installation");
ecrire("docs/format-echange.md", formatPourLeKit());
copier("kit/outils/valider-retour.mjs", "outils/valider-retour.mjs");
copier("js/format.js", "outils/lib/format.mjs");
copier("exemples/exemple-complet.json", "exemples/exemple-complet.json");
copier("exemples/exemple-retour.json", "exemples/exemple-retour.json");
for (const fichier of fichiersDeLApp()) copier(fichier, join("app", fichier));
ecrire("COMMENCER-ICI.txt",
  `Application Réseau — kit version ${version}\n\n` +
  "1. Placez ce dossier dans un dossier synchronisé avec votre iPhone (iCloud Drive, OneDrive, Google Drive ou Dropbox).\n" +
  "2. Ouvrez Claude Code avec ce dossier comme dossier de travail.\n" +
  "3. Copiez le message ci-dessous dans Claude Code, puis laissez-vous guider.\n\n" +
  `${prompt}\n`);

verifierKit();
zipper(kit, join(dossierSortie, `${NOM_KIT}.zip`));
rmSync(kit, { recursive: true, force: true });

const guide = lire("kit/guide-amis.html")
  .replaceAll("{{VERSION}}", version)
  .replaceAll("{{PROMPT}}", echapperHtml(prompt));
writeFileSync(join(dossierSortie, "Application-Reseau-guide.html"), guide);

console.log(`Kit ${version} construit dans ${dossierSortie}`);
