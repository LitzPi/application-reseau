// État local de l'app, export, et fusion d'un fichier importé.
// Fonctions pures : elles ne modifient jamais leurs arguments et ne touchent
// ni au stockage ni à l'écran. Le fichier reçu doit déjà être validé (format.js).

import { FORMAT, VERSION_SCHEMA, COLLECTIONS, CHAMPS_ENTETE } from "./format.js";

/** Collections créées sur le téléphone, que l'import ne doit pas écraser aveuglément. */
const COLLECTIONS_PARTAGEES = ["contextes", "series", "evenements"];

export function etatVide() {
  return {
    revision: 0,
    contextes: [],
    series: [],
    evenements: [],
    personnes: [],
    notes_brutes: [],
    // Identifiants des notes supprimées sur le téléphone : évite qu'un import
    // ne les fasse réapparaître. Jamais exporté.
    notes_supprimees: [],
    // Champs racine inconnus de cette version de l'app, réexportés tels quels.
    champs_inconnus: {},
  };
}

export function estVide(etat) {
  return COLLECTIONS.every((nom) => etat[nom].length === 0);
}

/** Construit le contenu du fichier d'export à partir de l'état local. */
export function construireExport(etat, maintenant) {
  const fichier = {
    ...structuredClone(etat.champs_inconnus),
    format: FORMAT,
    schema_version: VERSION_SCHEMA,
    origine: "app",
    // Millisecondes conservées : la fusion compare cette date aux modifications locales.
    exporte_le: maintenant.toISOString(),
    revision: etat.revision,
    base_exporte_le: null,
  };
  for (const nom of COLLECTIONS) fichier[nom] = structuredClone(etat[nom]);
  return fichier;
}

/**
 * Refuse un fichier plus ancien que les données présentes.
 * Révision égale : restauration d'une sauvegarde (à confirmer par l'utilisateur).
 */
export function controlerRevision(etat, fichier) {
  if (fichier.revision < etat.revision) {
    return {
      ok: false,
      message: `Ce fichier (révision ${fichier.revision}) est plus ancien que les données ` +
        `déjà présentes sur le téléphone (révision ${etat.revision}). Import refusé.`,
    };
  }
  return { ok: true, type: fichier.revision === etat.revision ? "restauration" : "mise_a_jour" };
}

// ---------------------------------------------------------------- outils

const instant = (horodatage) => Date.parse(horodatage);
const indexer = (liste) => new Map(liste.map((element) => [element.id, element]));

/** Vrai si l'élément a été créé ou modifié sur le téléphone après l'export traité. */
function estRecent(element, limite) {
  const creation = element.cree_le ?? element.saisie_le;
  return instant(element.modifie_le) > limite || instant(creation) > limite;
}

function champsInconnus(fichier) {
  const connus = new Set([...CHAMPS_ENTETE, ...COLLECTIONS]);
  const entrees = Object.entries(fichier).filter(([cle]) => !connus.has(cle));
  return structuredClone(Object.fromEntries(entrees));
}

// ---------------------------------------------------------------- notes

/** Le texte local fait foi ; seul le statut « traitée » vient du fichier. */
function fusionnerNote(locale, recue, limite) {
  const aTraiter = locale.statut !== "traitee" && recue.statut === "traitee"
    && instant(locale.modifie_le) <= limite;
  if (!aTraiter) return { note: locale, traitee: false };
  return { note: { ...locale, statut: "traitee", traitee_le: recue.traitee_le }, traitee: true };
}

function fusionnerNotes(etat, fichier, limite) {
  const recues = indexer(fichier.notes_brutes);
  const locales = indexer(etat.notes_brutes);
  const supprimees = new Set(etat.notes_supprimees);
  let traitees = 0;

  const notes = etat.notes_brutes.map((locale) => {
    const recue = recues.get(locale.id);
    if (!recue) return locale;
    const resultat = fusionnerNote(locale, recue, limite);
    if (resultat.traitee) traitees += 1;
    return resultat.note;
  });
  // Notes connues du fichier mais absentes du téléphone : restauration.
  for (const recue of fichier.notes_brutes) {
    if (locales.has(recue.id) || supprimees.has(recue.id)) continue;
    notes.push(recue);
    if (recue.statut === "traitee") traitees += 1;
  }
  return { notes, traitees };
}

// ---------------------------------------------------------------- collections partagées

function fusionnerEvenement(local, recu) {
  const presents = [...new Set([...recu.personne_ids, ...local.personne_ids])];
  return { ...local, personne_ids: presents };
}

/**
 * Élément local récent : conservé. Sinon la version du fichier gagne, et un
 * élément ancien absent du fichier disparaît (Claude l'a fusionné ou retiré).
 */
function fusionnerCollection(nom, etat, fichier, limite) {
  const locaux = indexer(etat[nom]);
  let conserves = 0;

  const elements = fichier[nom].map((recu) => {
    const local = locaux.get(recu.id);
    if (!local || !estRecent(local, limite)) return recu;
    conserves += 1;
    return nom === "evenements" ? fusionnerEvenement(local, recu) : local;
  });
  const recus = indexer(fichier[nom]);
  for (const local of etat[nom]) {
    if (recus.has(local.id) || !estRecent(local, limite)) continue;
    elements.push(local);
    conserves += 1;
  }
  return { elements, conserves };
}

// ---------------------------------------------------------------- références

/** Remet en place un élément local encore référencé alors que la fusion l'a écarté. */
function restaurerManquants(resultat, etat, nom, identifiants) {
  const presents = new Set(resultat[nom].map((element) => element.id));
  const locaux = indexer(etat[nom]);
  let restaures = 0;
  for (const id of identifiants) {
    if (id === null || presents.has(id) || !locaux.has(id)) continue;
    resultat[nom].push(locaux.get(id));
    presents.add(id);
    restaures += 1;
  }
  return restaures;
}

/** Garantit qu'aucun élément conservé ne pointe vers un élément disparu. */
function restaurerReferences(resultat, etat) {
  const etapes = [
    ["evenements", () => resultat.notes_brutes.map((n) => n.evenement_id)],
    ["personnes", () => resultat.evenements.flatMap((e) => e.personne_ids)],
    ["series", () => resultat.evenements.map((e) => e.serie_id)],
    ["contextes", () => [
      ...resultat.series.map((s) => s.contexte_id),
      ...resultat.personnes.flatMap((p) => p.contexte_ids),
    ]],
  ];
  return etapes.reduce(
    (total, [nom, identifiants]) => total + restaurerManquants(resultat, etat, nom, identifiants()),
    0,
  );
}

// ---------------------------------------------------------------- fusion

/**
 * Fusionne un fichier validé dans l'état local.
 * @returns {{etat: object, bilan: object}} un nouvel état ; les arguments restent intacts.
 */
export function fusionner(etat, fichier) {
  const limite = instant(fichier.base_exporte_le ?? fichier.exporte_le);
  const { notes, traitees } = fusionnerNotes(etat, fichier, limite);
  const resultat = {
    revision: fichier.revision,
    personnes: fichier.personnes,
    notes_brutes: notes,
    notes_supprimees: etat.notes_supprimees,
    champs_inconnus: champsInconnus(fichier),
  };
  let conserves = 0;
  for (const nom of COLLECTIONS_PARTAGEES) {
    const fusion = fusionnerCollection(nom, etat, fichier, limite);
    resultat[nom] = fusion.elements;
    conserves += fusion.conserves;
  }
  const restaures = restaurerReferences(resultat, etat);

  const nouvelEtat = structuredClone({ ...etatVide(), ...resultat });
  return {
    etat: nouvelEtat,
    bilan: {
      personnes: nouvelEtat.personnes.length,
      notes_traitees: traitees,
      notes_en_attente: nouvelEtat.notes_brutes.filter((n) => n.statut !== "traitee").length,
      elements_locaux_conserves: conserves,
      elements_restaures: restaures,
    },
  };
}
