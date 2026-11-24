import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { etatVide, fusionner } from "../../js/fusion.js";
import { nomComplet } from "../../js/personnes.js";
import { preparerSerie, preparerContexte, ficheCourte, premierePhrase } from "../../js/preparer.js";

const lire = (nom) =>
  JSON.parse(readFileSync(new URL(`../../exemples/${nom}`, import.meta.url), "utf8"));
const base = () => fusionner(etatVide(), lire("exemple-retour.json")).etat;

const serie = (etat, nom) => etat.series.find((s) => s.nom === nom);
const contexte = (etat, nom) => etat.contextes.find((c) => c.nom === nom);
const personne = (etat, prenom) => etat.personnes.find((p) => p.prenom === prenom);

test("pour une série : d'abord les personnes déjà croisées, la plus récente en premier", () => {
  const etat = base();
  const { dejaCroisees } = preparerSerie(etat, serie(etat, "Afterwork du club de paddle").id);
  // Camille : octobre et novembre. Thomas : novembre. Hugo : octobre seulement.
  assert.deepEqual(dejaCroisees.map((e) => [nomComplet(e.personne), e.editions, e.derniere]), [
    ["Thomas Reynaud", 1, "2026-11-12"],
    ["Camille Vasseur", 2, "2026-11-12"],
    ["Hugo Marchetti", 1, "2026-10-08"],
  ]);
});

test("pour une série : ensuite le reste du contexte, sans doublon", () => {
  const etat = base();
  const inconnue = { ...personne(etat, "Thomas"), id: "per_aaaaaaaa-0000-4000-8000-000000000001", prenom: "Inès", nom: "Caradec" };
  const horsContexte = { ...inconnue, id: "per_aaaaaaaa-0000-4000-8000-000000000002", prenom: "Marc", nom: "Autre",
    contexte_ids: [contexte(etat, "pro").id] };
  const elargi = { ...etat, personnes: [...etat.personnes, inconnue, horsContexte] };

  const preparation = preparerSerie(elargi, serie(elargi, "Afterwork du club de paddle").id);

  assert.equal(preparation.contexte.nom, "paddle");
  assert.equal(preparation.dejaCroisees.length, 3);
  assert.deepEqual(preparation.resteDuContexte.map(nomComplet), ["Inès Caradec"]);
});

test("une série sans édition passée ne propose que le contexte", () => {
  const etat = base();
  const preparation = preparerSerie(etat, serie(etat, "Petit-déjeuner des dirigeants").id);
  assert.deepEqual(preparation.dejaCroisees, []);
  assert.deepEqual(preparation.resteDuContexte.map(nomComplet), ["Hugo Marchetti"]);
});

test("une série inconnue ne renvoie rien", () => {
  assert.equal(preparerSerie(base(), "ser_inconnue"), null);
});

test("pour un contexte : toutes ses personnes, triées par nom", () => {
  const etat = base();
  assert.deepEqual(preparerContexte(etat, contexte(etat, "paddle").id).map(nomComplet),
    ["Hugo Marchetti", "Thomas Reynaud", "Camille Vasseur"]);
  assert.deepEqual(preparerContexte(etat, contexte(etat, "pro").id).map(nomComplet), ["Hugo Marchetti"]);
});

test("la fiche courte donne métier, dernier sujet, un détail et le suivi en cours", () => {
  const etat = base();
  assert.deepEqual(ficheCourte(personne(etat, "Camille")), {
    nom: "Camille Vasseur",
    metier: "Kinésithérapeute · Cabinet Vasseur",
    dernierSujet: "A parlé de l'entrée en sixième de sa fille Lou.",
    detail: "Joue en compétition régionale.",
    suivi: "Lui envoyer le nom de mon ostéo",
  });
});

test("la fiche courte laisse vides les rubriques sans contenu", () => {
  const vide = { ...personne(base(), "Hugo"), metier: "", entreprise: null, details_personnels: undefined,
    echanges: [], suivis: [] };
  assert.deepEqual(ficheCourte(vide),
    { nom: "Hugo Marchetti", metier: null, dernierSujet: null, detail: null, suivi: null });
});

test("un suivi déjà fait n'est pas « en cours »", () => {
  const camille = personne(base(), "Camille");
  const tousFaits = { ...camille, suivis: camille.suivis.map((s) => ({ ...s, statut: "fait" })) };
  assert.equal(ficheCourte(tousFaits).suivi, null);
});

test("le détail personnel est la première phrase", () => {
  assert.equal(premierePhrase("Deux enfants, passionné de voile. Habite Lyon."), "Deux enfants, passionné de voile.");
  assert.equal(premierePhrase("Sans point final"), "Sans point final");
  assert.equal(premierePhrase("  "), null);
  assert.equal(premierePhrase(null), null);
});
