import { h, icone, groupe } from "../dom.js";
import { dateHeure, ilYA } from "../dates.js";
import { choisir, demander, informer } from "../dialogue.js";
import { consigner, lireErreurs } from "../journal.js";
import { partagerFichier, telechargerFichier, copierTexte } from "../partage.js";
import { etatSauvegarde } from "../sauvegarde.js";
import { VERSION } from "../version.js";
import {
  lireDonnees, preparerExport, confirmerExport, examinerImport, appliquerImport, annulerDernierImport,
} from "../magasin.js";

const MAX_ERREURS_AFFICHEES = 5;

// ---------------------------------------------------------------- export

/** Feuille de partage d'abord ; sinon téléchargement ou copie, chacun dans son propre geste. */
async function exporter() {
  const { nom, texte } = preparerExport();
  let methode = await partagerFichier(nom, texte);
  if (methode === "annule") return;
  if (methode === "indisponible") {
    methode = await choisir({
      titre: "Enregistrer la sauvegarde",
      lignes: ["Le partage direct n'est pas disponible ici.", nom],
      actions: [
        { libelle: "Télécharger le fichier", valeur: "telechargement", style: "principal",
          executer: () => telechargerFichier(nom, texte) },
        { libelle: "Copier le contenu", valeur: "copie",
          executer: () => copierTexte(texte).catch(consigner) },
        { libelle: "Annuler", valeur: null },
      ],
    });
    if (!methode) return;
  }
  await confirmerExport();
  if (methode === "copie") {
    await informer("Contenu copié", ["Collez-le dans un fichier ou directement dans une conversation avec Claude."]);
  }
}

// ---------------------------------------------------------------- import

function decrireBilan(bilan) {
  return [
    `${bilan.personnes} personne(s) dans la base.`,
    `${bilan.notes_traitees} note(s) marquée(s) comme traitée(s).`,
    `${bilan.notes_en_attente} note(s) encore en attente.`,
    bilan.elements_locaux_conserves > 0
      ? `${bilan.elements_locaux_conserves} élément(s) modifié(s) sur le téléphone après l'export : conservé(s).`
      : null,
  ].filter(Boolean);
}

async function importer(fichierChoisi) {
  const examen = examinerImport(await fichierChoisi.text());
  if (!examen.ok) {
    const visibles = examen.messages.slice(0, MAX_ERREURS_AFFICHEES);
    const reste = examen.messages.length - visibles.length;
    await informer("Fichier refusé", [
      "Rien n'a été modifié sur le téléphone.",
      ...visibles,
      reste > 0 ? `… et ${reste} autre(s) erreur(s).` : null,
    ].filter(Boolean));
    return;
  }
  if (examen.type === "restauration") {
    const accord = await demander({
      titre: "Restaurer cette sauvegarde ?",
      lignes: [
        "Ce fichier a la même révision que les données du téléphone.",
        "Les notes saisies depuis seront conservées.",
      ],
      confirmer: "Restaurer",
    });
    if (!accord) return;
  }
  const bilan = await appliquerImport(examen.fichier, examen.type, fichierChoisi.name);
  await informer("Import réussi", decrireBilan(bilan));
}

async function annuler() {
  const accord = await demander({
    titre: "Annuler le dernier import ?",
    lignes: ["Le téléphone revient à l'état d'avant l'import. Les notes saisies depuis sont conservées."],
    confirmer: "Annuler l'import",
    danger: true,
  });
  if (accord) await annulerDernierImport();
}

/** Un <label> autour du champ : le toucher ouvre le sélecteur iOS sans script. */
function boutonFichier(libelle, classe, accepter, surChoix) {
  const champ = h("input", { type: "file", classe: "champ-cache", accept: accepter });
  champ.addEventListener("change", () => {
    const [fichier] = champ.files;
    champ.value = "";
    if (fichier) surChoix(fichier);
  });
  return h("label", { classe }, champ, libelle);
}

// ---------------------------------------------------------------- affichage

function ligneInfo(libelle, valeur) {
  return h("div", { classe: "ligne info" },
    h("span", { classe: "info-libelle", texte: libelle }),
    h("span", { classe: "info-valeur", texte: valeur }));
}

function blocSauvegarde(meta, proteger) {
  const suivi = etatSauvegarde(meta, new Date());
  const quand = suivi.jamais ? "Jamais" : `${dateHeure(meta.derniere_sauvegarde_le)} (${ilYA(meta.derniere_sauvegarde_le)})`;
  return h("section", { classe: "bloc" },
    h("h2", { classe: "entete-section", texte: "Sauvegarde" }),
    h("div", { classe: "groupe" },
      ligneInfo("Dernière sauvegarde", quand),
      ligneInfo("Modifications non sauvegardées", suivi.a_sauvegarder ? "Oui" : "Non")),
    suivi.ancienne && h("p", { classe: "note-section avertissement",
      texte: `Sauvegarde à refaire : ${suivi.jours} jours sans export.` }),
    h("button", { classe: "bouton principal grand", type: "button", onclick: proteger(exporter) },
      icone("sauvegarde"), "Exporter"),
    h("p", { classe: "note-section", texte: "Enregistrez le fichier dans OneDrive, puis donnez-le à Claude." }));
}

function blocImport(meta, instantanes, proteger) {
  const dernier = meta.dernier_import;
  return h("section", { classe: "bloc" },
    h("h2", { classe: "entete-section", texte: "Retour de Claude" }),
    boutonFichier("Importer un fichier", "bouton secondaire grand", ".json,application/json", proteger(importer)),
    boutonFichier("Fichier grisé ? Choisir parmi tous les fichiers", "lien centre", null, proteger(importer)),
    dernier && h("div", { classe: "groupe espace" },
      ligneInfo("Dernier import", dateHeure(dernier.le)),
      ligneInfo("Révision", String(dernier.revision))),
    instantanes.length > 0 && h("button",
      { classe: "lien danger centre", type: "button", onclick: proteger(annuler), texte: "Annuler le dernier import" }));
}

function blocDiagnostic(etat, contexte) {
  const erreurs = lireErreurs();
  return groupe("Diagnostic", [
    ligneInfo("Version de l'app", VERSION),
    ligneInfo("Révision des données", String(etat.revision)),
    ligneInfo("Notes / personnes", `${etat.notes_brutes.length} / ${etat.personnes.length}`),
    ligneInfo("App installée", contexte.installee ? "Oui" : "Non (ouverte dans le navigateur)"),
    ligneInfo("Stockage protégé", contexte.persistant ? "Oui" : "Non garanti"),
    ligneInfo("Hors ligne prêt", contexte.horsLigne ? "Oui" : "Pas encore"),
    ...erreurs.map((erreur) => ligneInfo(`Erreur ${dateHeure(erreur.le)}`, erreur.message)),
  ]);
}

export function ecranSauvegarde({ contexte, rafraichir }) {
  const { etat, meta, instantanes } = lireDonnees();
  // Toute erreur inattendue est montrée à l'écran et consignée, jamais avalée.
  const proteger = (action) => async (...arguments_) => {
    try {
      await action(...arguments_);
    } catch (erreur) {
      consigner(erreur);
      await informer("Une erreur est survenue", [erreur.message, "Rien n'a été perdu : réessayez."]);
      rafraichir();
    }
  };

  const element = h("div", { classe: "ecran" },
    h("div", { classe: "defilant" },
      h("h1", { classe: "grand-titre", texte: "Sauvegarde" }),
      blocSauvegarde(meta, proteger),
      blocImport(meta, instantanes, proteger),
      blocDiagnostic(etat, contexte)));
  return { element };
}
