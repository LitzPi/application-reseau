// Vérifie un fichier de l'Application Réseau avant de le remettre à l'utilisateur.
//
//   node outils/valider-retour.mjs <fichier>
//       Contrôle le format d'un export ou d'un retour.
//   node outils/valider-retour.mjs <retour> <export>
//       Contrôle aussi que le retour respecte les droits de Claude par rapport à l'export traité.
//
// Code de sortie : 0 si tout est bon, 1 sinon.

import { readFileSync } from "node:fs";
import { analyserTexte } from "./lib/format.mjs";

const [cheminFichier, cheminExport] = process.argv.slice(2);
if (!cheminFichier) {
  console.error("Usage : node outils/valider-retour.mjs <fichier> [export d'origine]");
  process.exit(1);
}

function charger(chemin) {
  let texte;
  try {
    texte = readFileSync(chemin, "utf8");
  } catch (erreur) {
    console.error(`Lecture impossible de ${chemin} : ${erreur.message}`);
    process.exit(1);
  }
  const analyse = analyserTexte(texte);
  if (!analyse.ok) {
    console.error(`${chemin} : fichier INVALIDE`);
    for (const e of analyse.erreurs) console.error(`  - ${e.message}${e.chemin ? ` (${e.chemin})` : ""}`);
    process.exit(1);
  }
  return analyse.fichier;
}

const fichier = charger(cheminFichier);
const notes = fichier.notes_brutes;
console.log(`${cheminFichier} : format valide`);
console.log(`  origine ${fichier.origine}, révision ${fichier.revision}, ` +
  `${fichier.personnes.length} personne(s), ${notes.length} note(s) dont ` +
  `${notes.filter((n) => n.statut !== "traitee").length} non traitée(s)`);

if (!cheminExport) process.exit(0);

// ------------------------------------------------------------ droits de Claude

const exporte = charger(cheminExport);
const ecarts = [];
const avertissements = [];
const verifier = (condition, message) => { if (!condition) ecarts.push(message); };
const parId = (liste) => new Map(liste.map((e) => [e.id, e]));

verifier(fichier.origine === "claude", "« origine » doit valoir « claude ».");
verifier(fichier.revision === exporte.revision + 1,
  `« revision » doit valoir ${exporte.revision + 1} (révision de l'export + 1).`);
verifier(fichier.base_exporte_le === exporte.exporte_le,
  "« base_exporte_le » doit recopier exactement le « exporte_le » de l'export.");

const notesRecues = parId(fichier.notes_brutes);
for (const note of exporte.notes_brutes) {
  const recue = notesRecues.get(note.id);
  if (!recue) {
    ecarts.push(`Note supprimée : ${note.id}.`);
    continue;
  }
  for (const champ of ["texte", "saisie_le", "modifie_le", "evenement_id"]) {
    verifier(recue[champ] === note[champ], `Note ${note.id} : le champ « ${champ} » a été modifié.`);
  }
  verifier(!(note.statut === "traitee" && recue.statut !== "traitee"),
    `Note ${note.id} : une note traitée ne peut pas redevenir non traitée.`);
}
verifier(fichier.notes_brutes.length === exporte.notes_brutes.length, "Claude ne doit pas créer de note.");

const evenementsRecus = parId(fichier.evenements);
for (const evenement of exporte.evenements) {
  const recu = evenementsRecus.get(evenement.id);
  if (!recu) {
    ecarts.push(`Événement supprimé : ${evenement.id}.`);
    continue;
  }
  for (const champ of ["titre", "date", "cree_le", "modifie_le"]) {
    verifier(recu[champ] === evenement[champ], `Événement ${evenement.id} : le champ « ${champ} » a été modifié.`);
  }
  const retires = evenement.personne_ids.filter((id) => !recu.personne_ids.includes(id));
  if (retires.length > 0) {
    avertissements.push(`Événement ${evenement.id} : ${retires.length} présent(s) retiré(s). ` +
      "Admis seulement pour suivre la fusion de deux fiches en double.");
  }
}
verifier(fichier.evenements.length === exporte.evenements.length, "Claude ne doit pas créer d'événement.");

const personnesRecues = parId(fichier.personnes);
const disparues = exporte.personnes.filter((p) => !personnesRecues.has(p.id));
if (disparues.length > 0) {
  avertissements.push(`${disparues.length} fiche(s) supprimée(s). Admis seulement pour fusionner des doublons.`);
}

for (const message of avertissements) console.log(`  À vérifier : ${message}`);
if (ecarts.length > 0) {
  console.error("Droits de Claude NON respectés :");
  for (const message of ecarts) console.error(`  - ${message}`);
  process.exit(1);
}
const traitees = fichier.notes_brutes.filter((n) => n.statut === "traitee").length
  - exporte.notes_brutes.filter((n) => n.statut === "traitee").length;
console.log(`Droits de Claude respectés. ${traitees} note(s) passée(s) à « traitée ».`);
