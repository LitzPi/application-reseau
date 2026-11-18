import { h, groupe, barreNavigation } from "../dom.js";
import { dateHeure } from "../dates.js";
import { lireDonnees } from "../magasin.js";
import { notesNonTraitees } from "../notes.js";

const LONGUEUR_EXTRAIT = 120;

function extrait(texte) {
  const propre = texte.replace(/\s+/g, " ").trim();
  return propre.length > LONGUEUR_EXTRAIT ? `${propre.slice(0, LONGUEUR_EXTRAIT)}…` : propre;
}

function ligneNote(note, naviguer) {
  return h("button", { classe: "ligne", type: "button", onclick: () => naviguer(`/note/${note.id}`) },
    h("span", { classe: "ligne-texte" },
      h("span", { classe: "principal note-extrait", texte: extrait(note.texte) }),
      h("span", { classe: "detail", texte: dateHeure(note.saisie_le) })),
    h("span", { classe: "chevron", texte: "›", "aria-hidden": "true" }));
}

export function ecranNotes({ naviguer }) {
  const notes = notesNonTraitees(lireDonnees().etat);
  const contenu = notes.length === 0
    ? h("p", { classe: "vide", texte: "Aucune note en attente. Les notes traitées par Claude disparaissent de cette liste." })
    : groupe(null, notes.map((note) => ligneNote(note, naviguer)),
      "Ces notes restent ici tant que Claude ne les a pas traitées.");

  const element = h("div", { classe: "ecran" },
    barreNavigation({ titre: "Notes à traiter", retour: { libelle: "Accueil", aller: () => naviguer("/") } }),
    h("div", { classe: "defilant" }, contenu));
  return { element };
}
