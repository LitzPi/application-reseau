// Contextes, séries et événements. Fonctions pures : elles renvoient un nouvel état.

import { nouvelIdentifiant } from "./notes.js";

const normaliser = (texte) => texte.trim().toLocaleLowerCase("fr");
const deuxChiffres = (n) => String(n).padStart(2, "0");

/** Date du jour au format AAAA-MM-JJ, dans le fuseau du téléphone. */
export function dateLocale(date) {
  return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;
}

function horodatages(maintenant) {
  const instant = maintenant.toISOString();
  return { cree_le: instant, modifie_le: instant };
}

/** Crée le contexte, ou renvoie celui qui porte déjà ce nom (sans tenir compte de la casse). */
export function creerContexte(etat, nom, maintenant) {
  const existant = etat.contextes.find((c) => normaliser(c.nom) === normaliser(nom));
  if (existant) return { etat, contexte: existant };
  const contexte = { id: nouvelIdentifiant("contextes"), nom: nom.trim(), ...horodatages(maintenant) };
  return { etat: { ...etat, contextes: [...etat.contextes, contexte] }, contexte };
}

/** Crée la série, ou renvoie celle du même nom dans le même contexte. */
export function creerSerie(etat, nom, contexteId, maintenant) {
  const existante = etat.series.find(
    (s) => s.contexte_id === contexteId && normaliser(s.nom) === normaliser(nom));
  if (existante) return { etat, serie: existante };
  const serie = {
    id: nouvelIdentifiant("series"), nom: nom.trim(), contexte_id: contexteId, ...horodatages(maintenant),
  };
  return { etat: { ...etat, series: [...etat.series, serie] }, serie };
}

export function creerEvenement(etat, { titre, date, serieId = null }, maintenant) {
  const evenement = {
    id: nouvelIdentifiant("evenements"),
    titre: titre.trim(),
    date,
    serie_id: serieId,
    personne_ids: [],
    ...horodatages(maintenant),
  };
  return { etat: { ...etat, evenements: [...etat.evenements, evenement] }, evenement };
}

/** Coche ou décoche une personne comme « croisée » à cet événement. */
export function basculerPresence(etat, evenementId, personneId, maintenant) {
  const evenements = etat.evenements.map((evenement) => {
    if (evenement.id !== evenementId) return evenement;
    const presents = evenement.personne_ids.includes(personneId)
      ? evenement.personne_ids.filter((id) => id !== personneId)
      : [...evenement.personne_ids, personneId];
    return { ...evenement, personne_ids: presents, modifie_le: maintenant.toISOString() };
  });
  return { ...etat, evenements };
}

export function trouverEvenement(etat, id) {
  return etat.evenements.find((evenement) => evenement.id === id) ?? null;
}

/** Titre affiché : le titre saisi, sinon le nom de la série, sinon un libellé neutre. */
export function titreEvenement(etat, evenement) {
  if (evenement.titre.trim() !== "") return evenement.titre;
  const serie = etat.series.find((s) => s.id === evenement.serie_id);
  return serie ? serie.nom : "Événement";
}

/** Du plus récent au plus ancien (date de l'événement, puis date de création). */
export function evenementsRecents(etat) {
  return etat.evenements.toSorted((a, b) =>
    b.date.localeCompare(a.date) || Date.parse(b.cree_le) - Date.parse(a.cree_le));
}

/** L'événement daté d'aujourd'hui, le dernier créé s'il y en a plusieurs. */
export function evenementDuJour(etat, maintenant) {
  const aujourdhui = dateLocale(maintenant);
  return evenementsRecents(etat).find((evenement) => evenement.date === aujourdhui) ?? null;
}

/** Notes rattachées à l'événement, dans l'ordre de saisie. */
export function notesDeLEvenement(etat, evenementId) {
  return etat.notes_brutes
    .filter((note) => note.evenement_id === evenementId)
    .toSorted((a, b) => Date.parse(a.saisie_le) - Date.parse(b.saisie_le));
}

/** Libellé d'une série avec son contexte, pour les listes de choix. */
export function libelleSerie(etat, serie) {
  const contexte = etat.contextes.find((c) => c.id === serie.contexte_id);
  return contexte ? `${serie.nom} (${contexte.nom})` : serie.nom;
}
