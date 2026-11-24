# Recette sur iPhone

Ce qui ne peut se vérifier que sur l'appareil, en mode installé. Les tests automatiques (`npm test`, `npm run test:e2e`) couvrent le reste, mais WebKit sous Playwright n'est pas Safari iOS.

Appareil de référence : iPhone sous iOS 26, app installée depuis Safari.

## Installation et socle

- [x] Ouverture de l'adresse dans Safari, puis « Sur l'écran d'accueil » avec « Ouvrir comme app web » — 19/11/2026
- [x] Diagnostic : app installée, stockage protégé, hors ligne prêt — 19/11/2026
- [x] Démarrage et saisie en mode avion — 19/11/2026
- [x] Mise à jour de l'app sans perte de données (0.2.0 → 0.3.0) — 23/11/2026
- [x] Barre de navigation nette sous la barre d'état d'iOS 26 (correctif 0.3.1) — 23/11/2026
- [ ] Bandeau « Nouvelle version prête » lors d'une mise à jour (à partir de la 0.7.0)

## Saisie

- [x] Clavier ouvert dès l'arrivée sur « Nouvelle note », enregistrement automatique — 19/11/2026
- [x] Note rattachée à l'événement depuis la page de l'événement — 23/11/2026
- [x] Rattachement automatique à l'événement du jour, puis « Changer » — 23/11/2026
- [x] Formulaire « Nouvel événement » : date, série, contexte — 23/11/2026
- [ ] Dictée par la touche micro du clavier

## Export et import

- [x] Export par la feuille de partage vers OneDrive — 19/11/2026
- [x] Import depuis OneDrive par le sélecteur de fichiers — 19/11/2026
- [x] Note saisie après l'export préservée par l'import — 19/11/2026
- [x] Liens événement, série, contexte et notes corrects dans l'export — 23/11/2026
- [ ] Annulation du dernier import
- [ ] Restauration complète sur un téléphone vide (suppression de l'app, réinstallation, import)
- [ ] Replis de l'export (télécharger, copier) : non déclenchés sur iPhone, le partage fonctionne

## Consultation

- [x] Présents cochés sur un événement, liste qui reste en place — 23/11/2026
- [x] Onglet Personnes, recherche par mots, fiche complète — 24/11/2026
- [x] Onglet Préparer : série puis contexte, fiches courtes — 24/11/2026
- [x] Bandeau « Cette semaine » et onglet Anniversaires — 24/11/2026
- [ ] Mode sombre et mode clair, changement en cours d'utilisation
- [ ] Utilisation à une main : boutons principaux atteignables au pouce

## Cycle réel

- [ ] Notes réelles exportées, traitées par Claude avec `docs/format-echange.md`, retour importé
- [ ] Anniversaire créé dans Google Agenda et suivi créé dans Notion, traces visibles sur la fiche
- [ ] Départ d'une base propre avant l'usage réel (données de test supprimées)
