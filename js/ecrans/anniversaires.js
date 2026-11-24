import { h, pastille, groupe } from "../dom.js";
import { lireDonnees } from "../magasin.js";
import { nomComplet, formaterAnniversaire } from "../personnes.js";
import { anniversairesAVenir, libelleEcheance, HORIZON_SEMAINE } from "../semaine.js";

function detail(entree) {
  const jour = formaterAnniversaire(entree.personne.anniversaire.startsWith("--")
    ? entree.personne.anniversaire
    : `--${entree.personne.anniversaire.slice(5)}`);
  return entree.age === null ? jour : `${jour} · ${entree.age} ans`;
}

function quand(entree) {
  if (entree.dans_jours <= HORIZON_SEMAINE) return libelleEcheance(entree.dans_jours, entree.date);
  return `dans ${entree.dans_jours} jours`;
}

function ligne(entree, naviguer) {
  const proche = entree.dans_jours <= HORIZON_SEMAINE;
  return h("button", { classe: "ligne", type: "button", onclick: () => naviguer(`/personne/${entree.personne.id}`) },
    pastille("gateau"),
    h("span", { classe: "ligne-texte" },
      h("span", { classe: "principal", texte: nomComplet(entree.personne) }),
      h("span", { classe: "detail", texte: detail(entree) })),
    h("span", { classe: `quand${proche ? " proche" : ""}`, texte: quand(entree) }));
}

export function ecranAnniversaires({ naviguer }) {
  const { etat } = lireDonnees();
  const liste = anniversairesAVenir(etat, new Date());
  const contenu = liste.length === 0
    ? h("p", { classe: "vide",
      texte: "Aucun anniversaire connu. Notez une date dans une note : Claude l'ajoutera à la fiche." })
    : groupe(null, liste.map((entree) => ligne(entree, naviguer)),
      "Du plus proche au plus lointain. Claude ajoute chaque anniversaire à votre agenda.");

  const element = h("div", { classe: "ecran" },
    h("div", { classe: "defilant" },
      h("h1", { classe: "grand-titre", texte: "Anniversaires" }),
      contenu));
  return { element };
}
