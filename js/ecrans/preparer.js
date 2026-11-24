import { h } from "../dom.js";
import { dateLongue } from "../dates.js";
import { lireDonnees } from "../magasin.js";
import { libelleSerie, evenementsRecents } from "../evenements.js";
import { preparerSerie, preparerContexte, ficheCourte } from "../preparer.js";

// Dernier choix conservé pendant la session : on le retrouve en revenant d'une fiche.
let dernierChoix = null;

function rubrique(libelle, texte, classe = "") {
  if (!texte) return null;
  return h("span", { classe: `rubrique ${classe}`.trim() },
    h("span", { classe: "rubrique-libelle", texte: libelle }),
    h("span", { classe: "rubrique-texte", texte }));
}

/** Fiche courte : nom, métier, dernier sujet abordé, un détail personnel, suivi en cours. */
function carte(personne, naviguer, mention = null) {
  const fiche = ficheCourte(personne);
  return h("button", { classe: "carte", type: "button", onclick: () => naviguer(`/personne/${personne.id}`) },
    h("span", { classe: "carte-entete" },
      h("span", { classe: "principal", texte: fiche.nom }),
      mention && h("span", { classe: "detail", texte: mention })),
    fiche.metier && h("span", { classe: "detail", texte: fiche.metier }),
    rubrique("Dernier sujet", fiche.dernierSujet),
    rubrique("Détail", fiche.detail),
    rubrique("Suivi en cours", fiche.suivi, "suivi"));
}

function section(titre, cartes) {
  if (cartes.length === 0) return null;
  return h("section", { classe: "bloc" },
    h("h2", { classe: "entete-section", texte: `${titre} (${cartes.length})` }),
    h("div", { classe: "cartes" }, cartes));
}

function mentionEditions({ editions, derniere }) {
  const quand = dateLongue(derniere);
  return editions > 1 ? `${editions} éditions · vu le ${quand}` : `vu le ${quand}`;
}

function contenuSerie(etat, serieId, naviguer) {
  const preparation = preparerSerie(etat, serieId);
  if (!preparation) return [];
  const nomContexte = preparation.contexte?.nom ?? "contexte";
  return [
    section("Déjà croisées à cette série",
      preparation.dejaCroisees.map((entree) => carte(entree.personne, naviguer, mentionEditions(entree)))),
    section(`Reste du contexte « ${nomContexte} »`,
      preparation.resteDuContexte.map((personne) => carte(personne, naviguer))),
  ].filter(Boolean);
}

function contenuContexte(etat, contexteId, naviguer) {
  const nom = etat.contextes.find((contexte) => contexte.id === contexteId)?.nom ?? "";
  return [section(`Contexte « ${nom} »`,
    preparerContexte(etat, contexteId).map((personne) => carte(personne, naviguer)))].filter(Boolean);
}

function contenu(etat, choix, naviguer) {
  const [type, id] = choix.split(":");
  const blocs = type === "serie" ? contenuSerie(etat, id, naviguer) : contenuContexte(etat, id, naviguer);
  if (blocs.length > 0) return blocs;
  return [h("p", { classe: "vide", texte: "Personne à revoir pour l'instant dans ce choix." })];
}

/** Choix proposé à l'ouverture : le dernier fait, sinon la série du dernier événement. */
function choixInitial(etat, valeurs) {
  if (dernierChoix && valeurs.includes(dernierChoix)) return dernierChoix;
  const serieRecente = evenementsRecents(etat).find((evenement) => evenement.serie_id)?.serie_id;
  const proposition = serieRecente ? `serie:${serieRecente}` : null;
  return valeurs.includes(proposition) ? proposition : valeurs[0];
}

function selecteur(etat) {
  const series = etat.series.map((serie) => [`serie:${serie.id}`, libelleSerie(etat, serie)]);
  const contextes = etat.contextes.map((contexte) => [`contexte:${contexte.id}`, contexte.nom]);
  const groupe = (libelle, options) => options.length > 0 && h("optgroup", { label: libelle },
    options.map(([valeur, texte]) => h("option", { value: valeur, texte })));
  const select = h("select", { classe: "champ-controle", "aria-label": "Série ou contexte à préparer" },
    groupe("Séries", series), groupe("Contextes", contextes));
  select.value = choixInitial(etat, [...series, ...contextes].map(([valeur]) => valeur));
  return select;
}

export function ecranPreparer({ naviguer }) {
  const { etat } = lireDonnees();
  if (etat.series.length + etat.contextes.length === 0) {
    return { element: h("div", { classe: "ecran" },
      h("div", { classe: "defilant" },
        h("h1", { classe: "grand-titre", texte: "Préparer" }),
        h("p", { classe: "vide",
          texte: "Créez d'abord un événement avec une série : vous pourrez ensuite préparer la prochaine édition." }))) };
  }

  const select = selecteur(etat);
  const zone = h("div", {}, contenu(etat, select.value, naviguer));
  select.addEventListener("change", () => {
    dernierChoix = select.value;
    zone.replaceChildren(...contenu(etat, select.value, naviguer));
  });
  dernierChoix = select.value;

  const element = h("div", { classe: "ecran" },
    h("div", { classe: "defilant" },
      h("h1", { classe: "grand-titre", texte: "Préparer" }),
      h("div", { classe: "groupe formulaire sans-marge" },
        h("label", { classe: "champ" }, h("span", { classe: "champ-libelle", texte: "Pour" }), select)),
      h("div", { classe: "espace-haut" }, zone)));
  return { element };
}
