// Préparation d'un événement : qui risque-t-on de revoir ? Fonctions pures.

import { nomComplet, trierPersonnes, echangesRecents, suivisOuverts } from "./personnes.js";

/** Première phrase d'un texte, ou null s'il est vide. */
export function premierePhrase(texte) {
  const propre = (texte ?? "").trim();
  if (propre === "") return null;
  const fin = propre.search(/[.!?…](\s|$)/);
  return fin === -1 ? propre : propre.slice(0, fin + 1);
}

/**
 * Fiche courte affichée dans « Préparer » : nom, métier, dernier sujet abordé,
 * un détail personnel, suivi en cours. Une rubrique sans contenu vaut null.
 */
export function ficheCourte(personne) {
  const metier = [personne.metier, personne.entreprise].filter(Boolean).join(" · ");
  return {
    nom: nomComplet(personne),
    metier: metier || null,
    dernierSujet: echangesRecents(personne)[0]?.resume ?? null,
    detail: premierePhrase(personne.details_personnels),
    suivi: suivisOuverts(personne)[0]?.action ?? null,
  };
}

export function preparerContexte(etat, contexteId) {
  return trierPersonnes(etat.personnes.filter((personne) => personne.contexte_ids.includes(contexteId)));
}

/** Pour chaque personne croisée aux éditions de la série : nombre d'éditions et date de la dernière. */
function presencesDansLaSerie(etat, serieId) {
  const presences = new Map();
  for (const evenement of etat.evenements) {
    if (evenement.serie_id !== serieId) continue;
    for (const personneId of evenement.personne_ids) {
      const connue = presences.get(personneId) ?? { editions: 0, derniere: "" };
      presences.set(personneId, {
        editions: connue.editions + 1,
        derniere: evenement.date > connue.derniere ? evenement.date : connue.derniere,
      });
    }
  }
  return presences;
}

/**
 * Pour une série : d'abord les personnes croisées aux éditions précédentes
 * (la plus récemment vue en premier), puis le reste du contexte de la série.
 * @returns {{serie, contexte, dejaCroisees: {personne, editions, derniere}[], resteDuContexte: object[]}|null}
 */
export function preparerSerie(etat, serieId) {
  const serie = etat.series.find((s) => s.id === serieId);
  if (!serie) return null;
  const presences = presencesDansLaSerie(etat, serieId);
  const dejaCroisees = trierPersonnes(etat.personnes.filter((personne) => presences.has(personne.id)))
    .map((personne) => ({ personne, ...presences.get(personne.id) }))
    .toSorted((a, b) => b.derniere.localeCompare(a.derniere));
  return {
    serie,
    contexte: etat.contextes.find((contexte) => contexte.id === serie.contexte_id) ?? null,
    dejaCroisees,
    resteDuContexte: preparerContexte(etat, serie.contexte_id)
      .filter((personne) => !presences.has(personne.id)),
  };
}
