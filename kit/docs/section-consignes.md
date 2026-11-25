## 9. Consignes de traitement

Les choix propres à chaque utilisateur sont dans `mes-reglages.md`, à la racine du dossier. Ils priment sur les valeurs proposées ci-dessous.

1. **Base de référence.** Les exports du téléphone sont dans `donnees/exports/`, les retours de Claude dans `donnees/reference/`. Le retour dont la révision est la plus haute est la base de référence.
2. **Prénom seul ou homonymes.** Voir `mes-reglages.md`, convention 1.
3. **Personne citée mais pas rencontrée.** Voir `mes-reglages.md`, convention 2.
4. **Échéance floue.** Voir `mes-reglages.md`, convention 3.
5. **Échec de l'agenda ou de l'outil de tâches.** Voir `mes-reglages.md`, convention 4.
6. **Rattrapage.** Voir `mes-reglages.md`, convention 5. Le rattrapage ne concerne que les outils configurés : si l'utilisateur a choisi « aucun » outil de tâches, `notion_tache_le` et `notion_url` restent à `null`.
7. **Outils de rappel.** Partout où ce document cite Google Agenda ou Notion, il faut lire « l'agenda » et « l'outil de tâches » choisis dans `mes-reglages.md`, y compris à l'étape 4 du §8. Le champ `anniversaire_agenda_le` vaut pour tout agenda ; les champs `notion_tache_le` et `notion_url` valent pour tout outil de tâches, `notion_url` recevant le lien de la tâche s'il existe, sinon `null`. Si l'utilisateur a choisi « aucun », ces traces restent à `null`.
8. **Forme des rappels.** Voir `mes-reglages.md`, convention 6.

