// Stockage local (IndexedDB). Un seul magasin clé → valeur : écrire plusieurs
// clés d'un coup se fait dans une seule transaction, donc tout ou rien.

const NOM_BASE = "application-reseau";
const MAGASIN = "donnees";

let base = null;

function ouvrir() {
  base ??= new Promise((resoudre, rejeter) => {
    const demande = indexedDB.open(NOM_BASE, 1);
    demande.onupgradeneeded = () => demande.result.createObjectStore(MAGASIN);
    demande.onsuccess = () => resoudre(demande.result);
    demande.onerror = () => rejeter(demande.error);
  });
  return base;
}

function transaction(mode, action) {
  return ouvrir().then((connexion) => new Promise((resoudre, rejeter) => {
    const tx = connexion.transaction(MAGASIN, mode);
    const resultat = action(tx.objectStore(MAGASIN));
    tx.oncomplete = () => resoudre(resultat);
    tx.onerror = () => rejeter(tx.error);
    tx.onabort = () => rejeter(tx.error ?? new Error("Écriture annulée par le navigateur."));
  }));
}

/** Lit plusieurs clés ; une clé absente vaut undefined. */
export function lire(cles) {
  return transaction("readonly", (magasin) => {
    const valeurs = {};
    for (const cle of cles) {
      const demande = magasin.get(cle);
      demande.onsuccess = () => { valeurs[cle] = demande.result; };
    }
    return valeurs;
  });
}

/** Écrit toutes les paires clé → valeur, ou aucune. */
export function ecrire(valeurs) {
  return transaction("readwrite", (magasin) => {
    for (const [cle, valeur] of Object.entries(valeurs)) magasin.put(valeur, cle);
  });
}

/** Demande au navigateur de ne pas évincer les données ; renvoie true si accordé. */
export async function demanderPersistance() {
  if (!navigator.storage?.persist) return false;
  return (await navigator.storage.persisted()) || navigator.storage.persist();
}
