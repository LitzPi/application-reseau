// Import d'un fichier de Claude, partagé par l'écran Sauvegarde et le bandeau de l'accueil.

import { h } from "./dom.js";
import { demander, informer } from "./dialogue.js";
import { consigner } from "./journal.js";
import { examinerImport, appliquerImport } from "./magasin.js";

const MAX_ERREURS_AFFICHEES = 5;

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

/** Valide, demande confirmation si besoin, applique, puis affiche le bilan. */
export async function importerFichier(fichierChoisi) {
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

/**
 * Enveloppe une action : toute erreur inattendue est montrée à l'écran et consignée,
 * jamais avalée. `apresErreur` permet de redessiner l'écran.
 */
export function proteger(action, apresErreur = () => {}) {
  return async (...arguments_) => {
    try {
      await action(...arguments_);
    } catch (erreur) {
      consigner(erreur);
      await informer("Une erreur est survenue", [erreur.message, "Rien n'a été perdu : réessayez."]);
      apresErreur();
    }
  };
}

/**
 * Un <label> autour d'un champ de fichier caché : le toucher ouvre le sélecteur iOS
 * sans script, ce qui est le seul moyen fiable dans une web app installée.
 */
export function boutonFichier({ classe, accepter = null, surChoix }, ...contenu) {
  const champ = h("input", { type: "file", classe: "champ-cache", accept: accepter });
  champ.addEventListener("change", () => {
    const [fichier] = champ.files;
    champ.value = "";
    if (fichier) surChoix(fichier);
  });
  return h("label", { classe }, champ, ...contenu);
}
