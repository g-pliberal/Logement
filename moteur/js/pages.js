/**
 * Les huit pages du site, et le routeur qui les choisit.
 *
 * Chaque page est une fonction qui reçoit les données et la requête, et rend
 * du HTML. Aucune ne calcule quoi que ce soit d'elle-même : les valeurs
 * viennent de `chiffres.js`, les deux calculs de `calculs.js`, la mise en page
 * de `gabarit.js`. Une page qui cite un chiffre absent des données lève, et
 * ne s'affiche pas — c'est voulu, et c'est testé.
 */

import * as g from "./gabarit.js";
import { echapper } from "./format.js";
import {
  Donnees, FIABILITES, avecUnite, decimalesUtiles, euros, milliards, nombre,
  nomFiabilite,
} from "./chiffres.js";
import {
  SEUIL_PRIMO, TAUX_SANS_MAJORATION, bornesCheque, chiffrage, coutMutation,
} from "./calculs.js";

/** Le titre de chaque page, tel qu'il s'écrit dans l'onglet du navigateur. */
export const TITRES = Object.freeze({
  "/": "Programme",
  "/constat": "Ce que produit la politique actuelle",
  "/construire": "Construire",
  "/louer": "Louer",
  "/aider": "Aider",
  "/fiscalite": "Fiscalité",
  "/chiffrage": "Chiffrage",
  "/donnees": "Données",
});

/** Ce qu'un partage ou un moteur de recherche reprend de chaque page. */
export const DESCRIPTIONS = Object.freeze({
  "/": "Le programme du Parti libéral français pour le logement : libérer le "
    + "droit de construire, rendre au bail sa liberté, remplacer douze aides "
    + "par un chèque logement, et cesser de taxer le déménagement.",
  "/constat": "Ce que la politique française du logement dépense, prélève et "
    + "produit : les aides, les prélèvements qui les dépassent largement, et "
    + "le niveau de construction le plus bas depuis le début du siècle.",
  "/construire": "Pourquoi on ne construit plus en France, et ce qu'il faut "
    + "changer : le plan local d'urbanisme, le zéro artificialisation nette, "
    + "les recours, et le maire qui paie ce qu'il autorise.",
  "/louer": "Encadrement des loyers, interdictions au diagnostic énergétique, "
    + "insécurité du bailleur : ce que le droit du bail retire au marché "
    + "locatif, et comment lui rendre sa liberté sans laisser personne dehors.",
  "/aider": "Aides personnelles, logement social, file d'attente : ce que les "
    + "aides au logement font vraiment aux loyers, et le chèque logement qui "
    + "les remplace.",
  "/fiscalite": "Le logement rapporte à l'impôt nettement plus qu'il ne "
    + "reçoit : ce que la fiscalité fait au déménagement, à la construction "
    + "et au propriétaire, et le calcul de ce qu'un achat coûte en droits de "
    + "mutation.",
  "/chiffrage": "Ce que la proposition coûte et ce qu'elle rend, mesure par "
    + "mesure et face à la situation actuelle, en milliards par an sur les "
    + "agrégats publiés du compte du logement — avec les hypothèses qu'on peut "
    + "déplacer soi-même.",
  "/donnees": "Tous les chiffres du site, avec leur source, leur adresse, "
    + "l'année qu'ils mesurent et la date à laquelle ils ont été lus.",
});

/** Les paramètres que porte l'adresse d'une page chiffrée. */
export const CLES_MODELISATION = Object.freeze(["cheque", "dmto", "pierre"]);

// -- petits outils de rendu --------------------------------------------------

/**
 * Un chiffre du paquet, tel qu'il se lit dans une phrase.
 *
 * Il passe par les données, jamais par une constante écrite dans la page :
 * c'est ce qui garantit qu'un chiffre affiché ici est un chiffre sourcé
 * là-bas, et qu'en corriger un le corrige partout.
 */
function v(donnees, cle, decimales = null) {
  const entree = donnees.chiffre(cle);
  const d = decimales === null ? decimalesUtiles(entree.valeur) : decimales;
  return avecUnite(entree.valeur, entree.unite, d);
}

/** Le même, mis en avant : c'est la forme que prend un chiffre qui compte. */
function vc(donnees, cle, decimales = null) {
  return `<strong class="cle-texte">${v(donnees, cle, decimales)}</strong>`;
}

/** La seule valeur, pour une phrase qui la met autrement. */
function n(donnees, cle) {
  return donnees.valeur(cle);
}

/** L'année qu'un chiffre mesure, pour dater une phrase. */
function an(donnees, cle) {
  return donnees.chiffre(cle).annee;
}

/**
 * Une valeur de série prise par son année, jamais par son rang.
 *
 * Une série s'allonge par le début le jour où l'on retrouve les années
 * antérieures ; un rang écrit dans une phrase se met alors à désigner une
 * autre année, sans que rien ne le signale. L'année, elle, ne bouge pas.
 */
function sv(serie, champ, annee) {
  const rang = serie.annees.indexOf(annee);
  if (rang < 0) {
    throw new Error(`année absente de la série : ${annee}`);
  }
  return serie[champ][rang];
}

/** L'année d'un extremum de série, et sa valeur. */
function extremum(serie, champ, haut) {
  const valeurs = serie[champ];
  let rang = 0;
  for (let i = 1; i < valeurs.length; i += 1) {
    if (haut ? valeurs[i] > valeurs[rang] : valeurs[i] < valeurs[rang]) {
      rang = i;
    }
  }
  return { annee: serie.annees[rang], valeur: valeurs[rang] };
}

/**
 * La ligne de source sous une carte : les publications citées, une fois
 * chacune, dans l'ordre où la carte s'en sert.
 */
function sources(donnees, ...cles) {
  const vues = new Map();
  for (const cle of cles) {
    const entree = donnees.chiffre(cle);
    if (!vues.has(entree.source)) {
      vues.set(entree.source, entree.url);
    }
  }
  const liste = [...vues.entries()]
    .map(([source, url]) => `<a href="${echapper(url)}">${echapper(source)}</a>`)
    .join(" · ");
  return `Source${vues.size > 1 ? "s" : ""} : ${liste}.`;
}

/**
 * Un bloc de chiffres mis côte à côte. `reperes` est la forme d'ouverture
 * d'une page : trois chiffres en or, assez gros pour être emportés en capture
 * d'écran.
 */
function fiches(entrees, reperes = false) {
  return `<div class="fiches${reperes ? " reperes" : ""}">${entrees.join("")}</div>`;
}

/** Le bloc « ce que nous proposons » d'une page de chantier. */
function proposition(titre, entrees) {
  const corps = entrees.map(([intitule, texte]) => (
    `<div class="point"><h3>${echapper(intitule)}</h3><p>${texte}</p></div>`
  )).join("");
  return `<section class="carte proposition-bloc">`
    + `<p class="badge proposition">La proposition</p>`
    + `<h2 class="serif">${echapper(titre)}</h2>`
    + `<div class="points">${corps}</div></section>`;
}

/** Un renvoi vers une autre page du site, en fin de section. */
function suite(chemin, texte) {
  return `<p class="actions"><a class="bouton" href="${g.lien(chemin)}">`
    + `${echapper(texte)} →</a></p>`;
}

// -- la page Programme -------------------------------------------------------

/**
 * Les cinq engagements, dans l'ordre où ils se tiennent : on ouvre le droit de
 * construire, on donne à la commune une raison de le faire, on rend au bail sa
 * liberté, on remplace douze aides par une, on cesse de taxer le déménagement.
 *
 * Le premier commande tous les autres. Une aide mieux faite, un bail plus
 * libre, un impôt plus juste ne créent pas un logement de plus tant que
 * construire reste interdit : ils se répartissent autrement la pénurie.
 */
function engagements(d) {
  const cartes = [
    ["Par défaut",
      'construire redevient <strong class="cle-texte">un droit</strong>, '
      + "non une faveur.",
      "Dans les communes où le logement manque, le plan local d'urbanisme "
      + "autorise d'office jusqu'à un gabarit écrit d'avance — hauteur, "
      + "emprise, division parcellaire, surélévation. Le maire garde la main "
      + "sur l'aspect et sur les réseaux, plus sur le droit d'empêcher. Le "
      + '<strong class="cle-texte">zéro artificialisation nette</strong> '
      + "est abrogé : un objectif national de surface ne peut pas décider "
      + "d'un logement à Toulouse."],
    ["10 ans",
      "de recettes du logement neuf "
      + '<strong class="cle-texte">pour la commune qui l\'autorise</strong>.',
      "Aujourd'hui, un maire qui accueille cent familles paie l'école, la "
      + "crèche et la voirie, et ne touche plus la taxe d'habitation qui les "
      + "finançait. Il a donc raison de refuser. La proposition lui rend, "
      + "pendant dix ans, la taxe foncière et une part de la TVA des "
      + "logements qu'il a laissés sortir de terre : "
      + '<strong class="cle-texte">construire doit rapporter à qui '
      + "construit</strong>."],
    ["1 bail",
      "libre, et "
      + '<strong class="cle-texte">un loyer payé</strong>.',
      "L'encadrement des loyers et les interdictions de louer au diagnostic "
      + "énergétique sont supprimés : ni l'un ni l'autre ne produit un "
      + "logement, et le second en retire. En échange, le bailleur obtient "
      + "ce qu'il "
      + "n'a jamais eu — un impayé jugé en "
      + '<strong class="cle-texte">trois mois</strong>, et une garantie '
      + "publique du loyer pour les locataires que cette sécurité rend enfin "
      + "louables."],
    ["1 chèque",
      "au ménage, "
      + '<strong class="cle-texte">jamais au logement</strong>.',
      "Les aides personnelles, les bonifications de prêt et les niches "
      + "fiscales du logement sont remplacées par un chèque logement unique, "
      + "sous condition de ressources, "
      + '<strong class="cle-texte">indépendant du loyer réellement '
      + "payé</strong> — c'est ce lien-là qui fait qu'une aide finit dans le "
      + "prix. Il suit le ménage, partout, qu'il loue ou qu'il achète."],
    ["0 %",
      "de droits de mutation : "
      + '<strong class="cle-texte">déménager cesse d\'être taxé</strong>.',
      "Les droits de mutation frappent le fait de bouger, pas la fortune : "
      + `${v(d, "dmto")} par an pris à qui change de ville pour un emploi, `
      + "à qui se sépare, à qui vieillit et veut un logement plus petit. Ils "
      + "sont supprimés, et compensés à l'euro par la fin des niches. La taxe "
      + "foncière, elle, est refaite sur des valeurs de ce siècle — à "
      + "rendement inchangé : on corrige une assiette fausse, on n'augmente "
      + "pas un impôt."],
  ];
  const corps = cartes.map(([chiffre, promesse, detail], index) => (
    `<div class="engagement"><div class="rang">${String(index + 1).padStart(2, "0")}</div>`
    + `<div class="chiffre">${chiffre}</div>`
    + `<div class="promesse">${promesse}</div>`
    + `<div class="detail">${detail}</div></div>`
  )).join("");
  return '<section class="engagements" aria-label="Nos cinq engagements">'
    + `<div class="grille">${corps}</div></section>`;
}

/**
 * Les quatre chantiers, chacun sous son pictogramme.
 *
 * Le pictogramme est DÉCORATIF : le titre dit déjà ce qu'il dit, et le répéter
 * ferait entendre deux fois la même chose à une synthèse vocale. Il est là pour
 * que les quatre se distinguent d'un coup d'œil, et pour rappeler que ce sont
 * quatre chantiers et non quatre paragraphes.
 */
function chantiers(d) {
  const cartes = [
    ["ruler", "Construire", "/construire",
      "Le droit des sols, le zéro artificialisation nette, les recours, et "
      + "la raison pour laquelle un maire a intérêt à refuser."],
    ["key", "Louer", "/louer",
      "L'encadrement des loyers, les interdictions au diagnostic "
      + "énergétique, et l'impayé qui dure deux ans."],
    ["users", "Aider", "/aider",
      "Les aides personnelles, ce qu'elles font aux loyers, et la file "
      + "d'attente du logement social."],
    ["coins", "Fiscalité", "/fiscalite",
      `${v(d, "prelevements")} prélevés, ${v(d, "aides_totales_2024")} `
      + "rendus, et l'impôt qui punit le déménagement."],
  ];
  const corps = cartes.map(([picto, titre, chemin, texte]) => (
    `<div class="point"><h3>${g.icone(picto)}${echapper(titre)}</h3>`
    + `<p>${texte} <a href="${g.lien(chemin)}">Lire →</a></p></div>`
  )).join("");
  return `<div class="points chantiers">${corps}</div>`;
}

function pageProgramme(d) {
  const repere = fiches([
    g.fiche("Logements mis en chantier",
      nombre(n(d, "logements_commences") * 1000, 0),
      `en ${an(d, "logements_commences")}, contre `
      + `${nombre(n(d, "logements_commences_sommet") * 1000, 0)} en `
      + `${an(d, "logements_commences_sommet")}`),
    g.fiche("Prix des logements, rapportés au revenu",
      `+${nombre(n(d, "friggit_ecart"), 0)}&nbsp;%`,
      "au-dessus du rapport qu'ils ont tenu de 1965 à 2001"),
    g.fiche("Ménages en attente d'un logement social",
      `${nombre(n(d, "demandes_hlm"), 2)}&nbsp;M`,
      `fin ${an(d, "demandes_hlm")}, pour `
      + `${nombre(n(d, "attributions_hlm"), 0)} attributions dans l'année`),
  ], true);

  return `
${g.affiche(
    "Le programme du Parti libéral français",
    "Le logement manque<br>parce qu'on l'a interdit",
    "La France a mis en chantier "
    + `<strong class="cle-texte">${nombre(n(d, "logements_commences") * 1000, 0)} logements</strong> `
    + `en ${an(d, "logements_commences")} : avec 2024, les deux années les plus `
    + `basses depuis 2000. Dans le même temps, l'État et les `
    + `collectivités ont prélevé ${v(d, "prelevements")} sur le logement et lui `
    + `ont consacré ${v(d, "aides_totales_2024")} d'aides, niches fiscales `
    + "comprises. Ce n'est pas d'argent que le logement manque, c'est "
    + "d'autorisation.",
  )}

${repere}
<p class="source">${sources(d, "logements_commences", "friggit_ecart",
    "demandes_hlm", "prelevements")}</p>

<div class="note entree">
  <p><strong>Le raisonnement tient en trois phrases.</strong> Un logement est
  cher là où il est rare. Il est rare là où il est interdit d'en construire —
  par le plan local d'urbanisme, par le ${g.terme("ZAN")}, par le recours du
  voisin, par la norme qui change tous les trois ans. Toute politique qui
  distribue de l'argent sans lever l'interdiction se contente de déplacer la
  file d'attente, et l'aide finit dans le prix.</p>
  <div class="actions"><a class="bouton" href="${g.lien("/constat")}">Ce que
  produit la politique actuelle →</a><a href="${g.lien("/chiffrage")}">Le
  chiffrage de la proposition</a></div>
</div>

<h2 class="serif">Cinq engagements</h2>
${engagements(d)}

${g.depliant("Ce que la proposition ne touche pas",
    `<p>Une réforme du logement se juge d'abord sur ceux qui n'ont rien. Quatre
  choses sont donc hors de son champ, et le resteront.</p>
  ${g.points([
    ["L'hébergement d'urgence",
      "Il n'est ni réduit, ni conditionné, ni transféré. Une place "
      + "d'hébergement n'est pas une aide au logement : c'est ce qui "
      + "sépare quelqu'un de la rue, et "
      + `<strong class="cle-texte">${nombre(n(d, "sans_domicile"), 0)} personnes</strong> `
      + `étaient sans domicile en ${an(d, "sans_domicile")}.`],
    ["Les baux en cours",
      "Aucun locataire en place ne voit son bail rompu, son loyer "
      + "déplafonné du jour au lendemain, ni son aide supprimée. Les "
      + "règles nouvelles valent pour les contrats nouveaux ; les "
      + "anciennes s'éteignent avec les contrats qu'elles régissent."],
    ["Le parc social existant",
      "Il n'est pas vendu de force, ni privatisé. Ce qui change est "
      + "l'entrée et la sortie — qui l'obtient, à quel loyer, et "
      + "jusqu'à quand — non la propriété des murs. Le "
      + `${g.terme("droit au maintien dans les lieux")} est aménagé pour `
      + "les revenus élevés, jamais pour les autres."],
    ["L'enveloppe des aides aux ménages modestes",
      "Le chèque logement est calibré sur l'enveloppe versée aujourd'hui, "
      + "et le "
      + `<a href="${g.lien("/chiffrage")}">chiffrage</a> montre ce que coûte `
      + "chaque euro au-dessus ou en dessous. Sur la répartition, il faut "
      + "être exact : un forfait qui remplace une aide calculée sur le "
      + "loyer fait mécaniquement des gagnants et des perdants à enveloppe "
      + "égale, et seule une microsimulation sur données individuelles dira "
      + "lesquels. L'engagement porte donc sur ce qu'on peut tenir — "
      + "l'enveloppe, et un dispositif transitoire garantissant qu'aucun "
      + "ménage sous plafond de ressources ne perde au passage — non sur "
      + "une promesse individuelle que ce site n'a pas les moyens de "
      + "vérifier."],
  ])}`, "plancher")}

<h2 class="serif">Les quatre chantiers</h2>
${chantiers(d)}
`;
}

// -- la page Constat ---------------------------------------------------------

/** Le tracé des mises en chantier, seule série longue du site. */
function courbeConstruction(d) {
  const serie = d.serie("logements_commences");
  const series = [
    new g.Serie("Total", serie.total, "var(--or)"),
    new g.Serie("Collectif", serie.collectif, "var(--serie-3)"),
    new g.Serie("Individuel", serie.individuel, "var(--serie-2)"),
  ];
  return g.graphique(
    "Logements mis en chantier, en milliers, de "
    + `${serie.annees[0]} à ${serie.annees[serie.annees.length - 1]}`,
    serie.annees, series, "milliers de logements", false, 0, true,
    null, "", [], "Année", null, "", 0,
  );
}

/**
 * Ce que le logement rapporte, rapporté à ce qu'il coûte.
 *
 * Deux façons de compter, qui ne comptent chaque euro qu'une fois : les niches
 * fiscales des deux côtés — l'impôt dû avant niches contre les aides niches
 * comprises —, ou l'argent perçu contre l'argent versé. Les prélèvements que
 * publie le compte du logement sont NETS des niches : les rapporter aux aides
 * niches comprises retranchait les niches deux fois, et c'est ce que ce site a
 * d'abord fait. `ancien` garde ce solde faux, pour pouvoir dire la correction
 * sans écrire un nombre à la main.
 *
 * La non-imposition du loyer imputé est un impôt auquel on renonce, comme une
 * niche : la compter parmi les aides oblige à la compter aussi dans l'impôt
 * dû. Elle change le rapport ; elle ne change pas le solde.
 */
function soldeDuLogement(d) {
  const prelevements = n(d, "prelevements");
  const niches = n(d, "depenses_fiscales");
  const aides = n(d, "aides_totales_2024");
  const loyers = n(d, "loyers_imputes_cout");
  return {
    du: prelevements + niches,
    rapportBrut: (prelevements + niches) / aides,
    rapportNet: prelevements / n(d, "aides_hors_fiscales"),
    rapportLoyers: (prelevements + niches + loyers) / (aides + loyers),
    ancien: prelevements - aides,
    ancienRapportLoyers: prelevements / (aides + loyers),
  };
}

/**
 * Ce que l'État prend et ce qu'il rend, en une cascade.
 *
 * Les niches y figurent une fois, et une seule : entre l'impôt que le logement
 * devrait et celui qu'il paie. Les aides versées se retranchent ensuite de ce
 * qui est perçu.
 */
function cascadePrelevements(d) {
  const marches = [
    new g.Marche("Impôt avant niches", soldeDuLogement(d).du, true,
      "var(--actuel)",
      "Ce que le logement paierait sans ses niches fiscales : ce qui est "
      + "perçu, et l'impôt auquel les niches font renoncer."),
    new g.Marche("Niches fiscales", -n(d, "depenses_fiscales"), false,
      "var(--manque)",
      "TVA à taux réduit sur l'entretien, réductions d'impôt pour "
      + "investissement locatif, exonérations : un impôt dû, qu'on renonce à "
      + "percevoir."),
    new g.Marche("Prélèvements perçus", n(d, "prelevements"), true,
      "var(--actuel)",
      "Taxe foncière, TVA, droits de mutation, impôts sur les revenus "
      + "locatifs, taxes sur l'énergie du logement — nets des niches, comme le "
      + "compte du logement les retrace."),
    new g.Marche("Prestations sociales", -n(d, "prestations_sociales"), false,
      "var(--manque)",
      `Aides personnelles — APL, ALS, ALF — pour `
      + `${milliards(n(d, "allocations_logement"))}, aide sociale à `
      + "l'hébergement, fonds de solidarité logement, chèque énergie."),
    new g.Marche("Subventions à la pierre", -n(d, "subventions"), false,
      "var(--manque)", "Versées aux bailleurs sociaux et aux producteurs."),
    new g.Marche("Bonifications de taux", -n(d, "bonifications"), false,
      "var(--manque)", "Prêts aidés, dont le prêt à taux zéro."),
    new g.Marche("Reste aux administrations", n(d, "solde_public"), true,
      "var(--reste)",
      "Ce que le logement rapporte, net de tout ce qu'il reçoit. La taxe "
      + "foncière revient aux communes, les droits de mutation aux "
      + "départements : ce solde n'est pas celui du seul budget de l'État."),
  ];
  return g.cascade(
    `Ce que le logement rapporte et ce qu'il reçoit, en ${an(d, "prelevements")}`,
    marches, "Md€", 1, 0, "Poste",
  );
}

function pageConstat(d) {
  const serie = d.serie("logements_commences");
  const chute = 100 * (1 - n(d, "logements_commences")
    / n(d, "logements_commences_sommet"));
  const pic = extremum(serie, "total", true);
  const bas = extremum(serie, "total", false);
  const derniere = serie.annees[serie.annees.length - 1];
  const solde = soldeDuLogement(d);

  const corps = `
${g.depliant("Ce que le logement pèse, avant tout jugement",
    `<p>Le logement est le premier poste de dépense du pays :
  ${vc(d, "depense_nationale")} en ${an(d, "depense_nationale")}, soit
  ${v(d, "depense_part_pib")} du produit intérieur brut — loyers réels et
  imputés, charges, énergie, travaux et investissement confondus. C'est aussi
  le premier poste des ménages, à ${vc(d, "part_budget_menages")} de leur
  budget.</p>
  <p>${v(d, "transactions")} de logements anciens ont changé de mains en
  ${an(d, "transactions")}, et ${v(d, "proprietaires")} des ménages sont
  propriétaires de leur résidence principale — une part stable depuis 2014,
  après quinze ans de hausse. Ces ordres de grandeur servent d'étalon à tout ce
  qui suit : une aide de ${v(d, "aides_hors_fiscales")} pèse peu de chose
  devant la dépense qu'elle prétend orienter, et beaucoup devant le budget de
  l'État qui la verse.</p>
  <p class="source">${sources(d, "depense_nationale", "transactions",
    "proprietaires", "aides_hors_fiscales")}</p>`, "masse")}

${g.cle("On ne construit plus.",
    '<strong class="cle-texte">'
    + `${nombre(n(d, "logements_commences") * 1000, 0)} logements</strong> `
    + "ont été mis en chantier en "
    + `${an(d, "logements_commences")}, contre `
    + `${nombre(n(d, "logements_commences_sommet") * 1000, 0)} en `
    + `${an(d, "logements_commences_sommet")} : `
    + `<strong class="cle-texte">${nombre(chute, 0)}&nbsp;% de moins en huit `
    + "ans</strong>.",
    `${courbeConstruction(d)}
  <p>La chute vient d'abord de la maison individuelle :
  ${nombre(sv(serie, "individuel", pic.annee) * 1000, 0)} mises en chantier en
  ${pic.annee}, ${nombre(sv(serie, "individuel", derniere) * 1000, 0)} en
  ${derniere} — une division par près de trois. Le collectif a reculé moins
  fort et remonte depuis 2024.</p>
  <p>La série publiée par l'Insee commence en 2000, et elle est reprise ici en
  entier : le creux n'est pas la dernière année, c'est ${bas.annee}, avec
  ${nombre(bas.valeur * 1000, 0)} logements, et ${derniere} ne s'en relève
  qu'à peine. Sur les douze mois arrêtés à février 2026,
  ${vc(d, "logements_autorises")} ont été autorisés, soit
  ${vc(d, "logements_autorises_ecart", 1)} par rapport à la moyenne des cinq
  années précédentes : ce qui est autorisé aujourd'hui est ce qui sortira de
  terre dans deux ans.</p>`,
    sources(d, "logements_commences", "logements_autorises",
      "logements_autorises_ecart"), "construction")}

${g.depliant("L'objection : « c'est le coût du crédit, pas le droit des sols »",
    `<p>C'est l'objection la plus intelligente qu'on nous oppose, et elle a un
  fait pour elle : en 2021, sous le même ${g.terme("PLU")}, le même
  ${g.terme("ZAN")} et le même droit du recours, la France a mis en chantier
  ${nombre(sv(serie, "total", 2021) * 1000, 0)} logements. Deux ans plus tard,
  le taux des crédits nouveaux à l'habitat était passé de
  ${vc(d, "taux_credit_bas", 2)} à ${vc(d, "taux_credit_haut", 2)} — il avait
  plus que triplé — et la construction s'effondrait. Attribuer cet effondrement
  au droit des sols serait malhonnête, et nous ne le faisons pas.</p>
  <p>Mais il y a deux horloges, et l'objection les confond. Le cycle du crédit
  explique pourquoi l'on construit peu <em>en ce moment</em> ; il n'explique
  pas le niveau où les prix se sont installés depuis un quart de siècle. Or
  c'est là que le raisonnement se retourne : de 2000 à 2021, le crédit n'a
  cessé de <em>baisser</em>. Un marché où l'offre répond aurait traduit cet
  argent moins cher en logements supplémentaires. La France l'a traduit en
  prix : ${vc(d, "friggit_ecart", 0)} au-dessus du rapport que les prix
  tenaient au revenu, et une maison individuelle tombée de
  ${nombre(sv(serie, "individuel", 2006) * 1000, 0)} à
  ${nombre(sv(serie, "individuel", derniere) * 1000, 0)} mises en chantier.</p>
  <p><strong class="cle-texte">Vingt ans d'argent bon marché absorbés par le
  prix plutôt que par la quantité : c'est la signature d'une offre qui ne peut
  pas répondre.</strong> C'est cela que mesure le droit des sols, et aucun
  mouvement de taux ne l'explique.</p>
  <p>La conséquence pratique nous engage autant que nos adversaires. Les taux
  redescendront, et le plafond, lui, ne bougera pas tout seul : la reprise du
  crédit retrouvera la même offre bloquée, et repartira dans les prix. À
  l'inverse, ouvrir le droit de construire ne fera pas sortir un logement de
  terre tant que le crédit restera cher. Les deux ne sont pas rivaux — mais un
  seul des deux est entre les mains du législateur.</p>
  <p class="source">${sources(d, "taux_credit_bas", "taux_credit_haut",
    "friggit_ecart", "logements_commences")}</p>`, "deux-horloges")}

${g.cle("Les prix ont quitté les revenus, et n'y sont pas revenus.",
    "De 1965 à 2001, le prix des logements anciens a suivi le revenu des "
    + `ménages à ${v(d, "friggit_stabilite")} près. Depuis, il s'en est `
    + "détaché : au premier "
    + `trimestre ${an(d, "friggit_ecart")}, il dépassait de `
    + `${vc(d, "friggit_ecart", 0)} la tendance qu'il avait suivie jusque-là.`,
    `<p>L'écart ne se lit pas seulement dans un indice. À effort d'épargne et à
  durée d'emprunt identiques, la surface qu'un primo-accédant peut acheter est
  inférieure de <strong class="cle-texte">${nombre(
    Math.abs(n(d, "pouvoir_achat_immobilier")), 0)}&nbsp;%</strong> à ce
  qu'elle était en 1965 comme en 2000. Pour acheter le même logement qu'alors, il lui faut désormais
  s'endetter sur ${vc(d, "duree_endettement", 0)}, contre quinze.</p>
  <p>Cette grandeur est la seule qui compte pour un ménage : ni le prix nu, qui
  ne dit rien sans le revenu, ni le taux d'intérêt, qui passe. Un prix qui
  décroche du revenu pendant vingt ans n'est pas une bulle qui éclatera, c'est
  une rareté qui dure.</p>`,
    sources(d, "friggit_ecart", "friggit_stabilite"), "prix")}

${g.cle("La file d'attente s'allonge pendant qu'on distribue.",
    `${vc(d, "demandes_hlm")} de ménages attendaient un logement social fin `
    + `${an(d, "demandes_hlm")}, pour `
    + `${nombre(n(d, "attributions_hlm"), 0)} attributions dans l'année.`,
    `<p>Ce total mérite une précision qu'on lit rarement : près d'un tiers de
  ces demandes — ${vc(d, "demandes_hlm_mutation", 0)} — émanent de ménages
  <em>déjà logés</em> dans le parc social et qui souhaitent en changer. Les ménages qui attendent d'y entrer sont donc environ deux
  millions — ce qui reste cinq fois le nombre d'attributions annuelles, et ne
  change pas la conclusion. Le dire d'emblée vaut mieux que de le laisser
  dire.</p>
  <p>Le parc social compte ${vc(d, "parc_social")} de logements, un ménage sur
  six, et il grandit : ${nombre(n(d, "parc_social_entrees"), 0)} logements y sont
  entrés en ${an(d, "parc_social_entrees")}. La demande, elle, grandit plus vite.
  Le délai médian d'obtention atteint
  ${vc(d, "delai_hlm_idf", 0)} en Île-de-France pour les demandes satisfaites
  en ${an(d, "delai_hlm_idf")} — la moitié des ménages servis avaient attendu
  davantage. Il s'y compte ${vc(d, "tension_idf", 0)} pour une attribution.</p>
  <p>Un parc qui ne se libère pas ne peut pas absorber une file qui s'allonge :
  le ${g.terme("droit au maintien dans les lieux")} garantit à l'occupant d'y rester quel que soit son revenu ultérieur, quand
  celui qui attend, lui, n'a droit à rien.</p>`,
    sources(d, "demandes_hlm", "parc_social", "delai_hlm_idf", "tension_idf",
      "demandes_hlm_mutation"), "attente")}

${g.cle("Le logement rapporte aux administrations plus du double de ce qu'il leur coûte.",
    `Elles en ont tiré ${vc(d, "prelevements")} d'impôts en `
    + `${an(d, "prelevements")} et lui ont versé ${v(d, "aides_hors_fiscales")} `
    + `d'aides : il leur reste ${vc(d, "solde_public", 1)}. Les niches fiscales, `
    + "impôts auxquels elles renoncent, sont déjà retranchées de ce qu'elles "
    + "perçoivent.",
    `${cascadePrelevements(d)}
  <p>Les prélèvements représentent ${v(d, "prelevements_part_pib")} du produit
  intérieur brut et ${v(d, "prelevements_part_po")} de tous les prélèvements
  obligatoires du pays. Ils sont portés par la taxe foncière
  (${v(d, "taxe_fonciere")}), la TVA
  sur le neuf, les travaux et les services (${v(d, "tva_logement")}), et les
  droits de mutation (${v(d, "dmto")}).</p>
  <p><strong>Une correction, parce qu'elle change le chiffre de cette
  carte.</strong> Le compte du logement retrace les prélèvements « nets des
  avantages fiscaux » : les ${v(d, "depenses_fiscales")} de niches — un impôt
  dû qu'on renonce à percevoir — en sont déjà retranchés. Ce site retranchait
  pourtant une seconde fois les ${v(d, "aides_totales_2024")} d'aides, niches
  comprises, et publiait un reste de ${milliards(solde.ancien)} : les niches y
  étaient comptées deux fois. Compter une niche comme une aide est légitime —
  le compte du logement le fait, notre chiffrage aussi —, à condition de la
  compter aussi dans l'impôt qu'elle fait renoncer à percevoir, comme la
  cascade le fait : ${milliards(solde.du)} dus, ${v(d, "aides_totales_2024")}
  d'aides, et le même reste de ${v(d, "solde_public", 1)}. Ce que le logement
  rapporte vaut alors ${nombre(solde.rapportBrut, 1)} fois ce qu'il coûte,
  niches comptées des deux côtés — ${nombre(solde.rapportNet, 1)} fois en
  argent perçu contre argent versé.</p>
  <p>Le sens de ce solde demande une précaution : aides et prélèvements n'ont
  ni les mêmes redevables ni les mêmes bénéficiaires, et l'écart n'est pas un
  solde budgétaire qu'on pourrait dépenser. Il dit une chose, et une seule :
  <strong class="cle-texte">le logement n'est pas un secteur subventionné, c'est
  un secteur taxé</strong> — et l'idée qu'il faudrait « remettre de l'argent »
  se heurte d'abord à celui qu'on y prend déjà.</p>
  <p>Une objection sérieuse manque encore à ce compte : les propriétaires
  occupants ne sont pas imposés sur le ${g.terme("loyer imputé")} qu'ils se
  versent à eux-mêmes, et cet avantage vaut
  ${vc(d, "loyers_imputes_cout")} par an. Il n'entre dans aucune colonne
  ci-dessus, et il ne change pas le reste, pour la même raison que les niches :
  un impôt qu'on ne perçoit pas n'entre ni ne sort des caisses. Il change le
  rapport, qui tombe de ${nombre(solde.rapportBrut, 1)} à
  ${nombre(solde.rapportLoyers, 1)} sans s'inverser ; la page
  <a href="${g.lien("/fiscalite")}">Fiscalité</a> le reprend en entier.</p>`,
    sources(d, "prelevements", "aides_totales_2024", "aides_hors_fiscales",
      "taxe_fonciere", "prelevements_part_pib", "prelevements_part_po",
      "loyers_imputes_cout"), "argent")}

${g.cle("Et pourtant, le mal-logement progresse.",
    `${vc(d, "mal_loges")} de personnes sont mal logées, et `
    + `${vc(d, "sans_domicile", 0)} sont sans domicile — contre `
    + `${v(d, "sans_domicile_2020", 0)} en ${an(d, "sans_domicile_2020")}.`,
    `<p>C'est la vérification de la thèse, et non son objection. Une politique
  qui dépense ${v(d, "aides_publiques")} par an et qui laisse le nombre de
  personnes sans domicile croître d'un sixième en cinq ans ne manque pas de
  moyens : elle manque de logements. ${vc(d, "heberges_tiers", 0)} vivent par
  ailleurs hébergées chez un tiers faute de logement autonome — un
  mal-logement qui n'apparaît dans aucune statistique de loyer.</p>
  <p>Le parc compte ${v(d, "parc_logements")} de logements pour
  ${v(d, "residences_principales")} de résidences principales,
  ${v(d, "logements_vacants")} de logements vacants
  (${v(d, "part_vacants")} du parc, en baisse depuis 2019) et
  ${v(d, "residences_secondaires")} de résidences secondaires. La vacance est
  souvent présentée comme la réserve où puiser : l'essentiel en est frictionnel
  — un logement entre deux occupants, en travaux, en succession — et se trouve
  là où la demande n'est pas.</p>`,
    sources(d, "mal_loges", "parc_logements", "logements_vacants",
      "part_vacants", "heberges_tiers", "sans_domicile_2020"), "mal-logement")}
`;

  return `
${g.affiche(
    "Le constat",
    "Quarante-six milliards,<br>et deux années<br>de construction<br>au plus bas depuis 2000",
    `L'État et les collectivités consacrent ${v(d, "aides_publiques")} par an `
    + `au logement en ${an(d, "aides_publiques")}, soit environ `
    + `${v(d, "depense_publique_pib")} — à peu près la moyenne européenne. Le `
    + "résultat se lit en cinq images, et aucune ne va dans le bon sens.",
  )}
${g.plan(corps, "/constat")}
${corps}
${suite("/construire", "Le premier chantier : construire")}
`;
}

// -- la page Construire ------------------------------------------------------

function pageConstruire(d) {
  const corps = `
${g.depliant("Le droit de construire est devenu un droit d'interdire",
    `<p>Un terrain constructible ne l'est pas par nature : il l'est parce qu'un
  document l'a décidé. Le ${g.terme("PLU")} fixe, parcelle par parcelle, la
  hauteur, l'emprise au sol, le nombre de places de stationnement, parfois la
  couleur des volets. Ce document n'est pas un arbitrage entre des usages :
  c'est un plafond. Là où la demande est forte, le plafond crée une rente, et
  la rente se voit dans le prix du terrain — la
  ${g.terme("charge foncière")} en porte la trace.</p>
  <p>Sur ce point, il faut corriger une idée reçue que nous avons nous-mêmes
  portée. Le foncier ne dévore pas le coût d'un logement social : il en
  représente ${vc(d, "part_foncier")} en ${an(d, "part_foncier")}, et il
  n'explique qu'une faible part de la hausse des prix de revient depuis 2019 —
  les coûts de construction en expliquent l'essentiel. « Contre toute
  attente, le foncier contribue nettement moins », écrit la Banque des
  Territoires, qui tient la base.</p>
  <p>La rareté du droit de bâtir se lit ailleurs, et plus nettement : dans
  l'écart entre les territoires. Un logement social coûte
  ${vc(d, "surcout_zone_tres_tendue", 0)} de plus à produire en zone très
  tendue — Paris et sa proche couronne — qu'en zone simplement tendue, et son
  prix de revient y a crû de ${vc(d, "hausse_cout_abis", 0)} en cinq ans,
  quand il montait deux fois moins vite partout ailleurs. Entre les zones
  détendues, en revanche, l'écart
  se compte en quelques pour cent. <strong class="cle-texte">Le coût s'envole
  là où, et seulement là où, la demande se heurte à un plafond.</strong></p>
  <p>On achète donc, à mesure qu'on s'approche des villes où le logement
  manque, de moins en moins un sol et de plus en plus une autorisation.</p>
  <p class="source">${sources(d, "part_foncier", "surcout_zone_tres_tendue",
    "hausse_cout_abis")}</p>`,
    "plu")}

${g.depliant("Un maire qui construit paie, et ne touche rien",
    `<p>C'est le nœud, et il est budgétaire avant d'être idéologique. Une
  commune qui accueille cent familles doit une école, une crèche, des réseaux,
  de la voirie — des dépenses immédiates et durables. En face, la taxe
  d'habitation, qui faisait payer l'habitant nouveau, a été supprimée sur les
  résidences principales : il reste la taxe foncière du bâti neuf, souvent
  exonérée deux ans, et la taxe d'aménagement.</p>
  <p>Un élu qui refuse un programme n'est donc pas un élu rétrograde : c'est un
  élu qui compte. Tant que construire coûte à la commune et rapporte à l'État,
  aucune exhortation nationale ne renversera l'arithmétique locale.</p>`,
    "maire")}

${g.depliant("Le zéro artificialisation nette : un plafond de surface là où manque un plancher de logements",
    `<p>La loi Climat et résilience de 2021 a fixé l'objectif de ne plus
  consommer d'espace naturel ou agricole à l'horizon 2050, par paliers
  intermédiaires. Le ${g.terme("ZAN")} répartit donc une enveloppe de surface
  entre les territoires — indépendamment de la demande de logements qui s'y
  exprime.</p>
  <p>La loi TRACE, adoptée en première lecture par le Sénat le 18 mars 2025, en
  a déjà repoussé l'échéance chiffrée de 2031 à 2034 et supprimé le palier
  intermédiaire de réduction de moitié. C'est l'aveu que la trajectoire n'était pas
  tenable ; ce n'est pas la correction du principe. Un objectif de surface est
  un instrument juste pour un problème de surface ; le nôtre est un problème de
  logements, et rien n'interdit d'y répondre en hauteur plutôt qu'en largeur —
  à condition que la hauteur, elle, soit permise.</p>`, "zan")}

${g.depliant("Le recours, et le temps qu'il coûte",
    `<p>Un permis délivré n'est pas un permis acquis. Le voisin, l'association,
  le concurrent peuvent le contester, et le Sénat mesurait
  ${vc(d, "recours_duree", 0)} de délai moyen devant le tribunal administratif
  en matière d'urbanisme — un an et onze mois —, auxquels s'ajoutent un an et
  six mois en appel et dix mois au Conseil d'État. Sur une opération de
  trente logements, ce délai suffit à faire passer le plan de financement de
  rentable à impossible ; il suffit surtout à décourager l'opération suivante,
  celle qu'on ne lance pas.</p>
  <p>Les délais ont été resserrés depuis. Le juge doit statuer en
  ${v(d, "recours_delai_legal", 0)} sur un permis de plus de deux logements,
  en première instance comme en appel, depuis ${an(d, "recours_delai_legal")} ;
  en zone tendue, l'appel est supprimé pour les recours introduits jusqu'au
  31 décembre 2027 ; et depuis la loi du 26 novembre 2025, un recours gracieux
  ne proroge plus le délai pour saisir le juge. C'est la bonne direction, et
  c'est encore ${v(d, "recours_delai_legal", 0)} pendant lesquels rien ne sort
  de terre.</p>
  <p>La mesure que nous citons date de ${an(d, "recours_duree")} : c'est la
  plus récente que nous ayons pu sourcer à une publication officielle, et nous
  préférons une mesure datée à une estimation ronde. Les délais ont pu bouger
  depuis, et plutôt à la baisse.</p>
  <p class="source">${sources(d, "recours_duree", "recours_delai_legal")}</p>`,
    "recours")}

${proposition("Rendre le droit de construire à celui qui construit", [
    ["Un gabarit de droit dans les zones tendues",
      "Dans les communes où le logement manque, le plan local d'urbanisme "
      + "cesse d'être une liste d'interdictions pour devenir un gabarit : "
      + "hauteur, emprise, nombre de niveaux, écrits d'avance et opposables. "
      + "Ce qui entre dans le gabarit est autorisé de plein droit. Le maire "
      + "garde la main sur l'aspect extérieur, sur les réseaux et sur la "
      + "sécurité — plus sur l'opportunité."],
    ["La division, la surélévation et le changement d'usage de droit",
      "Diviser une parcelle pavillonnaire, ajouter un étage, transformer un "
      + "bureau vide en logements : trois gestes qui produisent du logement "
      + "sans consommer un mètre carré de sol, et que le règlement empêche "
      + "aujourd'hui presque partout. Ils deviennent de droit dans les zones "
      + "tendues."],
    ["L'abrogation du zéro artificialisation nette",
      "Le plafond de surface est remplacé par la protection, parcelle par "
      + "parcelle, de ce qui mérite de l'être : espaces naturels classés, "
      + "terres agricoles à fort rendement, continuités écologiques. On "
      + "protège des lieux, non une comptabilité nationale d'hectares."],
    ["Le produit du logement neuf à la commune qui l'autorise",
      "Pendant dix ans, la taxe foncière des logements neufs et une part de "
      + "la TVA de leur construction restent à la commune. Elle finance ainsi "
      + "l'école qu'elle doit ouvrir, et construire cesse d'être une perte "
      + "sèche pour son budget."],
    ["Le contentieux enfermé dans un délai",
      "Un recours contre un permis de logements est jugé en première et "
      + "dernière instance dans un délai fixe, avec une consignation "
      + "restituée si le recours prospère. Le droit au recours n'est pas "
      + "touché ; sa durée l'est."],
  ])}

${g.cle("Cela marche-t-il ailleurs ?",
    "Parfois, et pas toujours — et ce qui sépare les réussites des échecs est "
    + "précisément ce que nous proposons. À Auckland, qui a ouvert les droits "
    + "à bâtir sur les trois quarts de son sol urbain en 2016, "
    + `<strong class="cle-texte">${v(d, "auckland_part_permis")}</strong> des `
    + "logements autorisés en sept ans le sont du fait de la réforme.",
    `<p>Trois estimations existent, et nous les donnons toutes les trois plutôt
  que la plus flatteuse. La plus prudente compare les quartiers d'Auckland
  entre eux : ${vc(d, "auckland_permis_prudent", 0)} autorisés en plus en
  cinq ans, soit ${v(d, "auckland_part_parc_prudent")} du parc. La deuxième
  compare Auckland à des villes néo-zélandaises restées sous l'ancien régime :
  ${v(d, "auckland_permis", 0)} en six ans, soit
  ${v(d, "auckland_part_parc")}. La plus récente, de 2025, porte sur sept ans
  et attribue à la réforme ${v(d, "auckland_part_permis")} de tous les permis
  délivrés — ${v(d, "auckland_hausse_permis")} de plus que sans elle. Sur les loyers, l'écart au scénario sans réforme est
  estimé à ${vc(d, "auckland_loyers", 0)}.</p>
  <p><strong>Et ailleurs, cela n'a pas marché.</strong> Il faut le dire, parce
  que c'est vrai et parce que c'est instructif. Minneapolis a autorisé en 2019
  jusqu'à trois logements par parcelle sans toucher aux règles de surface : les
  petits collectifs restent une fraction marginale des permis. La Californie a
  ouvert la division parcellaire sans obtenir grand-chose, les communes ayant
  trouvé de quoi la neutraliser. Et la littérature est nette sur les
  ouvertures ponctuelles : les études d'${g.terme("upzoning")} localisé
  « trouvent souvent une réponse de l'offre faible ou nulle ».</p>
  <p>Qu'est-ce qui sépare Auckland de Minneapolis ? Deux choses, et ce sont les
  deux que porte notre proposition. <strong class="cle-texte">L'ampleur</strong>
  — trois quarts du sol urbain d'un coup, non quelques parcelles : une
  ouverture localisée déplace la construction au lieu de l'augmenter, et fait
  monter le prix du terrain ouvert. Et <strong class="cle-texte">le
  gabarit</strong> : Auckland n'a pas seulement permis plus de logements par
  parcelle, elle a relevé la surface constructible de
  ${vc(d, "auckland_surface_plancher", 1)} en zone de densité moyenne, et
  triplé la capacité de l'agglomération. Minneapolis a compté les logements
  sans toucher aux mètres carrés, et n'a rien obtenu.</p>
  <p>C'est exactement la raison pour laquelle notre proposition s'écrit en
  hauteur, emprise et niveaux opposables, et non en nombre de logements
  autorisés. Une réforme qui ne ferait pas cela échouerait, et les échecs
  ci-dessus disent pourquoi.</p>
  <p>Restent les réserves, que nous posons nous-mêmes. Auckland partait d'un
  zonage pavillonnaire extrême, et la Nouvelle-Zélande n'a ni nos communes ni
  notre droit des sols. Les estimations reposent sur des contrefactuels
  construits, méthode reconnue mais discutée — et discutée elle l'a été, au
  point qu'une revue de littérature a été écrite pour répondre aux critiques.
  Enfin l'écart sur les loyers n'est pas une baisse constatée : c'est un écart
  au niveau qu'ils auraient atteint sans la réforme.</p>`,
    sources(d, "auckland_part_permis", "auckland_hausse_permis",
      "auckland_permis", "auckland_part_parc", "auckland_permis_prudent",
      "auckland_part_parc_prudent", "auckland_surface_plancher",
      "auckland_loyers"),
    "auckland")}

${g.depliant("L'objection : « il y a plus de permis que de chantiers »",
    `<p>Elle est juste, et c'est la plus sérieuse qu'on nous oppose. Sur les
  douze mois arrêtés à février 2026, ${vc(d, "logements_autorises")} ont été
  autorisés, quand
  <strong class="cle-texte">${nombre(n(d, "logements_commences") * 1000, 0)}</strong>
  seulement étaient mis en chantier dans l'année. Si l'autorisation était le seul verrou,
  l'écart serait inverse.</p>
  <p>Trois choses l'expliquent. Un permis n'est pas une opération : il se
  périme, il tombe au contentieux, il porte sur des programmes qui ne se
  financent plus depuis que le crédit a renchéri. Ensuite, les deux séries ne
  mesurent pas la même année : ce qui est autorisé aujourd'hui sort de terre
  dans un à deux ans. Enfin, et c'est le point principal, une autorisation
  délivrée ne dit rien du gabarit qu'elle autorise. On compte les permis
  accordés, jamais les étages que le règlement a retirés du projet avant qu'il
  ne soit déposé. Le plafond du ${g.terme("PLU")} ne se lit pas dans les permis
  refusés ; il se lit dans les projets rabotés d'avance, et dans ceux qu'on ne
  dépose pas.</p>
  <p>Où se lit-il, alors ? Dans le prix du sol, qui est le prix de
  l'autorisation. Non dans la part du foncier, qui est plus modeste qu'on ne
  le dit — ${v(d, "part_foncier")} du prix de revient d'un logement social —,
  mais dans l'écart entre les territoires : produire le même logement coûte
  ${v(d, "surcout_zone_tres_tendue", 0)} de plus en zone très tendue qu'en
  zone tendue, quand les zones détendues se tiennent à quelques pour cent les
  unes des autres. Un terrain ne vaut cher que là où le droit d'y bâtir est
  rare.</p>
  <p>Cette objection établit malgré tout quelque chose, et nous le concédons :
  ouvrir le droit de construire ne suffit pas à lui seul. Le coût du crédit et
  le prix de la construction décident du passage du permis au chantier, et
  aucun des deux n'est dans ce programme. C'est pourquoi nous ne promettons pas
  un nombre de logements : nous promettons la levée d'un plafond, sans laquelle
  rien d'autre ne peut jouer.</p>
  <p class="source">${sources(d, "logements_autorises", "logements_commences",
    "part_foncier", "surcout_zone_tres_tendue")}</p>`, "permis-chantiers")}

${g.depliant("L'objection : « une commune ne peut pas être forcée »",
    `<p>Le droit de l'urbanisme est une compétence que la loi délègue, non un
  pouvoir propre des communes. L'État fixe déjà, par la loi, ce qu'un plan
  local d'urbanisme doit permettre et ce qu'il doit interdire : les règles de
  la loi Littoral, les servitudes d'utilité publique, l'obligation de logement
  social de l'article 55 de la loi SRU s'imposent aux communes sans que leur
  libre administration ait été jugée méconnue. Un gabarit minimal opposable
  relève de la même catégorie.</p>
  <p>La libre administration reste protégée dans ce qu'elle a de réel : la
  commune garde l'aspect extérieur, les réseaux, la sécurité, l'équipement
  public, et le droit d'aller au-delà du gabarit si elle le souhaite. Ce
  qu'elle perd est le pouvoir de descendre en dessous — et ce pouvoir-là, elle
  ne l'exerce pas dans l'intérêt de ceux qui ne sont pas encore ses
  administrés.</p>
  <p>Reste que la mesure serait contestée, et qu'une loi de cette portée se
  prépare : une zone tendue définie par un critère mesurable et non par
  décision discrétionnaire, un gabarit proportionné à la tension constatée, et
  une entrée en vigueur laissant aux communes le temps de réviser leur plan.
  C'est le prix d'une réforme qui tient devant le juge.</p>`, "libre-administration")}
`;

  return `
${g.affiche(
    "Premier chantier",
    "Construire",
    "Le prix d'un logement, en zone tendue, est d'abord le prix de "
    + "l'autorisation de le construire. Tant que cette autorisation reste "
    + "rare, tout le reste — aides, encadrement, incitations — se contente de "
    + "répartir la pénurie autrement.",
  )}
${g.plan(corps, "/construire")}
${corps}
${suite("/louer", "Deuxième chantier : louer")}
`;
}

// -- la page Louer -----------------------------------------------------------

function pageLouer(d) {
  const corps = `
${g.depliant("L'encadrement des loyers : un transfert, pas une construction",
    `<p>${vc(d, "encadrement_villes", 0)} appliquent aujourd'hui un plafond de
  loyer par référence à un loyer médian de quartier : Paris, Lyon, Lille,
  Bordeaux, Montpellier, Villeurbanne, deux établissements territoriaux de
  Seine-Saint-Denis, le Pays basque et Grenoble. L'expérimentation ouverte par
  la loi ELAN de 2018, prolongée par la loi 3DS, s'éteint le 25 novembre 2026
  faute de loi nouvelle.</p>
  <p>Il faut ajouter aussitôt que cette extinction n'est plus acquise, et ne
  pas faire semblant de l'ignorer : l'Assemblée nationale a adopté le
  11 décembre 2025, en première lecture, une proposition de loi qui pérennise
  le dispositif et l'ouvre à toute commune volontaire en zone tendue. Le texte
  est au Sénat. Notre proposition n'enregistre donc pas une échéance : elle
  s'oppose à un texte en cours, et elle doit se défendre comme telle.</p>
  <p>Le bilan, et il n'est pas celui que nous aurions écrit. Le dispositif
  <em>marche</em>, au sens où il fait ce qu'il dit : l'évaluation
  parlementaire chiffre à
  <strong class="cle-texte">${nombre(Math.abs(n(d, "encadrement_effet")), 1)}&nbsp;%</strong>
  la modération de la hausse des loyers parisiens entre 2019 et 2024, soit
  environ ${vc(d, "encadrement_gain_mensuel", 0)} par mois pour un locataire
  concerné. Le rapport note qu'une part importante des
  loyers dépasse encore les plafonds autorisés — un plafond mal respecté
  répartit mal —, mais l'effet est réel et il est mesuré.</p>
  <p>Nous devons même concéder davantage, parce que c'est dans le même
  rapport. L'Apur, qui suit le dispositif depuis six ans et l'a étendu à sept
  villes encadrées, conclut à <strong>l'absence de dégradation durable de
  l'offre locative</strong> à Paris. C'est l'objection directe à ce que nous
  écrivons plus bas sur San Francisco, et nous ne la cacherons pas : le retrait
  d'offre que le contrôle des loyers produit ailleurs n'a pas été constaté
  ici.</p>
  <p>Que reste-t-il alors de notre position ? L'essentiel, et il ne dépend pas
  du point contesté. <strong class="cle-texte">Aucun de ces euros n'est un
  logement de plus.</strong> L'encadrement transfère du bailleur au locataire
  <em>en place</em> ; celui qui cherche affronte exactement la même rareté, et
  il n'entre pas dans les statistiques de loyer parce qu'il ne signe rien. Un
  dispositif peut être efficace sur ce qu'il mesure et inutile sur ce qui
  manque. C'est le cas ici, et c'est pour cela, et non pour ses effets sur
  l'offre, que nous ne le reconduisons pas.</p>
  <p class="source">${sources(d, "encadrement_villes", "encadrement_effet",
    "encadrement_gain_mensuel")}</p>`,
    "encadrement")}

${g.cle("Que fait un contrôle des loyers à l'offre ?",
    "À San Francisco, les bailleurs soumis à l'extension du contrôle en 1994 "
    + "ont retiré "
    + `<strong class="cle-texte">${nombre(Math.abs(n(d, "san_francisco_offre")), 0)}&nbsp;%</strong> `
    + "de leur offre locative du marché — vente à des occupants, démolition, reconstruction.",
    `<p>L'étude de Diamond, McQuade et Qian (<em>American Economic Review</em>,
  2019) est l'une des rares à mesurer les deux effets ensemble. Les locataires
  protégés y gagnent : ils restent, leur mobilité baisse de
  ${nombre(Math.abs(n(d, "san_francisco_mobilite")), 0)}&nbsp;%, leur
  déplacement hors de la ville recule. Les logements, eux, sortent du parc
  locatif — et la hausse de loyer qui s'ensuit pour tous les autres annule, à
  l'échelle de la ville, le gain des protégés.</p>
  <p>C'est le mécanisme, pas l'anecdote : un prix plafonné sous le prix
  d'équilibre rend la location moins attrayante que les usages concurrents —
  vendre, habiter, louer meublé, ne pas louer du tout.</p>
  <p><strong>Ce mécanisme n'a pourtant pas été constaté à Paris</strong>, et
  il faut le dire ici plutôt que de compter sur l'inattention du lecteur.
  L'Apur, qui suit l'encadrement français depuis six ans, conclut à l'absence
  de dégradation durable de l'offre locative. Trois raisons peuvent
  l'expliquer, et nous ne savons pas départager : l'encadrement français est
  bien plus lâche que le contrôle californien, puisqu'il admet un complément
  de loyer et se recale sur les loyers constatés à chaque révision, quand le
  contrôle de San Francisco gelait la progression d'un bail donné ; il est
  récent, quand l'étude américaine mesure sur vingt ans ; et il est mal
  respecté, ce qui atténue mécaniquement ses effets, bons comme mauvais.</p>
  <p>Nous retenons donc de San Francisco ce qu'un plafond <em>strict et
  durable</em> produit, non ce que l'encadrement français aurait déjà produit.
  Et nous fondons notre proposition sur l'argument qui ne dépend pas de ce
  point : un plafond ne construit rien.</p>`,
    sources(d, "san_francisco_offre", "san_francisco_mobilite"), "controle")}

${g.depliant("Les interdictions au diagnostic énergétique",
    `<p>Depuis le 1er janvier 2025, un logement classé G au
  ${g.terme("DPE")} ne peut plus être remis en location ; les classes F
  suivront en 2028, E en 2034. L'intention est bonne : un logement mal isolé
  coûte cher à chauffer et chauffe la planète. L'instrument, lui, a deux
  défauts qu'aucune rédaction ne corrige.</p>
  <p>Le premier est qu'il retire un logement au lieu de l'améliorer. Un
  propriétaire qui ne peut pas financer les travaux ne les fait pas : il vend,
  ou il laisse vide. Le locataire de la ${g.terme("passoire thermique")} n'est
  pas relogé dans un logement mieux isolé, il est relogé dans la file
  d'attente.</p>
  <p>Le second est que la mesure elle-même n'est pas stable. La méthode de
  calcul a changé en 2021, puis au 1er janvier 2026 : en abaissant le
  coefficient de conversion de l'électricité de 2,3 à 1,9, cette dernière
  révision fait sortir ${vc(d, "dpe_reclasses", 0)} du statut de passoire — sur
  ${v(d, "passoires")} que comptait le parc — sans qu'un mur ait bougé ni un
  radiateur changé. Une interdiction de louer adossée à un thermomètre qu'on
  recalibre tous les trois ans n'est pas une politique climatique : c'est une
  incertitude de plus pour qui songeait à louer.</p>
  <p>Que la correction soit justifiée ne change rien à l'argument, et nous
  l'accordons volontiers : le coefficient de 2,3 pénalisait l'électricité sans
  raison physique. C'est précisément le problème. Un seuil qui commande une
  interdiction doit être stable ; celui-ci est révisable par arrêté, et il l'a
  été deux fois en cinq ans.</p>
  <p class="source">${sources(d, "dpe_reclasses", "passoires")}</p>`, "dpe")}

${g.depliant("L'impayé, et les deux ans qu'il coûte",
    `<p>Le pendant de la liberté du bail est la certitude du paiement, et c'est
  là que le droit français est le plus défaillant. Entre le premier impayé et
  la libération effective des lieux, il s'écoule couramment plus de deux ans :
  commandement de payer, assignation, audience, délais accordés par le juge,
  concours de la force publique, trêve hivernale. Le bailleur avance le loyer
  qu'il ne perçoit pas et les charges qu'il doit.</p>
  <p>Cette incertitude a un prix, et ce sont les locataires qui le paient : la
  sélection au dossier, les trois garants, le contrat à durée indéterminée
  exigé, la préférence donnée au locataire déjà solide. Le risque que la loi
  refuse de traiter se transforme en barrière à l'entrée pour les plus
  fragiles.</p>`, "impaye")}

${proposition("Rendre au bail sa liberté, et au loyer sa certitude", [
    ["La fin de l'encadrement des loyers",
      "L'expérimentation s'éteint et n'est pas reconduite. Le loyer se fixe "
      + "au contrat. Ce que l'encadrement transférait aux locataires en place "
      + "doit venir d'ailleurs : d'une offre plus abondante, et du chèque "
      + "logement pour ceux dont le revenu ne suit pas."],
    ["Un impayé jugé en trois mois",
      "Procédure accélérée devant le juge des contentieux de la protection, "
      + "délai fixe, exécution de plein droit. En contrepartie, l'accompagnement "
      + "social du locataire de bonne foi est saisi dès le premier mois "
      + "d'impayé, et non deux ans plus tard quand la dette est irrattrapable."],
    ["Une garantie publique du loyer, ouverte à tous",
      "L'État assure le loyer du locataire dont le revenu est modeste ou "
      + "irrégulier, contre une prime. Ce n'est pas une subvention : c'est la "
      + "mutualisation d'un risque que le bailleur individuel ne sait pas "
      + "porter, et c'est ce qui rend louable un dossier qu'aucun garant ne "
      + "couvre aujourd'hui."],
    ["L'information énergétique plutôt que l'interdiction",
      "Le diagnostic reste obligatoire, affiché, et la consommation réelle "
      + "est communiquée au candidat locataire. L'interdiction de louer est "
      + "levée : le marché escompte déjà la facture de chauffage dans le "
      + "loyer, et un logement mal isolé se loue moins cher — ce qui est "
      + "exactement l'incitation recherchée, sans retirer le logement."],
    ["Un bail dont la durée se négocie",
      "La durée minimale légale devient un plancher supplétif, que les "
      + "parties peuvent allonger ou raccourcir d'un commun accord. Un "
      + "étudiant, un salarié en mission, une famille qui s'installe pour dix "
      + "ans n'ont pas besoin du même contrat."],
  ])}

${g.depliant("L'objection : « trois mois, c'est l'expulsion expresse »",
    `<p>Il faut répondre sur le fond, parce que l'accusation est la plus facile
  à lancer contre nous et la plus coûteuse à laisser sans réponse.</p>
  <p>Ce que nous raccourcissons est le <em>jugement</em>, non l'exécution.
  Aujourd'hui, une fois l'assignation délivrée — après les mois de relances et
  le commandement de payer qui la précèdent —, il faut en moyenne
  ${vc(d, "delai_decision_bail")} pour qu'un tribunal dise si la dette est due.
  Pendant ce temps, le locataire de bonne foi accumule une dette qu'il ne
  remboursera pas, et le locataire de mauvaise foi occupe gratuitement.
  Personne n'y gagne, sauf le second. Un jugement en
  trois mois est d'abord une protection pour le premier : c'est à ce moment-là
  que l'accompagnement social, le plan d'apurement et le
  ${g.terme("FSL")} peuvent encore quelque chose.</p>
  <p>Trois garanties ne sont pas touchées, et nous les écrivons ici pour qu'on
  puisse nous les opposer si nous y manquions.</p>
  ${g.points([
    ["La trêve hivernale",
      "Elle est maintenue. Aucune expulsion n'a lieu entre le 1er novembre "
      + "et le 31 mars, quelle que soit la date du jugement. Accélérer le "
      + "juge n'est pas remettre des familles dehors en janvier."],
    ["Le relogement avant la rue",
      "Le droit au logement opposable n'est ni supprimé ni restreint, et "
      + "le concours de la force publique reste subordonné à une solution "
      + "d'hébergement lorsque le ménage est de bonne foi. "
      + `L'hébergement d'urgence n'est pas touché : `
      + `<a href="${g.lien("/chiffrage")}">le chiffrage</a> conserve les `
      + "subventions qui le financent."],
    ["Le locataire de bonne foi, saisi tôt",
      "L'accompagnement social est déclenché dès le premier mois "
      + "d'impayé, et non deux ans plus tard. C'est la contrepartie exacte "
      + "de l'accélération, et elle coûte : "
      + `<a href="${g.lien("/chiffrage")}">le chiffrage</a> l'estime, avec `
      + "les juges que demande le délai, sur des hypothèses qu'il écrit."],
  ])}
  <p>Reste une part d'objection qui tient, et que nous ne pouvons pas dissoudre :
  un jugement plus rapide rendra quelques expulsions plus rapides aussi. Nous
  le pensons préférable à un droit qui protège si mal qu'il pousse les
  bailleurs à ne louer qu'aux dossiers déjà solides — c'est-à-dire à exclure du
  marché, en amont et sans juge, ceux que la procédure prétend protéger.</p>
  <p class="source">${sources(d, "delai_decision_bail")}</p>`,
    "treve-dalo")}
`;

  return `
${g.affiche(
    "Deuxième chantier",
    "Louer",
    "Le droit du bail français protège le locataire en place, et lui seul. "
    + "Celui qui cherche — le jeune, le mobile, le précaire — affronte la même "
    + "rareté et une sélection qui se durcit. La liberté du loyer et la "
    + "certitude du paiement vont ensemble : l'une sans l'autre est un marché "
    + "de dupes.",
  )}
${g.plan(corps, "/louer")}
${corps}
${suite("/aider", "Troisième chantier : aider")}
`;
}

// -- la page Aider -----------------------------------------------------------

function pageAider(d) {
  const moyenne = (n(d, "allocations_logement") * 1000)
    / (n(d, "menages_aides") * 12);

  const corps = `
${g.cle("Où va une aide au logement ?",
    "Dans le loyer, pour l'essentiel : la dernière grande extension des aides "
    + "françaises a vu "
    + `${vc(d, "apl_capture", 0)} du supplément d'aide passer dans le prix.`,
    `<p>Le mécanisme est simple et n'a rien d'idéologique. Une aide qui se
  calcule sur le loyer réellement payé augmente ce que le locataire peut
  offrir ; là où l'offre ne peut pas augmenter — parce qu'on ne construit pas —,
  c'est le prix qui monte. Gabrielle Fack, mesurant l'extension des aides des
  années 1990, trouve que ${vc(d, "apl_capture", 0)} de l'aide supplémentaire
  s'est retrouvée dans le loyer, sans amélioration observée de la qualité des
  logements. Les travaux postérieurs situent la fourchette entre
  ${v(d, "apl_capture_plancher")} et ${v(d, "apl_capture")}, d'autant plus
  haute que l'offre est rigide.</p>
  <p>Deux réserves, et nous les portons nous-mêmes. Cette mesure porte sur une
  réforme des années 1990, dans un marché qui n'est plus tout à fait le nôtre ;
  et elle mesure l'effet d'une <em>hausse</em> d'aide, dont on ne peut pas
  déduire mécaniquement l'effet symétrique d'une baisse. Ce qu'elle établit
  solidement est le mécanisme — une aide indexée sur le loyer pousse le loyer —
  et c'est de ce mécanisme, non du chiffre, que la proposition se déduit.</p>
  <p>Ce résultat ne dit pas qu'il faut cesser d'aider. Il dit que l'aide doit
  cesser d'être <em>indexée sur le loyer</em> : c'est ce lien qui la fait
  remonter dans le prix, et c'est le seul point que la proposition change.</p>
  <p>Une seconde mesure française l'a confirmé depuis, et elle est plus utile
  encore parce qu'elle dit <em>quand</em> le mécanisme joue. Céline
  Grislain-Letrémy et Corentin Trevien, à la
  <a href="https://publications.banque-france.fr/limpact-long-terme-des-aides-au-logement-sur-le-secteur-locatif-lexemple-francais">Banque
  de France</a>, suivent les deux décennies qui ont suivi les réformes des
  années 1990 : les aides ont poussé les loyers à la hausse durablement, y
  compris pour les locataires qui n'en touchaient pas, sans amélioration de la
  qualité. Mais pas partout de la même façon. Sur les petits logements — une et
  deux pièces —, la hausse des loyers s'est arrêtée à la fin des années 1990,
  et le nombre de ces logements a augmenté, constructions neuves comprises. Sur
  les grands, l'offre n'a pas suivi et les loyers ont continué de monter.</p>
  <p>C'est notre thèse entière, écrite par une banque centrale :
  <strong class="cle-texte">une aide ne finit dans le prix que là où l'offre ne
  peut pas répondre</strong>. Là où elle le peut, elle finit en logements. Toute
  la question est donc de savoir si l'on a le droit de construire — et c'est
  pourquoi le <a href="${g.lien("/construire")}">premier chantier</a> commande
  celui-ci.</p>`,
    sources(d, "apl_capture", "apl_capture_plancher"), "capture")}

${g.depliant("Ce que l'État verse, et à qui",
    `<p>${vc(d, "allocations_logement")} d'aides personnelles — ${g.terme("APL")},
  ALS, ALF — vont à ${vc(d, "menages_aides")} de ménages, soit environ
  ${euros(moyenne)} par mois et par ménage aidé. D'autres prestations
  sociales du logement — l'aide sociale à l'hébergement des personnes âgées ou
  handicapées, les ${g.terme("fonds de solidarité logement", "FSL")}, le chèque
  énergie — portent le total à ${v(d, "prestations_sociales")}. S'y ajoutent
  ${v(d, "subventions")} d'${g.terme("aide à la pierre")},
  ${v(d, "bonifications")} de bonifications de taux, et
  ${v(d, "depenses_fiscales")} de ${g.terme("dépense fiscale")} — taux réduit de
  TVA sur l'entretien, réductions d'impôt pour investissement locatif,
  exonérations diverses.</p>
  <p>Soit ${vc(d, "aides_totales_2024")} en ${an(d, "aides_totales_2024")},
  répartis entre une douzaine de dispositifs qui n'ont ni le même guichet, ni
  les mêmes conditions, ni la même administration — et dont l'un des deux plus
  coûteux, la dépense fiscale, ne figure dans aucun budget voté ligne à
  ligne.</p>
  <p class="source">${sources(d, "allocations_logement",
    "prestations_sociales", "menages_aides", "depenses_fiscales")}</p>`, "verse")}

${g.depliant("Le logement social : un parc qui ne circule pas",
    `<p>${vc(d, "parc_social")} de logements, un ménage sur six, un loyer moyen
  de ${v(d, "loyer_social")} — moitié moins que dans le parc privé des grandes
  villes. C'est un patrimoine considérable, et il est mal employé pour une
  raison précise : il ne circule pas.</p>
  <p>${v(d, "parc_social_entrees")} y sont entrés en
  ${an(d, "parc_social_entrees")}, ${v(d, "parc_social_demolitions")} ont été
  démolis, ${v(d, "parc_social_ventes")} vendus. Les attributions ont été
  ${nombre(n(d, "attributions_hlm"), 0)} en ${an(d, "attributions_hlm")}, pour
  ${v(d, "demandes_hlm")} de ménages en attente — dont
  ${v(d, "demandes_hlm_mutation", 0)} déjà logés dans le parc et qui demandent
  à en changer. En Île-de-France, une attribution pour
  ${v(d, "tension_idf", 0)}, et un délai médian de
  ${v(d, "delai_hlm_idf", 0)}. Le ${g.terme("droit au maintien dans les lieux")}
  garantit à l'occupant d'y rester quel que soit son revenu ultérieur : le
  surloyer existe, mais il est plafonné, contourné et, dans les quartiers
  prioritaires, inapplicable.</p>
  <p>Le résultat est un tirage au sort décalé dans le temps : ce qui compte
  n'est pas le besoin d'aujourd'hui, mais la date à laquelle on est entré.</p>
  <p class="source">${sources(d, "parc_social", "parc_social_entrees",
    "demandes_hlm", "demandes_hlm_mutation", "delai_hlm_idf",
    "tension_idf")}</p>`,
    "social")}

${proposition("Aider le ménage, jamais le logement", [
    ["Un chèque logement unique",
      "Les aides personnelles, les bonifications de taux et les dépenses "
      + "fiscales du logement fusionnent en une seule prestation, versée au "
      + "ménage sous condition de ressources. Un guichet, une règle, un "
      + "montant qu'on peut calculer soi-même."],
    ["Un montant qui ne dépend pas du loyer payé",
      "C'est le point décisif. Le chèque dépend du revenu, de la taille du "
      + "ménage et de la zone — non du loyer effectif. Un locataire qui "
      + "trouve moins cher garde la différence, au lieu de la perdre en aide. "
      + "L'aide cesse alors d'être un plancher sous les loyers."],
    ["Utilisable pour louer comme pour acheter",
      "Le même chèque sert à payer un loyer ou une mensualité d'emprunt. "
      + "L'État cesse d'avoir une opinion sur le statut d'occupation de "
      + "chacun : un ménage modeste qui préfère acheter n'a aucune raison "
      + "d'être moins aidé que son voisin qui loue."],
    ["Le parc social ouvert par le haut",
      "Au-delà d'un revenu durablement supérieur au plafond, le loyer "
      + "rejoint progressivement celui du marché — le locataire reste chez "
      + "lui, mais cesse d'être subventionné — et l'achat de son logement lui "
      + "est proposé en priorité. L'argent ainsi dégagé finance des "
      + "constructions nouvelles, non des remises de loyer à des ménages qui "
      + "n'en ont plus besoin."],
    ["Une attribution transparente",
      "Points, ancienneté, critères et rang de chaque demandeur sont "
      + "publiés et opposables. Une file d'attente de "
      + `${v(d, "demandes_hlm")} de ménages dont personne ne connaît la règle `
      + "est une machine à défiance. La demande de mutation y est traitée "
      + "comme les autres : un ménage déjà logé qui demande à bouger n'a ni "
      + "priorité ni pénalité du fait qu'il est déjà là."],
  ])}

${g.depliant("L'objection : « vous allez baisser les aides »",
    `<p>Non, et c'est vérifiable. Le <a href="${g.lien("/chiffrage")}">chiffrage</a>
  part du montant moyen versé aujourd'hui — ${euros(moyenne)} par mois et par
  ménage aidé — et laisse le lecteur déplacer le curseur pour voir ce que
  chaque euro au-dessus ou en dessous coûte à l'ensemble. À montant inchangé,
  la réforme dégage une marge, parce qu'elle supprime en même temps les niches
  fiscales et les bonifications de taux, dont le bénéfice est concentré sur les
  ménages les plus aisés.</p>
  <p>Ce qui change n'est donc pas le montant, c'est la règle : une aide qui ne
  suit plus le loyer cesse de le pousser. Le gain n'est pas immédiat — il
  apparaît à mesure que l'offre répond — et il suppose que le premier chantier,
  celui du droit de construire, soit mené en même temps. Une aide forfaitaire
  dans un marché où l'on ne construit toujours pas ne baisserait pas les
  loyers : elle en réduirait seulement l'alimentation publique.</p>`,
    "objection-aides")}
`;

  return `
${g.affiche(
    "Troisième chantier",
    "Aider",
    `${v(d, "aides_totales_2024")} d'aides par an, douze dispositifs, et un `
    + "défaut commun : la plupart se calculent sur le loyer, donc le "
    + "soutiennent. Un chèque au ménage, indépendant du loyer payé, aide "
    + "autant sans nourrir le prix.",
  )}
${g.plan(corps, "/aider")}
${corps}
${suite("/fiscalite", "Quatrième chantier : la fiscalité")}
`;
}

// -- la page Fiscalité -------------------------------------------------------

/** Les deux barèmes de droits de mutation en vigueur, et rien d'autre. */
function optionsTaux(d) {
  const majore = n(d, "dmto_taux");
  return [
    [String(majore), `${nombre(majore, 2)} % — taux relevé, la plupart `
      + "des départements"],
    [String(TAUX_SANS_MAJORATION),
      `${nombre(TAUX_SANS_MAJORATION, 2)} % — taux non relevé`],
  ];
}

/**
 * Le calcul du coût fiscal d'un achat, et le formulaire qui le demande.
 *
 * Le formulaire est en `GET` : la saisie EST l'adresse, un résultat se partage
 * et se recharge. Tant qu'aucun prix n'est saisi, il n'y a pas de résultat —
 * et surtout pas un résultat par défaut qu'on prendrait pour le sien.
 */
function calculetteMutation(d, parametres) {
  const tauxDefaut = String(n(d, "dmto_taux"));
  const prixSaisi = parametres.prix ?? "";
  const taux = parametres.taux ?? tauxDefaut;
  const primo = parametres.primo === "oui";

  const formulaire = `
<form class="creme simulateur-court" method="get" action="${g.route("/fiscalite")}">
  <div class="tete">
    <h2 class="serif">Ce que l'État prend quand vous déménagez</h2>
    <span class="etiquette">Le calcul</span>
  </div>
  <div class="grille">
    ${g.champ("prix", "Prix du logement", String(prixSaisi), "en euros, hors frais",
    "number", { min: "1000", max: "20000000", step: "1000", inputmode: "numeric" })}
    ${g.liste("taux", "Taux du département", optionsTaux(d), taux,
    "le vôtre est sur votre avis de taxe foncière")}
    ${g.liste("primo", "Premier achat de votre résidence principale",
    [["non", "Non"], ["oui", "Oui"]], primo ? "oui" : "non",
    `exonéré de la majoration sous ${euros(SEUIL_PRIMO)}`)}
    <div class="action"><button type="submit">Calculer →</button></div>
  </div>
  <p class="discret" style="margin:0.9rem 0 0">Le calcul se fait dans votre
  navigateur ; rien n'est envoyé. Il porte sur l'impôt seul — les émoluments du
  notaire, qui rémunèrent un travail, n'en sont pas.</p>
</form>`;

  const prix = Number(String(prixSaisi).replace(/\s/g, ""));
  if (!prixSaisi || !Number.isFinite(prix) || prix <= 0) {
    return formulaire;
  }

  const calcul = coutMutation(prix, Number(taux), primo);
  const detail = g.tableau(
    ["Poste", "Montant"],
    [
      [`Droits de mutation, ${nombre(calcul.taux, 2)} %`
        + (calcul.exoneree > 0
          ? ` (majoration non due sous ${euros(SEUIL_PRIMO)})` : ""),
      euros(calcul.droits)],
      ["Contribution de sécurité immobilière, 0,10 %", euros(calcul.csi)],
      ["<strong>Impôt total</strong>", `<strong>${euros(calcul.total)}</strong>`],
    ],
    ["", "nombre"],
    `Pour un achat de ${euros(prix)}`,
    true,
  );

  return `${formulaire}
<section class="carte" id="resultat-mutation" tabindex="-1">
  <p class="badge">Résultat</p>
  <h3>Acheter à ${euros(prix)} coûte ${euros(calcul.total)} d'impôt,
  soit ${nombre(calcul.part, 2)} % du prix.</h3>
  ${detail}
  <p>Cet impôt est dû à chaque mutation : deux ménages qui échangeraient
  leurs logements le paieraient deux fois, pour un parc inchangé. Il frappe
  donc le déménagement — la mutation professionnelle, la séparation, le
  départ en retraite vers plus petit — et non la détention.
  ${vc(d, "dmto")} par an sont prélevés de cette façon.</p>
  <p class="source">${sources(d, "dmto_taux", "dmto")}</p>
</section>`;
}

function pageFiscalite(d, parametres) {
  // La marge que le chiffrage dégage, aux réglages du lecteur, une fois
  // payées les lignes qu'il estime : c'est sur elle que se paierait le
  // maintien d'une niche. Dire si elle y suffit se calcule ; l'écrire en dur,
  // c'est promettre une phrase que la prochaine mise à jour des données rendra
  // fausse sans que rien ne le signale.
  const bilan = chiffrage(d, reglagesChiffrage(d, parametres));
  const solde = soldeDuLogement(d);
  const travaux = n(d, "tva_travaux_taux_reduit");
  const social = n(d, "niches_secteur_social");
  const SUFFIRE = {
    toujours: "qui y suffit",
    parfois: "qui n'y suffit que dans le haut de sa fourchette",
    jamais: "qui n'y suffit pas",
  };
  const suffitTravaux = SUFFIRE[tientDans(bilan, travaux)];
  const seul = tientDans(bilan, social);
  const avecTravaux = tientDans(bilan, social + travaux);
  let suffitSocial = SUFFIRE[seul];
  if (avecTravaux === "toujours") {
    suffitSocial = "qui y suffit, même avec le taux réduit des travaux";
  } else if (seul !== "jamais") {
    suffitSocial += avecTravaux === "jamais"
      ? ", mais pas en même temps qu'au taux réduit des travaux"
      : ", et avec le taux réduit des travaux dans le haut de sa fourchette "
        + "seulement";
  }

  const corps = `
${g.depliant("Ce que le logement rapporte",
    `<p>${vc(d, "prelevements")} en ${an(d, "prelevements")} :
  ${v(d, "prelevements_part_pib")} du produit intérieur brut,
  ${v(d, "prelevements_part_po")} de tous les prélèvements obligatoires du pays.
  L'essentiel tient en trois lignes — ${v(d, "taxe_fonciere")} de
  ${g.terme("taxe foncière")} sur le bâti, ${v(d, "tva_logement")} de TVA sur
  le neuf, les travaux et les services, ${v(d, "dmto")} de
  ${g.terme("DMTO")} — auxquelles s'ajoutent la TVA et les taxes sur l'énergie
  consommée dans le logement, les impôts sur les revenus locatifs et les
  plus-values.</p>
  <p>En face, ${v(d, "aides_totales_2024")} d'aides, dont
  ${v(d, "depenses_fiscales")} de niches fiscales — des impôts auxquels on
  renonce, et qui sont déjà absents des prélèvements : tout compté une fois, le
  logement rapporte ${vc(d, "solde_public", 1)} net aux administrations. Il n'est
  pas un secteur subventionné : c'est l'une des principales assiettes fiscales
  du pays.</p>
  <p class="source">${sources(d, "prelevements", "taxe_fonciere", "dmto",
    "prelevements_part_pib", "prelevements_part_po")}</p>`,
    "rapporte")}

${g.depliant("L'objection : « vous oubliez les loyers imputés »",
    `<p>Elle vient des économistes, elle est fondée, et nous la posons
  nous-mêmes plutôt que de l'attendre. Un propriétaire qui occupe son logement
  perçoit un revenu qu'il ne déclare pas : le loyer qu'il n'a pas à payer. Ce
  ${g.terme("loyer imputé")} n'est pas imposé, et cette non-imposition est une
  aide publique aux propriétaires — la première de toutes, et elle ne figure
  dans aucun compte des aides au logement. L'Insee l'estime à
  ${vc(d, "loyers_imputes_cout")} par an.</p>
  <p>Alors refaisons le calcul avec. La non-imposition du loyer imputé est un
  impôt auquel on renonce, comme une niche fiscale : la compter parmi les
  aides, c'est la compter aussi dans l'impôt dû. Aides et avantage réunis :
  ${milliards(n(d, "aides_totales_2024") + n(d, "loyers_imputes_cout"))} ;
  impôt dû, niches et loyers imputés compris :
  ${milliards(solde.du + n(d, "loyers_imputes_cout"))}. Le rapport tombe de
  ${nombre(solde.rapportBrut, 1)} à
  <strong class="cle-texte">${nombre(solde.rapportLoyers, 1)}</strong>. Il ne
  s'inverse pas, et la phrase que nous défendons tient : le logement reste, et
  de loin, un secteur plus taxé qu'aidé. Ce qu'il rapporte net aux
  administrations, lui, ne bouge pas : ${v(d, "solde_public", 1)}, puisque
  cet impôt n'a jamais été perçu et qu'il n'y a rien à en retrancher.</p>
  <p>Nous avions d'abord fait ce calcul de travers, en retranchant l'avantage
  d'un solde qui ne l'avait jamais contenu : le rapport tombait alors à
  ${nombre(solde.ancienRapportLoyers, 1)}. L'erreur, la même que pour les
  niches, est corrigée et expliquée à la page
  <a href="${g.lien("/constat")}">Constat</a>.</p>
  <p>Que proposons-nous d'en faire ? Rien. Imposer un revenu que personne ne
  perçoit en argent est une idée cohérente sur le papier et intenable en
  pratique : elle demanderait à un retraité propriétaire sans liquidités de
  payer l'impôt d'un loyer qu'il ne touche pas. Nous ne le proposons pas, et
  nous ne le proposerons pas.</p>
  <p>Reste ce que l'objection établit vraiment, et qui nous donne raison :
  l'avantage d'être propriétaire est considérable, et il est réservé à ceux qui
  le sont déjà — les ménages âgés et aisés, dit l'étude. La réponse libérale
  n'est pas de le confisquer, c'est de l'ouvrir : un chèque qui paie une
  mensualité aussi bien qu'un loyer, un déménagement qui cesse d'être taxé, et
  des logements qu'on a le droit de construire.</p>
  <p class="source">${sources(d, "loyers_imputes_cout", "prelevements",
    "solde_public")}</p>`, "loyers-imputes")}

${g.depliant("Les droits de mutation taxent le mouvement",
    `<p>Un impôt se juge à ce qu'il décourage. Les ${g.terme("DMTO")}
  découragent le déménagement : ils sont dus à chaque changement de
  propriétaire, et ne dépendent ni du revenu, ni du patrimoine, ni de la
  plus-value réalisée. Le salarié qui suit son emploi à trois cents kilomètres,
  le couple qui se sépare, le retraité qui veut un logement plus petit et moins
  cher à chauffer paient tous le même ticket.</p>
  <p>Le taux atteint ${vc(d, "dmto_taux", 2)} dans la grande majorité des
  départements, qui ont porté leur part de 4,50 à 5,00&nbsp;% comme la loi de
  finances pour 2025 le permettait, du 1er avril 2025 au 31 mars 2028 ; il
  reste à ${nombre(TAUX_SANS_MAJORATION, 2)}&nbsp;% dans les autres. Les primo-accédants en sont exonérés sur la fraction du prix
  inférieure à ${euros(SEUIL_PRIMO)}.</p>
  <p>Une économie où l'on ne déménage pas est une économie où l'on accepte de
  moins bons emplois, où les logements sont moins bien occupés — des personnes
  seules dans de grands logements, des familles à l'étroit —, et où le parc
  existant sert moins bien qu'il ne le pourrait. C'est un coût invisible, et
  il est considérable.</p>`, "mutation")}

${calculetteMutation(d, parametres)}

${g.depliant("La taxe foncière repose sur des valeurs de 1970",
    `<p>La ${g.terme("taxe foncière")} est assise sur la valeur locative
  cadastrale : une valeur administrative établie en 1970, revalorisée depuis
  par coefficients uniformes. Un demi-siècle de transformations urbaines n'y
  figure pas. Deux logements de même valeur réelle peuvent être imposés du
  simple au double selon que leur quartier s'est embourgeoisé ou dégradé
  depuis — et c'est presque toujours le second qui paie le plus.</p>
  <p>La révision des valeurs locatives des locaux d'habitation est votée depuis
  des années, et reportée d'autant. C'est le préalable de toute réforme qui
  déplacerait le poids de la mutation vers la détention : on ne peut pas
  renforcer un impôt dont l'assiette est fausse.</p>`, "fonciere")}

${g.cle("Une niche française, évaluée par l'État",
    "Le dispositif Pinel a été évalué en 2019 par l'Inspection générale des "
    + "finances. Sur chaque euro de réduction d'impôt accordé, "
    + `<strong class="cle-texte">${v(d, "pinel_part_loyer")}</strong> `
    + "seulement se retrouvent dans une baisse de loyer pour le locataire.",
    `<p>C'est la vérification française de tout ce qui précède, et elle ne vient
  pas de nous : « Seuls ${nombre(n(d, "pinel_part_loyer"), 1)}&nbsp;% du
  montant accordé par l'État au titre de la réduction d'impôt se traduisent par
  des baisses de loyer », écrit la mission —
  ${vc(d, "pinel_economie_loyer", 0)} d'économies de loyer sur neuf ans, pour
  ${vc(d, "pinel_cout_neuf_ans", 0)} de coût public. Les neuf dixièmes
  de la dépense vont ailleurs : au promoteur, au vendeur du terrain, à
  l'investisseur. Une niche destinée à loger moins cher loge à peine moins
  cher, et finance surtout le prix du bien qu'elle vise.</p>
  <p><strong>Mais le même rapport porte l'objection la plus sérieuse qu'on
  puisse nous faire</strong>, et nous ne la contournerons pas. Le Pinel est
  aussi un déclencheur : ${vc(d, "pinel_part_vefa", 0)} des ventes en l'état
  futur d'achèvement le mobilisent, et il est la motivation principale de
  quatre investisseurs sur cinq. La mission en conclut qu'il faut le faire
  évoluer <em>plutôt que le supprimer</em>, une suppression risquant
  « des perturbations dans la capacité de construction d'une ampleur et d'une
  durée difficile à anticiper ». C'est un rapport officiel qui recommande
  l'inverse de ce que nous proposons.</p>
  <p>Notre réponse tient en un point, et il est vérifiable. Ce que la mission
  craint est la suppression de la niche <em>toutes choses égales par
  ailleurs</em> — c'est-à-dire dans le monde où construire reste interdit. Dans
  ce monde-là, elle a raison : retirer la béquille sans réparer la jambe fait
  tomber. Notre proposition ne supprime pas la niche toutes choses égales par
  ailleurs ; elle la supprime en même temps qu'elle ouvre le droit de
  construire, et l'ordre compte. Le <a href="${g.lien("/chiffrage")}">
  chiffrage</a> le dit déjà des aides ; il vaut ici mot pour mot.</p>
  <p>Il reste que cet ordre est une promesse, et qu'une promesse de
  simultanéité est ce qu'un législateur tient le moins bien. Si le droit des
  sols ne s'ouvrait pas, la suppression des niches devrait être différée : nous
  l'écrivons ici pour qu'on puisse nous le rappeler.</p>`,
    sources(d, "pinel_part_loyer", "pinel_economie_loyer",
      "pinel_cout_neuf_ans", "pinel_part_vefa"), "pinel")}

${proposition("Cesser de taxer le mouvement, commencer à taxer juste", [
    ["La suppression des droits de mutation",
      `Les ${v(d, "dmto")} de droits de mutation sont supprimés. Déménager `
      + "redevient un acte neutre fiscalement, pour le locataire comme pour "
      + "le propriétaire."],
    ["La révision des valeurs locatives, enfin menée",
      "L'assiette de la taxe foncière est refaite sur les loyers constatés, "
      + "puis actualisée automatiquement. Sans elle, tout report vers la "
      + "détention reproduirait à l'identique l'injustice de 1970."],
    ["La compensation des départements",
      "Les droits de mutation financent les départements, et leur "
      + "suppression ne peut pas être un transfert de charge déguisé. Elle "
      + "est compensée à l'euro, par une dotation nationale financée sur la "
      + "suppression des niches — le "
      + `<a href="${g.lien("/chiffrage")}">chiffrage</a> montre que le `
      + "montant y est. La révision des valeurs locatives ne sert pas à "
      + "cette compensation et n'augmente pas le produit de la taxe "
      + "foncière : elle en redistribue la charge à rendement inchangé. "
      + "Toute autre rédaction reviendrait à financer la baisse d'un impôt "
      + "par la hausse d'un autre, et nous ne le proposons pas."],
    ["La fin des niches de l'investissement locatif",
      `Les ${v(d, "depenses_fiscales")} de dépenses fiscales sont supprimées `
      + "et versés au chèque logement : "
      + `${v(d, "niches_investissement_locatif")} de dispositifs `
      + `d'investissement locatif, ${v(d, "tva_travaux_taux_reduit")} de TVA `
      + "à taux réduit sur les travaux, et les exonérations diverses. Une "
      + "niche subventionne un montage, jamais un besoin ; elle enrichit qui "
      + "sait l'utiliser, et se retrouve dans le prix du bien qu'elle vise. "
      + "Le taux réduit sur les travaux est le cas le plus discutable, et il "
      + "est traité plus bas."],
    ["La neutralité entre les statuts",
      "Louer nu, louer meublé, habiter son logement, le laisser vide : "
      + "quatre situations aujourd'hui imposées selon quatre régimes "
      + "différents, ce qui produit des arbitrages fiscaux plutôt que des "
      + "logements. Un régime unique des revenus fonciers les remplace."],
  ])}

${g.depliant("L'objection : « qui perd ? »",
    `<p>Toute réforme qui redéploie ${v(d, "aides_totales_2024")} fait des
  perdants. Les taire serait la meilleure façon de se les voir présenter par
  d'autres, et dans le désordre. Les voici, nommés.</p>
  ${g.points([
    ["Les bénéficiaires des dispositifs d'investissement locatif",
      `${v(d, "niches_investissement_locatif")} de réductions d'impôt `
      + "disparaissent. Elles vont aux ménages les plus imposés ; leur "
      + "suppression est assumée, et c'est le seul cas où le mot "
      + "« perdant » ne nous embarrasse pas. Les engagements de location "
      + "déjà pris vont à leur terme : la loi ne défait pas ce qu'elle a "
      + "promis, et c'est pourquoi l'économie n'est pleine qu'après "
      + "plusieurs exercices."],
    ["Les propriétaires qui font des travaux",
      `${v(d, "tva_travaux_taux_reduit")} de TVA à taux réduit sur `
      + "l'entretien, c'est le taux normal qui revient sur une toiture ou "
      + "une chaudière. Le perdant n'est pas un investisseur : c'est un "
      + "propriétaire ordinaire, souvent modeste, parfois âgé. Deux "
      + "réponses, et aucune n'est la négation du problème. Le chèque "
      + "logement est utilisable par un propriétaire occupant, ce que "
      + "l'APL n'est pas. Et si le Parlement juge le taux réduit "
      + "nécessaire — parce qu'il tient aussi le travail déclaré dans le "
      + "bâtiment —, le maintenir coûte "
      + `${v(d, "tva_travaux_taux_reduit")} sur la marge que le `
      + `<a href="${g.lien("/chiffrage")}">chiffrage</a> laisse une fois ses `
      + `estimations payées, ${suffitTravaux}. `
      + "C'est un arbitrage, pas un impensé."],
    ["Le logement social",
      "C'est le plus lourd des perdants, et ce n'est pas un ménage. Les "
      + "dépenses fiscales supprimées comprennent "
      + `${v(d, "niches_secteur_social")} d'avantages au secteur locatif `
      + "social — TVA à taux réduit sur la construction, exonération de "
      + "longue durée de taxe foncière, exonération d'impôt sur les sociétés "
      + "des organismes HLM. Les bonifications supprimées lui retirent en "
      + `outre ${v(d, "bonifications_bailleurs_sociaux")} d'avantages de `
      + "taux sur ses prêts. Les subventions à la pierre, conservées, ne les "
      + "remplacent pas : elles s'y ajoutaient. Construire et gérer un "
      + "logement social coûtera donc plus cher. La proposition les supprime "
      + "avec les autres ; si le Parlement jugeait les avantages fiscaux "
      + "nécessaires, les maintenir coûterait "
      + `${v(d, "niches_secteur_social")} sur la marge que le `
      + `<a href="${g.lien("/chiffrage")}">chiffrage</a> laisse une fois ses `
      + `estimations payées, ${suffitSocial}.`],
    ["Les locataires protégés par l'encadrement des loyers",
      `Environ ${v(d, "encadrement_gain_mensuel", 0)} par mois à Paris — `
      + `${nombre(Math.abs(n(d, "encadrement_effet")), 1)} % de modération `
      + "de la hausse — cessent "
      + "de leur être transférés. Ils sont les perdants les plus immédiats "
      + "et les plus "
      + "visibles de la réforme. Leur bail en cours n'est pas touché ; le "
      + "chèque logement prend le relais pour ceux dont le revenu est "
      + "modeste ; et l'offre supplémentaire est ce qui doit faire le "
      + "reste — plus lentement qu'un plafond, et plus durablement."],
    ["Les primo-accédants au prêt à taux zéro",
      `Les ${v(d, "bonifications")} de bonifications de taux incluent le `
      + "prêt à taux zéro, qui disparaît. En face, l'achat cesse d'être "
      + `taxé (${v(d, "dmto")}) et le chèque logement peut payer une `
      + "mensualité d'emprunt, ce qu'aucune aide ne permet aujourd'hui. "
      + "Pour un primo-accédant, le solde des trois mesures est "
      + "favorable dans la plupart des configurations — mais « la "
      + "plupart » n'est pas « toutes », et c'est encore une chose que "
      + "seule une microsimulation tranchera."],
    ["Les départements, si la compensation faiblit",
      "Une dotation compensatrice se vote chaque année, et l'histoire des "
      + "compensations françaises invite à la méfiance. La nôtre doit être "
      + "indexée et inscrite en loi organique, faute de quoi la "
      + "suppression des droits de mutation deviendrait, en cinq ans, un "
      + "transfert de charge de plus."],
  ])}
  <p class="source">${sources(d, "niches_investissement_locatif",
    "tva_travaux_taux_reduit", "niches_secteur_social",
    "bonifications_bailleurs_sociaux", "encadrement_effet",
    "bonifications")}</p>`,
    "qui-perd")}
`;

  return `
${g.affiche(
    "Quatrième chantier",
    "Fiscalité",
    `Le logement rapporte ${v(d, "prelevements")} par an à l'État et aux `
    + `collectivités, et en reçoit ${v(d, "aides_totales_2024")}. Le problème `
    + "n'est pas le niveau : c'est l'assiette. On taxe le déménagement, on "
    + "subventionne le montage, et l'impôt sur la détention repose sur des "
    + "valeurs établies en 1970.",
  )}
${g.plan(corps, "/fiscalite")}
${corps}
${suite("/chiffrage", "Ce que tout cela coûte")}
`;
}

// -- la page Chiffrage -------------------------------------------------------

/** Les réglages du chiffrage, lus dans l'adresse et bornés. */
function reglagesChiffrage(d, parametres) {
  const { actuelle } = bornesCheque(d, n(d, "menages_aides"));
  const brut = Number(parametres.cheque);
  const cheque = Number.isFinite(brut) && brut >= 0 && brut <= 1000
    ? Math.round(brut)
    : Math.round(actuelle);
  const parts = { "100": 1.0, "50": 0.5, "0": 0.0 };
  return {
    chequeMensuel: cheque,
    menages: n(d, "menages_aides"),
    supprimerDmto: parametres.dmto !== "non",
    partSubventions: parts[parametres.pierre] ?? 1.0,
    actuelle,
  };
}

function formulaireChiffrage(d, reglages) {
  return `
<form class="creme simulateur-court" method="get" action="${g.route("/chiffrage")}">
  <div class="tete">
    <h2 class="serif">Déplacez les hypothèses</h2>
    <span class="etiquette">Le chiffrage</span>
  </div>
  <div class="grille">
    ${g.champ("cheque", "Chèque logement mensuel",
    String(reglages.chequeMensuel), `moyenne versée aujourd'hui : `
    + `${euros(reglages.actuelle)}`, "number",
    { min: "0", max: "1000", step: "10", inputmode: "numeric" })}
    ${g.liste("dmto", "Supprimer les droits de mutation",
    [["oui", "Oui"], ["non", "Non"]], reglages.supprimerDmto ? "oui" : "non",
    `${v(d, "dmto")} de recettes en moins`)}
    ${g.liste("pierre", "Subventions à la pierre conservées",
    [["100", "En totalité"], ["50", "La moitié"], ["0", "Aucune"]],
    String(Math.round(reglages.partSubventions * 100)),
    "logement social, rénovation, hébergement")}
    <div class="action"><button type="submit">Recalculer →</button></div>
  </div>
</form>`;
}

function cascadeChiffrage(d, bilan) {
  const marches = [
    new g.Marche("Aides supprimées", bilan.remplacees, true, "var(--actuel)",
      `Aides personnelles — APL, ALS, ALF — (${milliards(bilan.allocations)}), `
      + `bonifications de taux (${milliards(bilan.bonifications)}) et `
      + `dépenses fiscales (${milliards(bilan.niches)}).`),
  ];
  if (bilan.subventionsRendues > 0) {
    marches.push(new g.Marche("Subventions à la pierre rendues",
      bilan.subventionsRendues, false, "var(--reste)",
      "La part des aides à la pierre que la réforme ne conserve pas."));
  }
  marches.push(new g.Marche("Chèque logement", -bilan.cheque, false,
    "var(--manque)",
    `${euros(bilan.cheque * 1000 / (n(d, "menages_aides") * 12))} par mois `
    + `et par ménage aidé, pour ${v(d, "menages_aides")} de ménages.`));
  if (bilan.perteDmto > 0) {
    marches.push(new g.Marche("Droits de mutation supprimés", -bilan.perteDmto,
      false, "var(--manque)", "Une recette qui disparaît."));
  }
  marches.push(new g.Marche(
    bilan.solde >= 0 ? "Marge annuelle" : "À financer",
    bilan.solde, true, bilan.solde >= 0 ? "var(--reste)" : "var(--manque)",
    "Ce qui reste une fois la réforme entièrement en place."));
  return g.cascade("Le compte de la réforme, en milliards d'euros par an",
    marches, "Md€", 1, 0, "Poste");
}

/**
 * Les petits nombres s'écrivent en lettres dans une phrase. Au féminin : on y
 * compte des lignes et des mesures.
 */
const EN_LETTRES = Object.freeze([
  "aucune", "une", "deux", "trois", "quatre", "cinq", "six", "sept", "huit",
  "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf", "vingt",
]);

/** Une liste en français : « a », « a et b », « a, b et c ». */
function enumeration(mots) {
  return mots.length > 1
    ? `${mots.slice(0, -1).join(", ")} et ${mots[mots.length - 1]}`
    : (mots[0] ?? "");
}

/** La première lettre en capitale : une énumération qui ouvre une phrase. */
function capitale(texte) {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

function enLettres(entier, capitale = false) {
  const mot = EN_LETTRES[entier] ?? String(entier);
  return capitale ? mot.charAt(0).toUpperCase() + mot.slice(1) : mot;
}

/**
 * Une ligne du compte mesure par mesure : ce que la mesure est et pourquoi son
 * chiffre est ce qu'il est, ce qui existe aujourd'hui, ce que le programme met
 * à la place, et l'effet sur le compte.
 *
 * `effet` est un montant, zéro, une estimation — deux bornes, que le calcul
 * rend —, ou `null` : l'aveu qu'on ne sait pas le chiffrer, que la ligne écrit
 * alors en toutes lettres. `nature` range la ligne pour la phrase qui résume le
 * tableau : `compte` porte de l'argent, `regle` change une règle, `garde`
 * conserve une dépense telle qu'elle est, `transfert` fait passer de l'argent
 * d'une administration à une autre sans changer le total, `estime` est estimé
 * sur des hypothèses que la ligne écrit, `inconnu` n'est pas chiffré.
 */
function ligneDuCompte(nom, pourquoi, aujourdhui, programme, effet, nature) {
  return { nom, pourquoi, aujourdhui, programme, effet, nature };
}

/**
 * La ligne d'un poste calculé : son effet vient du calcul, et un poste que les
 * réglages laissent intact — des droits de mutation maintenus, des
 * subventions gardées — est une dépense conservée, non une ligne du compte.
 */
function ligneDuPoste(poste, nom, pourquoi, aujourdhui, programme) {
  return ligneDuCompte(nom, pourquoi, aujourdhui, programme, poste.effet,
    poste.effet === 0 ? "garde" : "compte");
}

/** L'effet tel qu'il s'écrit dans la colonne, teinté selon son sens. */
function celluleEffet(effet, plusGrand) {
  if (effet === null) {
    return '<span class="discret">non chiffré</span>';
  }
  if (typeof effet === "object") {
    return new g.Cellule(`<span class="estime">${fourchette(effet)}</span>`,
      (effet.bas + effet.haut) / 2 / plusGrand / 2);
  }
  if (effet === 0) {
    return nombre(effet, 0);
  }
  return new g.Cellule(g.signeCascade(effet, 1), effet / plusGrand);
}

/**
 * Une estimation telle qu'elle s'écrit : « ≈ −0,9 » quand elle n'a qu'une
 * valeur, « −0,1 à −0,9 » quand elle a deux bornes — de la plus petite à la
 * plus grande en valeur absolue, comme on dit « de cent à neuf cents millions ».
 * Le signe reste celui du compte : − pour ce qui coûte.
 */
function fourchette({ bas, haut }) {
  const [a, b] = [bas, haut].map((valeur) => g.signeCascade(valeur, 1));
  if (a === b) {
    return `≈&nbsp;${a}`;
  }
  return haut <= 0 ? `${b} à ${a}` : `${a} à ${b}`;
}

/**
 * La même dans une phrase, suivie de son unité : « de l'ordre de » devant une
 * valeur seule, rien devant une fourchette, qui dit déjà qu'elle est une
 * estimation.
 */
function fourchetteEnMots(bas, haut) {
  const texte = fourchette({ bas, haut });
  return texte.startsWith("≈")
    ? `l'ordre de ${texte.replace("≈&nbsp;", "")} Md€`
    : `${texte} Md€`;
}

/**
 * Un coût estimé dans une phrase, sans signe : « de tant à tant », ou une
 * seule valeur quand ses deux bornes s'écrivent pareil.
 */
function entre(a, b) {
  const [petit, grand] = [Math.min(a, b), Math.max(a, b)];
  return nombre(petit, 1) === nombre(grand, 1)
    ? milliards(grand)
    : `de ${nombre(petit, 1)} à ${milliards(grand)}`;
}

/**
 * Ce qu'un emploi de la marge devient face au solde qui compte les
 * estimations : il y tient quelle que soit l'estimation, dans le haut de la
 * fourchette seulement, ou jamais. La phrase qui le dit se calcule : écrite en
 * dur, elle deviendrait fausse à la première mise à jour des agrégats.
 */
function tientDans(bilan, montant) {
  if (bilan.soldeBas >= montant) {
    return "toujours";
  }
  return bilan.soldeHaut >= montant ? "parfois" : "jamais";
}

/**
 * Le programme mesure par mesure, face à aujourd'hui.
 *
 * C'est la question que pose tout lecteur d'un chiffrage — qu'est-ce qui
 * change, et de combien ? —, et la cascade n'y répondait qu'à moitié : elle ne
 * montre que ce qui bouge. Le tableau met chaque proposition des quatre
 * chantiers en face de ce qui existe aujourd'hui, y compris celles qui ne
 * coûtent rien et celles qu'on ne sait pas chiffrer : un compte qui tait ses
 * zéros et ses trous laisse croire qu'il est complet.
 */
function lignesDuCompte(d, bilan, reglages) {
  const poste = (cle) => bilan.postes.find((p) => p.cle === cle);
  const estime = (cle) => bilan.estimations.find((e) => e.cle === cle);
  const menages = v(d, "menages_aides");
  const parMenage = (bilan.cheque * 1000) / (n(d, "menages_aides") * 12);
  const impaye = estime("impaye");
  const clause = estime("clause");
  const garde = reglages.partSubventions === 1 ? "Conservées"
    : (reglages.partSubventions > 0 ? "La moitié conservée" : "Supprimées");

  return [
    new g.Intertitre(`<a href="${g.lien("/construire")}">Construire</a>`),
    ligneDuCompte("Le droit de construire",
      "Un gabarit autorisé de plein droit ; la division, la surélévation et le "
      + `changement d'usage de droit ; la fin du ${g.terme("ZAN")}. Une règle `
      + "change, aucune dépense.",
      `Le ${g.terme("PLU")} plafonne, le ZAN rationne le sol`,
      "Ce qui entre dans le gabarit est autorisé", 0, "regle"),
    ligneDuCompte("Le produit du neuf à la commune qui l'autorise",
      "Un transfert entre administrations, qui ne change pas le total. Chaque "
      + "dixième de cette TVA rendu aux communes coûte "
      + `${milliards(n(d, "tva_neuf") / 10)} à l'État, et leur rapporte autant.`,
      `${v(d, "tva_neuf")} de TVA sur les logements neufs, à l'État ; la `
      + "taxe foncière, déjà à la commune et à l'intercommunalité",
      "Une part de la TVA à la commune, dix ans, avec la taxe foncière",
      0, "transfert"),
    ligneDuCompte("Le recours contre un permis jugé dans un délai fixe",
      `Le délai fixe existe déjà : depuis ${an(d, "recours_delai_legal")}, le `
      + `juge doit statuer en ${v(d, "recours_delai_legal", 0)} sur un permis `
      + "de plus de deux logements, et en zone tendue l'appel est supprimé "
      + "pour les recours introduits jusqu'au 31 décembre 2027. Estimé à zéro, "
      + "en gardant ce délai et en supprimant l'appel partout : il n'y a pas "
      + "de juge à ajouter, et il y en a à libérer. Un délai plus court en "
      + "demanderait : selon le ministère de la Justice, cité par le Sénat, "
      + "les juridictions sont au plafond de ce qu'elles peuvent juger.",
      `${v(d, "recours_delai_legal", 0)} en principe, et un appel hors zone `
      + `tendue ; ${v(d, "recours_duree", 0)} mesurés en `
      + `${an(d, "recours_duree")}`,
      "Une seule instance, un délai fixe", estime("recours"), "estime"),

    new g.Intertitre(`<a href="${g.lien("/louer")}">Louer</a>`),
    ligneDuCompte("La fin de l'encadrement des loyers",
      "Rien pour les comptes publics. Pour un locataire parisien dont le loyer "
      + `est plafonné, environ ${v(d, "encadrement_gain_mensuel", 0)} par mois `
      + "cessent de lui être transférés : il est compté parmi "
      + `<a href="${g.lien("/fiscalite")}">les perdants</a>.`,
      `${v(d, "encadrement_villes", 0)} plafonnent le loyer`,
      "Le loyer se fixe au contrat", 0, "regle"),
    ligneDuCompte("Le diagnostic énergétique, la durée du bail",
      "L'information plutôt que l'interdiction, une durée qui se négocie : deux "
      + "règles, aucune dépense.",
      "Un logement classé G ne se loue plus",
      "Le diagnostic est affiché, la location permise", 0, "regle"),
    ligneDuCompte("Un impayé jugé en trois mois",
      "Avec l'accompagnement social dès le premier mois d'impayé. Estimé en "
      + "offrant à chaque ménage en impayé l'enquête sociale que reçoit "
      + "aujourd'hui une partie des ménages assignés, à son coût d'alors — "
      + `${v(d, "enquetes_sociales_cout", 0)} pour ${v(d, "enquetes_sociales")} `
      + `par an, soit ${euros(impaye.parEnquete)} l'une —, de `
      + `${v(d, "commandements_payer")}, ceux qui reçoivent un commandement de `
      + `payer, à ${v(d, "menages_impayes")}, tous ceux qui connaissent un `
      + "retard dans l'année. Les juges pèsent moins : le contentieux des "
      + "expulsions occupait l'équivalent de "
      + `${v(d, "etp_magistrats_expulsions")} et `
      + `${v(d, "etp_greffiers_expulsions")} à temps plein en `
      + `${an(d, "etp_magistrats_expulsions")}, et en doubler l'effectif `
      + `coûterait ${milliards(impaye.juges, 2)} par an.`,
      `${v(d, "decisions_bail")} en ${an(d, "decisions_bail")}, rendues en `
      + `${v(d, "delai_decision_bail")} en moyenne après l'assignation`,
      "Trois mois, délai fixe ; l'accompagnement dès le premier mois",
      impaye, "estime"),
    ligneDuCompte("Une garantie publique du loyer",
      "Pour tout locataire au revenu modeste ou irrégulier, contre une prime. "
      + "Rien si la prime couvre le risque, comme le programme le veut. Au "
      + "plus, si l'État le portait seul, ce que le Gouvernement estimait en "
      + `${an(d, "gul_besoin")} pour une garantie plus large, qui couvrait `
      + "presque tout le parc privé : "
      + `${milliards(n(d, "gul_besoin") / 1000)} par an.`,
      "Visale, gratuite, payée par Action Logement : "
      + `${v(d, "visale_sinistres", 0)} d'impayés et `
      + `${v(d, "visale_gestion", 0)} de gestion en ${an(d, "visale_sinistres")}`,
      "Une garantie de l'État, payée par une prime", estime("garantie"),
      "estime"),

    new g.Intertitre(`<a href="${g.lien("/aider")}">Aider</a>`),
    ligneDuPoste(poste("allocations"),
      "Les aides personnelles",
      `${g.terme("APL")}, ALS, ALF : le chèque les remplace.`,
      `${v(d, "allocations_logement")} à ${menages} de ménages`,
      "Supprimées"),
    ligneDuPoste(poste("cheque"),
      "Le chèque logement",
      "Au montant choisi dans le formulaire ci-dessus, et indépendant du loyer "
      + "payé.",
      "—",
      `${euros(parMenage)} par mois à ${menages} de ménages`),
    ligneDuCompte("Le chèque ouvert à l'accession",
      "Il paie aussi une mensualité d'emprunt, ce que l'aide personnelle ne "
      + "fait plus depuis 2018. Estimé en ramenant la part des accédants aidés "
      + `à ce qu'elle était en ${an(d, "accedants_aides_2017")}, dernière `
      + "année où l'aide leur était ouverte : "
      + `${v(d, "accedants_aides_2017")} au lieu de ${v(d, "accedants_aides")}, `
      + `soit ${nombre(Math.round(bilan.accedantsNouveaux * 1000) * 1000, 0)} `
      + "ménages de plus au chèque retenu.",
      `${v(d, "accedants_aides")} des ${v(d, "accedants")} de ménages `
      + "accédants sont aidés",
      "Le même chèque pour louer ou pour acheter", estime("accession"),
      "estime"),
    ligneDuPoste(poste("bonifications"),
      "Les bonifications de taux",
      "Le prêt à taux zéro et les prêts aidés, dont "
      + `${v(d, "bonifications_bailleurs_sociaux")} sur les prêts aux `
      + `bailleurs sociaux. L'État n'en paie que ${v(d, "bonifications_etat")} : `
      + "voir les limites, plus bas.",
      `${v(d, "bonifications")} d'intérêts épargnés aux emprunteurs`,
      "Supprimées"),
    ligneDuCompte("La clause de sauvegarde",
      "Aucun ménage sous plafond de ressources ne perçoit moins qu'avant : "
      + "l'écart lui est versé en complément dégressif. Estimé sur la seule "
      + "microsimulation publiée d'une aide qui suit le revenu, la taille du "
      + "ménage et la zone, et non le loyer, faite par l'Institut des "
      + "politiques publiques : à budget constant, ses perdants — "
      + `${v(d, "ipp_perdants", 0)} des ménages — perdent en moyenne `
      + `${v(d, "ipp_perte_moyenne", 0)} ; ses allocataires, les `
      + `${nombre(100 - n(d, "ipp_neutres"), 0)}&nbsp;% qu'elle touche, `
      + `reçoivent en moyenne ${v(d, "ipp_aide_moyenne", 0)}. Les pertes font `
      + `ainsi ${nombre(clause.part * 100, 1)}&nbsp;% de l'enveloppe. C'est le `
      + "coût de la première année ; le complément décroît ensuite, jusqu'à "
      + "s'éteindre. Un chèque plus bas que l'aide moyenne l'augmente de ce "
      + "qu'il retire aux ménages aidés : la clause le leur rend.",
      "—",
      "Un complément à qui perdrait au change", clause, "estime"),
    ligneDuPoste(poste("autres_prestations"),
      "Les autres prestations sociales du logement",
      "L'aide sociale à l'hébergement des personnes âgées ou handicapées, "
      + "l'allocation de logement temporaire, les "
      + `${g.terme("fonds de solidarité logement", "FSL")}, le chèque énergie : `
      + "ce ne sont pas des aides personnelles, et la proposition n'y touche pas.",
      milliards(bilan.autresPrestations),
      "Conservées"),
    ligneDuPoste(poste("pierre"),
      `Les ${g.terme("subventions à la pierre", "aide à la pierre")}`,
      "Versées aux bailleurs sociaux et à qui rénove"
      + (bilan.subventionsRendues > 0
        ? ", et rendues en partie selon le réglage ci-dessus." : "."),
      v(d, "subventions"),
      garde),
    ligneDuCompte("Le parc social ouvert par le haut, l'attribution publiée",
      "Le surloyer revient au bailleur social, non au budget ; publier la règle "
      + "ne coûte rien.",
      `Le ${g.terme("droit au maintien dans les lieux")} ; une file sans `
      + "règle publique",
      "Le loyer de marché au-dessus du plafond ; le rang de chacun publié",
      0, "regle"),

    new g.Intertitre(`<a href="${g.lien("/fiscalite")}">Fiscalité</a>`),
    ligneDuPoste(poste("niches"),
      "Les dépenses fiscales",
      `Les ${g.terme("niches", "dépense fiscale")}, dont `
      + `${v(d, "tva_travaux_taux_reduit")} de TVA réduite sur les travaux et `
      + `${v(d, "niches_investissement_locatif")} pour l'investissement `
      + "locatif. Comptées par bénéficiaire, elles vont pour "
      + `${v(d, "niches_secteur_social")} au logement social, le plus lourd `
      + "des perdants.",
      `${v(d, "depenses_fiscales")} d'impôt non perçu`,
      "Supprimées"),
    ligneDuPoste(poste("dmto"),
      "Les droits de mutation",
      reglages.supprimerDmto
        ? `Les ${g.terme("DMTO")} : déménager cesse d'être taxé.`
        : "Maintenus, selon le réglage ci-dessus.",
      `${v(d, "dmto")} perçus`,
      reglages.supprimerDmto ? "Supprimés" : "Maintenus"),
    ...(reglages.supprimerDmto ? [ligneDuCompte(
      "La compensation des départements",
      "L'État leur verse, à l'euro, ce que les droits de mutation leur "
      + "rapportaient. Un transfert : la perte est déjà comptée sur la ligne "
      + "du dessus.",
      "—", "Une dotation indexée, en loi organique", 0, "transfert")] : []),
    ligneDuCompte("La taxe foncière sur des valeurs de ce siècle",
      "À rendement inchangé : la charge se déplace entre propriétaires, le "
      + "total ne bouge pas.",
      `${v(d, "taxe_fonciere")} sur des valeurs de 1970`,
      "Le même produit, sur une assiette refaite", 0, "regle"),
    ligneDuCompte("Un régime unique des revenus fonciers",
      "Louer nu, louer meublé, habiter, laisser vide : un seul régime. Estimé "
      + "sur la seule part que l'administration fiscale a chiffrée : la "
      + "location meublée rangée sous le régime de la location nue, sans "
      + "amortissement. Selon l'abattement retenu, de "
      + `${v(d, "meuble_regime_foncier_50", 0)} à `
      + `${v(d, "meuble_regime_foncier", 0)} d'impôt sur le revenu en plus par `
      + "an ; les prélèvements sociaux, qu'elle ne sait pas chiffrer, y "
      + "ajouteraient. Habiter son logement ne change pas d'impôt : le "
      + `programme refuse d'imposer le ${g.terme("loyer imputé")}.`,
      "Quatre situations, quatre régimes", "Un seul régime", estime("regime"),
      "estime"),
  ];
}

/** Le tableau du compte mesure par mesure, et ses trois totaux. */
function tableauDesMesures(bilan, lignes) {
  const mesures = lignes.filter((ligne) => !(ligne instanceof g.Intertitre));
  const ampleur = (effet) => (typeof effet === "object"
    ? Math.max(Math.abs(effet.bas), Math.abs(effet.haut)) : Math.abs(effet));
  const plusGrand = Math.max(...mesures
    .filter((ligne) => ligne.effet !== null)
    .map((ligne) => ampleur(ligne.effet)));
  // L'intitulé des deux colonnes de phrases est redit dans chaque cellule, et
  // ne s'affiche que sur un téléphone, où le tableau se défait en fiches.
  const rangees = lignes.map((ligne) => (ligne instanceof g.Intertitre ? ligne : [
    `${ligne.nom}<span class="discret">${ligne.pourquoi}</span>`,
    `<span class="sur-mobile">Aujourd'hui : </span>${ligne.aujourdhui}`,
    `<span class="sur-mobile">Avec le programme : </span>${ligne.programme}`,
    celluleEffet(ligne.effet, plusGrand),
  ]));
  rangees.push(
    new g.Intertitre("Au total"),
    ["Ce que la réforme cesse de verser ou commence à percevoir", "", "",
      g.signeCascade(bilan.plus, 1)],
    ["Ce qu'elle verse en plus ou cesse de percevoir", "", "",
      g.signeCascade(bilan.moins, 1)],
    ["Solde des lignes mesurées", "", "",
      `<strong>${g.signeCascade(bilan.solde, 1)}</strong>`],
    ["Lignes estimées", "", "",
      `<span class="estime">${fourchette({
        bas: bilan.estimeBas, haut: bilan.estimeHaut })}</span>`],
    ["Solde, estimations comprises", "", "",
      `<strong class="estime">${fourchette({
        bas: bilan.soldeBas, haut: bilan.soldeHaut })}</strong>`],
  );
  return g.tableau(
    ["Mesure", "Aujourd'hui", "Avec le programme", "Effet, Md€ par an"],
    rangees, ["", "texte", "texte", "nombre"],
    "Le programme mesure par mesure, face à aujourd'hui, en milliards "
    + "d'euros par an",
    true, null, false, "mesures",
  );
}

function pageChiffrage(d, parametres) {
  const reglages = reglagesChiffrage(d, parametres);
  const bilan = chiffrage(d, reglages);
  const parMenage = (bilan.cheque * 1000) / (n(d, "menages_aides") * 12);

  const verdict = bilan.solde >= 0
    ? `la réforme dégage <strong class="cle-texte">${milliards(bilan.solde)} `
      + "par an</strong>"
    : `la réforme demande <strong class="cle-texte">${milliards(-bilan.solde)} `
      + "par an</strong> de financement";

  // Le chèque doublé, pour dire ce que pèse le premier levier : le résultat
  // se calcule, parce qu'une phrase qui l'écrirait en dur deviendrait fausse
  // à la première mise à jour des agrégats — c'est déjà arrivé.
  const double = chiffrage(d, { ...reglages, chequeMensuel: 2 * reglages.actuelle });
  const lignes = lignesDuCompte(d, bilan, reglages);
  const mesures = lignes.filter((ligne) => !(ligne instanceof g.Intertitre));
  const combien = (...natures) => mesures
    .filter((ligne) => natures.includes(ligne.nature)).length;
  const portent = combien("compte");
  const sansCout = combien("regle", "garde", "transfert");
  const estimees = mesures.filter((ligne) => ligne.nature === "estime");
  const inconnues = mesures.filter((ligne) => ligne.nature === "inconnu");
  const nommer = (liste) => enumeration(liste.map((ligne) => (
    ligne.nom.charAt(0).toLowerCase() + ligne.nom.slice(1))));
  const estimeesTexte = estimees.length
    ? `Le tableau estime ${nommer(estimees)} sur des hypothèses qu'il écrit en `
      + "toutes lettres ; ces estimations sont comptées à part, en fourchette, et "
      + "n'entrent pas dans le solde des lignes mesurées. "
    : "";
  const inconnuesTexte = inconnues.length
    ? `${capitale(nommer(inconnues))} ${inconnues.length > 1 ? "restent" : "reste"} `
      + "sans chiffre, faute de source : chaque ligne dit pourquoi, et donne le "
      + "repère qui existe quand il y en a un. "
    : "";
  const clause = bilan.estimations.find((e) => e.cle === "clause");
  const travaux = n(d, "tva_travaux_taux_reduit");
  const social = n(d, "niches_secteur_social");
  const TENIR = {
    toujours: "y tient",
    parfois: "n'y tient que dans le haut de la fourchette",
    jamais: "n'y tient pas",
  };
  const [premier, second, ensemble] = [travaux, social, travaux + social]
    .map((montant) => tientDans(bilan, montant));
  let troisiemeEmploi = "L'un et l'autre y tiennent, et même les deux ensemble.";
  if (ensemble !== "toujours") {
    let chacun = `Le premier ${TENIR[premier]}, le second ${TENIR[second]}.`;
    if (premier === second) {
      chacun = premier === "jamais"
        ? '<strong class="cle-texte">Ni l\'un ni l\'autre n\'y tient.</strong>'
        : `L'un comme l'autre ${TENIR[premier]}.`;
    }
    const deux = premier === "jamais" && second === "jamais" ? ""
      : ` <strong class="cle-texte">Les deux ensemble ${ensemble === "jamais"
        ? "dépassent la marge" : "n'y tiennent que dans le haut de la fourchette"}.</strong>`;
    troisiemeEmploi = `${chacun}${deux} C'est alors le montant du chèque — le `
      + "seul paramètre qui pèse assez — qu'il faudrait revoir.";
  }
  const reste = bilan.solde >= 0
    ? `laissent <strong class="cle-texte">${milliards(bilan.solde)} par an`
      + "</strong>"
    : `demandent <strong class="cle-texte">${milliards(-bilan.solde)} par an`
      + "</strong> de financement";

  // Ce que le calcul ne porte pas. La liste est comptée par la phrase qui
  // l'annonce : elle s'allonge sans qu'on ait à la recompter.
  const limites = [
    ["Aucun effet de comportement",
      "Ni la construction que la libération du droit des sols "
      + "déclencherait, ni la TVA et la taxe foncière qu'elle "
      + "apporterait, ni la baisse de loyer qu'une offre plus abondante "
      + "produirait, ni le surcroît de transactions qu'entraînerait la "
      + "suppression des droits de mutation. Tous joueraient dans le sens "
      + "favorable : les compter serait se faire plaisir."],
    ["Aucune montée en charge",
      "Le compte est celui du régime de croisière, et il n'est vrai "
      + "d'aucune des premières années. Un avantage fiscal accordé en "
      + "contrepartie d'un engagement de location de six, neuf ou douze "
      + "ans ne s'interrompt pas : la loi ne défait pas les situations "
      + "légalement acquises, et le Conseil constitutionnel y veille. Les "
      + `${v(d, "depenses_fiscales")} de niches s'éteignent donc par `
      + "extinction des engagements en cours, sur une décennie, tandis que "
      + "le chèque et la suppression des droits de mutation, eux, coûtent "
      + "dès le premier exercice. La marge affichée est celle de la fin du "
      + "chemin ; le début est négatif, et demande un financement de "
      + "transition que ce compte ne porte pas. Une ligne fait exception, et "
      + "c'est voulu : la clause de sauvegarde y est comptée à son coût de la "
      + "première année, le plus lourd, parce qu'elle passe avant tout le "
      + "reste."],
    ["Aucune redistribution fine",
      "Le chèque est ici un montant moyen. Sa modulation réelle — par "
      + "revenu, par taille de ménage, par zone — décide de qui gagne et "
      + "qui perd, et cette question ne se tranche pas avec une moyenne. "
      + "Elle demande un modèle de microsimulation sur données "
      + "individuelles, que ce site n'a pas."],
    ["Aucune mesure de l'effet sur les prix",
      "Que la suppression des droits de mutation se retrouve en partie "
      + "dans le prix des logements est probable — c'est ce que fait tout "
      + "allègement sur un marché contraint. C'est précisément pourquoi "
      + "elle ne vaut qu'accompagnée du premier chantier."],
    [`${enLettres(estimees.length + inconnues.length, true)} lignes sans `
      + "mesure publiée",
      `${estimeesTexte}${inconnuesTexte}Le reversement aux communes, lui, `
      + "n'est pas un trou : c'est un transfert de l'État aux communes, qui ne "
      + "change pas le total, et le tableau en donne le prix pour l'État."],
    ["Des aides qui ne sont pas toutes de l'argent public",
      "Le compte suit la convention du compte du logement, qui range "
      + `parmi les aides les ${v(d, "bonifications")} de bonifications de `
      + `taux. L'État n'en paie que ${v(d, "bonifications_etat")} — le prêt `
      + "à taux zéro et l'éco-prêt. Le reste est porté par l'épargne du "
      + "livret A, qui finance les prêts au logement social, et par Action "
      + "Logement : le supprimer ne rend rien au budget. Compté en seul "
      + "argent de l'État et des collectivités, le solde est inférieur de "
      + `${milliards(n(d, "bonifications") - n(d, "bonifications_etat"))}.`],
  ];

  const corps = `
${formulaireChiffrage(d, reglages)}

${g.cle("Que coûte la proposition ?",
    `À ${euros(parMenage)} de chèque mensuel par ménage aidé, ${verdict}.`,
    `${cascadeChiffrage(d, bilan)}
  <p>Le chèque retenu ici représente ${euros(parMenage)} par mois et par ménage
  aidé, contre ${euros(reglages.actuelle)} versés en moyenne aujourd'hui au
  titre des aides personnelles — ${g.terme("APL")}, ALS, ALF. Il est servi à
  ${v(d, "menages_aides")} de ménages — le nombre actuel de bénéficiaires, tenu
  constant.</p>
  <p>Deux dépenses ne figurent pas dans la cascade, et c'est voulu : les
  ${milliards(bilan.subventionsGardees)} de subventions à la pierre que la
  réforme conserve, et les ${milliards(bilan.autresPrestations)} d'autres
  prestations sociales du logement — l'aide sociale à l'hébergement des
  personnes âgées, les fonds de solidarité logement, le chèque énergie —, qui
  ne sont pas des aides personnelles. Une dépense qu'on ne touche pas ne
  s'ajoute ni ne se retranche ; elle continue. Le tableau mesure par mesure,
  plus bas, les montre quand même, face à aujourd'hui. Le curseur ci-dessus
  permet de rendre une part des subventions, et elle apparaît alors en
  recette.</p>
  <p>Une correction, parce qu'elle change un chiffre que ce site a publié. Ce
  compte partait de ${v(d, "prestations_sociales")} d'« aides personnelles » :
  c'était le total des prestations sociales du logement, dont les trois aides
  personnelles ne font que ${v(d, "allocations_logement")}. Le reste — l'aide
  sociale à l'hébergement d'une personne âgée en maison de retraite, par
  exemple — n'a rien à faire dans un chèque logement, et il est désormais
  compté à part. La marge n'en change pas : le chèque est calibré sur l'aide
  qu'il remplace, et les deux montants baissent ensemble.</p>`,
    sources(d, "allocations_logement", "prestations_sociales",
      "depenses_fiscales", "dmto", "menages_aides"), "compte")}

${g.cle("Qu'est-ce qui change, mesure par mesure, par rapport à aujourd'hui ?",
    `${enLettres(portent, true)} lignes portent tout le compte : `
    + `${milliards(bilan.plus)} que la réforme cesse de verser ou commence à `
    + `percevoir, ${milliards(-bilan.moins)} qu'elle verse en plus ou cesse `
    + `de percevoir. Elles ${reste}. `
    + `${enLettres(sansCout, true)} ne coûtent rien : elles changent une `
    + "règle, gardent une dépense ou la font passer d'une administration à une "
    + "autre."
    + (estimees.length
      ? ` ${enLettres(estimees.length, true)} ${estimees.length > 1
        ? "sont estimées" : "est estimée"} sur des hypothèses écrites, pour un `
        + `effet de ${fourchetteEnMots(bilan.estimeBas, bilan.estimeHaut)} par an.`
      : "")
    + (inconnues.length
      ? ` ${enLettres(inconnues.length, true)} ${inconnues.length > 1
        ? "restent" : "reste"} sans chiffre, et chacune dit pourquoi.`
      : ""),
    `${tableauDesMesures(bilan, lignes)}
  <p><strong>Comment le lire.</strong> Chaque ligne met une proposition en face
  de ce qui existe aujourd'hui. Le signe + dit ce que la réforme cesse de
  verser ou commence à percevoir ; le signe −, ce qu'elle verse en plus ou
  cesse de percevoir. Un zéro n'est pas un oubli : la mesure change une règle,
  garde une dépense telle qu'elle est, ou fait passer de l'argent d'une
  administration à une autre sans changer le total. Un effet précédé de ≈, ou
  donné en fourchette, est une estimation : la ligne dit sur quelle hypothèse,
  et les estimations sont additionnées à part.${inconnues.length
    ? " « Non chiffré » n'est pas un oubli non plus : la ligne dit pourquoi."
    : ""} La colonne des lignes mesurées s'additionne ; les arrondis peuvent en
  écarter le total d'un dixième.</p>
  <p><strong>Ce que pèsent les lignes sans mesure publiée.</strong> Leur effet
  ne se lit dans aucun agrégat : il dépend d'hypothèses, que chaque ligne écrit,
  et il se donne en fourchette. C'est pourquoi le tableau donne deux soldes —
  celui des lignes mesurées, et celui qui compte aussi les estimations.
  ${inconnuesTexte}Le solde mesuré n'est donc pas une marge acquise : c'est ce
  qui reste avant elles, et la dernière ligne dit ce qu'elles laissent. Ce que
  la marge peut payer, et dans quel ordre, est dit plus bas, sous « Ce que ce
  calcul n'est pas ».</p>`,
    sources(d, "allocations_logement", "bonifications_etat", "tva_neuf",
      "recours_delai_legal", "recours_duree", "enquetes_sociales",
      "commandements_payer", "cout_magistrat", "decisions_bail", "gul_besoin",
      "visale_sinistres", "accedants", "ipp_perdants", "meuble_regime_foncier",
      "encadrement_gain_mensuel", "encadrement_villes", "taxe_fonciere"),
    "mesures")}

${g.depliant("Ce que ce calcul n'est pas",
    `<p>C'est une addition, pas un modèle budgétaire, et il faut le dire avant
  qu'on le découvre. ${enLettres(limites.length, true)} choses n'y sont
  pas.</p>
  ${g.points(limites)}
  <p>Ce que le calcul établit est donc modeste, et suffisant : la réforme
  <strong class="cle-texte">tient dans les agrégats existants</strong>. Elle ne
  crée aucun impôt nouveau, ne suppose ni dette ni baisse de l'enveloppe des
  aides : les sommes qu'elle redéploie sont celles que le compte du logement
  publie chaque année.</p>
  <p><strong>Ce que la marge peut payer, et dans quel ordre.</strong> Trois
  emplois la réclament, et mieux vaut dire lequel passe d'abord. Un, la clause
  de sauvegarde, qui garantit qu'aucun ménage modeste ne perde au change :
  ${entre(-clause.haut, -clause.bas)} la première année, et elle passe avant
  tout le reste. Deux, les autres lignes estimées qui coûtent : la garantie du
  loyer, l'accompagnement et les juges de l'impayé, l'ouverture du chèque à
  l'accession. Ces deux emplois payés, et le peu que rapporte le régime unique
  des revenus fonciers compté, le solde est de
  ${fourchetteEnMots(bilan.soldeBas, bilan.soldeHaut)} par an. Trois, si le
  Parlement les juge nécessaires, le maintien du taux réduit de TVA sur les
  travaux (${milliards(travaux)}) ou celui des avantages fiscaux du logement
  social (${milliards(social)}). ${troisiemeEmploi} Nous préférons l'écrire que
  de laisser croire qu'une même somme paie trois fois.</p>
  <p>Une précision s'impose pourtant, parce qu'elle nous sera opposée et
  qu'elle est fondée. <strong class="cle-texte">Supprimer une niche fiscale
  augmente l'impôt de celui qui en bénéficiait.</strong> Aucun taux ne monte,
  aucune taxe n'est créée, mais ${v(d, "depenses_fiscales")} cessent d'être
  rendus — dont ${v(d, "tva_travaux_taux_reduit")} de TVA à taux réduit sur les
  travaux, qui concerne tout propriétaire qui refait une toiture. Dire « sans
  impôt nouveau » serait exact et insuffisant : la réforme déplace la charge
  des niches vers le chèque, et ce déplacement fait des perdants nommables. Le
  plus lourd n'est pas un ménage : c'est le logement social, qui reçoit
  ${v(d, "niches_secteur_social")} de ces avantages. Ils sont traités à la page
  <a href="${g.lien("/fiscalite")}">Fiscalité</a>.</p>`, "limites")}


${g.depliant("La microsimulation qui manque, et ce qu'elle trancherait",
    `<p>C'est le trou de ce chiffrage, et le plus grand. Une addition sur
  moyennes nationales ne dit pas ce que la réforme fait à un ménage : elle dit
  seulement que l'enveloppe y est. Or la question que tout le monde pose — la
  seule, en vérité — est « et moi ? ». Tant qu'elle reste sans réponse, chacun
  y répondra à notre place.</p>
  <p>Disons donc précisément ce qui manque, plutôt que de le regretter.</p>
  ${g.points([
    ["Les données",
      "L'enquête Revenus fiscaux et sociaux appariée aux données "
      + "d'allocataires, ou l'Enquête nationale logement : un échantillon "
      + "de ménages réels portant le revenu, la composition, la zone, le "
      + "statut d'occupation, le loyer effectif et l'aide perçue. Aucune "
      + "de ces deux bases n'est publique en accès libre ; elles "
      + "s'obtiennent sur projet auprès du service statistique."],
    ["La méthode",
      "Appliquer à chaque ménage de l'échantillon le barème actuel des "
      + "aides personnelles, puis le chèque proposé, et lire la "
      + "différence. C'est un calcul, non un modèle : aucune hypothèse de "
      + "comportement n'y entre. Le barème des aides est public, le chèque "
      + "est par construction plus simple."],
    ["Les trois quantités qu'elle produirait",
      "La part des ménages aidés qui gagnent et celle qui perdent ; la "
      + "perte du décile le plus touché, en euros par mois ; et le coût "
      + "d'une clause de sauvegarde ramenant cette perte à zéro. Les trois "
      + "décident de la réforme, et aucune n'est mesurée ici pour notre "
      + "chèque : le tableau n'en donne que l'ordre de grandeur, tiré d'une "
      + "étude de l'Institut des politiques publiques sur une aide voisine et "
      + "sur la législation de 2013."],
    ["Ce à quoi nous nous engageons en attendant",
      "Une clause de sauvegarde : aucun ménage sous plafond de ressources "
      + "ne perçoit moins qu'avant la réforme, l'écart lui étant versé en "
      + "complément dégressif. Son coût n'est connu qu'en ordre de grandeur "
      + `— ${entre(-clause.haut, -clause.bas)} la première année, dans le `
      + "tableau ci-dessus — et ne le sera exactement qu'une fois la "
      + "microsimulation faite. Il est prélevé sur la marge avant tout autre "
      + "emploi. Si la marge n'y suffisait pas, c'est le montant du chèque "
      + "qu'il faudrait revoir, non la clause."],
  ])}
  <p>Un lecteur peut légitimement conclure que le chiffrage est incomplet. Il
  l'est. Il établit qu'une enveloppe existe et qu'une règle est meilleure ; il
  n'établit pas qui paie la transition, et <strong class="cle-texte">aucun
  programme qui prétend le contraire sans microsimulation ne dit la
  vérité</strong>.</p>`, "microsimulation")}

${g.depliant("Les leviers, et ce qu'ils déplacent",
    `<p>Le formulaire ci-dessus porte les trois hypothèses qu'on peut déplacer.
  Voici ce que chacune vaut — et, en deuxième position, une quatrième qui
  devrait en être une et n'en est pas encore.</p>
  <ul class="leviers">
    <li><strong>Le chèque.</strong> Chaque tranche de 10 € mensuels sur
    ${v(d, "menages_aides")} de ménages coûte
    ${milliards(10 * 12 * n(d, "menages_aides") / 1000, 2)} par an. C'est le
    levier le plus lourd : doubler l'aide moyenne ${double.solde < 0
    ? `demanderait ${milliards(-double.solde)} par an de financement`
    : `ne laisserait que ${milliards(double.solde)} de marge`}.</li>
    <li><strong>Le nombre de ménages, qui n'est pas un levier ici et devrait
    l'être.</strong> Le compte retient ${v(d, "menages_aides")} de ménages, le
    nombre actuel de bénéficiaires. Or le chèque est ouvert aux accédants,
    quand l'aide personnelle ne l'est presque plus : à barème de ressources
    inchangé, l'assiette s'élargit donc mécaniquement. Le tableau l'estime en
    ramenant la part des accédants aidés à celle de
    ${an(d, "accedants_aides_2017")} : environ
    ${nombre(Math.round(bilan.accedantsNouveaux * 1000) * 1000, 0)} ménages de
    plus, que la ligne de l'accession compte à part. C'est une hypothèse, que
    seule la microsimulation vérifierait. Chaque tranche de cent mille ménages
    supplémentaires au montant retenu coûte
    ${milliards(reglages.chequeMensuel * 12 * 0.1 / 1000, 2)} par an, à titre
    de repère.</li>
    <li><strong>Les droits de mutation.</strong> Leur suppression coûte
    ${milliards(n(d, "dmto"))} de recettes — un montant qui suit le nombre de
    ventes, et qu'une année basse sous-estime.</li>
    <li><strong>Les subventions à la pierre.</strong>
    ${milliards(n(d, "subventions"))}, versés surtout aux bailleurs sociaux et à
    la rénovation des logements. La proposition les conserve en totalité par
    défaut : ce sont elles qui tiennent le plancher.</li>
  </ul>`, "leviers")}
`;

  return `
${g.affiche(
    "La preuve",
    "Le chiffrage",
    "Quatre chantiers, un compte, et chaque mesure face à aujourd'hui : ce "
    + "qu'elle rapporte, ce qu'elle coûte, ou pourquoi on ne sait pas la "
    + "chiffrer. Les aides d'aujourd'hui financent le chèque de demain et la "
    + "suppression des droits de mutation — sur les agrégats publiés, sans "
    + "impôt nouveau. Les hypothèses se déplacent ci-dessous.",
  )}
${g.plan(corps, "/chiffrage")}
${corps}
`;
}

// -- la page Données ---------------------------------------------------------

/** L'ordre d'affichage des niveaux de fiabilité : du plus sûr au moins sûr. */
const ORDRE_FIABILITE = ["officielle", "academique", "calcul",
  "partie_prenante", "presse"];

/** Les mois, pour qu'une échéance se lise comme une date et non comme une clé. */
const MOIS = Object.freeze([
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]);

/** « 2026-11-25 » se lit « 25 novembre 2026 ». */
function dateEnFrancais(iso) {
  const [annee, mois, jour] = iso.split("-");
  const quantieme = Number(jour) === 1 ? "1er" : String(Number(jour));
  return `${quantieme} ${MOIS[Number(mois) - 1]} ${annee}`;
}

/**
 * Les faits datés que le site surveille, dans l'ordre où ils tomberont.
 *
 * C'est la contrepartie visible du test de péremption : le lecteur voit ce
 * que nous nous sommes engagés à revérifier, et quand. Une veille qu'on ne
 * montre pas est une veille qu'on peut abandonner sans que personne ne le
 * sache.
 */
function tableauEcheances(d) {
  const echeances = d.echeances();
  const cles = Object.keys(echeances)
    .sort((a, b) => echeances[a].echeance.localeCompare(echeances[b].echeance));
  const lignes = cles.map((cle) => {
    const e = echeances[cle];
    return [
      `${echapper(e.libelle)}<br>`
      + `<span class="precision">${echapper(e.ou)}</span>`,
      `<a href="${echapper(e.url)}">${echapper(dateEnFrancais(e.echeance))}</a>`,
      `<span class="precision">${echapper(e.verifier)}</span>`,
    ];
  });
  return g.tableau(
    ["Ce que le site affirme", "À revérifier après le", "Quoi vérifier"],
    lignes, ["", "nombre", ""],
    "Les faits datés, et leur date de péremption", true,
  );
}

function tableauDonnees(d) {
  const cles = d.toutesLesCles().sort((a, b) => {
    const ea = d.chiffre(a);
    const eb = d.chiffre(b);
    const rang = ORDRE_FIABILITE.indexOf(ea.fiabilite)
      - ORDRE_FIABILITE.indexOf(eb.fiabilite);
    return rang !== 0 ? rang : ea.libelle.localeCompare(eb.libelle, "fr");
  });
  const lignes = cles.map((cle) => {
    const e = d.chiffre(cle);
    const valeur = avecUnite(e.valeur, e.unite, decimalesUtiles(e.valeur));
    return [
      `${echapper(e.libelle)}<br><span class="precision">${echapper(cle)}</span>`,
      valeur,
      String(e.annee),
      echapper(nomFiabilite(e.fiabilite)),
      `<a href="${echapper(e.url)}">${echapper(e.source)}</a>`
      + (e.note ? `<br><span class="precision">${echapper(e.note)}</span>` : ""),
      echapper(e.lu_le),
    ];
  });
  return g.tableau(
    ["Ce qu'il mesure", "Valeur", "Année", "Fiabilité", "Source", "Lu le"],
    lignes, ["", "nombre", "nombre", "", "", "nombre"],
    "Tous les chiffres du site", true, null, true, "table-donnees",
  );
}

function pageDonnees(d) {
  const cles = d.toutesLesCles();
  const compte = (niveau) => cles
    .filter((cle) => d.chiffre(cle).fiabilite === niveau).length;

  const corps = `
${g.depliant("Ce que chaque niveau de fiabilité veut dire",
    `${g.gloses(ORDRE_FIABILITE.map((niveau) => [
    `${nomFiabilite(niveau)} (${compte(niveau)} chiffres)`, FIABILITES[niveau],
  ]))}
  <p>Un chiffre marqué <em>presse</em> serait un chiffre lu dans la reprise
  d'une publication que nous n'aurions pas pu ouvrir. <strong>Il n'y en a
  aucun aujourd'hui</strong>, et c'est récent : les six derniers ont été
  repris à leur source, et trois d'entre eux étaient faux — une part du
  foncier deux fois trop grande, un délai d'attente surestimé de moitié, un
  transfert de loyers que personne ne publiait. Le niveau reste dans la liste
  parce que la dette reviendra : une actualité se cite d'abord de seconde
  main.</p>
  <p>Un chiffre marqué <em>partie prenante</em> ne l'est pas davantage, et il
  pose un autre problème. Les meilleures données sur la demande de logement
  social viennent de la fédération des bailleurs sociaux ; les meilleures sur
  le mal-logement, d'une association qui milite pour y remédier. Ce sont des
  sources primaires, et personne ne publie mieux qu'elles — mais elles ont un
  intérêt dans la réponse, et plusieurs de nos chiffres les plus frappants sont
  les leurs. Le dire ici vaut mieux que de se le faire dire ailleurs.</p>`, "fiabilite")}

${g.depliant("La règle", `
  <p>Tout ce que ce site affiche de chiffré vient d'un seul fichier,
  <code>moteur/donnees.json</code>, où chaque entrée porte sa valeur, son
  unité, l'année qu'elle mesure, sa source, l'adresse de cette source, la date
  à laquelle elle a été lue et, au besoin, la note qui la situe. Une page qui
  demanderait une clé absente ne s'afficherait pas.</p>
  <p>La règle mérite d'être dite exactement, parce qu'une promesse approximative
  ne vaut rien. <strong class="cle-texte">Aucune mesure n'est écrite à la main
  dans une phrase</strong> : tout ce qui mesure quelque chose vient du fichier,
  et un test refuse le contraire. Sept nombres y échappent, et ce sont les
  seuls : les paramètres de la proposition elle-même — dix ans de recettes
  rendues à la commune, zéro droit de mutation —, deux taux fixés par la loi,
  le pas du curseur de la page Chiffrage et l'affichage d'un poste nul. Aucun
  ne mesure le monde ; ils décrivent ce que nous proposons ou ce que le code
  général des impôts dispose. La liste est close, et elle est dans le test.</p>
  <p>Cette contrainte a un coût — un chiffre qu'on ne peut pas sourcer ne
  figure pas sur le site — et c'est le but. Les deux calculs du site, le coût
  fiscal d'un achat et le chiffrage de la réforme, n'utilisent eux aussi que
  ces valeurs-là.</p>`, "regle")}

${g.depliant("Ce qui se périmera, et quand nous le revérifierons",
    `<p>Un chiffre vieillit visiblement : son année est écrite à côté de lui.
  Une phrase, non. « L'expérimentation s'éteint le 25 novembre 2026 », « le
  texte est au Sénat », « les classes F suivront en 2028 » sont vraies le jour
  où on les écrit et fausses un jour, sans que rien ne prévienne — au milieu
  de chiffres qui, eux, sont tenus à jour. C'est la façon la plus sûre de
  perdre une confiance qu'on met des années à gagner.</p>
  <p>Chacune de ces phrases porte donc une échéance, et un test refuse de
  laisser publier le site lorsqu'une échéance est passée. Il ne se contente
  pas de le signaler : il dit où la phrase est écrite et quoi aller vérifier.
  Les voici, telles que le test les lit.</p>
  ${tableauEcheances(d)}
  <p>Deux réponses sont acceptables quand une échéance sonne : corriger le
  site, ou reporter l'échéance parce qu'on a vérifié qu'elle tient encore. Une
  seule ne l'est pas, et c'est la plus tentante : supprimer la ligne.</p>`,
    "peremption")}

${g.depliant("Ce que ce site ne sait pas", `
  ${g.points([
    ["Qui gagne et qui perd",
      "Le chiffrage raisonne sur des moyennes nationales. Il ne dit pas "
      + "ce que la réforme fait à un ménage donné, dans une commune "
      + "donnée. Cela demanderait une microsimulation sur données "
      + "individuelles."],
    ["Les délais",
      "Rien ici n'est daté en trajectoire. Entre le vote d'une réforme du "
      + "droit des sols et le premier logement livré, il s'écoule "
      + "plusieurs années ; le site ne les modélise pas."],
    ["L'effet exact sur les prix",
      "Les élasticités de l'offre de logement en France sont mal "
      + "mesurées, et varient fortement d'un marché local à l'autre. Les "
      + "expériences étrangères citées donnent un sens et un ordre de "
      + "grandeur, pas une prévision française."],
    ["Le détail des collectivités",
      "La suppression des droits de mutation touche les finances "
      + "départementales, dont la situation varie beaucoup. La "
      + "compensation est posée en principe ; sa répartition demande un "
      + "travail qui n'est pas fait ici."],
  ])}`, "ignorance")}

${g.depliant("Reprendre ces chiffres", `
  <p>Les données sont sous
  <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr">CC BY-SA
  4.0</a>, le code sous licence Apache 2.0, et le tout est dans
  <a href="${g.DEPOT}">le dépôt</a>. Le tableau ci-dessous se trie en cliquant
  sur un en-tête.</p>
  <p>Une erreur, un chiffre périmé, une source primaire que nous avons manquée :
  <a href="${g.DEPOT}/issues">ouvrez un ticket</a>. Les corrections sont
  publiées avec la date à laquelle elles ont été faites.</p>`, "reprendre")}
`;

  return `
${g.affiche(
    "La confiance",
    "Données",
    `Les ${cles.length} chiffres du site, avec leur source, l'année qu'ils `
    + "mesurent et la date à laquelle ils ont été lus. Rien n'est affiché "
    + "ailleurs qui ne figure ici.",
  )}
${g.plan(corps, "/donnees")}
${corps}
<h2 class="serif">Le tableau</h2>
${tableauDonnees(d)}
`;
}

// -- le routeur --------------------------------------------------------------

const PAGES = Object.freeze({
  "/": pageProgramme,
  "/constat": pageConstat,
  "/construire": pageConstruire,
  "/louer": pageLouer,
  "/aider": pageAider,
  "/fiscalite": pageFiscalite,
  "/chiffrage": pageChiffrage,
  "/donnees": pageDonnees,
});

/**
 * Le point d'entrée unique du rendu : une route, des paramètres, une page.
 *
 * C'est ici, et nulle part ailleurs, que les réglages de chiffrage sont posés
 * pour les liens internes : ils suivent ainsi le lecteur d'une page à l'autre,
 * et sont remis à zéro à chaque rendu, de sorte qu'aucun ne peut hériter des
 * réglages du précédent.
 */
export function rendre(donnees, chemin, parametres = {}) {
  const requete = new URLSearchParams();
  for (const cle of CLES_MODELISATION) {
    if (parametres[cle] !== undefined && parametres[cle] !== "") {
      requete.set(cle, parametres[cle]);
    }
  }
  g.poserOptions(requete.toString());

  const page = PAGES[chemin] ?? PAGES["/"];
  const titre = TITRES[chemin] ?? TITRES["/"];
  return [titre, page(donnees, parametres)];
}

export { Donnees };
