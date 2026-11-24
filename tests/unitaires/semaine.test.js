import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { etatVide, fusionner } from "../../js/fusion.js";
import {
  joursEntre, prochainAnniversaire, anniversairesAVenir, suivisAVenir, cetteSemaine, libelleEcheance,
} from "../../js/semaine.js";

const lire = (nom) =>
  JSON.parse(readFileSync(new URL(`../../exemples/${nom}`, import.meta.url), "utf8"));
const base = () => fusionner(etatVide(), lire("exemple-retour.json")).etat;
const jour = (annee, mois, numero) => new Date(annee, mois - 1, numero, 9, 30);

test("le nombre de jours entre deux dates ignore l'heure et le changement d'heure", () => {
  assert.equal(joursEntre("2026-11-24", "2026-11-24"), 0);
  assert.equal(joursEntre("2026-03-28", "2026-03-30"), 2); // passage à l'heure d'été
  assert.equal(joursEntre("2026-12-28", "2027-01-02"), 5);
  assert.equal(joursEntre("2026-11-24", "2026-11-20"), -4);
});

test("un anniversaire à venir cette année", () => {
  assert.deepEqual(prochainAnniversaire("--11-27", "2026-11-24"),
    { date: "2026-11-27", dans_jours: 3, age: null });
});

test("un anniversaire le jour même compte pour aujourd'hui", () => {
  assert.deepEqual(prochainAnniversaire("1984-11-24", "2026-11-24"),
    { date: "2026-11-24", dans_jours: 0, age: 42 });
});

test("un anniversaire déjà passé est reporté à l'année suivante", () => {
  assert.deepEqual(prochainAnniversaire("1984-07-02", "2026-11-24"),
    { date: "2027-07-02", dans_jours: 220, age: 43 });
});

test("le passage d'année est géré", () => {
  assert.deepEqual(prochainAnniversaire("--01-02", "2026-12-28"),
    { date: "2027-01-02", dans_jours: 5, age: null });
});

test("un anniversaire du 29 février se fête le 28 les années non bissextiles", () => {
  assert.deepEqual(prochainAnniversaire("--02-29", "2027-02-01"),
    { date: "2027-02-28", dans_jours: 27, age: null });
  assert.deepEqual(prochainAnniversaire("1992-02-29", "2028-02-01"),
    { date: "2028-02-29", dans_jours: 28, age: 36 });
  // Le 1er mars d'une année non bissextile : c'est passé, on vise l'année suivante (bissextile).
  assert.deepEqual(prochainAnniversaire("--02-29", "2027-03-01"),
    { date: "2028-02-29", dans_jours: 365, age: null });
});

test("sans date d'anniversaire, rien n'est calculé", () => {
  assert.equal(prochainAnniversaire(null, "2026-11-24"), null);
});

test("les anniversaires à venir sont triés par date, sans les personnes sans date", () => {
  const etat = base();
  const sansDate = { ...etat.personnes[0], id: "per_aaaaaaaa-0000-4000-8000-000000000001", anniversaire: null };
  const liste = anniversairesAVenir({ ...etat, personnes: [...etat.personnes, sansDate] }, jour(2026, 11, 20));
  assert.deepEqual(liste.map((a) => [a.personne.prenom, a.date, a.dans_jours]), [
    ["Thomas", "2026-11-21", 1],
    ["Camille", "2027-03-14", 114],
    ["Hugo", "2027-07-02", 224],
  ]);
});

test("les suivis à venir : ouverts et datés seulement, les plus anciens d'abord", () => {
  const etat = base();
  const suivis = suivisAVenir(etat, jour(2026, 11, 24));
  assert.deepEqual(suivis.map((s) => [s.personne.prenom, s.suivi.action, s.dans_jours]),
    [["Camille", "Lui envoyer le nom de mon ostéo", 6]]);
});

test("cette semaine : anniversaires et suivis des 7 prochains jours, suivis en retard compris", () => {
  const etat = base();
  const semaine = cetteSemaine(etat, jour(2026, 11, 20));
  assert.deepEqual(semaine.anniversaires.map((a) => a.personne.prenom), ["Thomas"]);
  assert.deepEqual(semaine.suivis, []); // le suivi du 30 est à 10 jours

  const plusTard = cetteSemaine(etat, jour(2026, 11, 24));
  assert.deepEqual(plusTard.anniversaires, []);
  assert.deepEqual(plusTard.suivis.map((s) => s.dans_jours), [6]);

  const enRetard = cetteSemaine(etat, jour(2026, 12, 3));
  assert.deepEqual(enRetard.suivis.map((s) => [s.suivi.action, s.dans_jours]),
    [["Lui envoyer le nom de mon ostéo", -3]]);
});

test("la limite de la semaine est incluse : dans 7 jours oui, dans 8 non", () => {
  const etat = base();
  assert.equal(cetteSemaine(etat, jour(2026, 11, 14)).anniversaires.length, 1);
  assert.equal(cetteSemaine(etat, jour(2026, 11, 13)).anniversaires.length, 0);
});

test("le libellé d'échéance est en clair", () => {
  assert.equal(libelleEcheance(0, "2026-11-24"), "aujourd'hui");
  assert.equal(libelleEcheance(1, "2026-11-25"), "demain");
  assert.equal(libelleEcheance(4, "2026-11-28"), "samedi");
  assert.equal(libelleEcheance(-1, "2026-11-23"), "en retard d'1 jour");
  assert.equal(libelleEcheance(-3, "2026-11-21"), "en retard de 3 jours");
  assert.equal(libelleEcheance(40, "2027-01-03"), "3 janv.");
});
