import { h, icone, groupe, barreNavigation } from "../dom.js";
import { dateHeure, dateLongue } from "../dates.js";
import { lireDonnees, changerPresence } from "../magasin.js";
import { trouverEvenement, titreEvenement, notesDeLEvenement, libelleSerie } from "../evenements.js";

const LONGUEUR_EXTRAIT = 120;

function extrait(texte) {
  const propre = texte.replace(/\s+/g, " ").trim();
  return propre.length > LONGUEUR_EXTRAIT ? `${propre.slice(0, LONGUEUR_EXTRAIT)}…` : propre;
}

function ligneNote(note, naviguer) {
  const etat = note.statut === "traitee" ? " · traitée" : "";
  return h("button", { classe: "ligne", type: "button", onclick: () => naviguer(`/note/${note.id}`) },
    h("span", { classe: "ligne-texte" },
      h("span", { classe: "principal note-extrait", texte: extrait(note.texte) }),
      h("span", { classe: "detail", texte: `${dateHeure(note.saisie_le)}${etat}` })),
    h("span", { classe: "chevron", texte: "›", "aria-hidden": "true" }));
}

function nomComplet(personne) {
  return `${personne.prenom} ${personne.nom}`.trim();
}

function lignePersonne(personne, present, evenementId) {
  return h("button", {
    classe: "ligne", type: "button", role: "checkbox", "aria-checked": String(present),
    onclick: () => changerPresence(evenementId, personne.id),
  },
    h("span", { classe: `coche${present ? " active" : ""}` }, present && icone("coche")),
    h("span", { classe: "ligne-texte" },
      h("span", { classe: "principal", texte: nomComplet(personne) }),
      personne.metier && h("span", { classe: "detail", texte: personne.metier })));
}

function blocPersonnes(etat, evenement) {
  if (etat.personnes.length === 0) {
    return h("section", { classe: "bloc" },
      h("h2", { classe: "entete-section", texte: "Personnes croisées" }),
      h("p", { classe: "note-section",
        texte: "Les personnes apparaîtront ici après le premier traitement de vos notes par Claude." }));
  }
  const presents = new Set(evenement.personne_ids);
  const personnes = etat.personnes.toSorted((a, b) => nomComplet(a).localeCompare(nomComplet(b), "fr"));
  return groupe(`Personnes croisées (${presents.size})`,
    personnes.map((personne) => lignePersonne(personne, presents.has(personne.id), evenement.id)),
    "Touchez une personne pour la cocher ou la décocher.");
}

export function ecranEvenement({ params, naviguer }) {
  const { etat } = lireDonnees();
  const evenement = trouverEvenement(etat, params[0]);
  const retour = { libelle: "Accueil", aller: () => naviguer("/") };
  if (!evenement) {
    return { element: h("div", { classe: "ecran" },
      barreNavigation({ titre: "Événement", retour }),
      h("p", { classe: "vide", texte: "Cet événement n'existe plus." })) };
  }

  const serie = etat.series.find((s) => s.id === evenement.serie_id);
  const notes = notesDeLEvenement(etat, evenement.id);
  const sousTitre = [dateLongue(evenement.date), serie && libelleSerie(etat, serie)].filter(Boolean).join(" · ");

  const element = h("div", { classe: "ecran" },
    barreNavigation({ titre: "Événement", retour }),
    h("div", { classe: "defilant" },
      h("h1", { classe: "grand-titre serre", texte: titreEvenement(etat, evenement) }),
      h("p", { classe: "sous-titre", texte: sousTitre }),
      notes.length > 0
        ? groupe("Notes", notes.map((note) => ligneNote(note, naviguer)))
        : h("p", { classe: "vide court", texte: "Aucune note pour cet événement." }),
      blocPersonnes(etat, evenement)),
    h("div", { classe: "pied" },
      h("button", { classe: "bouton principal grand", type: "button",
        onclick: () => naviguer(`/note/nouvelle/${evenement.id}`) },
        icone("plus"), "Nouvelle note")));
  return { element };
}
