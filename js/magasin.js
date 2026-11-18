// État de l'app en mémoire, synchronisé avec le stockage local.
// Les écrans lisent via lireDonnees() et agissent via les fonctions exportées.

import { lire, ecrire } from "./stockage.js";
import { consigner } from "./journal.js";
import { analyserTexte, nomFichierExport } from "./format.js";
import { etatVide, construireExport, controlerRevision, fusionner } from "./fusion.js";
import { creerNote, modifierNote, supprimerNote } from "./notes.js";
import {
  metaVide, marquerModification, marquerSauvegarde, empilerInstantane, annulerImport,
} from "./sauvegarde.js";

let donnees = { etat: etatVide(), meta: metaVide(), instantanes: [] };
const abonnes = new Set();

export const lireDonnees = () => donnees;

export function abonner(fonction) {
  abonnes.add(fonction);
  return () => abonnes.delete(fonction);
}

function publier(partiel) {
  donnees = { ...donnees, ...partiel };
  for (const fonction of abonnes) fonction();
}

export async function charger() {
  const lu = await lire(["etat", "meta", "instantanes"]);
  publier({
    etat: { ...etatVide(), ...lu.etat },
    meta: { ...metaVide(), ...lu.meta },
    instantanes: lu.instantanes ?? [],
  });
}

/** Saisie : la mémoire est mise à jour tout de suite, le stockage suit. */
function modifierLocalement(etat) {
  const partiel = { etat, meta: marquerModification(donnees.meta, new Date()) };
  publier(partiel);
  ecrire(partiel).catch(consigner);
}

/** Import et annulation : on n'adopte le nouvel état que s'il est bien écrit. */
async function remplacer(partiel) {
  await ecrire(partiel);
  publier(partiel);
}

// ---------------------------------------------------------------- notes

export function ajouterNote(texte) {
  const { etat, note } = creerNote(donnees.etat, texte, new Date());
  modifierLocalement(etat);
  return note.id;
}

export function changerNote(id, texte) {
  modifierLocalement(modifierNote(donnees.etat, id, texte, new Date()));
}

export function retirerNote(id) {
  modifierLocalement(supprimerNote(donnees.etat, id));
}

// ---------------------------------------------------------------- export

/** Synchrone : doit pouvoir être suivi d'un partage dans le même geste. */
export function preparerExport() {
  const maintenant = new Date();
  const fichier = construireExport(donnees.etat, maintenant);
  return {
    nom: nomFichierExport(maintenant, donnees.etat.revision),
    texte: JSON.stringify(fichier, null, 2),
  };
}

export function confirmerExport() {
  return remplacer({ meta: marquerSauvegarde(donnees.meta, new Date()) });
}

// ---------------------------------------------------------------- import

/** Valide un fichier sans rien modifier. */
export function examinerImport(texte) {
  const analyse = analyserTexte(texte);
  if (!analyse.ok) return { ok: false, messages: analyse.erreurs.map(decrireErreur) };
  const controle = controlerRevision(donnees.etat, analyse.fichier);
  if (!controle.ok) return { ok: false, messages: [controle.message] };
  return { ok: true, fichier: analyse.fichier, type: controle.type };
}

function decrireErreur(erreur) {
  return erreur.chemin ? `${erreur.message} (${erreur.chemin})` : erreur.message;
}

/** Garde une copie de l'état actuel, puis applique le fichier. Tout ou rien. */
export async function appliquerImport(fichier, type, nom) {
  const maintenant = new Date();
  const { etat, bilan } = fusionner(donnees.etat, fichier);
  const resteAExporter = bilan.notes_en_attente > 0 || bilan.elements_locaux_conserves > 0;
  const meta = {
    ...donnees.meta,
    modifs_depuis_sauvegarde: resteAExporter,
    premiere_modif_le: resteAExporter ? donnees.meta.premiere_modif_le ?? maintenant.toISOString() : null,
    dernier_import: { le: maintenant.toISOString(), nom, type, revision: fichier.revision, bilan },
  };
  await remplacer({
    etat,
    meta,
    instantanes: empilerInstantane(donnees.instantanes, donnees.etat, donnees.meta, maintenant),
  });
  return bilan;
}

export async function annulerDernierImport() {
  const instantane = donnees.instantanes.at(-1);
  if (!instantane) return false;
  await remplacer({
    etat: annulerImport(donnees.etat, instantane),
    meta: { ...instantane.meta, ...sauvegardeActuelle() },
    instantanes: donnees.instantanes.slice(0, -1),
  });
  return true;
}

/** L'annulation d'un import ne doit pas effacer le suivi de la sauvegarde. */
function sauvegardeActuelle() {
  const { derniere_sauvegarde_le, modifs_depuis_sauvegarde, premiere_modif_le } = donnees.meta;
  return { derniere_sauvegarde_le, modifs_depuis_sauvegarde, premiere_modif_le };
}
