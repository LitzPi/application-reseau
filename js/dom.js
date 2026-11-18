// Petits outils d'affichage. Tout texte passe par textContent : jamais de HTML
// construit à partir d'une saisie.

const SVG = "http://www.w3.org/2000/svg";

/**
 * Crée un élément. `attributs` : classe, texte, et tout attribut HTML ;
 * une clé commençant par « on » installe un écouteur (onclick, oninput…).
 */
export function h(balise, attributs = {}, ...enfants) {
  const element = document.createElement(balise);
  for (const [cle, valeur] of Object.entries(attributs)) {
    if (valeur === null || valeur === undefined || valeur === false) continue;
    if (cle === "classe") element.className = valeur;
    else if (cle === "texte") element.textContent = valeur;
    else if (cle.startsWith("on")) element.addEventListener(cle.slice(2), valeur);
    else element.setAttribute(cle, valeur === true ? "" : valeur);
  }
  element.append(...enfants.flat().filter((enfant) => enfant !== null && enfant !== undefined && enfant !== false));
  return element;
}

/** Icône définie dans index.html (symboles SVG « i-nom »). */
export function icone(nom) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(SVG, "use");
  use.setAttribute("href", `#i-${nom}`);
  svg.append(use);
  return svg;
}

export function pastille(nom) {
  return h("span", { classe: "pastille" }, icone(nom));
}

/** Section de liste groupée, avec en-tête et note de bas facultatifs. */
export function groupe(titre, lignes, note = null) {
  return h("section", { classe: "bloc" },
    titre && h("h2", { classe: "entete-section", texte: titre }),
    h("div", { classe: "groupe" }, lignes),
    note && h("p", { classe: "note-section", texte: note }));
}

/** En-tête d'un écran secondaire : retour à gauche, action facultative à droite. */
export function barreNavigation({ titre, retour, action = null }) {
  return h("header", { classe: "navigation" },
    h("button", { classe: "nav-retour", type: "button", onclick: retour.aller },
      h("span", { classe: "chevron-retour", texte: "‹", "aria-hidden": "true" }), retour.libelle),
    h("h1", { classe: "nav-titre", texte: titre }),
    action
      ? h("button", { classe: "nav-action", type: "button", onclick: action.aller, texte: action.libelle })
      : h("span", { classe: "nav-action" }));
}
