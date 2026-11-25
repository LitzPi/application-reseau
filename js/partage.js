// Sortie du fichier d'export. Trois niveaux, du plus confortable au plus sûr :
// 1. feuille de partage iOS (vers le dossier synchronisé) ; 2. téléchargement ; 3. copie du contenu.
// Les niveaux 2 et 3 sont proposés par des boutons : chacun doit partir d'un geste.

function fichiersCandidats(nom, texte) {
  return [
    new File([texte], nom, { type: "application/json" }),
    // Repli si la feuille de partage refuse le type JSON.
    new File([texte], nom.replace(/\.json$/, ".txt"), { type: "text/plain" }),
  ];
}

/**
 * Tente la feuille de partage.
 * @returns {Promise<"partage"|"annule"|"indisponible">}
 */
export async function partagerFichier(nom, texte) {
  if (!navigator.canShare || !navigator.share) return "indisponible";
  const fichier = fichiersCandidats(nom, texte).find((f) => navigator.canShare({ files: [f] }));
  if (!fichier) return "indisponible";
  try {
    await navigator.share({ files: [fichier] });
    return "partage";
  } catch (erreur) {
    return erreur.name === "AbortError" ? "annule" : "indisponible";
  }
}

/** À appeler directement dans un clic. */
export function telechargerFichier(nom, texte) {
  const url = URL.createObjectURL(new Blob([texte], { type: "application/json" }));
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nom;
  document.body.append(lien);
  lien.click();
  lien.remove();
  // Révocation différée : iOS lit l'URL après la fin du clic.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** À appeler directement dans un clic. */
export function copierTexte(texte) {
  return navigator.clipboard.writeText(texte);
}
