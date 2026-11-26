import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { analyserTexte } from "../../js/format.js";

const exemple = (nom) => fileURLToPath(new URL(`../../exemples/${nom}`, import.meta.url));
const EXPORT_R3 = exemple("exemple-complet.json");
const RETOUR_R4 = exemple("exemple-retour.json");

const zoneNote = (page) => page.getByLabel("Texte de la note");
const onglet = (page, nom) => page.locator("#onglets").getByRole("button", { name: nom, exact: true });
const feuille = (page) => page.locator("dialog.feuille");
const diagnostic = (page, libelle) =>
  page.locator(".ligne.info", { hasText: libelle }).locator(".info-valeur");

async function ecrireNote(page, texte) {
  await page.getByRole("button", { name: "Nouvelle note" }).click();
  await expect(zoneNote(page)).toBeFocused();
  await zoneNote(page).fill(texte);
  await expect(page.getByText("Enregistré", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Terminé" }).click();
  await expect(page.getByRole("heading", { name: "Accueil" })).toBeVisible();
}

async function importer(page, fichier) {
  await onglet(page, "Sauvegarde").click();
  await page.locator("label.bouton input[type=file]").setInputFiles(fichier);
  await expect(feuille(page)).toBeVisible();
}

const fermerFeuille = (page) => feuille(page).getByRole("button", { name: "OK" }).click();

test.beforeEach(async ({ page }) => {
  // Le partage natif n'existe pas ici : on vérifie le repli par téléchargement.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Accueil" })).toBeVisible();
});

test("une note saisie s'enregistre seule et survit au rechargement", async ({ page }) => {
  await ecrireNote(page, "Camille, kiné, joue en compétition.");
  await expect(page.locator(".compteur")).toHaveText("1");

  await page.reload();
  await page.getByRole("button", { name: /Notes à traiter/ }).click();
  await expect(page.getByText("Camille, kiné, joue en compétition.")).toBeVisible();
});

test("une note vidée disparaît", async ({ page }) => {
  await ecrireNote(page, "À effacer");
  await page.getByRole("button", { name: /Notes à traiter/ }).click();
  await page.getByText("À effacer").click();
  await zoneNote(page).fill("");
  await page.getByRole("button", { name: "Terminé" }).click();
  await expect(page.getByText("Aucune note en attente")).toBeVisible();
});

test("l'export par téléchargement produit un fichier valide et daté", async ({ page }) => {
  await ecrireNote(page, "Note à exporter");
  await onglet(page, "Sauvegarde").click();
  await expect(diagnostic(page, "Modifications non sauvegardées")).toHaveText("Oui");

  await page.getByRole("button", { name: "Exporter" }).click();
  const [telechargement] = await Promise.all([
    page.waitForEvent("download"),
    feuille(page).getByRole("button", { name: "Télécharger le fichier" }).click(),
  ]);

  expect(telechargement.suggestedFilename()).toMatch(/^reseau-export-\d{4}-\d{2}-\d{2}-\d{4}-r0000\.json$/);
  const analyse = analyserTexte(readFileSync(await telechargement.path(), "utf8"));
  expect(analyse.erreurs).toEqual([]);
  expect(analyse.fichier.notes_brutes.map((note) => note.texte)).toEqual(["Note à exporter"]);
  await expect(diagnostic(page, "Modifications non sauvegardées")).toHaveText("Non");
});

test("l'import ne touche pas à une note saisie après l'export", async ({ page }) => {
  await ecrireNote(page, "Saisie après l'export");
  await importer(page, RETOUR_R4);
  await expect(feuille(page)).toContainText("Import réussi");
  await expect(feuille(page)).toContainText("3 personne(s) dans la base.");
  await expect(feuille(page)).toContainText("1 note(s) encore en attente.");
  await fermerFeuille(page);

  await onglet(page, "Accueil").click();
  await page.getByRole("button", { name: /Notes à traiter/ }).click();
  await expect(page.getByText("Saisie après l'export")).toBeVisible();
  await expect(page.locator("button.ligne")).toHaveCount(1);
});

test("un fichier plus ancien ou abîmé est refusé sans rien modifier", async ({ page }) => {
  await importer(page, RETOUR_R4);
  await fermerFeuille(page);

  await importer(page, EXPORT_R3);
  await expect(feuille(page)).toContainText("Fichier refusé");
  await expect(feuille(page)).toContainText("plus ancien");
  await fermerFeuille(page);

  await importer(page, { name: "abime.json", mimeType: "application/json", buffer: Buffer.from('{"format": "appli') });
  await expect(feuille(page)).toContainText("Fichier refusé");
  await expect(feuille(page)).toContainText("abîmé");
  await fermerFeuille(page);

  await expect(diagnostic(page, "Révision des données")).toHaveText("4");
});

test("annuler le dernier import ramène à l'état précédent", async ({ page }) => {
  await importer(page, RETOUR_R4);
  await fermerFeuille(page);
  await expect(diagnostic(page, "Révision des données")).toHaveText("4");

  await page.getByRole("button", { name: "Annuler le dernier import" }).click();
  await feuille(page).getByRole("button", { name: "Annuler l'import" }).click();

  await expect(diagnostic(page, "Révision des données")).toHaveText("0");
  await expect(diagnostic(page, "Notes / personnes")).toHaveText("0 / 0");
});

test("un événement reçoit ses notes, et la série se prépare", async ({ page }) => {
  await importer(page, RETOUR_R4);
  await fermerFeuille(page);
  await onglet(page, "Accueil").click();

  await page.getByRole("button", { name: "Nouvel événement" }).click();
  await page.locator("select").first().selectOption({ label: "Afterwork du club de paddle (paddle)" });
  await page.getByRole("button", { name: "Créer" }).click();
  await expect(page.getByRole("heading", { name: "Afterwork du club de paddle" })).toBeVisible();

  await page.getByRole("button", { name: "Nouvelle note" }).click();
  await expect(page.locator(".rattachement-valeur")).toHaveText("Afterwork du club de paddle");
  await zoneNote(page).fill("Note de l'édition du jour");
  await expect(page.getByText("Enregistré", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Terminé" }).click();
  await expect(page.getByText("Note de l'édition du jour")).toBeVisible();

  await page.getByRole("checkbox", { name: /Hugo Marchetti/ }).click();
  await expect(page.getByText("Personnes croisées (1)")).toBeVisible();

  await onglet(page, "Préparer").click();
  await expect(page.getByText("Déjà croisées à cette série (3)")).toBeVisible();
  await expect(page.locator(".carte .principal").first()).toHaveText("Hugo Marchetti");
});

test("la recherche trouve une personne par un mot de sa fiche", async ({ page }) => {
  await importer(page, RETOUR_R4);
  await fermerFeuille(page);
  await onglet(page, "Personnes").click();
  await expect(page.locator("button.ligne")).toHaveCount(3);

  await page.getByLabel("Rechercher une personne").fill("osteo");
  await expect(page.locator("button.ligne")).toHaveCount(1);
  await page.locator("button.ligne").click();
  await expect(page.getByRole("heading", { name: "Camille Vasseur" })).toBeVisible();
  await expect(page.getByText("Historique des échanges")).toBeVisible();
});

test("l'app redémarre hors ligne avec ses données", async ({ page, context }) => {
  await ecrireNote(page, "Écrite avant la coupure");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload(); // la page est désormais servie par le service worker

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole("heading", { name: "Accueil" })).toBeVisible();
  await expect(page.locator(".compteur")).toHaveText("1");
  await ecrireNote(page, "Écrite hors ligne");
  await expect(page.locator(".compteur")).toHaveText("2");
});

test("après un export, l'accueil propose d'importer le retour de Claude", async ({ page }) => {
  await ecrireNote(page, "Note à faire traiter");
  await expect(page.getByText("Retour de Claude à importer")).toHaveCount(0);

  await onglet(page, "Sauvegarde").click();
  await page.getByRole("button", { name: "Exporter" }).click();
  await Promise.all([
    page.waitForEvent("download"),
    feuille(page).getByRole("button", { name: "Télécharger le fichier" }).click(),
  ]);

  await onglet(page, "Accueil").click();
  const bandeau = page.locator("label.alerte.retour");
  await expect(bandeau).toContainText("Retour de Claude à importer");

  // Le retour d'exemple (révision 4) est plus récent que l'export (révision 0).
  await bandeau.locator("input[type=file]").setInputFiles(RETOUR_R4);
  await expect(feuille(page)).toContainText("Import réussi");
  await fermerFeuille(page);

  await expect(bandeau).toHaveCount(0);
  await expect(page.getByText("Cette semaine")).toBeVisible();
});
