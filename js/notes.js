// Opérations sur les notes brutes. Fonctions pures : elles renvoient un nouvel état.

import { PREFIXES } from "./format.js";

export function nouvelIdentifiant(collection) {
  return `${PREFIXES[collection]}_${crypto.randomUUID()}`;
}

export function creerNote(etat, texte, maintenant, evenementId = null) {
  const instant = maintenant.toISOString();
  const note = {
    id: nouvelIdentifiant("notes_brutes"),
    texte,
    saisie_le: instant,
    modifie_le: instant,
    evenement_id: evenementId,
    statut: "non_traitee",
    traitee_le: null,
  };
  return { etat: { ...etat, notes_brutes: [...etat.notes_brutes, note] }, note };
}

export function modifierNote(etat, id, texte, maintenant) {
  const notes = etat.notes_brutes.map((note) =>
    note.id === id ? { ...note, texte, modifie_le: maintenant.toISOString() } : note);
  return { ...etat, notes_brutes: notes };
}

/** Supprime la note et retient son identifiant pour qu'un import ne la ramène pas. */
export function supprimerNote(etat, id) {
  if (!etat.notes_brutes.some((note) => note.id === id)) return etat;
  return {
    ...etat,
    notes_brutes: etat.notes_brutes.filter((note) => note.id !== id),
    notes_supprimees: [...new Set([...etat.notes_supprimees, id])],
  };
}

export function trouverNote(etat, id) {
  return etat.notes_brutes.find((note) => note.id === id) ?? null;
}

/** Notes en attente de traitement, la plus récente d'abord. */
export function notesNonTraitees(etat) {
  return etat.notes_brutes
    .filter((note) => note.statut !== "traitee")
    .toSorted((a, b) => Date.parse(b.saisie_le) - Date.parse(a.saisie_le));
}
