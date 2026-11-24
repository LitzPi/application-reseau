// Boîtes de dialogue de l'app (pas d'alert/confirm du navigateur).

import { h } from "./dom.js";

let compteur = 0;

/**
 * Affiche une feuille avec un titre, des paragraphes et des boutons.
 * Chaque action : { libelle, valeur, style?, executer? }. `executer` est appelé
 * directement dans le geste de l'utilisateur (nécessaire pour télécharger ou copier).
 * @returns {Promise<any>} la valeur du bouton choisi, ou null si la feuille est fermée.
 */
export function choisir({ titre, lignes = [], actions }) {
  return new Promise((resoudre) => {
    const fermer = (valeur) => {
      feuille.close();
      feuille.remove();
      resoudre(valeur);
    };
    const boutons = actions.map((action) =>
      h("button", {
        type: "button",
        classe: `bouton ${action.style ?? "secondaire"}`,
        texte: action.libelle,
        onclick: () => {
          action.executer?.();
          fermer(action.valeur);
        },
      }));
    const idTitre = `feuille-titre-${(compteur += 1)}`;
    const feuille = h("dialog", {
      classe: "feuille", "aria-labelledby": idTitre,
      oncancel: (e) => { e.preventDefault(); fermer(null); },
    },
      h("h2", { classe: "feuille-titre", id: idTitre, texte: titre }),
      lignes.map((ligne) => h("p", { classe: "feuille-texte", texte: ligne })),
      h("div", { classe: "feuille-actions" }, boutons));
    document.body.append(feuille);
    feuille.showModal();
  });
}

export function informer(titre, lignes = []) {
  return choisir({ titre, lignes, actions: [{ libelle: "OK", valeur: true, style: "principal" }] });
}

export function demander({ titre, lignes = [], confirmer, danger = false }) {
  return choisir({
    titre,
    lignes,
    actions: [
      { libelle: confirmer, valeur: true, style: danger ? "danger" : "principal" },
      { libelle: "Annuler", valeur: false },
    ],
  }).then((valeur) => valeur === true);
}
