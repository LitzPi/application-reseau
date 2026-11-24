// Lecture des fiches Personne : tri, recherche par mots, extraits. Fonctions pures.
// Les fiches ne sont jamais modifiées par l'app : seul Claude les écrit.

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function nomComplet(personne) {
  return `${personne.prenom} ${personne.nom}`.trim();
}

/** Minuscules, sans accents, espaces resserrés : base de toute comparaison. */
export function normaliserTexte(texte) {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/\s+/g, " ")
    .trim();
}

export function trierPersonnes(personnes) {
  return personnes.toSorted((a, b) =>
    a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" })
    || a.prenom.localeCompare(b.prenom, "fr", { sensitivity: "base" }));
}

/** Tous les champs texte d'une fiche, réunis pour la recherche. */
function texteDeRecherche(personne, nomsContextes) {
  const morceaux = [
    personne.prenom, personne.nom, personne.metier, personne.entreprise,
    personne.rencontre, personne.details_personnels,
    ...personne.contexte_ids.map((id) => nomsContextes.get(id)),
    ...personne.echanges.map((echange) => echange.resume),
    ...personne.suivis.map((suivi) => suivi.action),
  ];
  return normaliserTexte(morceaux.filter(Boolean).join(" "));
}

/**
 * Recherche par mots (pas de langage naturel) : chaque mot saisi doit commencer
 * un mot de la fiche, quel que soit le champ. Sans mot, renvoie tout le monde.
 */
export function rechercherPersonnes(etat, requete) {
  const mots = normaliserTexte(requete).split(" ").filter(Boolean);
  const triees = trierPersonnes(etat.personnes);
  if (mots.length === 0) return triees;
  const nomsContextes = new Map(etat.contextes.map((contexte) => [contexte.id, contexte.nom]));
  return triees.filter((personne) => {
    const texte = ` ${texteDeRecherche(personne, nomsContextes).replace(/[^\p{L}\p{N}]+/gu, " ")}`;
    return mots.every((mot) => texte.includes(` ${mot.replace(/[^\p{L}\p{N}]+/gu, " ").trim()}`));
  });
}

export function trouverPersonne(etat, id) {
  return etat.personnes.find((personne) => personne.id === id) ?? null;
}

export function echangesRecents(personne) {
  return personne.echanges.toSorted((a, b) => b.date.localeCompare(a.date));
}

export function suivisOuverts(personne) {
  return personne.suivis.filter((suivi) => suivi.statut === "ouvert");
}

export function contextesDeLaPersonne(etat, personne) {
  return etat.contextes.filter((contexte) => personne.contexte_ids.includes(contexte.id));
}

/** « 14 mars » ou « 2 juillet 1984 » ; null si la date est inconnue. */
export function formaterAnniversaire(anniversaire) {
  if (!anniversaire) return null;
  const [annee, mois, jour] = anniversaire.startsWith("--")
    ? [null, ...anniversaire.slice(2).split("-")]
    : anniversaire.split("-");
  const base = `${Number(jour)} ${MOIS[Number(mois) - 1]}`;
  return annee ? `${base} ${annee}` : base;
}
