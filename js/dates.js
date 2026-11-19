// Mise en forme des dates pour l'affichage (français).

const MINUTE = 60 * 1000;
const HEURE = 60 * MINUTE;
const JOUR = 24 * HEURE;

const FORMAT_DATE_HEURE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
});

const FORMAT_DATE_LONGUE = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short", day: "numeric", month: "short", year: "numeric",
});

/** « jeu. 12 nov. 2026 » à partir d'une date AAAA-MM-JJ (sans décalage de fuseau). */
export function dateLongue(date) {
  const [annee, mois, jour] = date.split("-").map(Number);
  return FORMAT_DATE_LONGUE.format(new Date(annee, mois - 1, jour));
}

export function dateHeure(horodatage) {
  return FORMAT_DATE_HEURE.format(new Date(horodatage));
}

/** « à l'instant », « il y a 12 min », « il y a 3 h », « hier », « il y a 5 jours ». */
export function ilYA(horodatage, maintenant = new Date()) {
  const ecart = maintenant - Date.parse(horodatage);
  if (ecart < MINUTE) return "à l'instant";
  if (ecart < HEURE) return `il y a ${Math.floor(ecart / MINUTE)} min`;
  if (ecart < JOUR) return `il y a ${Math.floor(ecart / HEURE)} h`;
  const jours = Math.floor(ecart / JOUR);
  return jours === 1 ? "hier" : `il y a ${jours} jours`;
}
