import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { validerFichier } from "../../js/format.js";
import {
  etatVide,
  estVide,
  construireExport,
  controlerRevision,
  fusionner,
} from "../../js/fusion.js";

const lire = (nom) =>
  JSON.parse(readFileSync(new URL(`../../exemples/${nom}`, import.meta.url), "utf8"));

const AVANT = "2026-11-10T10:00:00Z";
const EXPORT = "2026-11-13T07:45:10Z";
const APRES = "2026-11-13T08:30:00Z";
const RETOUR = "2026-11-13T09:10:00Z";

const CTX = "ctx_aaaaaaaa-0000-4000-8000-000000000001";
const SER = "ser_aaaaaaaa-0000-4000-8000-000000000002";
const EVT = "evt_aaaaaaaa-0000-4000-8000-000000000003";
const PER = "per_aaaaaaaa-0000-4000-8000-000000000004";
const NOTE = "not_aaaaaaaa-0000-4000-8000-000000000005";

const contexte = (plus = {}) => ({ id: CTX, nom: "paddle", cree_le: AVANT, modifie_le: AVANT, ...plus });
const serie = (plus = {}) => ({
  id: SER, nom: "Afterwork", contexte_id: CTX, cree_le: AVANT, modifie_le: AVANT, ...plus,
});
const evenement = (plus = {}) => ({
  id: EVT, titre: "Afterwork de novembre", date: "2026-11-12", serie_id: SER,
  personne_ids: [], cree_le: AVANT, modifie_le: AVANT, ...plus,
});
const personne = (plus = {}) => ({
  id: PER, prenom: "Camille", nom: "Vasseur", contexte_ids: [CTX], metier: "Kiné",
  entreprise: "", rencontre: "", details_personnels: "", anniversaire: null,
  anniversaire_agenda_le: null, echanges: [], suivis: [], cree_le: AVANT, modifie_le: AVANT, ...plus,
});
const note = (plus = {}) => ({
  id: NOTE, texte: "Texte d'origine", saisie_le: AVANT, modifie_le: AVANT,
  evenement_id: null, statut: "non_traitee", traitee_le: null, ...plus,
});

/** État local de départ : une révision 3 avec un élément de chaque sorte. */
const etatDeBase = (plus = {}) => ({
  ...etatVide(),
  revision: 3,
  contextes: [contexte()],
  series: [serie()],
  evenements: [evenement()],
  personnes: [personne()],
  notes_brutes: [note()],
  ...plus,
});

/** Fichier de retour de Claude construit à partir d'un état exporté à EXPORT. */
const retourDeClaude = (etat, modifier = () => {}) => {
  const fichier = {
    ...construireExport(etat, new Date(EXPORT)),
    origine: "claude",
    exporte_le: RETOUR,
    revision: etat.revision + 1,
    base_exporte_le: EXPORT,
  };
  modifier(fichier);
  assert.deepEqual(validerFichier(fichier).erreurs, [], "le fichier de test doit être valide");
  return fichier;
};

const parId = (liste, id) => liste.find((e) => e.id === id);

test("un fichier plus ancien que les données présentes est refusé", () => {
  const fichier = retourDeClaude(etatDeBase(), (f) => { f.revision = 2; });
  const controle = controlerRevision(etatDeBase(), fichier);
  assert.equal(controle.ok, false);
  assert.match(controle.message, /plus ancien/);
});

test("une révision égale est une restauration, une révision supérieure une mise à jour", () => {
  const etat = etatDeBase();
  const sauvegarde = construireExport(etat, new Date(EXPORT));
  assert.deepEqual(controlerRevision(etat, sauvegarde), { ok: true, type: "restauration" });
  assert.deepEqual(controlerRevision(etat, retourDeClaude(etat)), { ok: true, type: "mise_a_jour" });
});

test("une note saisie après l'export n'est jamais écrasée par l'import", () => {
  const depart = etatDeBase();
  const fichier = retourDeClaude(depart, (f) => {
    f.notes_brutes[0].statut = "traitee";
    f.notes_brutes[0].traitee_le = RETOUR;
  });
  const nouvelle = note({
    id: "not_bbbbbbbb-0000-4000-8000-000000000006",
    texte: "Saisie après l'export", saisie_le: APRES, modifie_le: APRES,
  });
  const local = { ...depart, notes_brutes: [...depart.notes_brutes, nouvelle] };

  const { etat, bilan } = fusionner(local, fichier);

  assert.deepEqual(parId(etat.notes_brutes, nouvelle.id), nouvelle);
  assert.equal(parId(etat.notes_brutes, NOTE).statut, "traitee");
  assert.equal(etat.notes_brutes.length, 2);
  assert.equal(bilan.notes_traitees, 1);
  assert.equal(bilan.notes_en_attente, 1);
});

test("une note modifiée après l'export reste non traitée", () => {
  const depart = etatDeBase();
  const fichier = retourDeClaude(depart, (f) => {
    f.notes_brutes[0].statut = "traitee";
    f.notes_brutes[0].traitee_le = RETOUR;
  });
  const local = {
    ...depart,
    notes_brutes: [note({ texte: "Texte complété après l'export", modifie_le: APRES })],
  };

  const { etat } = fusionner(local, fichier);

  assert.equal(etat.notes_brutes[0].statut, "non_traitee");
  assert.equal(etat.notes_brutes[0].texte, "Texte complété après l'export");
});

test("le texte local d'une note fait foi même si le fichier le modifie", () => {
  const depart = etatDeBase();
  const fichier = retourDeClaude(depart, (f) => {
    f.notes_brutes[0].texte = "Texte réécrit à tort";
    f.notes_brutes[0].statut = "traitee";
    f.notes_brutes[0].traitee_le = RETOUR;
  });

  const { etat } = fusionner(depart, fichier);

  assert.equal(etat.notes_brutes[0].texte, "Texte d'origine");
  assert.equal(etat.notes_brutes[0].statut, "traitee");
  assert.equal(etat.notes_brutes[0].traitee_le, RETOUR);
});

test("une note absente du fichier est conservée", () => {
  const depart = etatDeBase();
  const fichier = retourDeClaude(depart, (f) => { f.notes_brutes = []; });
  const { etat } = fusionner(depart, fichier);
  assert.deepEqual(etat.notes_brutes, depart.notes_brutes);
});

test("une note supprimée sur le téléphone après l'export ne revient pas", () => {
  const depart = etatDeBase();
  const fichier = retourDeClaude(depart);
  const local = { ...depart, notes_brutes: [], notes_supprimees: [NOTE] };
  const { etat } = fusionner(local, fichier);
  assert.deepEqual(etat.notes_brutes, []);
});

test("les personnes du fichier remplacent les fiches locales, champs inconnus compris", () => {
  const depart = etatDeBase();
  const nouvelleId = "per_cccccccc-0000-4000-8000-000000000007";
  const fichier = retourDeClaude(depart, (f) => {
    f.personnes[0].metier = "Kinésithérapeute du sport";
    f.personnes[0].champ_futur = "conservé";
    f.personnes.push(personne({ id: nouvelleId, prenom: "Thomas", nom: "Reynaud" }));
  });

  const { etat, bilan } = fusionner(depart, fichier);

  assert.equal(parId(etat.personnes, PER).metier, "Kinésithérapeute du sport");
  assert.equal(parId(etat.personnes, PER).champ_futur, "conservé");
  assert.ok(parId(etat.personnes, nouvelleId));
  assert.equal(bilan.personnes, 2);
  assert.equal(etat.revision, 4);
});

test("un événement créé après l'export est conservé", () => {
  const depart = etatDeBase();
  const fichier = retourDeClaude(depart);
  const recent = evenement({
    id: "evt_dddddddd-0000-4000-8000-000000000008",
    titre: "Créé après l'export", cree_le: APRES, modifie_le: APRES,
  });
  const local = { ...depart, evenements: [...depart.evenements, recent] };

  const { etat, bilan } = fusionner(local, fichier);

  assert.deepEqual(parId(etat.evenements, recent.id), recent);
  assert.equal(etat.evenements.length, 2);
  assert.equal(bilan.elements_locaux_conserves, 1);
});

test("des présents cochés après l'export s'ajoutent à ceux trouvés par Claude", () => {
  const autre = "per_eeeeeeee-0000-4000-8000-000000000009";
  const depart = etatDeBase({ personnes: [personne(), personne({ id: autre, prenom: "Hugo" })] });
  const fichier = retourDeClaude(depart, (f) => { f.evenements[0].personne_ids = [autre]; });
  const local = {
    ...depart,
    evenements: [evenement({ personne_ids: [PER], modifie_le: APRES })],
  };

  const { etat } = fusionner(local, fichier);

  assert.deepEqual(etat.evenements[0].personne_ids.toSorted(), [PER, autre].toSorted());
});

test("un élément ancien retiré par Claude (fusion de doublons) est supprimé", () => {
  const doublon = "ctx_ffffffff-0000-4000-8000-00000000000a";
  const depart = etatDeBase({ contextes: [contexte(), contexte({ id: doublon, nom: "padel" })] });
  const fichier = retourDeClaude(depart, (f) => {
    f.contextes = f.contextes.filter((c) => c.id !== doublon);
  });

  const { etat } = fusionner(depart, fichier);

  assert.deepEqual(etat.contextes.map((c) => c.id), [CTX]);
});

test("un élément retiré par Claude est gardé s'il sert encore à un élément local récent", () => {
  const doublon = "ser_ffffffff-0000-4000-8000-00000000000b";
  const depart = etatDeBase({ series: [serie(), serie({ id: doublon, nom: "Afterwork bis" })] });
  const fichier = retourDeClaude(depart, (f) => {
    f.series = f.series.filter((s) => s.id !== doublon);
  });
  const recent = evenement({
    id: "evt_dddddddd-0000-4000-8000-00000000000c",
    serie_id: doublon, cree_le: APRES, modifie_le: APRES,
  });
  const local = { ...depart, evenements: [...depart.evenements, recent] };

  const { etat, bilan } = fusionner(local, fichier);

  assert.ok(parId(etat.series, doublon), "la série référencée doit être restaurée");
  assert.equal(bilan.elements_restaures, 1);
});

test("l'import sur un téléphone vide restaure l'intégralité des données", () => {
  const depart = etatDeBase({ champs_inconnus: { champ_futur: { a: 1 } } });
  const sauvegarde = construireExport(depart, new Date(EXPORT));
  assert.equal(validerFichier(sauvegarde).ok, true);

  const { etat } = fusionner(etatVide(), sauvegarde);

  assert.deepEqual(construireExport(etat, new Date(EXPORT)), sauvegarde);
});

test("la fusion ne modifie ni l'état local ni le fichier reçus", () => {
  const local = etatDeBase();
  const fichier = retourDeClaude(local, (f) => {
    f.notes_brutes[0].statut = "traitee";
    f.notes_brutes[0].traitee_le = RETOUR;
  });
  const copieLocal = structuredClone(local);
  const copieFichier = structuredClone(fichier);

  fusionner(local, fichier);

  assert.deepEqual(local, copieLocal);
  assert.deepEqual(fichier, copieFichier);
});

test("importer deux fois le même fichier donne le même résultat", () => {
  const depart = etatDeBase();
  const fichier = retourDeClaude(depart, (f) => {
    f.notes_brutes[0].statut = "traitee";
    f.notes_brutes[0].traitee_le = RETOUR;
  });
  const premier = fusionner(depart, fichier).etat;
  const second = fusionner(premier, fichier).etat;
  assert.deepEqual(second, premier);
});

test("l'état vide est reconnu, un état avec une seule note ne l'est pas", () => {
  assert.equal(estVide(etatVide()), true);
  assert.equal(estVide({ ...etatVide(), notes_brutes: [note()] }), false);
});

test("cycle complet sur les fichiers d'exemple", () => {
  const exporte = lire("exemple-complet.json");
  const retour = lire("exemple-retour.json");
  const local = fusionner(etatVide(), exporte).etat;
  const apresExport = note({
    id: "not_bbbbbbbb-0000-4000-8000-00000000000d",
    texte: "Saisie pendant que Claude travaillait", saisie_le: APRES, modifie_le: APRES,
  });
  local.notes_brutes.push(apresExport);

  assert.deepEqual(controlerRevision(local, retour), { ok: true, type: "mise_a_jour" });
  const { etat, bilan } = fusionner(local, retour);

  assert.equal(etat.personnes.length, 3);
  assert.equal(bilan.notes_traitees, 3);
  assert.equal(bilan.notes_en_attente, 1);
  assert.deepEqual(parId(etat.notes_brutes, apresExport.id), apresExport);
  assert.equal(etat.revision, 4);
  assert.equal(validerFichier(construireExport(etat, new Date(RETOUR))).ok, true);
});
