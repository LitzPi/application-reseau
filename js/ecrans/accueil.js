import { h, icone, pastille, groupe } from "../dom.js";
import { dateHeure, dateLongue, ilYA } from "../dates.js";
import { importerFichier, proteger, boutonFichier } from "../importer.js";
import { lireDonnees } from "../magasin.js";
import { notesNonTraitees } from "../notes.js";
import { etatSauvegarde, retourAttendu } from "../sauvegarde.js";
import { evenementsRecents, titreEvenement, notesDeLEvenement } from "../evenements.js";
import { nomComplet } from "../personnes.js";
import { cetteSemaine, libelleEcheance } from "../semaine.js";

const MAX_EVENEMENTS = 3;

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

/** Après un export : rappelle d'importer le retour de Claude, en deux gestes. */
function bandeauRetour(meta) {
  const attendu = retourAttendu(meta);
  if (!attendu) return null;
  // Pas de filtre de type : un fichier n'apparaît jamais grisé dans le sélecteur.
  return boutonFichier({ classe: "alerte retour", surChoix: proteger(importerFichier) },
    pastille("sauvegarde"),
    h("span", { classe: "ligne-texte" },
      h("span", { classe: "principal", texte: "Retour de Claude à importer" }),
      h("span", { classe: "detail", texte: `Depuis votre export du ${dateHeure(attendu.depuis)}. Toucher pour choisir le fichier dans donnees/reference.` })),
    h("span", { classe: "chevron", texte: "›", "aria-hidden": "true" }));
}

function ligneEcheance({ personne, icone: nomIcone, detail, dansJours, date }, naviguer) {
  const classe = dansJours < 0 ? " retard" : " proche";
  return h("button", { classe: "ligne", type: "button", onclick: () => naviguer(`/personne/${personne.id}`) },
    pastille(nomIcone),
    h("span", { classe: "ligne-texte" },
      h("span", { classe: "principal", texte: nomComplet(personne) }),
      h("span", { classe: "detail", texte: detail })),
    h("span", { classe: `quand${classe}`, texte: libelleEcheance(dansJours, date) }));
}

/** Bandeau « Cette semaine » : anniversaires et suivis des 7 prochains jours, retards compris. */
function blocSemaine(etat, naviguer) {
  if (etat.personnes.length === 0) return null;
  const { anniversaires, suivis } = cetteSemaine(etat, new Date());
  const lignes = [
    ...suivis.map((s) => ({ personne: s.personne, icone: "suivi", detail: s.suivi.action,
      dansJours: s.dans_jours, date: s.suivi.date_promise })),
    ...anniversaires.map((a) => ({ personne: a.personne, icone: "gateau",
      detail: a.age === null ? "Anniversaire" : `Anniversaire · ${a.age} ans`, dansJours: a.dans_jours, date: a.date })),
  ].toSorted((a, b) => a.dansJours - b.dansJours);
  if (lignes.length === 0) {
    return h("section", { classe: "bloc" },
      h("h2", { classe: "entete-section", texte: "Cette semaine" }),
      h("p", { classe: "note-section", texte: "Ni anniversaire ni suivi promis dans les 7 prochains jours." }));
  }
  return groupe("Cette semaine", lignes.map((ligne) => ligneEcheance(ligne, naviguer)));
}

function ligneEvenement(etat, evenement, naviguer) {
  const notes = notesDeLEvenement(etat, evenement.id).length;
  const detail = `${dateLongue(evenement.date)} · ${notes} note${notes > 1 ? "s" : ""}`;
  return h("button", { classe: "ligne", type: "button", onclick: () => naviguer(`/evenement/${evenement.id}`) },
    pastille("evenement"),
    h("span", { classe: "ligne-texte" },
      h("span", { classe: "principal", texte: titreEvenement(etat, evenement) }),
      h("span", { classe: "detail", texte: detail })),
    h("span", { classe: "chevron", texte: "›", "aria-hidden": "true" }));
}

function blocEvenements(etat, naviguer) {
  const evenements = evenementsRecents(etat).slice(0, MAX_EVENEMENTS);
  if (evenements.length === 0) return null;
  return groupe("Derniers événements", evenements.map((e) => ligneEvenement(etat, e, naviguer)));
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
      bandeauRetour(meta),
      alerteSauvegarde(suivi, naviguer),
      blocSemaine(etat, naviguer),
      groupe("En attente", [ligneNotes]),
      blocEvenements(etat, naviguer)),
    h("div", { classe: "pied" },
      h("button", { classe: "bouton principal grand", type: "button", onclick: () => naviguer("/note/nouvelle") },
        icone("plus"), "Nouvelle note"),
      h("button", { classe: "lien centre", type: "button", onclick: () => naviguer("/evenement/nouveau"),
        texte: "Nouvel événement" })));

  return { element };
}
