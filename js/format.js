// Format d'échange entre l'app et Claude : constantes et validation.
// Fonctions pures, sans accès au navigateur : testables avec `node --test`.
// La référence lisible de ce format est docs/format-echange.md.

export const FORMAT = "application-reseau";
export const VERSION_SCHEMA = 1;
export const COLLECTIONS = ["contextes", "series", "evenements", "personnes", "notes_brutes"];

export const PREFIXES = {
  contextes: "ctx",
  series: "ser",
  evenements: "evt",
  personnes: "per",
  notes_brutes: "not",
  echanges: "ech",
  suivis: "sui",
};

/** Champs d'en-tête connus ; tout autre champ racine est conservé tel quel. */
export const CHAMPS_ENTETE = [
  "format", "schema_version", "origine", "exporte_le", "revision", "base_exporte_le",
];

const ORIGINES = ["app", "claude"];
const STATUTS_NOTE = ["non_traitee", "traitee"];
const STATUTS_SUIVI = ["ouvert", "fait"];

const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORODATAGE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;
const RE_ANNIVERSAIRE_SANS_ANNEE = /^--\d{2}-\d{2}$/;
const RE_SUFFIXE_ID = "[A-Za-z0-9-]{8,}";

/**
 * Migrations de schéma : MIGRATIONS[n] transforme un fichier de version n
 * en fichier de version n + 1. Vide tant que la version 1 est la seule.
 */
const MIGRATIONS = {};

// ---------------------------------------------------------------- types simples

const estObjet = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const estTexte = (v) => typeof v === "string";
const estEntier = (v) => Number.isInteger(v);

export function estDate(valeur) {
  if (!estTexte(valeur) || !RE_DATE.test(valeur)) return false;
  const date = new Date(`${valeur}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === valeur;
}

export function estHorodatage(valeur) {
  return estTexte(valeur) && RE_HORODATAGE.test(valeur) && !Number.isNaN(Date.parse(valeur));
}

/** null, « AAAA-MM-JJ » ou « --MM-JJ » (année inconnue). */
export function estAnniversaire(valeur) {
  if (valeur === null) return true;
  if (!estTexte(valeur)) return false;
  if (RE_ANNIVERSAIRE_SANS_ANNEE.test(valeur)) return estDate(`2000${valeur.slice(1)}`);
  return estDate(valeur);
}

function estIdentifiant(valeur, prefixe) {
  return estTexte(valeur) && new RegExp(`^${prefixe}_${RE_SUFFIXE_ID}$`).test(valeur);
}

// ---------------------------------------------------------------- rapport d'erreurs

function creerRapport() {
  const erreurs = [];
  return {
    erreurs,
    ajouter(code, chemin, message) {
      erreurs.push({ code, chemin, message });
    },
  };
}

function conclure(rapport, fichier = null) {
  const ok = rapport.erreurs.length === 0;
  return { ok, erreurs: rapport.erreurs, fichier: ok ? fichier : null };
}

// ---------------------------------------------------------------- contrôles de champ

function exigerTexte(r, objet, champ, chemin, { nonVide = false } = {}) {
  const valeur = objet[champ];
  if (!estTexte(valeur) || (nonVide && valeur.trim() === "")) {
    r.ajouter("texte", `${chemin}.${champ}`, `« ${champ} » doit être un texte${nonVide ? " non vide" : ""}.`);
  }
}

function exigerTexteFacultatif(r, objet, champ, chemin) {
  const valeur = objet[champ];
  if (valeur !== undefined && valeur !== null && !estTexte(valeur)) {
    r.ajouter("texte", `${chemin}.${champ}`, `« ${champ} » doit être un texte, null ou absent.`);
  }
}

function exigerHorodatage(r, objet, champ, chemin, { nul = false } = {}) {
  const valeur = objet[champ];
  if (nul && valeur === null) return;
  if (!estHorodatage(valeur)) {
    r.ajouter("horodatage", `${chemin}.${champ}`,
      `« ${champ} » doit être un horodatage ISO 8601 (ex. 2026-11-13T07:45:10Z).`);
  }
}

function exigerDate(r, objet, champ, chemin, { nul = false } = {}) {
  const valeur = objet[champ];
  if (nul && valeur === null) return;
  if (!estDate(valeur)) {
    r.ajouter("date", `${chemin}.${champ}`, `« ${champ} » doit être une date réelle au format AAAA-MM-JJ.`);
  }
}

function exigerValeur(r, objet, champ, chemin, valeurs) {
  if (!valeurs.includes(objet[champ])) {
    r.ajouter("valeur", `${chemin}.${champ}`, `« ${champ} » doit valoir : ${valeurs.join(" ou ")}.`);
  }
}

function exigerReference(r, valeur, connus, chemin, { nul = false } = {}) {
  if (nul && valeur === null) return;
  if (!connus.has(valeur)) {
    r.ajouter("reference", chemin, `Référence vers un élément absent du fichier : ${JSON.stringify(valeur)}.`);
  }
}

function exigerReferences(r, objet, champ, connus, chemin) {
  const liste = objet[champ];
  if (!Array.isArray(liste)) {
    r.ajouter("liste", `${chemin}.${champ}`, `« ${champ} » doit être une liste.`);
    return;
  }
  liste.forEach((valeur, i) => exigerReference(r, valeur, connus, `${chemin}.${champ}[${i}]`));
}

function exigerCreationEtModification(r, objet, chemin) {
  exigerHorodatage(r, objet, "cree_le", chemin);
  exigerHorodatage(r, objet, "modifie_le", chemin);
}

// ---------------------------------------------------------------- en-tête

function validerEntete(f, r) {
  if (f.format !== FORMAT) {
    r.ajouter("format", "format", "Ce fichier n'est pas un fichier de l'Application Réseau.");
    return;
  }
  if (!estEntier(f.schema_version) || f.schema_version < 1) {
    r.ajouter("version", "schema_version", "« schema_version » doit être un entier supérieur ou égal à 1.");
    return;
  }
  if (f.schema_version > VERSION_SCHEMA) {
    r.ajouter("version_inconnue", "schema_version",
      `Ce fichier utilise la version ${f.schema_version} du format ; cette app connaît la version ` +
      `${VERSION_SCHEMA} au plus. Mettez l'app à jour.`);
    return;
  }
  exigerValeur(r, f, "origine", "", ORIGINES);
  exigerHorodatage(r, f, "exporte_le", "");
  if (!estEntier(f.revision) || f.revision < 0) {
    r.ajouter("revision", "revision", "« revision » doit être un entier positif ou nul.");
  }
  validerBaseExport(f, r);
}

function validerBaseExport(f, r) {
  const requis = f.origine === "claude";
  const valide = requis ? estHorodatage(f.base_exporte_le)
    : f.base_exporte_le === null || estHorodatage(f.base_exporte_le);
  if (!valide) {
    r.ajouter("base_exporte_le", "base_exporte_le", requis
      ? "Un fichier produit par Claude doit recopier dans « base_exporte_le » la date de l'export traité."
      : "« base_exporte_le » doit être null ou un horodatage ISO 8601.");
  }
}

function migrer(fichier) {
  let courant = fichier;
  while (courant.schema_version < VERSION_SCHEMA) {
    courant = MIGRATIONS[courant.schema_version](courant);
  }
  return courant;
}

// ---------------------------------------------------------------- identifiants

function validerCollectionsPresentes(f, r) {
  for (const nom of COLLECTIONS) {
    if (!Array.isArray(f[nom])) {
      r.ajouter("collection_manquante", nom, `La collection « ${nom} » est absente ou n'est pas une liste.`);
    }
  }
}

/** Enregistre un identifiant ; signale un mauvais format ou un doublon. */
function enregistrerId(r, element, prefixe, chemin, vus) {
  if (!estObjet(element)) {
    r.ajouter("structure", chemin, "Chaque élément doit être un objet.");
    return null;
  }
  if (!estIdentifiant(element.id, prefixe)) {
    r.ajouter("identifiant", `${chemin}.id`, `Identifiant invalide : attendu « ${prefixe}_ » suivi d'un UUID.`);
    return null;
  }
  if (vus.has(element.id)) {
    r.ajouter("identifiant_double", `${chemin}.id`, `Identifiant présent plusieurs fois : ${element.id}.`);
    return null;
  }
  vus.add(element.id);
  return element.id;
}

function indexerIdentifiants(f, r) {
  const vus = new Set();
  const index = { vus };
  for (const nom of COLLECTIONS) {
    index[nom] = new Set();
    f[nom].forEach((element, i) => {
      const id = enregistrerId(r, element, PREFIXES[nom], `${nom}[${i}]`, vus);
      if (id) index[nom].add(id);
    });
  }
  return index;
}

// ---------------------------------------------------------------- collections

function pourChaqueObjet(liste, nom, action) {
  liste.forEach((element, i) => {
    if (estObjet(element)) action(element, `${nom}[${i}]`);
  });
}

function validerContextes(f, r) {
  pourChaqueObjet(f.contextes, "contextes", (c, chemin) => {
    exigerTexte(r, c, "nom", chemin, { nonVide: true });
    exigerCreationEtModification(r, c, chemin);
  });
}

function validerSeries(f, ids, r) {
  pourChaqueObjet(f.series, "series", (s, chemin) => {
    exigerTexte(r, s, "nom", chemin, { nonVide: true });
    exigerReference(r, s.contexte_id, ids.contextes, `${chemin}.contexte_id`);
    exigerCreationEtModification(r, s, chemin);
  });
}

function validerEvenements(f, ids, r) {
  pourChaqueObjet(f.evenements, "evenements", (e, chemin) => {
    exigerTexte(r, e, "titre", chemin);
    exigerDate(r, e, "date", chemin);
    exigerReference(r, e.serie_id, ids.series, `${chemin}.serie_id`, { nul: true });
    exigerReferences(r, e, "personne_ids", ids.personnes, chemin);
    exigerCreationEtModification(r, e, chemin);
  });
}

function validerEchanges(p, chemin, ids, r) {
  if (!Array.isArray(p.echanges)) {
    r.ajouter("liste", `${chemin}.echanges`, "« echanges » doit être une liste.");
    return;
  }
  p.echanges.forEach((echange, i) => {
    const ici = `${chemin}.echanges[${i}]`;
    if (!enregistrerId(r, echange, PREFIXES.echanges, ici, ids.vus)) return;
    exigerDate(r, echange, "date", ici);
    exigerReference(r, echange.evenement_id, ids.evenements, `${ici}.evenement_id`, { nul: true });
    exigerTexte(r, echange, "resume", ici);
  });
}

function validerSuivis(p, chemin, ids, r) {
  if (!Array.isArray(p.suivis)) {
    r.ajouter("liste", `${chemin}.suivis`, "« suivis » doit être une liste.");
    return;
  }
  p.suivis.forEach((suivi, i) => {
    const ici = `${chemin}.suivis[${i}]`;
    if (!enregistrerId(r, suivi, PREFIXES.suivis, ici, ids.vus)) return;
    exigerTexte(r, suivi, "action", ici, { nonVide: true });
    exigerDate(r, suivi, "date_promise", ici, { nul: true });
    exigerValeur(r, suivi, "statut", ici, STATUTS_SUIVI);
    exigerHorodatage(r, suivi, "notion_tache_le", ici, { nul: true });
    exigerTexteFacultatif(r, suivi, "notion_url", ici);
  });
}

function validerPersonnes(f, ids, r) {
  pourChaqueObjet(f.personnes, "personnes", (p, chemin) => {
    exigerTexte(r, p, "prenom", chemin);
    exigerTexte(r, p, "nom", chemin);
    if (estTexte(p.prenom) && estTexte(p.nom) && `${p.prenom}${p.nom}`.trim() === "") {
      r.ajouter("texte", chemin, "Une personne doit avoir au moins un prénom ou un nom.");
    }
    exigerReferences(r, p, "contexte_ids", ids.contextes, chemin);
    for (const champ of ["metier", "entreprise", "rencontre", "details_personnels"]) {
      exigerTexteFacultatif(r, p, champ, chemin);
    }
    if (!estAnniversaire(p.anniversaire)) {
      r.ajouter("date", `${chemin}.anniversaire`, "« anniversaire » doit valoir null, AAAA-MM-JJ ou --MM-JJ.");
    }
    exigerHorodatage(r, p, "anniversaire_agenda_le", chemin, { nul: true });
    validerEchanges(p, chemin, ids, r);
    validerSuivis(p, chemin, ids, r);
    exigerCreationEtModification(r, p, chemin);
  });
}

function validerNotes(f, ids, r) {
  pourChaqueObjet(f.notes_brutes, "notes_brutes", (n, chemin) => {
    exigerTexte(r, n, "texte", chemin);
    exigerHorodatage(r, n, "saisie_le", chemin);
    exigerHorodatage(r, n, "modifie_le", chemin);
    exigerReference(r, n.evenement_id, ids.evenements, `${chemin}.evenement_id`, { nul: true });
    exigerValeur(r, n, "statut", chemin, STATUTS_NOTE);
    exigerHorodatage(r, n, "traitee_le", chemin, { nul: n.statut !== "traitee" });
  });
}

/**
 * Les horodatages des contextes, séries et événements appartiennent au téléphone :
 * la fusion s'en sert pour reconnaître ce qui a changé après l'export. Un fichier
 * de Claude ne peut donc pas en porter de postérieurs à l'export qu'il a traité.
 */
function validerHorodatagesDuTelephone(f, r) {
  if (f.origine !== "claude") return;
  const limite = Date.parse(f.base_exporte_le);
  for (const nom of ["contextes", "series", "evenements"]) {
    pourChaqueObjet(f[nom], nom, (element, chemin) => {
      for (const champ of ["cree_le", "modifie_le"]) {
        if (estHorodatage(element[champ]) && Date.parse(element[champ]) > limite) {
          r.ajouter("horodatage_app", `${chemin}.${champ}`,
            `« ${champ} » est postérieur à « base_exporte_le » : Claude ne doit pas modifier ` +
            "les horodatages des contextes, séries et événements.");
        }
      }
    });
  }
}

// ---------------------------------------------------------------- API publique

/**
 * Valide un objet déjà lu. Ne modifie rien.
 * @returns {{ok: boolean, erreurs: {code: string, chemin: string, message: string}[], fichier: object|null}}
 */
export function validerFichier(brut) {
  const r = creerRapport();
  if (!estObjet(brut)) {
    r.ajouter("structure", "", "Le fichier ne contient pas un objet JSON.");
    return conclure(r);
  }
  validerEntete(brut, r);
  if (r.erreurs.length > 0) return conclure(r);

  const fichier = migrer(brut);
  validerCollectionsPresentes(fichier, r);
  if (r.erreurs.length > 0) return conclure(r);

  const ids = indexerIdentifiants(fichier, r);
  validerContextes(fichier, r);
  validerSeries(fichier, ids, r);
  validerEvenements(fichier, ids, r);
  validerPersonnes(fichier, ids, r);
  validerNotes(fichier, ids, r);
  validerHorodatagesDuTelephone(fichier, r);
  return conclure(r, fichier);
}

/** Lit le texte d'un fichier puis le valide. */
export function analyserTexte(texte) {
  let brut;
  try {
    brut = JSON.parse(texte);
  } catch (erreur) {
    const r = creerRapport();
    r.ajouter("json_illisible", "", `Le fichier est abîmé ou incomplet : ce n'est pas du JSON lisible (${erreur.message}).`);
    return conclure(r);
  }
  return validerFichier(brut);
}

const deuxChiffres = (n) => String(n).padStart(2, "0");

/** Nom daté (heure locale du téléphone) : reseau-export-AAAA-MM-JJ-HHmm-rNNNN.json */
export function nomFichierExport(date, revision) {
  const jour = `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;
  const heure = `${deuxChiffres(date.getHours())}${deuxChiffres(date.getMinutes())}`;
  return `reseau-export-${jour}-${heure}-r${String(revision).padStart(4, "0")}.json`;
}
