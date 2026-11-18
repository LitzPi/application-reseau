// Point d'entrée : navigation interne (aucune interface de navigateur en mode
// installé), onglets, démarrage.

import { h, icone } from "./dom.js";
import { consigner } from "./journal.js";
import { charger, abonner } from "./magasin.js";
import { demanderPersistance } from "./stockage.js";
import { ecranAccueil } from "./ecrans/accueil.js";
import { ecranNotes } from "./ecrans/notes.js";
import { ecranSaisie } from "./ecrans/saisie.js";
import { ecranSauvegarde } from "./ecrans/sauvegarde.js";

const ROUTES = [
  { motif: /^\/$/, ecran: ecranAccueil, onglet: "accueil", vivant: true },
  { motif: /^\/notes$/, ecran: ecranNotes, onglet: "accueil", vivant: true },
  // La saisie n'est pas redessinée pendant la frappe, et masque les onglets.
  { motif: /^\/note\/([\w-]+)$/, ecran: ecranSaisie, onglet: null, vivant: false },
  { motif: /^\/sauvegarde$/, ecran: ecranSauvegarde, onglet: "sauvegarde", vivant: true },
];

const ONGLETS = [
  { cle: "accueil", libelle: "Accueil", icone: "accueil", chemin: "/" },
  { cle: "sauvegarde", libelle: "Sauvegarde", icone: "sauvegarde", chemin: "/sauvegarde" },
];

const zoneEcran = document.getElementById("ecran");
const zoneOnglets = document.getElementById("onglets");
const contexte = {
  installee: window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true,
  persistant: false,
  horsLigne: false,
};

let cheminAffiche = null;
let ecranCourant = null;
let routeCourante = null;

const cheminDemande = () => location.hash.slice(1) || "/";

function trouverRoute(chemin) {
  for (const route of ROUTES) {
    const correspondance = chemin.match(route.motif);
    if (correspondance) return { route, params: correspondance.slice(1) };
  }
  return { route: ROUTES[0], params: [] };
}

function dessinerOnglets(actif) {
  zoneOnglets.hidden = actif === null;
  zoneOnglets.replaceChildren(...ONGLETS.map((onglet) =>
    h("button", {
      type: "button",
      classe: `onglet${onglet.cle === actif ? " actif" : ""}`,
      "aria-current": onglet.cle === actif ? "page" : null,
      onclick: () => naviguer(onglet.chemin),
    }, icone(onglet.icone), onglet.libelle)));
}

/**
 * Affiche un écran. Synchrone : appelé dans le geste de l'utilisateur, ce qui
 * permet d'ouvrir le clavier iOS dès l'arrivée sur la saisie.
 */
function afficher(chemin, { anime = true } = {}) {
  ecranCourant?.quitter?.();
  const { route, params } = trouverRoute(chemin);
  routeCourante = route;
  cheminAffiche = chemin;
  ecranCourant = route.ecran({
    params,
    naviguer,
    remplacerChemin,
    contexte,
    rafraichir: () => afficher(cheminAffiche, { anime: false }),
  });
  ecranCourant.element.classList.toggle("entree", anime);
  zoneEcran.replaceChildren(ecranCourant.element);
  dessinerOnglets(route.onglet);
  ecranCourant.apresAffichage?.();
}

function naviguer(chemin) {
  if (cheminDemande() !== chemin) location.hash = chemin;
  if (cheminAffiche !== chemin) afficher(chemin);
}

/** Change l'adresse sans redessiner (une note vient de recevoir son identifiant). */
function remplacerChemin(chemin) {
  history.replaceState(null, "", `#${chemin}`);
  cheminAffiche = chemin;
}

/** Le clavier iOS réduit la zone visible sans redimensionner la page : on suit. */
function suivreZoneVisible() {
  const zone = window.visualViewport;
  if (!zone) return;
  const ajuster = () => {
    document.documentElement.style.setProperty("--hauteur-visible", `${zone.height}px`);
    window.scrollTo(0, 0);
  };
  zone.addEventListener("resize", ajuster);
  zone.addEventListener("scroll", ajuster);
  ajuster();
}

async function preparerHorsLigne() {
  if (!("serviceWorker" in navigator)) return;
  await navigator.serviceWorker.register("./sw.js");
  await navigator.serviceWorker.ready;
  contexte.horsLigne = true;
}

async function demarrer() {
  window.addEventListener("error", (evenement) => consigner(evenement.error ?? evenement.message));
  window.addEventListener("unhandledrejection", (evenement) => consigner(evenement.reason));
  suivreZoneVisible();

  try {
    await charger();
  } catch (erreur) {
    consigner(erreur);
    zoneEcran.replaceChildren(h("p", { classe: "vide",
      texte: `Impossible de lire les données du téléphone : ${erreur.message}` }));
    return;
  }

  afficher(cheminDemande(), { anime: false });
  window.addEventListener("hashchange", () => {
    if (cheminDemande() !== cheminAffiche) afficher(cheminDemande());
  });
  abonner(() => { if (routeCourante?.vivant) afficher(cheminAffiche, { anime: false }); });

  demanderPersistance().then((accorde) => { contexte.persistant = accorde; }).catch(consigner);
  preparerHorsLigne().catch(consigner);
}

demarrer();
