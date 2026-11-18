// Génère les icônes PNG de l'app (aucune dépendance).
// Usage : node outils/generer-icones.js
// Dessin : deux silhouettes blanches sur fond bleu nuit, plein cadre (iOS arrondit lui-même).

import { deflateSync, crc32 } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TAILLES = [180, 192, 512];
const SUR_ECHANTILLONNAGE = 3;
const HAUT = [58, 91, 240];
const BAS = [26, 47, 158];
const SILHOUETTES = [
  { cx: 0.645, cy: 0.47, echelle: 0.9, opacite: 0.5 },
  { cx: 0.43, cy: 0.52, echelle: 1.05, opacite: 1 },
];

function dansSilhouette(u, v, { cx, cy, echelle }) {
  const tete = Math.hypot(u - cx, v - (cy - 0.17 * echelle)) <= 0.115 * echelle;
  const baseCorps = cy + 0.22 * echelle;
  const corps = v <= baseCorps
    && ((u - cx) / (0.21 * echelle)) ** 2 + ((v - baseCorps) / (0.24 * echelle)) ** 2 <= 1;
  return tete || corps;
}

function couleur(u, v) {
  let rvb = HAUT.map((haut, i) => haut + (BAS[i] - haut) * v);
  for (const silhouette of SILHOUETTES) {
    if (dansSilhouette(u, v, silhouette)) {
      rvb = rvb.map((canal) => canal + (255 - canal) * silhouette.opacite);
    }
  }
  return rvb;
}

function pixel(x, y, taille) {
  const somme = [0, 0, 0];
  for (let dy = 0; dy < SUR_ECHANTILLONNAGE; dy += 1) {
    for (let dx = 0; dx < SUR_ECHANTILLONNAGE; dx += 1) {
      const u = (x + (dx + 0.5) / SUR_ECHANTILLONNAGE) / taille;
      const v = (y + (dy + 0.5) / SUR_ECHANTILLONNAGE) / taille;
      couleur(u, v).forEach((canal, i) => { somme[i] += canal; });
    }
  }
  return somme.map((canal) => Math.round(canal / SUR_ECHANTILLONNAGE ** 2));
}

function bloc(type, donnees) {
  const corps = Buffer.concat([Buffer.from(type, "ascii"), donnees]);
  const longueur = Buffer.alloc(4);
  longueur.writeUInt32BE(donnees.length);
  const controle = Buffer.alloc(4);
  controle.writeUInt32BE(crc32(corps));
  return Buffer.concat([longueur, corps, controle]);
}

function png(taille) {
  const largeurLigne = taille * 3 + 1;
  const brut = Buffer.alloc(largeurLigne * taille);
  for (let y = 0; y < taille; y += 1) {
    for (let x = 0; x < taille; x += 1) {
      pixel(x, y, taille).forEach((canal, i) => { brut[y * largeurLigne + 1 + x * 3 + i] = canal; });
    }
  }
  const entete = Buffer.alloc(13);
  entete.writeUInt32BE(taille, 0);
  entete.writeUInt32BE(taille, 4);
  entete.set([8, 2, 0, 0, 0], 8); // 8 bits, RVB sans transparence
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloc("IHDR", entete),
    bloc("IDAT", deflateSync(brut, { level: 9 })),
    bloc("IEND", Buffer.alloc(0)),
  ]);
}

const dossier = fileURLToPath(new URL("../icons/", import.meta.url));
mkdirSync(dossier, { recursive: true });
for (const taille of TAILLES) {
  writeFileSync(`${dossier}icone-${taille}.png`, png(taille));
  console.log(`icons/icone-${taille}.png`);
}
