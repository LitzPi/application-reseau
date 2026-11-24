import { h } from "../dom.js";
import { lireDonnees } from "../magasin.js";
import { nomComplet, rechercherPersonnes } from "../personnes.js";

// Conservée entre deux visites de l'onglet : on retrouve sa recherche en revenant d'une fiche.
let derniereRecherche = "";

function sousTitre(personne) {
  return [personne.metier, personne.entreprise].filter(Boolean).join(" · ");
}

function lignePersonne(personne, naviguer) {
  const detail = sousTitre(personne);
  return h("button", { classe: "ligne", type: "button", onclick: () => naviguer(`/personne/${personne.id}`) },
    h("span", { classe: "ligne-texte" },
      h("span", { classe: "principal", texte: nomComplet(personne) }),
      detail && h("span", { classe: "detail", texte: detail })),
    h("span", { classe: "chevron", texte: "›", "aria-hidden": "true" }));
}

function resultats(etat, requete, naviguer) {
  if (etat.personnes.length === 0) {
    return h("p", { classe: "vide",
      texte: "Aucune personne pour l'instant. Les fiches sont créées par Claude à partir de vos notes." });
  }
  const trouvees = rechercherPersonnes(etat, requete);
  if (trouvees.length === 0) {
    return h("p", { classe: "vide", texte: "Aucune personne ne correspond à ces mots." });
  }
  const compte = `${trouvees.length} personne${trouvees.length > 1 ? "s" : ""}`;
  return h("section", { classe: "bloc" },
    h("h2", { classe: "entete-section", texte: compte }),
    h("div", { classe: "groupe" }, trouvees.map((personne) => lignePersonne(personne, naviguer))));
}

export function ecranPersonnes({ naviguer }) {
  const { etat } = lireDonnees();
  const zoneResultats = h("div", {}, resultats(etat, derniereRecherche, naviguer));
  const champ = h("input", {
    type: "search", classe: "recherche", placeholder: "Nom, métier, sujet, détail…",
    "aria-label": "Rechercher une personne", autocapitalize: "none", autocorrect: "off",
    enterkeyhint: "search",
  });
  champ.value = derniereRecherche;
  // Seule la liste est redessinée pendant la frappe : le champ garde le clavier.
  champ.addEventListener("input", () => {
    derniereRecherche = champ.value;
    zoneResultats.replaceChildren(resultats(etat, derniereRecherche, naviguer));
  });

  const element = h("div", { classe: "ecran" },
    h("div", { classe: "defilant" },
      h("h1", { classe: "grand-titre", texte: "Personnes" }),
      etat.personnes.length > 0 && champ,
      zoneResultats));
  return { element };
}
