import { h, barreNavigation } from "../dom.js";
import { dateLongue } from "../dates.js";
import { choisir, demander } from "../dialogue.js";
import { lireDonnees, ajouterNote, changerNote, retirerNote, changerEvenementDeNote } from "../magasin.js";
import { trouverNote } from "../notes.js";
import { trouverEvenement, titreEvenement, evenementsRecents, evenementDuJour } from "../evenements.js";

const DELAI_ENREGISTREMENT = 400;
const MAX_EVENEMENTS_PROPOSES = 6;
const AUCUN = "__aucun";

function ecranIntrouvable(revenir) {
  return {
    element: h("div", { classe: "ecran" },
      barreNavigation({ titre: "Note", retour: { libelle: "Retour", aller: revenir } }),
      h("p", { classe: "vide", texte: "Cette note n'existe plus." })),
  };
}

/** Événement proposé pour une nouvelle note : celui d'où l'on vient, sinon celui du jour. */
function evenementParDefaut(etat, demande) {
  if (demande && trouverEvenement(etat, demande)) return demande;
  return evenementDuJour(etat, new Date())?.id ?? null;
}

function libelleEvenement(etat, evenementId) {
  const evenement = evenementId ? trouverEvenement(etat, evenementId) : null;
  return evenement ? titreEvenement(etat, evenement) : "Aucun";
}

/** Demande à quel événement rattacher la note ; renvoie undefined si annulé. */
async function choisirEvenement(etat) {
  const propositions = evenementsRecents(etat).slice(0, MAX_EVENEMENTS_PROPOSES);
  const choix = await choisir({
    titre: "Rattacher la note à",
    lignes: propositions.length === 0 ? ["Aucun événement n'a encore été créé."] : [],
    actions: [
      ...propositions.map((evenement) => ({
        libelle: `${titreEvenement(etat, evenement)} · ${dateLongue(evenement.date)}`,
        valeur: evenement.id,
      })),
      { libelle: "Aucun événement", valeur: AUCUN },
      { libelle: "Annuler", valeur: null },
    ],
  });
  if (choix === null) return undefined;
  return choix === AUCUN ? null : choix;
}

/**
 * Saisie d'une note. La note est créée à la première frappe et enregistrée
 * automatiquement ; il n'y a aucun bouton « Enregistrer ».
 */
export function ecranSaisie({ params, revenir, remplacerChemin }) {
  let id = params[0] === "nouvelle" ? null : params[0];
  const { etat } = lireDonnees();
  const existante = id ? trouverNote(etat, id) : null;
  if (id && !existante) return ecranIntrouvable(revenir);

  const lectureSeule = existante?.statut === "traitee";
  let evenementId = existante ? existante.evenement_id : evenementParDefaut(etat, params[1]);
  let dernierTexte = existante?.texte ?? "";
  let minuterie = null;

  const temoin = h("p", { classe: "temoin", "aria-live": "polite", texte: existante ? "Enregistré" : "" });
  const zone = h("textarea", {
    classe: "zone-saisie",
    placeholder: "Qui, quoi, à retenir… en vrac.",
    "aria-label": "Texte de la note",
    readonly: lectureSeule,
    autocapitalize: "sentences",
  });
  zone.value = dernierTexte;

  const enregistrer = () => {
    clearTimeout(minuterie);
    const texte = zone.value;
    if (texte === dernierTexte) return;
    if (id) {
      changerNote(id, texte);
    } else if (texte.trim() !== "") {
      id = ajouterNote(texte, evenementId);
      remplacerChemin(`/note/${id}`);
    } else {
      return;
    }
    dernierTexte = texte;
    temoin.textContent = "Enregistré";
  };

  zone.addEventListener("input", () => {
    temoin.textContent = "…";
    clearTimeout(minuterie);
    minuterie = setTimeout(enregistrer, DELAI_ENREGISTREMENT);
  });

  // L'app peut être mise en arrière-plan à tout moment : on enregistre aussitôt.
  const surMasquage = () => { if (document.visibilityState === "hidden") enregistrer(); };
  document.addEventListener("visibilitychange", surMasquage);
  window.addEventListener("pagehide", enregistrer);

  const nomEvenement = h("span", { classe: "rattachement-valeur", texte: libelleEvenement(etat, evenementId) });
  const changerEvenement = async () => {
    const choix = await choisirEvenement(lireDonnees().etat);
    if (choix !== undefined && choix !== evenementId) {
      evenementId = choix;
      if (id) changerEvenementDeNote(id, evenementId);
      nomEvenement.textContent = libelleEvenement(lireDonnees().etat, evenementId);
    }
    zone.focus();
  };

  const supprimer = async () => {
    const accord = await demander({
      titre: "Supprimer cette note ?",
      lignes: ["Elle ne pourra pas être récupérée."],
      confirmer: "Supprimer",
      danger: true,
    });
    if (!accord) return;
    zone.value = "";
    revenir();
  };

  const element = h("div", { classe: "ecran" },
    barreNavigation({
      titre: existante ? "Note" : "Nouvelle note",
      retour: { libelle: "Retour", aller: revenir },
      action: { libelle: "Terminé", aller: revenir },
    }),
    h("div", { classe: "saisie" },
      h("div", { classe: "rattachement" },
        h("span", { classe: "detail", texte: "Événement" }),
        nomEvenement,
        !lectureSeule && h("button", { classe: "rattachement-changer", type: "button",
          onclick: changerEvenement, texte: "Changer" })),
      zone,
      h("div", { classe: "sous-saisie" },
        existante && !lectureSeule
          ? h("button", { classe: "lien danger", type: "button", onclick: supprimer, texte: "Supprimer la note" })
          : h("span"),
        temoin)));

  return {
    element,
    apresAffichage: () => { if (!lectureSeule) zone.focus(); },
    quitter: () => {
      enregistrer();
      document.removeEventListener("visibilitychange", surMasquage);
      window.removeEventListener("pagehide", enregistrer);
      // Une note vidée n'a plus lieu d'être.
      if (id && zone.value.trim() === "") retirerNote(id);
    },
  };
}
