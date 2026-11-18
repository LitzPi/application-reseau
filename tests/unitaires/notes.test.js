import { test } from "node:test";
import assert from "node:assert/strict";

import { validerFichier } from "../../js/format.js";
import { etatVide, construireExport } from "../../js/fusion.js";
import {
  creerNote, modifierNote, supprimerNote, trouverNote, notesNonTraitees,
} from "../../js/notes.js";

const T1 = new Date("2026-11-18T10:00:00.000Z");
const T2 = new Date("2026-11-18T10:05:00.000Z");

test("une note créée est non traitée, isolée et horodatée", () => {
  const { etat, note } = creerNote(etatVide(), "Camille, kiné", T1);
  assert.match(note.id, /^not_[0-9a-f-]{36}$/);
  assert.equal(note.statut, "non_traitee");
  assert.equal(note.evenement_id, null);
  assert.equal(note.saisie_le, T1.toISOString());
  assert.deepEqual(etat.notes_brutes, [note]);
});

test("créer une note ne modifie pas l'état reçu", () => {
  const depart = etatVide();
  creerNote(depart, "texte", T1);
  assert.deepEqual(depart, etatVide());
});

test("modifier une note change son texte et sa date de modification seulement", () => {
  const { etat, note } = creerNote(etatVide(), "avant", T1);
  const apres = modifierNote(etat, note.id, "après", T2);
  const modifiee = trouverNote(apres, note.id);
  assert.equal(modifiee.texte, "après");
  assert.equal(modifiee.modifie_le, T2.toISOString());
  assert.equal(modifiee.saisie_le, T1.toISOString());
  assert.equal(trouverNote(etat, note.id).texte, "avant");
});

test("supprimer une note retient son identifiant", () => {
  const { etat, note } = creerNote(etatVide(), "à supprimer", T1);
  const apres = supprimerNote(etat, note.id);
  assert.deepEqual(apres.notes_brutes, []);
  assert.deepEqual(apres.notes_supprimees, [note.id]);
  assert.equal(supprimerNote(apres, note.id), apres);
});

test("les notes en attente sont listées de la plus récente à la plus ancienne", () => {
  let etat = etatVide();
  const premiere = creerNote(etat, "première", T1);
  const seconde = creerNote(premiere.etat, "seconde", T2);
  etat = {
    ...seconde.etat,
    notes_brutes: [
      ...seconde.etat.notes_brutes,
      { ...premiere.note, id: "not_aaaaaaaa-0000-4000-8000-000000000001", statut: "traitee", traitee_le: T2.toISOString() },
    ],
  };
  assert.deepEqual(notesNonTraitees(etat).map((n) => n.texte), ["seconde", "première"]);
});

test("un export contenant des notes saisies dans l'app est un fichier valide", () => {
  const { etat } = creerNote(etatVide(), "note de test", T1);
  const resultat = validerFichier(construireExport(etat, T2));
  assert.deepEqual(resultat.erreurs, []);
});
