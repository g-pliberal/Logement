/**
 * Les deux calculs du site, et le rendu des huit pages.
 *
 *     node --test tests/js/
 *
 * Aucune bibliothèque : `node:test` et `node:assert` suffisent, comme le site
 * se passe de bibliothèque de tracé.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const paquet = JSON.parse(readFileSync(join(RACINE, "moteur/donnees.json"), "utf8"));

const { Donnees } = await import(join(RACINE, "moteur/js/chiffres.js"));
const {
  SEUIL_PRIMO, TAUX_SANS_MAJORATION, bornesCheque, chiffrage, coutMutation,
  enMoisDeLoyer,
} = await import(join(RACINE, "moteur/js/calculs.js"));
const { TITRES, rendre } = await import(join(RACINE, "moteur/js/pages.js"));
const { graduationsX } = await import(join(RACINE, "moteur/js/gabarit.js"));

const d = new Donnees(paquet);

// -- le coût fiscal d'une mutation ------------------------------------------

/** Les montants sont comparés à un centime près : deux écritures d'un même
 * produit ne donnent pas le même dernier bit, et ce n'est pas ce qu'on teste. */
function presque(obtenu, attendu, marge = 0.01) {
  assert.ok(Math.abs(obtenu - attendu) < marge,
    `${obtenu} attendu à ${marge} près de ${attendu}`);
}

test("les droits de mutation sont le taux appliqué au prix", () => {
  const calcul = coutMutation(300000, 6.32);
  presque(calcul.droits, 300000 * 0.0632);
  presque(calcul.csi, 300);
  presque(calcul.total, 300000 * 0.0632 + 300);
  // 6,32 % de droits et 0,10 % de contribution : le total dit 6,42 %.
  presque(calcul.part, 6.42, 1e-9);
});

test("le primo-accédant échappe à la majoration sous le seuil, et à elle seule", () => {
  const ordinaire = coutMutation(200000, 6.32);
  const primo = coutMutation(200000, 6.32, true);
  // Sous le seuil, le primo-accédant paie exactement le taux d'avant la
  // hausse — c'est la définition retenue, et elle se lit dans l'écart.
  presque(primo.droits, 200000 * TAUX_SANS_MAJORATION / 100);
  presque(ordinaire.total - primo.total,
    200000 * (6.32 - TAUX_SANS_MAJORATION) / 100);
  // La contribution de sécurité immobilière, elle, reste due.
  presque(primo.csi, 200);
});

test("au-dessus du seuil, seule la fraction basse est exonérée", () => {
  const primo = coutMutation(400000, 6.32, true);
  const attendu = (400000 * 6.32
    - SEUIL_PRIMO * (6.32 - TAUX_SANS_MAJORATION)) / 100;
  presque(primo.droits, attendu);
  // La fraction haute reste au taux plein : l'exonération ne remonte pas.
  assert.ok(primo.droits > 400000 * TAUX_SANS_MAJORATION / 100);
});

test("un taux sans majoration ne donne aucune exonération à personne", () => {
  const ordinaire = coutMutation(200000, TAUX_SANS_MAJORATION);
  const primo = coutMutation(200000, TAUX_SANS_MAJORATION, true);
  assert.equal(ordinaire.total, primo.total);
});

test("un prix nul ou négatif est refusé plutôt que calculé", () => {
  assert.throws(() => coutMutation(0, 6.32), /montant positif/);
  assert.throws(() => coutMutation(-1, 6.32), /montant positif/);
});

test("le coût se traduit en mois de loyer, ou en rien du tout", () => {
  assert.equal(enMoisDeLoyer(9000, 900), 10);
  assert.equal(enMoisDeLoyer(9000, 0), null);
});

// -- le chiffrage de la réforme ---------------------------------------------

test("le chiffrage est l'addition qu'il annonce", () => {
  const menages = d.valeur("menages_aides");
  const bilan = chiffrage(d, { chequeMensuel: 300, menages });
  const remplacees = d.valeur("prestations_sociales")
    + d.valeur("bonifications") + d.valeur("depenses_fiscales");
  presque(bilan.remplacees, remplacees, 1e-9);
  presque(bilan.cheque, (300 * 12 * menages) / 1000, 1e-9);
  presque(bilan.solde, remplacees - bilan.cheque - d.valeur("dmto"), 1e-9);
});

test("garder les droits de mutation dégage exactement leur montant", () => {
  const menages = d.valeur("menages_aides");
  const avec = chiffrage(d, { chequeMensuel: 300, menages, supprimerDmto: true });
  const sans = chiffrage(d, { chequeMensuel: 300, menages, supprimerDmto: false });
  presque(sans.solde - avec.solde, d.valeur("dmto"), 1e-9);
});

test("rendre les subventions à la pierre les fait entrer dans le solde", () => {
  const menages = d.valeur("menages_aides");
  const tout = chiffrage(d, { chequeMensuel: 300, menages, partSubventions: 1 });
  const rien = chiffrage(d, { chequeMensuel: 300, menages, partSubventions: 0 });
  presque(rien.solde - tout.solde, d.valeur("subventions"), 1e-9);
});

test("le chèque à la moyenne actuelle rend exactement l'aide d'aujourd'hui", () => {
  const menages = d.valeur("menages_aides");
  const { actuelle } = bornesCheque(d, menages);
  const bilan = chiffrage(d, { chequeMensuel: actuelle, menages });
  presque(bilan.cheque, d.valeur("prestations_sociales"), 1e-9);
  presque(bilan.aideMoyenneActuelle, actuelle, 1e-9);
});

test("un chèque assez gros renverse le solde", () => {
  const menages = d.valeur("menages_aides");
  const bilan = chiffrage(d, { chequeMensuel: 900, menages });
  assert.ok(bilan.solde < 0, "à 900 € par mois, la réforme doit être à financer");
});

// -- les données -------------------------------------------------------------

test("un chiffre absent lève plutôt que de rendre une valeur vide", () => {
  assert.throws(() => d.valeur("ce_chiffre_n_existe_pas"), /chiffre absent/);
  assert.throws(() => d.serie("ni_cette_serie"), /série absente/);
});

// -- le rendu ----------------------------------------------------------------

test("les huit pages se composent, et portent un titre unique", () => {
  for (const chemin of Object.keys(TITRES)) {
    const [titre, html] = rendre(d, chemin, {});
    assert.ok(html.length > 3000, `${chemin} : page trop courte`);
    assert.equal((html.match(/<h1>/g) || []).length, 1,
      `${chemin} : il faut un <h1> et un seul`);
    assert.ok(titre.length > 0);
    assert.ok(!html.includes("undefined"), `${chemin} : « undefined » dans le rendu`);
    assert.ok(!html.includes("NaN"), `${chemin} : « NaN » dans le rendu`);
  }
});

test("une route inconnue rend le programme, et non une page vide", () => {
  const [titre] = rendre(d, "/nimporte-quoi", {});
  assert.equal(titre, TITRES["/"]);
});

test("les réglages du chiffrage suivent les liens de la page", () => {
  const [, html] = rendre(d, "/chiffrage", { cheque: "350", dmto: "non" });
  assert.ok(html.includes("cheque=350"), "les liens doivent porter le réglage");
  assert.ok(html.includes("dmto=non"));
  // Et rien d'autre : un paramètre étranger ne se propage pas.
  const [, autre] = rendre(d, "/", { prix: "300000" });
  assert.ok(!autre.includes("prix=300000"));
});

test("un prix saisi donne un résultat, un prix absurde n'en donne pas", () => {
  const [, avec] = rendre(d, "/fiscalite", { prix: "300000", taux: "6.32" });
  assert.ok(avec.includes("resultat-mutation"));
  const [, sans] = rendre(d, "/fiscalite", { prix: "zéro", taux: "6.32" });
  assert.ok(!sans.includes("resultat-mutation"));
});

test("ce qui vient du lecteur est échappé", () => {
  const [, html] = rendre(d, "/fiscalite", { prix: "\"><script>alert(1)</script>" });
  assert.ok(!html.includes("<script>alert(1)</script>"));
});

test("l'axe des années garde ses graduations quand la série s'allonge", () => {
  // L'écart minimal entre une décennie et une borne est une part de
  // l'amplitude, non un nombre d'années : ce qui se chevauche est une largeur
  // de texte. Écrit en années, il faisait disparaître 2020 d'une série de
  // vingt-six ans alors que rien ne le gênait.
  assert.deepEqual(graduationsX(2000, 2025), [2000, 2010, 2020, 2025]);
  assert.deepEqual(graduationsX(2014, 2025), [2014, 2020, 2025]);

  // La règle sert toujours là où elle a une raison d'être : sur un siècle et
  // quart, « 2020 » et « 2025 » se toucheraient, et la décennie cède.
  const long = graduationsX(1900, 2025);
  assert.ok(!long.includes(2020), "2020 colle à la borne sur une série longue");
  assert.equal(long[0], 1900);
  assert.equal(long[long.length - 1], 2025);

  // Les deux bornes sont graduées d'office, et jamais en double.
  for (const [a, b] of [[2000, 2025], [2014, 2025], [1900, 2025], [2020, 2024]]) {
    const gr = graduationsX(a, b);
    assert.equal(gr[0], a);
    assert.equal(gr[gr.length - 1], b);
    assert.equal(new Set(gr).size, gr.length, `doublon dans ${a}-${b}`);
    assert.deepEqual([...gr].sort((x, y) => x - y), gr, `désordre dans ${a}-${b}`);
  }

  // Aucune graduation ne tombe à moins d'une largeur d'étiquette d'une autre.
  for (const [a, b] of [[2000, 2025], [1975, 2025], [1900, 2025]]) {
    const gr = graduationsX(a, b);
    for (let i = 1; i < gr.length; i += 1) {
      assert.ok((gr[i] - gr[i - 1]) / (b - a) >= 0.08,
        `${gr[i - 1]} et ${gr[i]} se chevaucheraient sur un téléphone`);
    }
  }
});
