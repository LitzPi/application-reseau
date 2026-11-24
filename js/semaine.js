// Échéances calculées sur le téléphone : anniversaires et suivis promis.
// Fonctions pures. Les dates sont manipulées au format AAAA-MM-JJ, sans heure,
// pour ne dépendre ni du fuseau ni du changement d'heure.

import { dateLocale } from "./evenements.js";
import { trierPersonnes, suivisOuverts } from "./personnes.js";

const JOUR = 24 * 60 * 60 * 1000;
export const HORIZON_SEMAINE = 7;

const FORMAT_JOUR_SEMAINE = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" });
const FORMAT_COURT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

const enUTC = (date) => {
  const [annee, mois, jour] = date.split("-").map(Number);
  return Date.UTC(annee, mois - 1, jour);
};
const deuxChiffres = (n) => String(n).padStart(2, "0");
const estBissextile = (annee) => (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0;

/** Nombre de jours de `debut` à `fin` (négatif si `fin` est passée). */
export function joursEntre(debut, fin) {
  return Math.round((enUTC(fin) - enUTC(debut)) / JOUR);
}

/** Date de l'anniversaire une année donnée ; le 29 février devient le 28 hors année bissextile. */
function anniversaireEn(annee, mois, jour) {
  const jourFete = mois === 2 && jour === 29 && !estBissextile(annee) ? 28 : jour;
  return `${annee}-${deuxChiffres(mois)}-${deuxChiffres(jourFete)}`;
}

/**
 * Prochaine occurrence d'un anniversaire (« AAAA-MM-JJ » ou « --MM-JJ »).
 * @returns {{date: string, dans_jours: number, age: number|null}|null}
 */
export function prochainAnniversaire(anniversaire, aujourdhui) {
  if (!anniversaire) return null;
  const sansAnnee = anniversaire.startsWith("--");
  const [mois, jour] = anniversaire.slice(sansAnnee ? 2 : 5).split("-").map(Number);
  const naissance = sansAnnee ? null : Number(anniversaire.slice(0, 4));
  const anneeCourante = Number(aujourdhui.slice(0, 4));
  const cetteAnnee = anniversaireEn(anneeCourante, mois, jour);
  const annee = joursEntre(aujourdhui, cetteAnnee) >= 0 ? anneeCourante : anneeCourante + 1;
  const date = anniversaireEn(annee, mois, jour);
  return {
    date,
    dans_jours: joursEntre(aujourdhui, date),
    age: naissance === null ? null : annee - naissance,
  };
}

/** Tous les anniversaires connus, du plus proche au plus lointain. */
export function anniversairesAVenir(etat, maintenant) {
  const aujourdhui = dateLocale(maintenant);
  return trierPersonnes(etat.personnes)
    .map((personne) => ({ personne, ...prochainAnniversaire(personne.anniversaire, aujourdhui) }))
    .filter((entree) => entree.date !== undefined)
    .toSorted((a, b) => a.dans_jours - b.dans_jours);
}

/** Suivis ouverts ayant une date promise, du plus ancien au plus lointain. */
export function suivisAVenir(etat, maintenant) {
  const aujourdhui = dateLocale(maintenant);
  return trierPersonnes(etat.personnes)
    .flatMap((personne) => suivisOuverts(personne)
      .filter((suivi) => suivi.date_promise)
      .map((suivi) => ({ personne, suivi, dans_jours: joursEntre(aujourdhui, suivi.date_promise) })))
    .toSorted((a, b) => a.dans_jours - b.dans_jours);
}

/** Bandeau de l'accueil : les 7 prochains jours, plus les suivis en retard. */
export function cetteSemaine(etat, maintenant) {
  return {
    anniversaires: anniversairesAVenir(etat, maintenant).filter((a) => a.dans_jours <= HORIZON_SEMAINE),
    suivis: suivisAVenir(etat, maintenant).filter((s) => s.dans_jours <= HORIZON_SEMAINE),
  };
}

/** « aujourd'hui », « demain », « samedi », « 3 janv. », « en retard de 3 jours ». */
export function libelleEcheance(dansJours, date) {
  if (dansJours < -1) return `en retard de ${-dansJours} jours`;
  if (dansJours === -1) return "en retard d'1 jour";
  if (dansJours === 0) return "aujourd'hui";
  if (dansJours === 1) return "demain";
  const instant = new Date(enUTC(date));
  return dansJours < HORIZON_SEMAINE ? FORMAT_JOUR_SEMAINE.format(instant) : FORMAT_COURT.format(instant);
}
