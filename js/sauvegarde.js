// Suivi de la sauvegarde et retour en arrière après un import. Fonctions pures.

export const SEUIL_JOURS = 7;
export const MAX_INSTANTANES = 3;
const JOUR = 24 * 60 * 60 * 1000;

export function metaVide() {
  return {
    derniere_sauvegarde_le: null,
    modifs_depuis_sauvegarde: false,
    premiere_modif_le: null,
    dernier_import: null,
  };
}

/** À appeler à chaque changement fait sur le téléphone. */
export function marquerModification(meta, maintenant) {
  return {
    ...meta,
    modifs_depuis_sauvegarde: true,
    premiere_modif_le: meta.premiere_modif_le ?? maintenant.toISOString(),
  };
}

export function marquerSauvegarde(meta, maintenant) {
  return {
    ...meta,
    derniere_sauvegarde_le: maintenant.toISOString(),
    modifs_depuis_sauvegarde: false,
    premiere_modif_le: null,
  };
}

/**
 * La sauvegarde est « ancienne » s'il reste des modifications non exportées
 * et que la dernière sauvegarde (ou, à défaut, la première modification)
 * date de plus de SEUIL_JOURS.
 */
export function etatSauvegarde(meta, maintenant) {
  const reference = meta.derniere_sauvegarde_le ?? meta.premiere_modif_le;
  const jours = reference ? Math.floor((maintenant - Date.parse(reference)) / JOUR) : 0;
  return {
    jamais: meta.derniere_sauvegarde_le === null,
    a_sauvegarder: meta.modifs_depuis_sauvegarde,
    jours,
    ancienne: meta.modifs_depuis_sauvegarde && jours >= SEUIL_JOURS,
  };
}

/** Ajoute une copie de l'état avant import ; ne garde que les plus récentes. */
export function empilerInstantane(instantanes, etat, meta, maintenant) {
  const instantane = structuredClone({ pris_le: maintenant.toISOString(), etat, meta });
  return [...instantanes, instantane].slice(-MAX_INSTANTANES);
}

/**
 * Revient à l'état d'avant le dernier import, sans perdre ce qui a été saisi
 * depuis : les notes créées, modifiées ou supprimées après l'instantané sont conservées.
 */
export function annulerImport(etatCourant, instantane) {
  const limite = Date.parse(instantane.pris_le);
  const recentes = etatCourant.notes_brutes.filter((note) => Date.parse(note.modifie_le) > limite);
  const idsRecents = new Set(recentes.map((note) => note.id));
  const supprimees = new Set([
    ...instantane.etat.notes_supprimees,
    ...etatCourant.notes_supprimees,
  ]);
  const anciennes = instantane.etat.notes_brutes.filter(
    (note) => !idsRecents.has(note.id) && !supprimees.has(note.id));
  return structuredClone({
    ...instantane.etat,
    notes_brutes: [...anciennes, ...recentes],
    notes_supprimees: [...supprimees],
  });
}
