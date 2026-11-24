import { h, groupe, barreNavigation } from "../dom.js";
import { dateHeure, dateLongue } from "../dates.js";
import { lireDonnees } from "../magasin.js";
import { trouverEvenement, titreEvenement } from "../evenements.js";
import {
  nomComplet, trouverPersonne, echangesRecents, contextesDeLaPersonne, formaterAnniversaire,
} from "../personnes.js";

/** Ligne « libellé au-dessus, texte en dessous », pour les champs longs. */
function ligneTexte(libelle, texte, complement = null) {
  return h("div", { classe: "ligne empilee" },
    h("span", { classe: "detail", texte: libelle }),
    h("span", { classe: "texte-long", texte }),
    complement);
}

function trace(texte) {
  return h("span", { classe: "trace", texte });
}

function blocIdentite(etat, personne) {
  const contextes = contextesDeLaPersonne(etat, personne);
  const anniversaire = formaterAnniversaire(personne.anniversaire);
  const lignes = [
    personne.metier && ligneTexte("Métier", personne.metier),
    personne.entreprise && ligneTexte("Entreprise", personne.entreprise),
    personne.rencontre && ligneTexte("Rencontre", personne.rencontre),
    personne.details_personnels && ligneTexte("Détails personnels", personne.details_personnels),
    anniversaire && ligneTexte("Anniversaire", anniversaire,
      trace(personne.anniversaire_agenda_le
        ? `Ajouté à l'agenda le ${dateHeure(personne.anniversaire_agenda_le)}`
        : "Pas encore dans l'agenda")),
  ].filter(Boolean);
  return [
    contextes.length > 0 && h("div", { classe: "etiquettes" },
      contextes.map((contexte) => h("span", { classe: "etiquette", texte: contexte.nom }))),
    lignes.length > 0 && groupe(null, lignes),
  ];
}

/** Lien vers la tâche Notion, seulement si l'adresse est bien une adresse https. */
function lienNotion(suivi) {
  if (!suivi.notion_tache_le) return trace("Pas encore dans Notion");
  const texte = `Tâche Notion créée le ${dateHeure(suivi.notion_tache_le)}`;
  if (!suivi.notion_url?.startsWith("https://")) return trace(texte);
  return h("a", { classe: "trace lien-trace", href: suivi.notion_url, target: "_blank", rel: "noopener noreferrer", texte });
}

function ligneSuivi(suivi) {
  const fait = suivi.statut === "fait";
  const echeance = suivi.date_promise ? `Promis pour le ${dateLongue(suivi.date_promise)}` : "Sans date promise";
  return h("div", { classe: "ligne empilee" },
    h("span", { classe: `texte-long${fait ? " fait" : ""}`, texte: suivi.action }),
    h("span", { classe: "detail", texte: fait ? `Fait · ${echeance}` : echeance }),
    lienNotion(suivi));
}

function blocSuivis(personne) {
  if (personne.suivis.length === 0) return null;
  const ouvertsDAbord = personne.suivis.toSorted((a, b) => (a.statut === "fait") - (b.statut === "fait"));
  return groupe("Suivis promis", ouvertsDAbord.map(ligneSuivi));
}

function ligneEchange(etat, echange) {
  const evenement = echange.evenement_id ? trouverEvenement(etat, echange.evenement_id) : null;
  const ou = [dateLongue(echange.date), evenement && titreEvenement(etat, evenement)].filter(Boolean).join(" · ");
  return h("div", { classe: "ligne empilee" },
    h("span", { classe: "detail", texte: ou }),
    h("span", { classe: "texte-long", texte: echange.resume }));
}

function blocEchanges(etat, personne) {
  if (personne.echanges.length === 0) return null;
  return groupe("Historique des échanges", echangesRecents(personne).map((e) => ligneEchange(etat, e)));
}

export function ecranPersonne({ params, revenir }) {
  const { etat } = lireDonnees();
  const personne = trouverPersonne(etat, params[0]);
  const retour = { libelle: "Retour", aller: revenir };
  if (!personne) {
    return { element: h("div", { classe: "ecran" },
      barreNavigation({ titre: "Personne", retour }),
      h("p", { classe: "vide", texte: "Cette fiche n'existe plus." })) };
  }

  const element = h("div", { classe: "ecran" },
    barreNavigation({ titre: "Fiche", retour }),
    h("div", { classe: "defilant" },
      h("h1", { classe: "grand-titre serre", texte: nomComplet(personne) }),
      blocIdentite(etat, personne),
      blocSuivis(personne),
      blocEchanges(etat, personne),
      h("p", { classe: "note-section", texte: "Pour corriger cette fiche, écrivez une note : Claude la mettra à jour." })));
  return { element };
}
