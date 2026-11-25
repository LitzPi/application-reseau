# Guide d'installation — pour Claude

Ce guide s'adresse à toi, Claude. Tu installes l'Application Réseau avec l'utilisateur, **une étape par message** : tu expliques l'étape et son utilité en deux ou trois phrases, tu fais ce qui peut être fait de ton côté, puis tu attends sa confirmation avant la suivante.

Durée habituelle : 30 à 45 minutes. Après chaque étape terminée, mets à jour la rubrique « Avancement » de `mes-reglages.md` (une fois ce fichier créé), pour pouvoir reprendre si la session est interrompue. Pour reprendre, l'utilisateur dira « reprends l'installation » : relis alors `mes-reglages.md`, **vérifie l'état réel** de ce qui a déjà été fait (outils installés, dépôt existant, Pages actif, app en ligne) et repars de la première étape inachevée.

Avant de commencer, présente en quelques lignes ce qui va se passer : l'app sera copiée sur un compte GitHub gratuit à son nom (seul le code y est publié, jamais ses données), installée sur son iPhone depuis Safari, puis reliée à toi par des fichiers déposés dans ce dossier.

## Conventions pour les commandes

- Repère d'abord le système et le shell que tu utilises (PowerShell, Git Bash, zsh) : plusieurs commandes diffèrent.
- **Chemins** : mets toujours les chemins entre guillemets ; ceux des dossiers synchronisés contiennent souvent des espaces (« OneDrive - Société »).
- **Commandes interactives** (connexion, installation avec fenêtre de confirmation) : c'est l'utilisateur qui les lance dans son propre terminal. Explique-lui comment l'ouvrir :
  - Mac : touches Cmd + Espace, taper « Terminal », Entrée ;
  - Windows : menu Démarrer, taper « PowerShell », Entrée. Après l'installation d'un outil, il faut ouvrir une **nouvelle** fenêtre PowerShell (et souvent relancer Claude Code) pour qu'il soit reconnu.
- **Hors du dossier de travail** : ton répertoire courant n'est pas conservé d'une commande à l'autre hors de ce dossier. Pour le dossier de déploiement (étape 4), utilise des chemins absolus dans chaque commande (`git -C "<chemin>"`, `--source "<chemin>"`). Préviens l'utilisateur qu'on lui demandera peut-être d'autoriser l'accès à ce dossier.

---

## Étape 1 — Le dossier synchronisé

**But** : ce dossier doit être visible à la fois sur l'ordinateur (pour toi) et sur l'iPhone (pour enregistrer les exports et choisir les fichiers à importer).

- Regarde le chemin du dossier de travail. Il doit se trouver dans un service synchronisé avec l'iPhone. Emplacements habituels :
  - iCloud Drive sur Mac : `~/Library/Mobile Documents/com~apple~CloudDocs/…` ;
  - OneDrive, Google Drive, Dropbox sur Mac : `~/Library/CloudStorage/…` ;
  - Windows : `C:\Users\<nom>\OneDrive…`, `…\iCloudDrive\…`, `…\Dropbox\…`, ou un lecteur Google Drive (souvent `G:`).
- Si ce n'est pas le cas, explique le problème et aide l'utilisateur à déplacer le dossier du kit dans son service synchronisé, puis à rouvrir Claude Code dans le nouveau dossier et à dire « reprends l'installation ». Arrête-toi là jusqu'à ce que ce soit fait.
- Crée les dossiers `donnees/exports/` et `donnees/reference/`.
- Copie `installation/modele-reglages.md` en `mes-reglages.md` à la racine et note-y le service synchronisé utilisé.
- Fais vérifier sur l'iPhone, dans l'app **Fichiers**, que le dossier du kit et son sous-dossier `donnees` sont visibles (la synchronisation peut prendre une minute). Si le service n'apparaît pas dans Fichiers :
  - installer l'app du service (OneDrive, Google Drive, Dropbox) et s'y connecter ; iCloud Drive est déjà présent ;
  - dans Fichiers, onglet **Parcourir**, toucher « ••• » en haut, puis **Modifier**, et activer le service.

## Étape 2 — Les outils sur l'ordinateur

**But** : publier l'app demande `git` et l'outil GitHub `gh`.

- Vérifie : `git --version` et `gh --version`.
- S'il en manque un, guide l'installation **un outil à la fois**. L'utilisateur lance lui-même la commande dans son terminal, car elle peut demander d'accepter des conditions ou afficher une fenêtre de confirmation de Windows qu'il doit valider :
  - Windows : `winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements`, puis `winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements`. Préviens qu'en lançant ces commandes il accepte les conditions d'utilisation de winget et des logiciels installés.
  - Mac : `xcode-select --install` (une fenêtre propose d'installer les outils, accepter) fournit git. Pour `gh` : `brew install gh` si Homebrew est présent (`brew --version`), sinon le programme d'installation téléchargeable sur https://cli.github.com.
- Vérifie aussi `node --version`. Node.js n'est pas obligatoire : il sert seulement à vérifier les fichiers de retour. S'il manque, propose de l'installer (Windows : `winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements` ; Mac : `brew install node` ou https://nodejs.org) sans insister.

## Étape 3 — Le compte GitHub

**But** : GitHub héberge gratuitement l'app et la rend accessible en HTTPS, ce qui est indispensable pour l'installer sur l'iPhone.

1. Demande à l'utilisateur s'il a un compte GitHub. Sinon, il le crée lui-même sur https://github.com/signup (gratuit). Tu ne crées pas de compte à sa place.
2. Fais-lui lancer, dans son terminal : `gh auth login --hostname github.com --git-protocol https --web`. Prépare-le aux questions :
   - « Authenticate Git with your GitHub credentials? » : répondre **Y** ;
   - un code à usage unique s'affiche ; appuyer sur Entrée ouvre le navigateur, où il colle ce code et autorise l'accès.
3. Vérifie avec `gh auth status`, puis lance `gh auth setup-git` pour que tes futures commandes `git` utilisent cette connexion sans rien demander.
4. Récupère son identifiant et son numéro, en deux commandes (sans guillemets, pour fonctionner dans tous les shells) : `gh api user --jq .login` et `gh api user --jq .id`. Note l'identifiant dans `mes-reglages.md`.

## Étape 4 — Publier l'app sur son GitHub

**But** : créer sa propre copie de l'app, indépendante de toute autre.

Annonce ce que tu vas faire et attends son accord : créer un dépôt **public** sur son compte (GitHub Pages gratuit l'exige), contenant uniquement le code de `app/`. Rassure-le : le dépôt et l'adresse de l'app sont publics, mais ne contiennent aucune de ses données, qui ne quitteront jamais son iPhone et son dossier synchronisé.

Le nom proposé est `application-reseau` ; on l'appelle `<nom-du-depot>` ci-dessous. Vérifie qu'il est libre : `gh repo view <identifiant>/<nom-du-depot>` doit répondre qu'il n'existe pas. Sinon, propose un autre nom (par exemple `reseau-perso`). Note le nom retenu dans `mes-reglages.md`.

1. **Dossier de déploiement, hors du dossier synchronisé** (un dépôt git dans un dossier synchronisé peut être corrompu par la synchronisation) :
   - Mac, zsh ou Git Bash : `~/application-reseau-site` ;
   - Windows, PowerShell : `$env:USERPROFILE\application-reseau-site` (jamais `%USERPROFILE%`, que PowerShell ne comprend pas).
   Note son chemin absolu dans `mes-reglages.md`. S'il existe déjà, regarde ce qu'il contient avant toute chose.
2. Copie-y le **contenu** de `app/` (pas le dossier lui-même), puis `git -C "<dossier>" init -b main`.
3. Identité du dépôt, pour ne pas publier son adresse e-mail personnelle :
   `git -C "<dossier>" config user.name "<identifiant>"` et
   `git -C "<dossier>" config user.email "<numéro>+<identifiant>@users.noreply.github.com"`.
4. `git -C "<dossier>" add -A`, puis `git -C "<dossier>" commit -m "feat: application réseau"`, puis
   `gh repo create <nom-du-depot> --public --source "<dossier>" --push --description "Application personnelle sans serveur. Aucune donnée dans ce dépôt."`
5. Active GitHub Pages :
   - PowerShell ou zsh : `gh api -X POST repos/<identifiant>/<nom-du-depot>/pages -f "source[branch]=main" -f "source[path]=/"` ;
   - Git Bash : même commande précédée de `MSYS_NO_PATHCONV=1 ` (sinon `/` est transformé en chemin Windows).
   Si la réponse indique que Pages est déjà actif, c'est bon.
6. L'adresse de l'app est `https://<identifiant en minuscules>.github.io/<nom-du-depot>/`. La première mise en ligne prend en général 1 à 3 minutes, parfois jusqu'à 10. Interroge l'adresse de `js/version.js` toutes les 20 secondes environ jusqu'à obtenir 200 :
   - Windows : `curl.exe -s -o NUL -w "%{http_code}" "<adresse>js/version.js"` (écrire `curl.exe` : sous PowerShell, `curl` seul désigne une autre commande) ;
   - Mac : `curl -s -o /dev/null -w "%{http_code}" "<adresse>js/version.js"`.
7. Note l'adresse de l'app dans `mes-reglages.md`.

## Étape 5 — Installer l'app sur l'iPhone

**But** : une app installée a son propre stockage, protégé, et fonctionne sans réseau. Dans Safari seul, les données pourraient être effacées.

Guide ces gestes, un message à la fois :

1. Faire arriver l'adresse sur l'iPhone : la recopier dans Safari en entier, avec la barre oblique finale, ou se l'envoyer par message ou e-mail et la toucher en choisissant de l'ouvrir dans **Safari** (pas un autre navigateur). L'écran « Accueil » de l'app doit s'afficher. **Ne rien saisir dans Safari** : ses données ne seraient pas reprises dans l'app installée.
2. Toucher **Partager** (le carré avec une flèche ; sur iOS 26 il peut être rangé derrière « ••• »), puis **Sur l'écran d'accueil**, vérifier que **Ouvrir comme app web** est activé, puis **Ajouter**.
3. Fermer Safari, ouvrir l'app par sa nouvelle icône « Réseau », aller dans l'onglet **Sauvegarde**, bloc **Diagnostic**. Les trois lignes doivent indiquer « Oui ». Sinon :
   - **App installée : Non (ouverte dans le navigateur)** : l'app a été ouverte depuis Safari et non depuis l'icône ; fermer Safari et passer par l'icône. Si l'icône ouvre Safari, l'interrupteur « Ouvrir comme app web » était désactivé : supprimer l'icône et refaire le geste 2.
   - **Hors ligne prêt : Pas encore** : l'app finit de se mettre en mémoire. Avec du réseau, attendre quelques secondes, passer sur l'onglet Accueil puis revenir sur Sauvegarde.
   - **Stockage protégé : Non garanti** : on peut continuer. iOS protège en général les apps installées, mais il faudra simplement exporter régulièrement. Si l'app vient d'être ouverte depuis Safari, refaire le contrôle depuis l'icône.
   - Autre cas : demande une capture d'écran.

## Étape 6 — Premier essai : une note et un export

**But** : vérifier la saisie hors ligne et le passage d'un fichier de l'iPhone vers ce dossier.

1. Mode avion activé, ouvrir l'app, **Nouvelle note** : le clavier doit s'ouvrir tout seul. Taper ou dicter « Note d'essai », puis **Terminé**. L'accueil affiche « Notes à traiter 1 ». Désactiver ensuite le mode avion.
2. Onglet **Sauvegarde**, **Exporter** : la feuille de partage d'iOS s'ouvre. Choisir **Enregistrer dans Fichiers** (ou l'app du service synchronisé), puis naviguer jusqu'au dossier du kit, `donnees`, `exports`, et enregistrer.
3. Attends que le fichier apparaisse dans `donnees/exports/` (son nom commence par `reseau-export-` et finit par `.json`, plus rarement `.txt`), puis vérifie-le : `node outils/valider-retour.mjs "<fichier>"` (ou lis-le si Node.js est absent). Il doit être valide, en révision 0, et contenir la note d'essai.

Si la feuille de partage ne s'ouvre pas et qu'une fenêtre propose « Télécharger » ou « Copier », fais choisir « Télécharger le fichier », puis déplacer le fichier depuis l'app Fichiers (dossier Téléchargements) vers `donnees/exports`.

## Étape 7 — Agenda et outil de tâches

**But** : c'est toi qui crées les rappels, pas l'app. Il te faut donc accès à l'agenda et à l'outil de tâches de l'utilisateur. Les deux sont facultatifs.

- Demande quel agenda il utilise (Google Agenda par exemple), s'il veut que tu y crées les anniversaires, et dans quel calendrier.
- Demande s'il veut que tu crées ses suivis promis dans un outil de tâches (Notion par exemple), ou nulle part.
- Pour chaque outil retenu, vérifie que tu disposes de son connecteur (cherche les outils correspondants). S'il manque, explique que l'utilisateur doit l'ajouter dans les réglages de connecteurs de son compte Claude, puis rouvrir la session et dire « reprends l'installation ». Tu ne connectes pas de compte à sa place.
- Pour Notion : demande dans quelle base de données créer les tâches, ou propose d'en créer une nommée « Suivis Réseau », sous une page qu'il te désigne, avec les propriétés Nom (titre), Personne (texte), Échéance (date) et État (sélection : « Ouvert », « Fait »).
- Note les choix dans `mes-reglages.md` (« aucun » si l'utilisateur n'en veut pas).

## Étape 8 — Conventions de traitement

**But** : fixer une fois pour toutes comment tu traites les cas ambigus, pour faire toujours le même choix.

Présente les conventions de `mes-reglages.md` (rubrique « Conventions »), **une par message**, avec un exemple concret pour chacune. Chacune a une valeur proposée ; l'utilisateur la garde ou la change. Enregistre ses réponses. Ne présente la convention 6 (forme des rappels) que si au moins un outil de rappel a été retenu.

## Étape 9 — Premier aller-retour

**But** : vérifier l'import dans l'app avant l'usage réel.

1. Traite l'export d'essai comme un vrai (voir `CLAUDE.md`, « Traitement d'un export ») : la note d'essai ne mentionne personne, tu la marques simplement comme traitée. Le retour porte la révision 1.
2. Fais importer le fichier dans l'app : onglet **Sauvegarde**, **Importer un fichier**, puis dans Fichiers : le service synchronisé, le dossier du kit, `donnees`, `reference`. Si le fichier apparaît grisé, toucher plutôt le lien « Fichier grisé ? Choisir parmi tous les fichiers », juste en dessous du bouton.
3. La fenêtre « Import réussi » doit indiquer 1 note marquée traitée et 0 en attente.

## Étape 10 — Fin

- Marque l'installation comme terminée dans `mes-reglages.md`.
- Résume en quelques lignes l'usage quotidien :
  1. pendant ou après un événement : créer l'événement (avec sa série s'il est récurrent), puis noter ou dicter en vrac ;
  2. exporter vers `donnees/exports` ;
  3. ouvrir Claude Code dans ce dossier et demander « traite mon dernier export » ;
  4. importer le retour depuis `donnees/reference`.
- Rappelle deux bonnes habitudes :
  - exporter régulièrement : chaque export est aussi une sauvegarde datée ;
  - en cas de perte du téléphone : réinstaller l'app depuis son adresse, puis importer le fichier de **révision la plus haute** parmi `donnees/exports` et `donnees/reference` (le numéro après « r » dans le nom) ; à révision égale, prendre l'export, qui contient les notes saisies après le dernier traitement.
