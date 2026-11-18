import { h, barreNavigation } from "../dom.js";
import { demander } from "../dialogue.js";
import { lireDonnees, ajouterNote, changerNote, retirerNote } from "../magasin.js";
import { trouverNote } from "../notes.js";

const DELAI_ENREGISTREMENT = 400;

function ecranIntrouvable(naviguer) {
  return {
    element: h("div", { classe: "ecran" },
      barreNavigation({ titre: "Note", retour: { libelle: "Accueil", aller: () => naviguer("/") } }),
      h("p", { classe: "vide", texte: "Cette note n'existe plus." })),
  };
}

/**
 * Saisie d'une note. La note est créée à la première frappe et enregistrée
 * automatiquement ; il n'y a aucun bouton « Enregistrer ».
 */
export function ecranSaisie({ params, naviguer, remplacerChemin }) {
  let id = params[0] === "nouvelle" ? null : params[0];
  const existante = id ? trouverNote(lireDonnees().etat, id) : null;
  if (id && !existante) return ecranIntrouvable(naviguer);

  const lectureSeule = existante?.statut === "traitee";
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
      id = ajouterNote(texte);
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

  const supprimer = async () => {
    const accord = await demander({
      titre: "Supprimer cette note ?",
      lignes: ["Elle ne pourra pas être récupérée."],
      confirmer: "Supprimer",
      danger: true,
    });
    if (!accord) return;
    zone.value = "";
    naviguer("/");
  };

  const element = h("div", { classe: "ecran" },
    barreNavigation({
      titre: existante ? "Note" : "Nouvelle note",
      retour: { libelle: "Accueil", aller: () => naviguer("/") },
      action: { libelle: "Terminé", aller: () => naviguer("/") },
    }),
    h("div", { classe: "saisie" },
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
