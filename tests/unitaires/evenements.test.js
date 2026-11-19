import { test } from "node:test";
import assert from "node:assert/strict";

import { validerFichier } from "../../js/format.js";
import { etatVide, construireExport, fusionner } from "../../js/fusion.js";
import { creerNote, rattacherNote, trouverNote } from "../../js/notes.js";
import {
  dateLocale, creerContexte, creerSerie, creerEvenement, basculerPresence,
  trouverEvenement, titreEvenement, evenementsRecents, evenementDuJour, notesDeLEvenement,
} from "../../js/evenements.js";

const T1 = new Date(2026, 10, 12, 18, 0);
const T2 = new Date(2026, 10, 12, 19, 30);
const PER = "per_aaaaaaaa-0000-4000-8000-000000000001";

/** Un contexte, une série et un événement daté du 12 novembre 2026. */
function scene() {
  const c = creerContexte(etatVide(), "paddle", T1);
  const s = creerSerie(c.etat, "Afterwork du club", c.contexte.id, T1);
  const e = creerEvenement(s.etat, { titre: "", date: dateLocale(T1), serieId: s.serie.id }, T1);
  return { etat: e.etat, contexte: c.contexte, serie: s.serie, evenement: e.evenement };
}

test("la date locale est au format AAAA-MM-JJ", () => {
  assert.equal(dateLocale(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
});

test("un contexte de même nom n'est pas créé deux fois", () => {
  const premier = creerContexte(etatVide(), "Paddle", T1);
  const second = creerContexte(premier.etat, "  paddle ", T2);
  assert.equal(second.contexte.id, premier.contexte.id);
  assert.equal(second.etat.contextes.length, 1);
});

test("une série de même nom dans le même contexte n'est pas créée deux fois", () => {
  const { etat, contexte, serie } = scene();
  const encore = creerSerie(etat, "afterwork du club", contexte.id, T2);
  assert.equal(encore.serie.id, serie.id);
  const autre = creerContexte(etat, "pro", T2);
  const ailleurs = creerSerie(autre.etat, "Afterwork du club", autre.contexte.id, T2);
  assert.notEqual(ailleurs.serie.id, serie.id);
});

test("un événement créé dans l'app donne un export valide", () => {
  const { etat, evenement } = scene();
  const avecNote = creerNote(etat, "Camille, kiné", T2, evenement.id).etat;
  const resultat = validerFichier(construireExport(avecNote, T2));
  assert.deepEqual(resultat.erreurs, []);
  assert.equal(resultat.fichier.notes_brutes[0].evenement_id, evenement.id);
  assert.equal(resultat.fichier.evenements[0].serie_id, etat.series[0].id);
});

test("un événement sans titre prend le nom de sa série", () => {
  const { etat, evenement } = scene();
  assert.equal(titreEvenement(etat, evenement), "Afterwork du club");
  const isole = creerEvenement(etat, { titre: "", date: "2026-11-05" }, T1).evenement;
  assert.equal(titreEvenement(etat, isole), "Événement");
  const nomme = creerEvenement(etat, { titre: " Salon ", date: "2026-11-05" }, T1).evenement;
  assert.equal(titreEvenement(etat, nomme), "Salon");
});

test("cocher puis décocher une personne met à jour les présents et la date de modification", () => {
  const { etat, evenement } = scene();
  const coche = basculerPresence(etat, evenement.id, PER, T2);
  assert.deepEqual(trouverEvenement(coche, evenement.id).personne_ids, [PER]);
  assert.equal(trouverEvenement(coche, evenement.id).modifie_le, T2.toISOString());
  const decoche = basculerPresence(coche, evenement.id, PER, T2);
  assert.deepEqual(trouverEvenement(decoche, evenement.id).personne_ids, []);
  assert.deepEqual(trouverEvenement(etat, evenement.id).personne_ids, []);
});

test("l'événement du jour est le dernier créé à la date d'aujourd'hui", () => {
  const { etat, evenement } = scene();
  assert.equal(evenementDuJour(etat, T2).id, evenement.id);
  const second = creerEvenement(etat, { titre: "Dîner", date: dateLocale(T1) }, T2);
  assert.equal(evenementDuJour(second.etat, T2).id, second.evenement.id);
  assert.equal(evenementDuJour(etat, new Date(2026, 10, 13, 9, 0)), null);
});

test("les événements sont listés du plus récent au plus ancien", () => {
  const { etat } = scene();
  const ancien = creerEvenement(etat, { titre: "Ancien", date: "2026-10-08" }, T2).etat;
  const futur = creerEvenement(ancien, { titre: "Futur", date: "2026-12-10" }, T2).etat;
  assert.deepEqual(evenementsRecents(futur).map((e) => e.date), ["2026-12-10", "2026-11-12", "2026-10-08"]);
});

test("rattacher une note à un événement, puis la détacher", () => {
  const { etat, evenement } = scene();
  const { etat: avecNote, note } = creerNote(etat, "isolée", T1);
  const rattachee = rattacherNote(avecNote, note.id, evenement.id, T2);
  assert.equal(trouverNote(rattachee, note.id).evenement_id, evenement.id);
  assert.equal(trouverNote(rattachee, note.id).modifie_le, T2.toISOString());
  assert.deepEqual(notesDeLEvenement(rattachee, evenement.id).map((n) => n.id), [note.id]);
  const detachee = rattacherNote(rattachee, note.id, null, T2);
  assert.deepEqual(notesDeLEvenement(detachee, evenement.id), []);
});

test("un événement créé sur le téléphone survit à un import qui ne le connaît pas", () => {
  const exporte = construireExport(etatVide(), new Date(2026, 10, 12, 17, 0));
  const { etat, evenement, serie, contexte } = scene();
  const retour = { ...exporte, origine: "claude", revision: 1, base_exporte_le: exporte.exporte_le };

  const fusion = fusionner(etat, retour).etat;

  assert.ok(trouverEvenement(fusion, evenement.id));
  assert.deepEqual(fusion.series.map((s) => s.id), [serie.id]);
  assert.deepEqual(fusion.contextes.map((c) => c.id), [contexte.id]);
});
