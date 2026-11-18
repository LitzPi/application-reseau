import { h, icone, pastille, groupe } from "../dom.js";
import { ilYA } from "../dates.js";
import { lireDonnees } from "../magasin.js";
import { notesNonTraitees } from "../notes.js";
import { etatSauvegarde } from "../sauvegarde.js";

function texteSauvegarde(meta, suivi) {
  if (suivi.jamais) return suivi.a_sauvegarder ? "Jamais sauvegardé" : "Rien à sauvegarder";
  return `Dernière sauvegarde ${ilYA(meta.derniere_sauvegarde_le)}`;
}

function alerteSauvegarde(suivi, naviguer) {
  if (!suivi.ancienne) return null;
  const depuis = suivi.jamais ? "Aucune sauvegarde" : "Sauvegarde ancienne";
  return h("button", { classe: "alerte", type: "button", onclick: () => naviguer("/sauvegarde") },
    pastille("sauvegarde"),
    h("span", { classe: "ligne-texte" },
      h("span", { classe: "principal", texte: `${depuis} : ${suivi.jours} jours` }),
      h("span", { classe: "detail", texte: "Exporter maintenant pour ne rien perdre" })),
    h("span", { classe: "chevron", texte: "›", "aria-hidden": "true" }));
}

export function ecranAccueil({ naviguer }) {
  const { etat, meta } = lireDonnees();
  const enAttente = notesNonTraitees(etat).length;
  const suivi = etatSauvegarde(meta, new Date());

  const ligneNotes = h("button", { classe: "ligne", type: "button", onclick: () => naviguer("/notes") },
    pastille("note"),
    h("span", { classe: "ligne-texte" },
      h("span", { classe: "principal", texte: "Notes à traiter" }),
      h("span", { classe: "detail", texte: texteSauvegarde(meta, suivi) })),
    h("span", { classe: "compteur", texte: String(enAttente) }),
    h("span", { classe: "chevron", texte: "›", "aria-hidden": "true" }));

  const element = h("div", { classe: "ecran" },
    h("div", { classe: "defilant" },
      h("h1", { classe: "grand-titre", texte: "Accueil" }),
      alerteSauvegarde(suivi, naviguer),
      groupe("En attente", [ligneNotes])),
    h("div", { classe: "pied" },
      h("button", { classe: "bouton principal grand", type: "button", onclick: () => naviguer("/note/nouvelle") },
        icone("plus"), "Nouvelle note")));

  return { element };
}
