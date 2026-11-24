import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { etatVide, fusionner } from "../../js/fusion.js";
import {
  nomComplet, normaliserTexte, trierPersonnes, rechercherPersonnes,
  echangesRecents, suivisOuverts, formaterAnniversaire,
} from "../../js/personnes.js";

const lire = (nom) =>
  JSON.parse(readFileSync(new URL(`../../exemples/${nom}`, import.meta.url), "utf8"));
const base = () => fusionner(etatVide(), lire("exemple-retour.json")).etat;
const noms = (personnes) => personnes.map(nomComplet);

test("le texte est comparé sans accents ni majuscules", () => {
  assert.equal(normaliserTexte("  Kinésithérapeute À L'ŒUVRE "), "kinesitherapeute a l'œuvre");
});

test("sans recherche, toutes les personnes sont listées par nom puis prénom", () => {
  assert.deepEqual(noms(rechercherPersonnes(base(), "")),
    ["Hugo Marchetti", "Thomas Reynaud", "Camille Vasseur"]);
});

test("la recherche porte sur le nom, le métier et l'entreprise", () => {
  const etat = base();
  assert.deepEqual(noms(rechercherPersonnes(etat, "vasseur")), ["Camille Vasseur"]);
  assert.deepEqual(noms(rechercherPersonnes(etat, "ARCHITECTE")), ["Thomas Reynaud"]);
  assert.deepEqual(noms(rechercherPersonnes(etat, "transports")), ["Hugo Marchetti"]);
});

test("la recherche ignore les accents", () => {
  assert.deepEqual(noms(rechercherPersonnes(base(), "kinesitherapeute")), ["Camille Vasseur"]);
});

test("la recherche porte aussi sur les détails, les échanges, les suivis et les contextes", () => {
  const etat = base();
  assert.deepEqual(noms(rechercherPersonnes(etat, "voile")), ["Hugo Marchetti"]);
  assert.deepEqual(noms(rechercherPersonnes(etat, "sixième")), ["Camille Vasseur"]);
  assert.deepEqual(noms(rechercherPersonnes(etat, "ostéo")), ["Camille Vasseur"]);
  assert.deepEqual(noms(rechercherPersonnes(etat, "pro")), ["Hugo Marchetti"]);
});

test("plusieurs mots doivent tous être présents, dans n'importe quel champ", () => {
  const etat = base();
  assert.deepEqual(noms(rechercherPersonnes(etat, "paddle architecte")), ["Thomas Reynaud"]);
  assert.deepEqual(noms(rechercherPersonnes(etat, "hugo recrute")), ["Hugo Marchetti"]);
  assert.deepEqual(noms(rechercherPersonnes(etat, "camille architecte")), []);
});

test("un début de mot suffit", () => {
  assert.deepEqual(noms(rechercherPersonnes(base(), "archi")), ["Thomas Reynaud"]);
});

test("la recherche reste exacte et rapide sur 200 personnes", () => {
  const etat = base();
  const modele = etat.personnes[0];
  const foule = Array.from({ length: 200 }, (_, i) => ({
    ...modele,
    id: `per_00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    prenom: `Prénom${i}`,
    nom: `Nom${i}`,
    metier: i % 10 === 0 ? "Notaire" : "Consultant",
    details_personnels: i === 137 ? "Collectionne les cartes anciennes" : "",
  }));
  const grand = { ...etat, personnes: foule };
  const debut = performance.now();
  const notaires = rechercherPersonnes(grand, "notaire");
  const cartes = rechercherPersonnes(grand, "cartes anciennes");
  const duree = performance.now() - debut;
  assert.equal(notaires.length, 20);
  assert.deepEqual(noms(cartes), ["Prénom137 Nom137"]);
  assert.ok(duree < 200, `recherche trop lente : ${duree} ms`);
});

test("le tri ne modifie pas la liste reçue", () => {
  const etat = base();
  const avant = noms(etat.personnes);
  trierPersonnes(etat.personnes);
  assert.deepEqual(noms(etat.personnes), avant);
});

test("les échanges sont listés du plus récent au plus ancien", () => {
  const camille = base().personnes.find((p) => p.prenom === "Camille");
  assert.deepEqual(echangesRecents(camille).map((e) => e.date), ["2026-11-12", "2026-10-08"]);
});

test("seuls les suivis ouverts sont « en cours »", () => {
  const camille = base().personnes.find((p) => p.prenom === "Camille");
  assert.deepEqual(suivisOuverts(camille).map((s) => s.action), ["Lui envoyer le nom de mon ostéo"]);
});

test("l'anniversaire s'affiche avec ou sans année", () => {
  assert.equal(formaterAnniversaire("--03-14"), "14 mars");
  assert.equal(formaterAnniversaire("1984-07-02"), "2 juillet 1984");
  assert.equal(formaterAnniversaire(null), null);
});
