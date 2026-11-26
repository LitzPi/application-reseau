import { test } from "node:test";
import assert from "node:assert/strict";

import { etatVide } from "../../js/fusion.js";
import { creerNote, modifierNote, supprimerNote } from "../../js/notes.js";
import {
  MAX_INSTANTANES, metaVide, marquerModification, marquerSauvegarde,
  etatSauvegarde, empilerInstantane, annulerImport, marquerExport, marquerImport, retourAttendu,
} from "../../js/sauvegarde.js";

const jour = (n) => new Date(Date.parse("2026-11-01T09:00:00.000Z") + n * 24 * 60 * 60 * 1000);

test("sans aucune saisie, il n'y a rien à sauvegarder", () => {
  const suivi = etatSauvegarde(metaVide(), jour(30));
  assert.deepEqual(suivi, { jamais: true, a_sauvegarder: false, jours: 0, ancienne: false });
});

test("une saisie jamais exportée devient une sauvegarde ancienne après 7 jours", () => {
  const meta = marquerModification(metaVide(), jour(0));
  assert.equal(etatSauvegarde(meta, jour(6)).ancienne, false);
  const suivi = etatSauvegarde(meta, jour(7));
  assert.equal(suivi.ancienne, true);
  assert.equal(suivi.jours, 7);
  assert.equal(suivi.jamais, true);
});

test("la première modification non sauvegardée fait référence, pas la dernière", () => {
  const meta = marquerModification(marquerModification(metaVide(), jour(0)), jour(6));
  assert.equal(etatSauvegarde(meta, jour(8)).ancienne, true);
});

test("un export remet le compteur à zéro", () => {
  const meta = marquerSauvegarde(marquerModification(metaVide(), jour(0)), jour(10));
  assert.deepEqual(etatSauvegarde(meta, jour(30)),
    { jamais: false, a_sauvegarder: false, jours: 20, ancienne: false });
});

test("une sauvegarde vieille de 7 jours avec de nouvelles saisies est signalée", () => {
  const sauvegarde = marquerSauvegarde(metaVide(), jour(0));
  const meta = marquerModification(sauvegarde, jour(1));
  assert.equal(etatSauvegarde(meta, jour(6)).ancienne, false);
  assert.equal(etatSauvegarde(meta, jour(7)).ancienne, true);
});

test("seuls les derniers instantanés sont conservés", () => {
  let instantanes = [];
  for (let i = 0; i < MAX_INSTANTANES + 2; i += 1) {
    instantanes = empilerInstantane(instantanes, { ...etatVide(), revision: i }, metaVide(), jour(i));
  }
  assert.equal(instantanes.length, MAX_INSTANTANES);
  assert.equal(instantanes.at(-1).etat.revision, MAX_INSTANTANES + 1);
});

test("annuler un import rétablit l'état précédent", () => {
  const avant = creerNote({ ...etatVide(), revision: 3 }, "note d'origine", jour(0)).etat;
  const [instantane] = empilerInstantane([], avant, metaVide(), jour(1));
  const apresImport = {
    ...avant,
    revision: 4,
    personnes: [{ id: "per_x" }],
    notes_brutes: avant.notes_brutes.map((n) => ({ ...n, statut: "traitee", traitee_le: jour(1).toISOString() })),
  };

  const retabli = annulerImport(apresImport, instantane);

  assert.deepEqual(retabli, avant);
});

test("annuler un import conserve ce qui a été saisi depuis", () => {
  const depart = creerNote(etatVide(), "ancienne", jour(0));
  const aSupprimer = creerNote(depart.etat, "à supprimer", jour(0));
  const avant = aSupprimer.etat;
  const [instantane] = empilerInstantane([], avant, metaVide(), jour(1));

  let courant = { ...avant, revision: 1 };
  courant = modifierNote(courant, depart.note.id, "ancienne, complétée", jour(2));
  courant = supprimerNote(courant, aSupprimer.note.id);
  const nouvelle = creerNote(courant, "saisie après l'import", jour(2));

  const retabli = annulerImport(nouvelle.etat, instantane);

  assert.equal(retabli.revision, 0);
  assert.deepEqual(retabli.notes_brutes.map((n) => n.texte).toSorted(),
    ["ancienne, complétée", "saisie après l'import"]);
  assert.deepEqual(retabli.notes_supprimees, [aSupprimer.note.id]);
});

test("après un export, un retour de Claude est attendu", () => {
  const meta = marquerExport(metaVide(), jour(0), 3);
  assert.deepEqual(retourAttendu(meta), { depuis: jour(0).toISOString(), revision: 3 });
  assert.equal(etatSauvegarde(meta, jour(1)).a_sauvegarder, false);
});

test("sans export, aucun retour n'est attendu", () => {
  assert.equal(retourAttendu(metaVide()), null);
});

test("importer un retour plus récent que l'export lève l'attente", () => {
  const meta = marquerExport(metaVide(), jour(0), 3);
  assert.equal(retourAttendu(marquerImport(meta, 4)), null);
});

test("restaurer une sauvegarde de même révision ne lève pas l'attente", () => {
  const meta = marquerExport(metaVide(), jour(0), 3);
  assert.notEqual(retourAttendu(marquerImport(meta, 3)), null);
});

test("un nouvel export remplace l'attente précédente", () => {
  const premier = marquerExport(metaVide(), jour(0), 3);
  const second = marquerExport(premier, jour(2), 3);
  assert.equal(retourAttendu(second).depuis, jour(2).toISOString());
});
