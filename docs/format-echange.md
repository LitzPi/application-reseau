# Format d'échange de l'Application Réseau — version 1

Ce document est autonome. Il décrit le fichier que l'app iPhone « Application Réseau » exporte, et le fichier que Claude doit lui renvoyer. Il suffit à produire un fichier de retour valide.

## 1. Le cycle

1. **Aller.** L'app exporte un fichier `reseau-export-AAAA-MM-JJ-HHmm-rNNNN.json`. Il contient toutes les données du téléphone, dont les notes brutes saisies par l'utilisateur.
2. **Traitement.** Claude lit les notes au statut `non_traitee`, met à jour les fiches des personnes, puis produit un fichier de retour.
3. **Retour.** L'utilisateur importe ce fichier dans l'app. L'app le valide entièrement avant d'écrire quoi que ce soit ; à la moindre erreur, elle le refuse en bloc.

L'app ne contient aucune intelligence : tout ce qui demande de comprendre une note est fait par Claude.

## 2. Règles générales

- Un seul fichier JSON, encodé en UTF-8.
- Les **cinq collections sont toujours présentes**, même vides : `contextes`, `series`, `evenements`, `personnes`, `notes_brutes`.
- **Identifiants** : un préfixe, un tiret bas, puis un UUID version 4 en minuscules, par exemple `per_0c2e4a6b-8d0f-4a2c-9e4b-6d8f0a2c4e17`. Un identifiant est unique dans tout le fichier (échanges et suivis compris), ne change jamais et n'est jamais réutilisé.

  | Objet | Préfixe |
  |---|---|
  | Contexte | `ctx` |
  | Série | `ser` |
  | Événement | `evt` |
  | Personne | `per` |
  | Note brute | `not` |
  | Échange (dans une personne) | `ech` |
  | Suivi (dans une personne) | `sui` |

- **Horodatage** : ISO 8601 avec fuseau, à la seconde, par exemple `2026-11-13T07:45:10Z` ou `2026-11-13T08:45:10+01:00`.
- **Date** : `AAAA-MM-JJ`, et la date doit exister.
- **Référence** : tout identifiant cité (`contexte_id`, `serie_id`, `personne_ids`, `evenement_id`…) doit désigner un élément présent dans le même fichier.
- **Ordre** : l'ordre des éléments dans une collection et l'ordre des clés n'ont pas de signification. Le plus simple est de conserver l'ordre de l'export et d'ajouter en fin de liste.
- **Nom du fichier d'export** : la date et l'heure du nom sont en heure locale du téléphone ; elles servent seulement au classement. La seule valeur à recopier est le champ `exporte_le`.
- **Champs inconnus** : l'app conserve et réexporte tels quels les champs qu'elle ne connaît pas. Claude fait de même : ne jamais supprimer un champ qu'il ne reconnaît pas.

## 3. En-tête

| Champ | Type | Règle |
|---|---|---|
| `format` | texte | Toujours `"application-reseau"`. |
| `schema_version` | entier | `1` pour ce document. |
| `origine` | texte | `"app"` pour un export, `"claude"` pour un retour. |
| `exporte_le` | horodatage | Moment où le fichier a été produit. |
| `revision` | entier ≥ 0 | Numéro de version de la base de référence. |
| `base_exporte_le` | horodatage ou `null` | `null` dans un export. Dans un retour : copie exacte du `exporte_le` de l'export traité. |

## 4. Les objets

### Contexte — étiquette libre (paddle, pro…)

| Champ | Type | Règle |
|---|---|---|
| `id` | identifiant `ctx_` | |
| `nom` | texte | Non vide. |
| `cree_le`, `modifie_le` | horodatage | Gérés par le téléphone (voir §6). |

### Série — événement récurrent

| Champ | Type | Règle |
|---|---|---|
| `id` | identifiant `ser_` | |
| `nom` | texte | Non vide. |
| `contexte_id` | référence | Obligatoire. |
| `cree_le`, `modifie_le` | horodatage | Gérés par le téléphone. |

### Événement — une édition datée

| Champ | Type | Règle |
|---|---|---|
| `id` | identifiant `evt_` | |
| `titre` | texte | Peut être vide. |
| `date` | date | |
| `serie_id` | référence ou `null` | `null` si l'événement n'appartient à aucune série. |
| `personne_ids` | liste de références | Personnes croisées à cette édition. |
| `cree_le`, `modifie_le` | horodatage | Gérés par le téléphone. |

### Personne

| Champ | Type | Règle |
|---|---|---|
| `id` | identifiant `per_` | |
| `prenom`, `nom` | texte | Au moins l'un des deux non vide. Mettre `""` si inconnu. |
| `contexte_ids` | liste de références | Plusieurs contextes possibles. |
| `metier`, `entreprise` | texte | Facultatifs (`""`, `null` ou absents). |
| `rencontre` | texte | Comment et où la rencontre a eu lieu. Facultatif. |
| `details_personnels` | texte | Famille, passions, etc. Facultatif. |
| `anniversaire` | texte ou `null` | `AAAA-MM-JJ`, ou `--MM-JJ` si l'année est inconnue, ou `null`. |
| `anniversaire_agenda_le` | horodatage ou `null` | Trace technique : moment où Claude a créé l'anniversaire dans Google Agenda. |
| `echanges` | liste | Historique daté, voir ci-dessous. |
| `suivis` | liste | Suivis promis, voir ci-dessous. |
| `cree_le`, `modifie_le` | horodatage | Gérés par Claude. |

**Échange** (élément de `echanges`)

| Champ | Type | Règle |
|---|---|---|
| `id` | identifiant `ech_` | |
| `date` | date | |
| `evenement_id` | référence ou `null` | |
| `resume` | texte | Ce dont on a parlé. |

**Suivi** (élément de `suivis`)

| Champ | Type | Règle |
|---|---|---|
| `id` | identifiant `sui_` | |
| `action` | texte | Non vide. |
| `date_promise` | date ou `null` | |
| `statut` | texte | `"ouvert"` ou `"fait"`. |
| `notion_tache_le` | horodatage ou `null` | Trace technique : moment où Claude a créé la tâche Notion. |
| `notion_url` | texte ou `null` | Lien vers la tâche Notion. |

### Note brute — texte libre saisi sur le téléphone

| Champ | Type | Règle |
|---|---|---|
| `id` | identifiant `not_` | |
| `texte` | texte | Saisi ou dicté par l'utilisateur. |
| `saisie_le`, `modifie_le` | horodatage | Gérés par le téléphone. |
| `evenement_id` | référence ou `null` | `null` pour une note isolée. |
| `statut` | texte | `"non_traitee"` ou `"traitee"`. |
| `traitee_le` | horodatage ou `null` | Obligatoire quand le statut est `"traitee"`. |

## 5. Ce que Claude a le droit de modifier

**Autorisé**

- Créer une personne, et modifier tous les champs d'une personne existante.
- Ajouter des échanges et des suivis à une personne ; passer un suivi à `"fait"`.
- Renseigner les traces techniques : `anniversaire_agenda_le`, `notion_tache_le`, `notion_url`.
- Fusionner deux personnes en double : garder un identifiant, supprimer l'autre, et remplacer partout l'identifiant supprimé (`personne_ids` des événements).
- Compléter `personne_ids` d'un événement avec les personnes que ses notes montrent comme **présentes** à cet événement. Une personne seulement mentionnée dans la conversation n'est pas ajoutée.
- Renommer un contexte ou une série. Fusionner deux contextes ou deux séries en double, en corrigeant toutes les références.
- Créer un contexte nécessaire à une nouvelle personne.
- Passer une note de `"non_traitee"` à `"traitee"`, en renseignant `traitee_le`.

**Interdit**

- Modifier le `texte`, l'identifiant, `saisie_le`, `modifie_le` ou `evenement_id` d'une note.
- Supprimer une note, ou en créer une.
- Changer un identifiant existant, ou en réutiliser un.
- Créer un événement ou une série : ils sont créés sur le téléphone. Un échange sans événement porte `evenement_id` à `null`.
- Supprimer une personne, sauf pour fusionner deux fiches en double.
- Supprimer un événement, ou modifier son `titre`, sa `date` ou sa `serie_id` (sauf pour suivre la fusion de deux séries).
- Retirer une personne de `personne_ids` (sauf pour suivre la fusion de deux personnes).
- Omettre une collection, ou supprimer un champ inconnu.
- Marquer `"traitee"` une note dont une partie n'a pas pu être exploitée : dans le doute, la laisser `"non_traitee"` et le signaler à l'utilisateur.

## 6. Révision et horodatages

- **Révision.** Le retour porte `revision` = révision de l'export + 1. L'app refuse tout fichier dont la révision est inférieure à la sienne ; après un import réussi, elle adopte la révision du fichier. Importer deux fois le même retour est sans effet.
- **`base_exporte_le`.** Le retour recopie le `exporte_le` de l'export traité. L'app s'en sert pour reconnaître ce que l'utilisateur a saisi ou modifié après cet export, et le préserver.
- **Horodatages du téléphone.** Les champs `cree_le` et `modifie_le` des contextes, séries et événements appartiennent au téléphone. Claude **ne les modifie pas**, même quand il change l'élément. S'il crée un contexte, il y met la valeur de `base_exporte_le`. Un retour dont l'un de ces horodatages est postérieur à `base_exporte_le` est refusé.
- Les horodatages des personnes (`cree_le`, `modifie_le`) et les traces techniques sont libres : Claude y met l'heure réelle du traitement. Le `modifie_le` d'une fiche que Claude n'a pas modifiée reste inchangé.

## 7. Ce que l'app fait du retour

Connaître ces règles évite les surprises.

- **Personnes** : la version du fichier remplace celle du téléphone, où les fiches ne sont pas modifiables. Une personne absente du fichier disparaît donc du téléphone.
- **Notes** : le texte du téléphone fait toujours foi. L'app n'applique que le passage à `"traitee"`, et seulement si la note n'a pas été modifiée depuis l'export. Une note saisie après l'export est conservée telle quelle.
- **Contextes, séries, événements** : un élément créé ou modifié sur le téléphone après l'export est conservé (pour un événement, les présents des deux côtés sont réunis). Sinon la version du fichier s'applique. Un élément ancien absent du fichier est supprimé, sauf s'il est encore utilisé par un élément conservé.
- Avant tout import, l'app garde une copie de l'état précédent pour pouvoir revenir en arrière.

## 8. Procédure recommandée pour Claude

1. Lire l'export et vérifier sa cohérence avec la base de référence (voir §9, même révision). En cas d'écart, le signaler avant de continuer.
2. Partir de l'export : c'est lui qui fait foi pour les notes, les événements, les séries et les contextes.
3. Traiter chaque note `non_traitee` : identifier les personnes (existantes ou nouvelles), compléter les fiches, ajouter échanges et suivis, compléter les présents de l'événement.
4. Créer les anniversaires dans Google Agenda et les suivis dans Notion, puis renseigner les traces techniques.
5. Produire le retour : `origine` = `"claude"`, `revision` + 1, `base_exporte_le` = `exporte_le` de l'export, nouvel `exporte_le`.
6. Relire le fichier contre ce document (identifiants uniques, références, collections présentes), puis l'enregistrer comme nouvelle base de référence.

Nom conseillé pour le retour : `reseau-retour-AAAA-MM-JJ-rNNNN.json`.

## 9. Consignes de traitement

Ces conventions ont été fixées par l'utilisateur. Elles s'appliquent à chaque traitement.

1. **Base de référence.** Elle est conservée dans le dossier OneDrive du projet : les exports du téléphone dans `donnees/exports/`, les retours de Claude dans `donnees/reference/`. Le retour le plus récent (révision la plus haute) est la base de référence.
2. **Prénom seul ou homonymes.** Rattacher l'information à une fiche quand un seul candidat est plausible d'après le contexte (événement, métier, sujet). Sinon, ne modifier aucune fiche, laisser la note `"non_traitee"` et poser la question à l'utilisateur.
3. **Personne citée mais pas rencontrée.** Ne pas créer de fiche. La mentionner seulement dans la fiche de la personne rencontrée (détails ou résumé de l'échange).
4. **Échéance floue.** La traduire en date quand c'est raisonnable (« avant Noël » → 24 décembre, « fin novembre » → 30 novembre). Laisser `date_promise` à `null` quand elle est trop vague (« bientôt »).
5. **Échec de Google Agenda ou de Notion.** Si la fiche a bien été mise à jour, la note passe quand même à `"traitee"`. La trace technique reste à `null`, et l'échec est signalé à l'utilisateur.
6. **Rattrapage systématique.** À chaque traitement, parcourir toute la base : créer dans Google Agenda tout anniversaire dont `anniversaire_agenda_le` est `null`, et dans Notion tout suivi `"ouvert"` dont `notion_tache_le` est `null`, puis renseigner les traces.

## 10. Évolution du format

- Ajouter un champ ne change pas `schema_version` : chaque partie conserve les champs qu'elle ne connaît pas.
- Un changement incompatible (champ renommé, sens modifié) passe à `schema_version` + 1. L'app sait alors convertir les anciens fichiers, et refuse un fichier d'une version plus récente qu'elle avec le message « Mettez l'app à jour ».

## 11. Exemple complet

Toutes les données ci-dessous sont fictives. Il s'agit d'un **fichier de retour** produit par Claude à partir d'un export de révision 3 daté du `2026-11-13T07:45:10Z`.

Dans cet export, trois notes étaient `non_traitee`. Claude a :

- complété la fiche de Camille Vasseur (détail personnel, nouvel échange, nouveau suivi avec tâche Notion) ;
- créé la fiche de Thomas Reynaud, avec son anniversaire ajouté à l'agenda ;
- ajouté un échange à Hugo Marchetti ;
- complété les présents de deux événements, sans toucher à leurs horodatages ;
- passé les trois notes à `"traitee"`, sans modifier leur texte.

```json
{
  "format": "application-reseau",
  "schema_version": 1,
  "origine": "claude",
  "exporte_le": "2026-11-13T09:10:00Z",
  "revision": 4,
  "base_exporte_le": "2026-11-13T07:45:10Z",
  "contextes": [
    {
      "id": "ctx_5d0c8a51-2f6e-4b7a-9a11-3c1e7f2b9d01",
      "nom": "paddle",
      "cree_le": "2026-09-20T18:02:11Z",
      "modifie_le": "2026-09-20T18:02:11Z"
    },
    {
      "id": "ctx_91b7e3c4-6a2d-4f58-8c03-7e5a1d4b6f02",
      "nom": "pro",
      "cree_le": "2026-09-22T08:15:40Z",
      "modifie_le": "2026-09-22T08:15:40Z"
    }
  ],
  "series": [
    {
      "id": "ser_2a4f6c8e-1b3d-4e5f-a7b9-0c1d2e3f4a03",
      "nom": "Afterwork du club de paddle",
      "contexte_id": "ctx_5d0c8a51-2f6e-4b7a-9a11-3c1e7f2b9d01",
      "cree_le": "2026-09-20T18:03:05Z",
      "modifie_le": "2026-09-20T18:03:05Z"
    },
    {
      "id": "ser_7c9e1a3b-5d7f-4a2c-b4d6-8e0f1a2b3c04",
      "nom": "Petit-déjeuner des dirigeants",
      "contexte_id": "ctx_91b7e3c4-6a2d-4f58-8c03-7e5a1d4b6f02",
      "cree_le": "2026-09-22T08:16:12Z",
      "modifie_le": "2026-09-22T08:16:12Z"
    }
  ],
  "evenements": [
    {
      "id": "evt_3e5a7c9b-2d4f-4b6a-8c0e-1f3a5b7c9d05",
      "titre": "Afterwork d'octobre",
      "date": "2026-10-08",
      "serie_id": "ser_2a4f6c8e-1b3d-4e5f-a7b9-0c1d2e3f4a03",
      "personne_ids": [
        "per_4f6b8d0a-3c5e-4a7b-9d1f-2a4c6e8b0d08",
        "per_8a0c2e4f-6b8d-4c1e-a3f5-7b9d1c3e5f09"
      ],
      "cree_le": "2026-10-08T17:40:00Z",
      "modifie_le": "2026-10-10T09:00:00Z"
    },
    {
      "id": "evt_6b8d0f2a-4c6e-4d8a-9b1c-3e5f7a9b1c06",
      "titre": "Afterwork de novembre",
      "date": "2026-11-12",
      "serie_id": "ser_2a4f6c8e-1b3d-4e5f-a7b9-0c1d2e3f4a03",
      "personne_ids": [
        "per_4f6b8d0a-3c5e-4a7b-9d1f-2a4c6e8b0d08",
        "per_0c2e4a6b-8d0f-4a2c-9e4b-6d8f0a2c4e17"
      ],
      "cree_le": "2026-11-12T17:35:20Z",
      "modifie_le": "2026-11-12T19:10:02Z"
    },
    {
      "id": "evt_9d1f3b5c-7e9a-4f2b-8d4e-5a7c9e1b3d07",
      "titre": "Salon de la logistique",
      "date": "2026-11-05",
      "serie_id": null,
      "personne_ids": [
        "per_8a0c2e4f-6b8d-4c1e-a3f5-7b9d1c3e5f09"
      ],
      "cree_le": "2026-11-05T12:20:45Z",
      "modifie_le": "2026-11-05T12:20:45Z"
    }
  ],
  "personnes": [
    {
      "id": "per_4f6b8d0a-3c5e-4a7b-9d1f-2a4c6e8b0d08",
      "prenom": "Camille",
      "nom": "Vasseur",
      "contexte_ids": [
        "ctx_5d0c8a51-2f6e-4b7a-9a11-3c1e7f2b9d01"
      ],
      "metier": "Kinésithérapeute",
      "entreprise": "Cabinet Vasseur",
      "rencontre": "Afterwork du club de paddle, octobre 2026, présentée par le moniteur",
      "details_personnels": "Joue en compétition régionale. Sa fille Lou entre en sixième.",
      "anniversaire": "--03-14",
      "anniversaire_agenda_le": "2026-10-10T09:00:00Z",
      "echanges": [
        {
          "id": "ech_1a3c5e7b-9d1f-4b3a-8c5e-7f9a1b3c5d10",
          "date": "2026-10-08",
          "evenement_id": "evt_3e5a7c9b-2d4f-4b6a-8c0e-1f3a5b7c9d05",
          "resume": "Premier échange : son cabinet, sa pratique du paddle en compétition."
        },
        {
          "id": "ech_2c4e6a8b-0d2f-4c4a-9e6b-8f0a2c4e6a18",
          "date": "2026-11-12",
          "evenement_id": "evt_6b8d0f2a-4c6e-4d8a-9b1c-3e5f7a9b1c06",
          "resume": "A parlé de l'entrée en sixième de sa fille Lou."
        }
      ],
      "suivis": [
        {
          "id": "sui_2b4d6f8a-0c2e-4d4b-9e6f-8a0b2c4d6e11",
          "action": "Lui envoyer le lien du tournoi de décembre",
          "date_promise": "2026-10-15",
          "statut": "fait",
          "notion_tache_le": "2026-10-10T09:00:00Z",
          "notion_url": "https://www.notion.so/exemple-tache-fictive-1"
        },
        {
          "id": "sui_4e6a8c0b-2d4f-4e6a-9b8c-0d2e4f6a8c19",
          "action": "Lui envoyer le nom de mon ostéo",
          "date_promise": "2026-11-30",
          "statut": "ouvert",
          "notion_tache_le": "2026-11-13T09:10:00Z",
          "notion_url": "https://www.notion.so/exemple-tache-fictive-2"
        }
      ],
      "cree_le": "2026-10-10T09:00:00Z",
      "modifie_le": "2026-11-13T09:10:00Z"
    },
    {
      "id": "per_8a0c2e4f-6b8d-4c1e-a3f5-7b9d1c3e5f09",
      "prenom": "Hugo",
      "nom": "Marchetti",
      "contexte_ids": [
        "ctx_5d0c8a51-2f6e-4b7a-9a11-3c1e7f2b9d01",
        "ctx_91b7e3c4-6a2d-4f58-8c03-7e5a1d4b6f02"
      ],
      "metier": "Directeur commercial",
      "entreprise": "Transports Marchetti",
      "rencontre": "Afterwork du club de paddle, octobre 2026",
      "details_personnels": "Deux enfants, passionné de voile.",
      "anniversaire": "1984-07-02",
      "anniversaire_agenda_le": null,
      "echanges": [
        {
          "id": "ech_3c5e7a9b-1d3f-4e5a-8b7c-9d1e3f5a7b12",
          "date": "2026-10-08",
          "evenement_id": "evt_3e5a7c9b-2d4f-4b6a-8c0e-1f3a5b7c9d05",
          "resume": "A parlé de la reprise de l'entreprise familiale."
        },
        {
          "id": "ech_6a8c0e2b-4d6f-4a8c-9b0d-2e4f6a8c0e20",
          "date": "2026-11-05",
          "evenement_id": "evt_9d1f3b5c-7e9a-4f2b-8d4e-5a7c9e1b3d07",
          "resume": "Croisé au salon de la logistique : il recrute un responsable d'exploitation."
        }
      ],
      "suivis": [],
      "cree_le": "2026-10-10T09:00:00Z",
      "modifie_le": "2026-11-13T09:10:00Z"
    },
    {
      "id": "per_0c2e4a6b-8d0f-4a2c-9e4b-6d8f0a2c4e17",
      "prenom": "Thomas",
      "nom": "Reynaud",
      "contexte_ids": [
        "ctx_5d0c8a51-2f6e-4b7a-9a11-3c1e7f2b9d01"
      ],
      "metier": "Architecte",
      "entreprise": "Atelier Reynaud",
      "rencontre": "Afterwork du club de paddle, novembre 2026",
      "details_personnels": "Joue au paddle depuis deux ans.",
      "anniversaire": "--11-21",
      "anniversaire_agenda_le": "2026-11-13T09:10:00Z",
      "echanges": [
        {
          "id": "ech_8c0e2a4b-6d8f-4c0a-9d2e-4f6a8c0e2a21",
          "date": "2026-11-12",
          "evenement_id": "evt_6b8d0f2a-4c6e-4d8a-9b1c-3e5f7a9b1c06",
          "resume": "Cherche un partenaire pour le tournoi de janvier."
        }
      ],
      "suivis": [],
      "cree_le": "2026-11-13T09:10:00Z",
      "modifie_le": "2026-11-13T09:10:00Z"
    }
  ],
  "notes_brutes": [
    {
      "id": "not_5e7a9c1b-3d5f-4a7b-8c9d-1e3f5a7b9c13",
      "texte": "Camille, kiné, joue en compétition. Hugo, directeur commercial dans le transport, reprend la boîte familiale. Envoyer à Camille le lien du tournoi de décembre.",
      "saisie_le": "2026-10-08T19:55:30Z",
      "modifie_le": "2026-10-08T19:55:30Z",
      "evenement_id": "evt_3e5a7c9b-2d4f-4b6a-8c0e-1f3a5b7c9d05",
      "statut": "traitee",
      "traitee_le": "2026-10-10T09:00:00Z"
    },
    {
      "id": "not_7a9c1e3b-5d7f-4b9a-8d1c-3e5f7a9b1c14",
      "texte": "Camille : sa fille Lou entre en sixième. Lui envoyer le nom de mon ostéo avant fin novembre.",
      "saisie_le": "2026-11-12T19:02:14Z",
      "modifie_le": "2026-11-12T19:02:14Z",
      "evenement_id": "evt_6b8d0f2a-4c6e-4d8a-9b1c-3e5f7a9b1c06",
      "statut": "traitee",
      "traitee_le": "2026-11-13T09:10:00Z"
    },
    {
      "id": "not_9c1e3a5b-7d9f-4c1a-8e3b-5a7c9e1b3d15",
      "texte": "Nouveau : Thomas Reynaud, architecte chez Atelier Reynaud, joue depuis deux ans, cherche un partenaire pour le tournoi de janvier. Anniversaire le 21 novembre.",
      "saisie_le": "2026-11-12T19:08:41Z",
      "modifie_le": "2026-11-12T19:09:03Z",
      "evenement_id": "evt_6b8d0f2a-4c6e-4d8a-9b1c-3e5f7a9b1c06",
      "statut": "traitee",
      "traitee_le": "2026-11-13T09:10:00Z"
    },
    {
      "id": "not_1e3a5c7b-9d1f-4e3a-8b5c-7d9e1f3a5b16",
      "texte": "Croisé Hugo au salon de la logistique, il recrute un responsable d'exploitation.",
      "saisie_le": "2026-11-05T12:25:09Z",
      "modifie_le": "2026-11-05T12:25:09Z",
      "evenement_id": null,
      "statut": "traitee",
      "traitee_le": "2026-11-13T09:10:00Z"
    }
  ]
}
```
