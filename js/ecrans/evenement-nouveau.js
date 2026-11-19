import { h, barreNavigation } from "../dom.js";
import { lireDonnees, ajouterEvenement } from "../magasin.js";
import { dateLocale, libelleSerie } from "../evenements.js";

const NOUVEAU = "__nouveau";

function champ(libelle, controle) {
  return h("label", { classe: "champ" }, h("span", { classe: "champ-libelle", texte: libelle }), controle);
}

function liste(options, selection) {
  const select = h("select", { classe: "champ-controle" },
    options.map(([valeur, texte]) => h("option", { value: valeur, texte })));
  select.value = selection;
  return select;
}

/** Lit le formulaire ; renvoie { erreur } ou la description de l'événement à créer. */
function lireFormulaire({ titre, date, serie, nomSerie, contexte, nomContexte }) {
  if (!date.value) return { erreur: "Indiquez la date de l'événement." };
  const base = { titre: titre.value, date: date.value };
  if (serie.value === "") {
    if (titre.value.trim() === "") return { erreur: "Donnez un titre, ou choisissez une série." };
    return { ...base, serie: null };
  }
  if (serie.value !== NOUVEAU) return { ...base, serie: { id: serie.value } };
  if (nomSerie.value.trim() === "") return { erreur: "Donnez un nom à la nouvelle série." };
  if (contexte.value !== NOUVEAU) {
    return { ...base, serie: { nom: nomSerie.value, contexteId: contexte.value } };
  }
  if (nomContexte.value.trim() === "") return { erreur: "Donnez un nom au nouveau contexte (paddle, pro…)." };
  return { ...base, serie: { nom: nomSerie.value, nouveauContexte: nomContexte.value } };
}

export function ecranNouvelEvenement({ naviguer, revenir }) {
  const { etat } = lireDonnees();
  const controles = {
    titre: h("input", { type: "text", classe: "champ-controle", placeholder: "Facultatif avec une série",
      autocapitalize: "sentences", enterkeyhint: "done" }),
    date: h("input", { type: "date", classe: "champ-controle" }),
    serie: liste([
      ["", "Aucune"],
      ...etat.series.map((serie) => [serie.id, libelleSerie(etat, serie)]),
      [NOUVEAU, "Nouvelle série…"],
    ], ""),
    nomSerie: h("input", { type: "text", classe: "champ-controle", placeholder: "Afterwork du club…",
      autocapitalize: "sentences" }),
    contexte: liste([
      ...etat.contextes.map((contexte) => [contexte.id, contexte.nom]),
      [NOUVEAU, "Nouveau contexte…"],
    ], etat.contextes[0]?.id ?? NOUVEAU),
    nomContexte: h("input", { type: "text", classe: "champ-controle", placeholder: "paddle, pro…",
      autocapitalize: "none" }),
  };
  controles.date.value = dateLocale(new Date());

  const blocSerie = h("div", { classe: "groupe formulaire espace" },
    champ("Nom de la série", controles.nomSerie),
    champ("Contexte", controles.contexte));
  const blocContexte = h("div", { classe: "groupe formulaire espace" },
    champ("Nom du contexte", controles.nomContexte));
  const erreur = h("p", { classe: "note-section avertissement", role: "alert" });

  const ajusterBlocs = () => {
    const nouvelleSerie = controles.serie.value === NOUVEAU;
    blocSerie.hidden = !nouvelleSerie;
    blocContexte.hidden = !nouvelleSerie || controles.contexte.value !== NOUVEAU;
  };
  controles.serie.addEventListener("change", ajusterBlocs);
  controles.contexte.addEventListener("change", ajusterBlocs);
  ajusterBlocs();

  const creer = () => {
    const saisie = lireFormulaire(controles);
    if (saisie.erreur) {
      erreur.textContent = saisie.erreur;
      return;
    }
    naviguer(`/evenement/${ajouterEvenement(saisie)}`, { remplacer: true });
  };

  const element = h("div", { classe: "ecran" },
    barreNavigation({
      titre: "Nouvel événement",
      retour: { libelle: "Retour", aller: revenir },
      action: { libelle: "Créer", aller: creer },
    }),
    h("div", { classe: "defilant" },
      h("div", { classe: "groupe formulaire" },
        champ("Date", controles.date),
        champ("Série", controles.serie),
        champ("Titre", controles.titre)),
      blocSerie,
      blocContexte,
      erreur,
      h("p", { classe: "note-section",
        texte: "Une série regroupe les éditions d'un même événement récurrent. Elle sert à préparer la prochaine édition." })));
  return { element };
}
