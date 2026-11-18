import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  VERSION_SCHEMA,
  analyserTexte,
  validerFichier,
  estAnniversaire,
  nomFichierExport,
} from "../../js/format.js";

const lire = (nom) => readFileSync(new URL(`../../exemples/${nom}`, import.meta.url), "utf8");
const exemple = () => JSON.parse(lire("exemple-complet.json"));
const codes = (resultat) => resultat.erreurs.map((e) => e.code);

test("l'exemple d'export est valide", () => {
  const resultat = validerFichier(exemple());
  assert.deepEqual(resultat.erreurs, []);
  assert.equal(resultat.ok, true);
});

test("l'exemple de retour de Claude est valide", () => {
  const resultat = analyserTexte(lire("exemple-retour.json"));
  assert.deepEqual(resultat.erreurs, []);
  assert.equal(resultat.fichier.origine, "claude");
});

test("le document de format contient l'exemple de retour à l'identique", () => {
  const doc = readFileSync(new URL("../../docs/format-echange.md", import.meta.url), "utf8");
  const blocs = [...doc.matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => m[1]);
  const dernier = JSON.parse(blocs.at(-1));
  assert.deepEqual(dernier, JSON.parse(lire("exemple-retour.json")));
});

test("un texte abîmé est refusé avec un message clair", () => {
  const resultat = analyserTexte(lire("exemple-complet.json").slice(0, 400));
  assert.equal(resultat.ok, false);
  assert.deepEqual(codes(resultat), ["json_illisible"]);
});

test("un JSON qui n'est pas un fichier de l'app est refusé", () => {
  assert.deepEqual(codes(validerFichier({ bonjour: 1 })), ["format"]);
  assert.deepEqual(codes(validerFichier([1, 2])), ["structure"]);
});

test("une version de schéma plus récente que l'app est refusée", () => {
  const fichier = { ...exemple(), schema_version: VERSION_SCHEMA + 1 };
  const resultat = validerFichier(fichier);
  assert.deepEqual(codes(resultat), ["version_inconnue"]);
  assert.match(resultat.erreurs[0].message, /Mettez l'app à jour/);
});

test("une collection manquante est refusée", () => {
  const fichier = exemple();
  delete fichier.series;
  assert.deepEqual(codes(validerFichier(fichier)), ["collection_manquante"]);
});

test("un identifiant en double est refusé", () => {
  const fichier = exemple();
  fichier.notes_brutes.push({ ...fichier.notes_brutes[0] });
  assert.ok(codes(validerFichier(fichier)).includes("identifiant_double"));
});

test("un identifiant au mauvais préfixe est refusé", () => {
  const fichier = exemple();
  fichier.contextes[0].id = "per_5d0c8a51-2f6e-4b7a-9a11-3c1e7f2b9d01";
  assert.ok(codes(validerFichier(fichier)).includes("identifiant"));
});

test("une référence vers un élément absent est refusée", () => {
  const fichier = exemple();
  fichier.notes_brutes[1].evenement_id = "evt_00000000-0000-4000-8000-000000000000";
  const resultat = validerFichier(fichier);
  assert.deepEqual(codes(resultat), ["reference"]);
  assert.match(resultat.erreurs[0].chemin, /notes_brutes\[1\]\.evenement_id/);
});

test("un horodatage ou une date invalide est refusé", () => {
  const fichier = exemple();
  fichier.evenements[0].date = "2026-02-30";
  fichier.notes_brutes[0].saisie_le = "hier soir";
  assert.deepEqual(codes(validerFichier(fichier)), ["date", "horodatage"]);
});

test("l'anniversaire accepte une date avec ou sans année", () => {
  assert.equal(estAnniversaire(null), true);
  assert.equal(estAnniversaire("--03-14"), true);
  assert.equal(estAnniversaire("--02-29"), true);
  assert.equal(estAnniversaire("1984-07-02"), true);
  assert.equal(estAnniversaire("--02-30"), false);
  assert.equal(estAnniversaire("14/03"), false);
});

test("un fichier de Claude doit indiquer l'export dont il part", () => {
  const fichier = { ...exemple(), origine: "claude", base_exporte_le: null };
  assert.deepEqual(codes(validerFichier(fichier)), ["base_exporte_le"]);
});

test("Claude ne peut pas postdater un contexte, une série ou un événement", () => {
  const fichier = JSON.parse(lire("exemple-retour.json"));
  fichier.evenements[0].modifie_le = "2026-11-13T09:10:00Z";
  const resultat = validerFichier(fichier);
  assert.deepEqual(codes(resultat), ["horodatage_app"]);
  assert.match(resultat.erreurs[0].chemin, /evenements\[0\]\.modifie_le/);
});

test("une note traitée doit porter sa date de traitement", () => {
  const fichier = exemple();
  fichier.notes_brutes[1].statut = "traitee";
  assert.deepEqual(codes(validerFichier(fichier)), ["horodatage"]);
});

test("un statut de suivi inconnu est refusé", () => {
  const fichier = exemple();
  fichier.personnes[0].suivis[0].statut = "en attente";
  assert.deepEqual(codes(validerFichier(fichier)), ["valeur"]);
});

test("les champs inconnus sont acceptés (évolution du modèle)", () => {
  const fichier = exemple();
  fichier.personnes[0].linkedin = "https://exemple.invalid/camille";
  fichier.champ_futur = { a: 1 };
  assert.equal(validerFichier(fichier).ok, true);
});

test("les champs texte facultatifs d'une personne peuvent manquer", () => {
  const fichier = exemple();
  delete fichier.personnes[0].metier;
  fichier.personnes[0].entreprise = null;
  assert.equal(validerFichier(fichier).ok, true);
});

test("le nom du fichier d'export est daté et porte la révision", () => {
  const nom = nomFichierExport(new Date(2026, 10, 13, 8, 5), 7);
  assert.equal(nom, "reseau-export-2026-11-13-0805-r0007.json");
});
