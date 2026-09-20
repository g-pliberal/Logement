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
    + "produit : 46 milliards d'aides, 99 milliards de prélèvements, et le "
    + "plus bas niveau de construction depuis vingt-cinq ans.",
  "/construire": "Pourquoi on ne construit plus en France, et ce qu'il faut "
    + "changer : le plan local d'urbanisme, le zéro artificialisation nette, "
    + "les recours, et le maire qui paie ce qu'il autorise.",
  "/louer": "Encadrement des loyers, interdictions au diagnostic énergétique, "
    + "insécurité du bailleur : ce que le droit du bail retire au marché "
    + "locatif, et comment lui rendre sa liberté sans laisser personne dehors.",
  "/aider": "Aides personnelles, logement social, file d'attente : ce que les "
    + "aides au logement font vraiment aux loyers, et le chèque logement qui "
    + "les remplace.",
  "/fiscalite": "Le logement rapporte 99 milliards et reçoit 43 : ce que "
    + "l'impôt fait au déménagement, à la construction et au propriétaire, et "
    + "le calcul de ce qu'un achat coûte en droits de mutation.",
  "/chiffrage": "Ce que la proposition coûte et ce qu'elle rend, en milliards "
    + "par an, sur les agrégats publiés du compte du logement — avec les "
    + "hypothèses qu'on peut déplacer soi-même.",
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
      + "énergétique sont supprimés : ils retirent des logements du marché "
      + "sans en produire un seul. En échange, le bailleur obtient ce qu'il "
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
      + "sont supprimés, et compensés par la fin des niches et par une taxe "
      + "foncière enfin assise sur des valeurs de ce siècle."],
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
      "au 30 juin 2025, pour environ "
      + `${nombre(n(d, "attributions_hlm"), 0)} attributions par an`),
  ], true);

  return `
${g.affiche(
    "Le programme du Parti libéral français",
    "Le logement manque<br>parce qu'on l'a interdit",
    "La France a mis en chantier "
    + `<strong class="cle-texte">${nombre(n(d, "logements_commences") * 1000, 0)} logements</strong> `
    + `en ${an(d, "logements_commences")}, le plus bas niveau depuis un quart `
    + `de siècle. Dans le même temps, l'État a prélevé ${v(d, "prelevements")} `
    + `sur le logement et en a dépensé ${v(d, "aides_totales_2024")}. Ce n'est `
    + "pas d'argent que le logement manque, c'est d'autorisation.",
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
    ["Le niveau d'aide des ménages modestes",
      "Le chèque logement remplace les aides actuelles ; il ne les "
      + "diminue pas. Le "
      + `<a href="${g.lien("/chiffrage")}">chiffrage</a> part du montant `
      + "moyen versé aujourd'hui et montre ce que coûte chaque euro "
      + "au-dessus ou en dessous."],
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

/** Ce que l'État prend et ce qu'il rend, en une cascade. */
function cascadePrelevements(d) {
  const marches = [
    new g.Marche("Prélèvements sur le logement", n(d, "prelevements"), true,
      "var(--actuel)",
      "Taxe foncière, TVA, droits de mutation, impôts sur les revenus "
      + "locatifs, taxes sur l'énergie du logement."),
    new g.Marche("Aides personnelles", -n(d, "prestations_sociales"), false,
      "var(--manque)", "APL, ALS, ALF."),
    new g.Marche("Subventions à la pierre", -n(d, "subventions"), false,
      "var(--manque)", "Versées aux bailleurs sociaux et aux producteurs."),
    new g.Marche("Bonifications de taux", -n(d, "bonifications"), false,
      "var(--manque)", "Prêts aidés, dont le prêt à taux zéro."),
    new g.Marche("Dépenses fiscales", -n(d, "depenses_fiscales"), false,
      "var(--manque)",
      "TVA à taux réduit sur l'entretien, réductions d'impôt pour "
      + "investissement locatif, exonérations."),
    new g.Marche("Reste à l'État", n(d, "solde_public"), true, "var(--reste)",
      "Ce que le logement rapporte, net de tout ce qu'il reçoit."),
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
    `${vc(d, "logements_commences")} de logements ont été mis en chantier en `
    + `${an(d, "logements_commences")}, contre `
    + `${v(d, "logements_commences_sommet")} en `
    + `${an(d, "logements_commences_sommet")} : `
    + `<strong class="cle-texte">${nombre(chute, 0)}&nbsp;% de moins en huit `
    + "ans</strong>.",
    `${courbeConstruction(d)}
  <p>La chute vient d'abord de la maison individuelle, tombée de
  ${nombre(serie.individuel[3], 0)} à ${nombre(serie.individuel[11], 0)} milliers
  de mises en chantier, soit une division par près de deux. Le collectif a
  reculé moins fort et remonte depuis 2024, mais l'ensemble reste au plus bas
  depuis un quart de siècle. Sur les douze mois arrêtés à février 2026,
  ${vc(d, "logements_autorises")} ont été autorisés,
  ${nombre(5.1, 1)}&nbsp;% de moins que la moyenne des cinq années
  précédentes : ce qui est autorisé aujourd'hui est ce qui sortira de terre
  dans deux ans.</p>`,
    sources(d, "logements_commences", "logements_autorises"), "construction")}

${g.cle("Les prix ont quitté les revenus, et n'y sont pas revenus.",
    "De 1965 à 2001, le prix des logements anciens a suivi le revenu des "
    + "ménages à 10&nbsp;% près. Depuis, il s'en est détaché : au premier "
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
    sources(d, "friggit_ecart"), "prix")}

${g.cle("La file d'attente s'allonge pendant qu'on distribue.",
    `${vc(d, "demandes_hlm")} de ménages attendaient un logement social au `
    + "30 juin 2025, pour environ "
    + `${nombre(n(d, "attributions_hlm"), 0)} attributions par an.`,
    `<p>Le parc social compte ${vc(d, "parc_social")} de logements, un ménage sur
  six, et il grandit : ${nombre(n(d, "parc_social_entrees"), 0)} logements y sont
  entrés en ${an(d, "parc_social_entrees")}. La demande, elle, grandit plus vite
  — de moitié depuis 2015. Le délai moyen d'obtention atteint
  ${vc(d, "delai_hlm", 0)} pour les demandes satisfaites en
  ${an(d, "delai_hlm")}, et ${nombre(39.5, 1)} mois en Île-de-France.</p>
  <p>Un parc qui ne se libère pas ne peut pas absorber une file qui s'allonge :
  le ${g.terme("droit au maintien dans les lieux")} garantit à l'occupant d'y rester quel que soit son revenu ultérieur, quand
  celui qui attend, lui, n'a droit à rien.</p>`,
    sources(d, "demandes_hlm", "parc_social", "delai_hlm"), "attente")}

${g.cle("Le logement rapporte à l'État plus du double de ce qu'il lui coûte.",
    `${vc(d, "prelevements")} de prélèvements en ${an(d, "prelevements")}, `
    + `${v(d, "aides_totales_2024")} d'aides : il reste `
    + `${vc(d, "solde_public")}.`,
    `${cascadePrelevements(d)}
  <p>Les prélèvements représentent ${nombre(3.4, 1)}&nbsp;% du produit intérieur
  brut et ${nombre(7.9, 1)}&nbsp;% de tous les prélèvements obligatoires du
  pays. Ils sont portés par la taxe foncière (${v(d, "taxe_fonciere")}), la TVA
  sur le neuf, les travaux et les services (${v(d, "tva_logement")}), et les
  droits de mutation (${v(d, "dmto")}).</p>
  <p>Le sens de ce solde demande une précaution : aides et prélèvements n'ont
  ni les mêmes redevables ni les mêmes bénéficiaires, et l'écart n'est pas un
  solde budgétaire qu'on pourrait dépenser. Il dit une chose, et une seule :
  <strong class="cle-texte">le logement n'est pas un secteur subventionné, c'est
  un secteur taxé</strong> — et l'idée qu'il faudrait « remettre de l'argent »
  se heurte d'abord à celui qu'on y prend déjà.</p>`,
    sources(d, "prelevements", "aides_totales_2024", "taxe_fonciere"), "argent")}

${g.cle("Et pourtant, le mal-logement progresse.",
    `${vc(d, "mal_loges")} de personnes sont mal logées, et `
    + `${vc(d, "sans_domicile", 0)} sont sans domicile — contre 300 000 en 2020.`,
    `<p>C'est la vérification de la thèse, et non son objection. Une politique
  qui dépense ${v(d, "aides_publiques")} par an et qui laisse le nombre de
  personnes sans domicile croître d'un sixième en cinq ans ne manque pas de
  moyens : elle manque de logements. Près de 600 000 personnes vivent par
  ailleurs hébergées chez un tiers faute de logement autonome — un
  mal-logement qui n'apparaît dans aucune statistique de loyer.</p>
  <p>Le parc compte ${v(d, "parc_logements")} de logements pour
  ${v(d, "residences_principales")} de résidences principales,
  ${v(d, "logements_vacants")} de logements vacants
  (${nombre(7.7, 1)}&nbsp;% du parc, en baisse depuis 2019) et
  ${v(d, "residences_secondaires")} de résidences secondaires. La vacance est
  souvent présentée comme la réserve où puiser : l'essentiel en est frictionnel
  — un logement entre deux occupants, en travaux, en succession — et se trouve
  là où la demande n'est pas.</p>`,
    sources(d, "mal_loges", "parc_logements", "logements_vacants"), "mal-logement")}
`;

  return `
${g.affiche(
    "Le constat",
    "Quarante-six milliards,<br>et le plus bas niveau<br>de construction<br>depuis vingt-cinq ans",
    `L'État consacre ${v(d, "aides_publiques")} par an au logement, soit `
    + `environ ${v(d, "depense_publique_pib")} — à peu près la moyenne `
    + "européenne. Le résultat se lit en cinq images, et aucune ne va dans le "
    + "bon sens.",
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
  ${g.terme("charge foncière")} pèse de 25&nbsp;% du prix d'une opération en
  province à 50&nbsp;% à Paris, et atteint ${vc(d, "part_foncier", 0)} du coût
  hors taxes des opérations de logement social en ${an(d, "part_foncier")}, en
  hausse de dix points depuis 2020.</p>
  <p>On achète donc de moins en moins un sol, et de plus en plus une
  autorisation.</p>
  <p class="source">${sources(d, "part_foncier")}</p>`, "plu")}

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
  intermédiaire de −50&nbsp;%. C'est l'aveu que la trajectoire n'était pas
  tenable ; ce n'est pas la correction du principe. Un objectif de surface est
  un instrument juste pour un problème de surface ; le nôtre est un problème de
  logements, et rien n'interdit d'y répondre en hauteur plutôt qu'en largeur —
  à condition que la hauteur, elle, soit permise.</p>`, "zan")}

${g.depliant("Le recours, et le temps qu'il coûte",
    `<p>Un permis délivré n'est pas un permis acquis. Le voisin, l'association,
  le concurrent peuvent le contester, et la procédure dure
  ${vc(d, "recours_duree", 0)} en première instance. Sur une opération de
  trente logements, ce délai suffit à faire passer le plan de financement de
  rentable à impossible ; il suffit surtout à décourager l'opération suivante,
  celle qu'on ne lance pas.</p>
  <p>La loi du 26 novembre 2025 a resserré les délais : le recours gracieux ne
  proroge plus le délai contentieux, et un jugement est attendu sous dix mois
  pour les permis de plus de deux logements. C'est la bonne direction, et c'est
  encore un an pendant lequel rien ne sort de terre.</p>
  <p class="source">${sources(d, "recours_duree")}</p>`, "recours")}

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
    "Auckland a ouvert les droits à bâtir sur les trois quarts de son sol "
    + `urbain en 2016. Six ans après, ${vc(d, "auckland_permis")} de plus y `
    + "avaient été autorisés, et les loyers y étaient "
    + `${vc(d, "auckland_loyers", 0)} en dessous de ce qu'ils auraient été `
    + "sans la réforme.",
    `<p>C'est l'expérience naturelle la mieux documentée du domaine : une
  métropole d'un million et demi d'habitants, une réforme datée, des villes
  comparables restées sous l'ancien régime. Les deux méthodes employées
  donnent 21 800 logements autorisés en plus sur cinq ans pour la plus
  prudente — 4&nbsp;% du parc — et 43 500 sur six ans pour l'autre, soit
  9&nbsp;%. Sur les loyers, l'écart au scénario sans réforme est estimé entre
  23 et 28&nbsp;%.</p>
  <p>Ce n'est pas transposable tel quel : Auckland partait d'un zonage
  pavillonnaire extrême, et la Nouvelle-Zélande n'a ni nos communes, ni notre
  droit des sols. Le point n'est pas le chiffre, c'est le sens : quand le droit
  de construire s'ouvre, on construit, et les loyers baissent par rapport à ce
  qu'ils auraient été.</p>`,
    sources(d, "auckland_permis", "auckland_loyers"), "auckland")}
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
  loyer par référence à un loyer médian de quartier. L'expérimentation ouverte
  par la loi ELAN de 2018 s'éteint le 23 novembre 2026 sans loi nouvelle.</p>
  <p>Le bilan est celui qu'on attendait. Les loyers des logements concernés
  reculent de 2 à 4&nbsp;% hors Paris — environ 700 millions d'euros transférés
  chaque année aux locataires en place. Plus d'un nouveau bail sur trois
  dépasse pourtant le plafond, et plus de 40&nbsp;% dans certaines zones : un
  plafond qu'on ne peut pas faire respecter n'est pas une politique, c'est une
  loterie entre les locataires qui savent le faire valoir et les autres.</p>
  <p>Surtout, aucun de ces euros n'est un logement de plus. Le transfert va aux
  locataires <em>en place</em> ; celui qui cherche affronte la même rareté, avec
  moins d'offre à visiter.</p>
  <p class="source">${sources(d, "encadrement_villes", "encadrement_effet")}</p>`,
    "encadrement")}

${g.cle("Que fait un contrôle des loyers à l'offre ?",
    "À San Francisco, les bailleurs soumis à l'extension du contrôle en 1994 "
    + `ont retiré ${vc(d, "san_francisco_offre", 0)} de leur offre locative du `
    + "marché — vente à des occupants, démolition, reconstruction.",
    `<p>L'étude de Diamond, McQuade et Qian (<em>American Economic Review</em>,
  2019) est l'une des rares à mesurer les deux effets ensemble. Les locataires
  protégés y gagnent : ils restent, leur mobilité baisse de 20&nbsp;%, leur
  déplacement hors de la ville recule. Les logements, eux, sortent du parc
  locatif — et la hausse de loyer qui s'ensuit pour tous les autres annule, à
  l'échelle de la ville, le gain des protégés.</p>
  <p>C'est le mécanisme, pas l'anecdote : un prix plafonné sous le prix
  d'équilibre rend la location moins attrayante que les usages concurrents —
  vendre, habiter, louer meublé, ne pas louer du tout. La France n'y échappe
  pas plus que la Californie.</p>`,
    sources(d, "san_francisco_offre"), "controle")}

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
  calcul a changé en 2021, puis au 1er janvier 2026 — cette dernière révision
  faisant sortir environ 850 000 logements du statut de passoire sans qu'un mur
  ait bougé. Une interdiction de louer adossée à un thermomètre qu'on
  recalibre tous les trois ans n'est pas une politique climatique : c'est une
  incertitude de plus pour qui songeait à louer.</p>`, "dpe")}

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
`;

  return `
${g.affiche(
    "Deuxième chantier",
    "Louer",
    "Le droit du bail français protège le locataire en place, et lui seul. "
    + "Celui qui cherche — le jeune, le mobile, le précaire — affronte un parc "
    + "qui rétrécit et une sélection qui se durcit. La liberté du loyer et la "
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
  const moyenne = (n(d, "prestations_sociales") * 1000)
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
  années 1990, trouve que 78&nbsp;% de l'aide supplémentaire s'est retrouvée
  dans le loyer, sans amélioration observée de la qualité des logements. Les
  travaux postérieurs situent la fourchette entre 60 et 80&nbsp;%, d'autant
  plus haute que l'offre est rigide.</p>
  <p>Ce résultat ne dit pas qu'il faut cesser d'aider. Il dit que l'aide doit
  cesser d'être <em>indexée sur le loyer</em> : c'est ce lien qui la fait
  remonter dans le prix, et c'est le seul point que la proposition change.</p>`,
    sources(d, "apl_capture"), "capture")}

${g.depliant("Ce que l'État verse, et à qui",
    `<p>${vc(d, "prestations_sociales")} d'aides personnelles — ${g.terme("APL")},
  ALS, ALF — vont à ${vc(d, "menages_aides")} de ménages, soit environ
  ${euros(moyenne)} par mois et par ménage aidé. S'y ajoutent
  ${v(d, "subventions")} de ${g.terme("aide à la pierre")},
  ${v(d, "bonifications")} de bonifications de taux, et
  ${v(d, "depenses_fiscales")} de ${g.terme("dépense fiscale")} — taux réduit de
  TVA sur l'entretien, réductions d'impôt pour investissement locatif,
  exonérations diverses.</p>
  <p>Soit ${vc(d, "aides_totales_2024")} en ${an(d, "aides_totales_2024")},
  répartis entre une douzaine de dispositifs qui n'ont ni le même guichet, ni
  les mêmes conditions, ni la même administration — et dont le plus coûteux
  après les aides personnelles, la dépense fiscale, ne figure dans aucun budget
  voté ligne à ligne.</p>
  <p class="source">${sources(d, "prestations_sociales", "menages_aides",
    "depenses_fiscales")}</p>`, "verse")}

${g.depliant("Le logement social : un parc qui ne circule pas",
    `<p>${vc(d, "parc_social")} de logements, un ménage sur six, un loyer moyen
  de ${v(d, "loyer_social")} — moitié moins que dans le parc privé des grandes
  villes. C'est un patrimoine considérable, et il est mal employé pour une
  raison précise : il ne circule pas.</p>
  <p>${v(d, "parc_social_entrees")} de logements y sont entrés en
  ${an(d, "parc_social_entrees")}, 18 100 ont été démolis, 10 900 vendus. Les
  attributions tournent autour de ${nombre(n(d, "attributions_hlm"), 0)} par an,
  pour ${v(d, "demandes_hlm")} de ménages en attente et un délai moyen de
  ${v(d, "delai_hlm", 0)}. Le ${g.terme("droit au maintien dans les lieux")}
  garantit à l'occupant d'y rester quel que soit son revenu ultérieur : le
  surloyer existe, mais il est plafonné, contourné et, dans les quartiers
  prioritaires, inapplicable.</p>
  <p>Le résultat est un tirage au sort décalé dans le temps : ce qui compte
  n'est pas le besoin d'aujourd'hui, mais la date à laquelle on est entré.</p>
  <p class="source">${sources(d, "parc_social", "demandes_hlm", "delai_hlm")}</p>`,
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
      + "est une machine à défiance."],
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
    [String(majore), `${nombre(majore, 2)} % — 89 départements`],
    [String(TAUX_SANS_MAJORATION),
      `${nombre(TAUX_SANS_MAJORATION, 2)} % — 11 départements`],
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
  const corps = `
${g.depliant("Ce que le logement rapporte",
    `<p>${vc(d, "prelevements")} en ${an(d, "prelevements")} :
  ${nombre(3.4, 1)}&nbsp;% du produit intérieur brut,
  ${nombre(7.9, 1)}&nbsp;% de tous les prélèvements obligatoires du pays.
  L'essentiel tient en trois lignes — ${v(d, "taxe_fonciere")} de
  ${g.terme("taxe foncière")} sur le bâti, ${v(d, "tva_logement")} de TVA sur
  le neuf, les travaux et les services, ${v(d, "dmto")} de
  ${g.terme("DMTO")} — auxquelles s'ajoutent la TVA et les taxes sur l'énergie
  consommée dans le logement, les impôts sur les revenus locatifs et les
  plus-values.</p>
  <p>En face, ${v(d, "aides_totales_2024")} d'aides. Le logement n'est pas un
  secteur subventionné : c'est l'une des principales assiettes fiscales du
  pays.</p>
  <p class="source">${sources(d, "prelevements", "taxe_fonciere", "dmto")}</p>`,
    "rapporte")}

${g.depliant("Les droits de mutation taxent le mouvement",
    `<p>Un impôt se juge à ce qu'il décourage. Les ${g.terme("DMTO")}
  découragent le déménagement : ils sont dus à chaque changement de
  propriétaire, et ne dépendent ni du revenu, ni du patrimoine, ni de la
  plus-value réalisée. Le salarié qui suit son emploi à trois cents kilomètres,
  le couple qui se sépare, le retraité qui veut un logement plus petit et moins
  cher à chauffer paient tous le même ticket.</p>
  <p>Le taux atteint ${vc(d, "dmto_taux", 2)} dans 89 départements depuis que
  la loi de finances pour 2025 a permis d'ajouter un demi-point, du 1er avril
  2025 au 30 avril 2028 ; il reste à ${nombre(TAUX_SANS_MAJORATION, 2)}&nbsp;%
  dans onze. Les primo-accédants en sont exonérés sur la fraction du prix
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
      + "est compensée à l'euro par une fraction de la taxe foncière révisée "
      + "et par la suppression des niches — dont le "
      + `<a href="${g.lien("/chiffrage")}">chiffrage</a> montre qu'elle y `
      + "suffit."],
    ["La fin des niches de l'investissement locatif",
      `Les ${v(d, "depenses_fiscales")} de dépenses fiscales — dispositifs `
      + "locatifs, taux réduits, exonérations — sont supprimés et versés au "
      + "chèque logement. Une niche subventionne un montage, jamais un "
      + "besoin ; elle enrichit qui sait l'utiliser, et se retrouve dans le "
      + "prix du bien qu'elle vise."],
    ["La neutralité entre les statuts",
      "Louer nu, louer meublé, habiter son logement, le laisser vide : "
      + "quatre situations aujourd'hui imposées selon quatre régimes "
      + "différents, ce qui produit des arbitrages fiscaux plutôt que des "
      + "logements. Un régime unique des revenus fonciers les remplace."],
  ])}
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
    "hébergement d'urgence et logement très social")}
    <div class="action"><button type="submit">Recalculer →</button></div>
  </div>
</form>`;
}

function cascadeChiffrage(d, bilan) {
  const marches = [
    new g.Marche("Aides supprimées", bilan.remplacees, true, "var(--actuel)",
      `Aides personnelles (${milliards(bilan.prestations)}), bonifications de `
      + `taux (${milliards(bilan.bonifications)}) et dépenses fiscales `
      + `(${milliards(bilan.niches)}).`),
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

function pageChiffrage(d, parametres) {
  const reglages = reglagesChiffrage(d, parametres);
  const bilan = chiffrage(d, reglages);
  const parMenage = (bilan.cheque * 1000) / (n(d, "menages_aides") * 12);

  const verdict = bilan.solde >= 0
    ? `la réforme dégage <strong class="cle-texte">${milliards(bilan.solde)} `
      + "par an</strong>"
    : `la réforme demande <strong class="cle-texte">${milliards(-bilan.solde)} `
      + "par an</strong> de financement";

  const tableauBilan = g.tableau(
    ["Poste", "Milliards d'euros par an"],
    [
      ["Aides personnelles supprimées", milliards(bilan.prestations)],
      ["Bonifications de taux supprimées", milliards(bilan.bonifications)],
      ["Dépenses fiscales supprimées", milliards(bilan.niches)],
      ["Subventions à la pierre conservées",
        `− ${milliards(bilan.subventionsGardees)}`],
      ["Chèque logement versé", `− ${milliards(bilan.cheque)}`],
      ["Droits de mutation supprimés",
        bilan.perteDmto > 0 ? `− ${milliards(bilan.perteDmto)}` : "0 Md€"],
      ["<strong>Solde</strong>",
        `<strong>${bilan.solde >= 0 ? "+" : "−"} `
        + `${milliards(Math.abs(bilan.solde))}</strong>`],
    ],
    ["", "nombre"],
    "Le compte, poste par poste",
    true,
  );

  const corps = `
${formulaireChiffrage(d, reglages)}

${g.cle("Que coûte la proposition ?",
    `À ${euros(parMenage)} de chèque mensuel par ménage aidé, ${verdict}.`,
    `${cascadeChiffrage(d, bilan)}
  ${tableauBilan}
  <p>Le chèque retenu ici représente ${euros(parMenage)} par mois et par ménage
  aidé, contre ${euros(reglages.actuelle)} versés en moyenne aujourd'hui au
  titre des aides personnelles. Il est servi à ${v(d, "menages_aides")} de
  ménages — le nombre actuel de bénéficiaires, tenu constant.</p>`,
    sources(d, "prestations_sociales", "depenses_fiscales", "dmto",
      "menages_aides"), "compte")}

${g.depliant("Ce que ce calcul n'est pas",
    `<p>C'est une addition, pas un modèle budgétaire, et il faut le dire avant
  qu'on le découvre. Quatre choses n'y sont pas.</p>
  ${g.points([
    ["Aucun effet de comportement",
      "Ni la construction que la libération du droit des sols "
      + "déclencherait, ni la TVA et la taxe foncière qu'elle "
      + "apporterait, ni la baisse de loyer qu'une offre plus abondante "
      + "produirait, ni le surcroît de transactions qu'entraînerait la "
      + "suppression des droits de mutation. Tous joueraient dans le sens "
      + "favorable : les compter serait se faire plaisir."],
    ["Aucune montée en charge",
      "Le compte est celui du régime de croisière. La transition — les "
      + "baux en cours, les niches à extinction, les engagements "
      + "pluriannuels déjà pris envers les bailleurs — s'étale sur "
      + "plusieurs exercices et coûte davantage les premières années."],
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
  ])}
  <p>Ce que le calcul établit est donc modeste, et suffisant : la réforme
  <strong class="cle-texte">tient dans les agrégats existants</strong>. Elle ne
  suppose ni impôt nouveau, ni dette, ni économie sur les ménages modestes —
  les sommes qu'elle redéploie sont celles que le compte du logement publie
  chaque année.</p>`, "limites")}

${g.depliant("Les trois leviers, et ce qu'ils déplacent",
    `<p>Le formulaire ci-dessus porte les trois hypothèses qui pèsent. Voici ce
  que chacune vaut.</p>
  <ul class="leviers">
    <li><strong>Le chèque.</strong> Chaque tranche de 10 € mensuels sur
    ${v(d, "menages_aides")} de ménages coûte
    ${milliards(10 * 12 * n(d, "menages_aides") / 1000, 2)} par an. C'est le
    levier le plus lourd : doubler l'aide moyenne coûterait davantage que tout
    ce que la réforme supprime.</li>
    <li><strong>Les droits de mutation.</strong> Leur suppression coûte
    ${milliards(n(d, "dmto"))} de recettes — un montant qui suit le nombre de
    ventes, et qu'une année basse sous-estime.</li>
    <li><strong>Les subventions à la pierre.</strong>
    ${milliards(n(d, "subventions"))}, dont l'essentiel finance le logement
    très social et l'hébergement. La proposition les conserve en totalité par
    défaut : ce sont elles qui tiennent le plancher.</li>
  </ul>`, "leviers")}
`;

  return `
${g.affiche(
    "La preuve",
    "Le chiffrage",
    "Quatre chantiers, un compte. Les aides d'aujourd'hui financent le chèque "
    + "de demain et la suppression des droits de mutation — sur les agrégats "
    + "publiés, sans impôt nouveau. Les hypothèses se déplacent ci-dessous.",
  )}
${g.plan(corps, "/chiffrage")}
${corps}
`;
}

// -- la page Données ---------------------------------------------------------

/** L'ordre d'affichage des niveaux de fiabilité : du plus sûr au moins sûr. */
const ORDRE_FIABILITE = ["officielle", "academique", "calcul", "presse"];

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
      echapper(e.fiabilite),
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
    `${niveau} (${compte(niveau)} chiffres)`, FIABILITES[niveau],
  ]))}
  <p>Un chiffre marqué <em>presse</em> n'est pas un chiffre douteux : c'est un
  chiffre lu dans la reprise d'une publication que nous n'avons pas pu ouvrir
  directement, et qui doit être repris à sa source dès qu'elle est accessible.
  Le distinguer est le seul moyen de ne pas laisser un ordre de grandeur
  prendre, avec le temps, l'autorité d'une mesure.</p>`, "fiabilite")}

${g.depliant("La règle", `
  <p>Tout ce que ce site affiche de chiffré vient d'un seul fichier,
  <code>moteur/donnees.json</code>, où chaque entrée porte sa valeur, son
  unité, l'année qu'elle mesure, sa source, l'adresse de cette source, la date
  à laquelle elle a été lue et, au besoin, la note qui la situe. Aucune page
  n'écrit un nombre en dur ; une page qui demanderait une clé absente ne
  s'afficherait pas.</p>
  <p>Cette contrainte a un coût — un chiffre qu'on ne peut pas sourcer ne
  figure pas sur le site — et c'est le but. Les deux calculs du site, le coût
  fiscal d'un achat et le chiffrage de la réforme, n'utilisent eux aussi que
  ces valeurs-là.</p>`, "regle")}

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
