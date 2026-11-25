# Application Réseau — instructions pour Claude

Ce dossier est le kit de l'« Application Réseau » : une application iPhone personnelle (une PWA installée depuis Safari) qui sert à se souvenir des personnes croisées lors d'événements récurrents. L'utilisateur y note en vrac, pendant ou juste après un échange, ce qu'il retient. **Toi, Claude, tu fais le travail d'intelligence hors de l'app** : tu transformes ces notes en fiches structurées, et tu crées les rappels (anniversaires dans l'agenda, suivis promis dans un outil de tâches).

L'app ne contient aucune intelligence, aucun serveur et aucun compte. Toutes les données restent sur l'iPhone. Le lien entre l'app et toi est un fichier JSON échangé à la main :

1. **Aller** : l'app exporte un fichier `reseau-export-…json` que l'utilisateur enregistre dans `donnees/exports/`.
2. **Traitement** : tu le traites et tu écris un fichier `reseau-retour-…json` dans `donnees/reference/`.
3. **Retour** : l'utilisateur importe ce fichier dans l'app.

## Règles permanentes

- Réponds en français, simplement : l'utilisateur n'est pas forcément technicien.
- **Guidage pas à pas** : quand tu guides l'utilisateur (installation, manipulation sur l'iPhone), donne **une seule étape par message**, dis brièvement pourquoi elle sert, puis attends qu'il confirme ou te décrive ce qu'il voit avant de passer à la suivante. Ne donne jamais toute la liste d'avance.
- **Données personnelles de tiers** : les fichiers de `donnees/` décrivent des personnes réelles. Ne les envoie vers aucun service extérieur, sauf l'agenda et l'outil de tâches que l'utilisateur a choisis dans `mes-reglages.md`, et seulement ce qu'il faut pour le rappel (nom, date, action). Ne les mets jamais dans un dépôt git, ne les recopie pas dans d'autres dossiers que ceux prévus.
- **Identifiants et comptes** : l'utilisateur crée lui-même ses comptes et saisit lui-même ses mots de passe et codes. Ne lui demande jamais de te les donner.
- **Actions visibles de l'extérieur** (créer un dépôt GitHub, publier, créer des événements d'agenda ou des tâches) : annonce ce que tu vas faire et attends son accord la première fois.
- En cas de doute sur une note ou une règle, **pose la question** plutôt que de supposer.

## Fichiers du kit

| Fichier | Rôle |
|---|---|
| `installation/guide-installation.md` | Étapes d'installation à suivre avec l'utilisateur |
| `docs/format-echange.md` | **Contrat du format d'échange** : ce que tu as le droit de modifier. À suivre strictement. |
| `mes-reglages.md` | Réglages de cet utilisateur (adresse de son app, agenda, outil de tâches, conventions). Créé pendant l'installation à partir de `installation/modele-reglages.md`. |
| `app/` | Code de l'application, à déployer sur le GitHub de l'utilisateur. Ne contient aucune donnée. |
| `outils/valider-retour.mjs` | Vérifie un fichier de retour avant de le remettre à l'utilisateur (nécessite Node.js). |
| `exemples/` | Fichiers d'exemple entièrement fictifs. |
| `donnees/exports/`, `donnees/reference/` | Fichiers réels de l'utilisateur. Créés pendant l'installation. |

## Que faire selon la situation

### 1. Installation

Si `mes-reglages.md` n'existe pas, ou si l'utilisateur demande à installer l'application : suis `installation/guide-installation.md`, étape par étape. Si l'installation a été interrompue, reprends à l'étape indiquée dans `mes-reglages.md` (rubrique « Avancement »).

### 2. Traitement d'un export

Quand l'utilisateur te demande de traiter ses notes :

1. Lis `mes-reglages.md` et `docs/format-echange.md` en entier.
2. Prends le fichier le plus récent de `donnees/exports/` et **confirme son nom** avec l'utilisateur. Son nom commence par `reseau-export-` ; il finit en général par `.json`, parfois par `.txt` quand l'iPhone a refusé le type JSON au partage : le contenu est le même.
3. Compare-le à la base de référence : le fichier de `donnees/reference/` dont la révision est la plus haute. Leur révision doit être identique (au premier traitement, `donnees/reference/` est vide et la révision de l'export vaut 0). En cas d'écart, signale-le avant de continuer.
4. Traite chaque note `non_traitee` en appliquant le contrat (§5) et les conventions de `mes-reglages.md`.
5. Crée les anniversaires et les suivis dans les outils choisis par l'utilisateur, puis renseigne les traces techniques. Si un outil n'est pas configuré (« aucun »), laisse les traces à `null`.
6. Écris le retour dans `donnees/reference/reseau-retour-AAAA-MM-JJ-rNNNN.json`.
7. Vérifie-le : `node outils/valider-retour.mjs "<retour>" "<export>"` (guillemets indispensables : les chemins des dossiers synchronisés contiennent souvent des espaces). Si Node.js n'est pas installé, relis le fichier contre le contrat (identifiants uniques, références, collections présentes, notes non modifiées) ; l'app refusera de toute façon un fichier invalide.
8. Résume à l'utilisateur ce qui a changé (fiches créées ou complétées, rappels créés), signale les notes laissées non traitées et pourquoi, puis dis-lui d'importer le fichier depuis `donnees/reference/` (onglet Sauvegarde, « Importer un fichier »).

### 3. Mise à jour de l'application

Si l'utilisateur te donne un kit plus récent (nouveau dossier `app/`) :

1. Annonce la mise à jour et attends son accord.
2. Copie le contenu du nouveau `app/` dans son dossier de déploiement (chemin absolu dans `mes-reglages.md`), en remplaçant les anciens fichiers.
3. Avec des chemins absolus (`git -C "<dossier>" …`) : ajoute, commite (« feat: mise à jour de l'application »), pousse.
4. Attends que la nouvelle version soit en ligne : l'adresse de `js/version.js` doit renvoyer le nouveau numéro de version. Sur l'iPhone, un bandeau « Nouvelle version prête » apparaîtra.
5. Remplace aussi `CLAUDE.md`, `installation/`, `docs/` et `outils/` par ceux du nouveau kit. Ne touche jamais à `donnees/` ni à `mes-reglages.md`.

### 4. Autres questions

Réponds à partir de ce dossier. L'app ne fait rien d'autre que ce qui est décrit ici : pas de notification, pas de synchronisation automatique, pas de photo.
