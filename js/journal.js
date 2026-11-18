// Journal des erreurs en mémoire, affiché dans l'écran Sauvegarde (diagnostic).
// Il n'y a pas d'inspecteur web sur l'iPhone : c'est le seul moyen de les voir.

const MAX = 10;
const erreurs = [];

export function consigner(erreur) {
  const message = erreur?.message ?? String(erreur);
  erreurs.push({ le: new Date().toISOString(), message });
  if (erreurs.length > MAX) erreurs.shift();
  console.error(erreur);
}

export const lireErreurs = () => [...erreurs];
