/**
 * Les deux calculs du site, et rien d'autre.
 *
 * Ils tournent dans le navigateur, sur les seules valeurs de
 * `moteur/donnees.json` : aucun ne tire un paramètre de nulle part, et chacun
 * rend, avec son résultat, la liste des nombres dont il s'est servi — c'est ce
 * qui permet à la page de les afficher sous le résultat plutôt que de
 * demander au lecteur de nous croire.
 *
 *   * `coutMutation` : ce que l'État prélève quand un logement change de
 *     mains. Le barème est celui des droits de mutation, lu dans les données.
 *   * `chiffrage` : l'arithmétique de la proposition, sur les agrégats publiés
 *     du compte du logement, poste par poste et face à aujourd'hui. Ce n'est
 *     PAS un modèle budgétaire — il n'y a ni comportement, ni montée en
 *     charge, ni retour d'activité —, c'est une addition posée, et la page le
 *     dit. Les mesures qu'aucun agrégat ne mesure y sont estimées à part, en
 *     fourchette, sur des hypothèses que la page écrit.
 */

/** Le taux réduit, hors majoration départementale de 0,5 point. */
export const TAUX_SANS_MAJORATION = 5.81;

/**
 * Le seuil, en euros, sous lequel un primo-accédant échappe à la majoration
 * de 0,5 point ouverte par la loi de finances pour 2025.
 */
export const SEUIL_PRIMO = 250000;

/** La contribution de sécurité immobilière, perçue par l'État sur la vente. */
export const TAUX_CSI = 0.10;

/**
 * Ce que coûte un déménagement en impôt, et lui seul.
 *
 * Les émoluments du notaire n'y sont pas : ce sont des honoraires tarifés, la
 * rémunération d'un travail, et les mêler à l'impôt ferait dire au total autre
 * chose que ce qu'il dit. La page l'écrit sous le résultat.
 *
 * `taux` est le taux global des droits de mutation en vigueur dans le
 * département, en pourcentage. `primoAccedant` applique l'exonération de la
 * majoration sur la fraction du prix inférieure à `SEUIL_PRIMO`.
 */
export function coutMutation(prix, taux, primoAccedant = false) {
  if (!(prix > 0)) {
    throw new Error("le prix doit être un montant positif");
  }
  const majoration = Math.max(0, taux - TAUX_SANS_MAJORATION);
  const exoneree = primoAccedant ? Math.min(prix, SEUIL_PRIMO) : 0;
  const droits = (prix * taux - exoneree * majoration) / 100;
  const csi = (prix * TAUX_CSI) / 100;
  return {
    prix,
    taux,
    droits,
    csi,
    total: droits + csi,
    part: (100 * (droits + csi)) / prix,
    exoneree,
    majoration,
  };
}

/**
 * Le nombre d'années de loyer, ou de mensualités, que l'impôt de mutation
 * représente. C'est la seule façon de rendre un montant sensible : « 19 000 € »
 * ne dit rien, « six mois de loyer » dit tout.
 */
export function enMoisDeLoyer(montant, loyerMensuel) {
  if (!(loyerMensuel > 0)) {
    return null;
  }
  return montant / loyerMensuel;
}

/**
 * Un poste du compte, face à aujourd'hui.
 *
 * `aujourdhui` et `programme` sont les montants d'une année, avant et après la
 * réforme. `effet` est ce que la réforme change au compte : positif quand elle
 * cesse de verser ou commence à percevoir, négatif quand elle verse en plus ou
 * cesse de percevoir. `sens` dit lequel des deux cas se lit : une dépense qui
 * baisse rapporte, une recette qui baisse coûte. Une dépense fiscale — un impôt
 * qu'on ne perçoit pas — se compte comme une dépense, ce qu'elle est.
 */
function poste(cle, sens, aujourdhui, programme) {
  const effet = sens === "depense" ? aujourdhui - programme : programme - aujourdhui;
  return { cle, sens, aujourdhui, programme, effet };
}

/**
 * Une ligne qu'aucun agrégat publié ne mesure, estimée sur des hypothèses que
 * la page écrit en toutes lettres. Elle rend une fourchette en milliards
 * d'euros par an, au signe des effets — négative quand la mesure coûte —, et
 * `bas` est toujours la borne la plus défavorable au solde. Une estimation sans
 * fourchette a deux bornes égales.
 *
 * Les estimations ne se mêlent pas aux postes : le solde des postes est une
 * addition d'agrégats publiés, celui des estimations dépend d'hypothèses. Les
 * additionner sans le dire ferait passer les secondes pour les premiers.
 */
function estimation(cle, bas, haut = bas) {
  return { cle, bas: Math.min(bas, haut), haut: Math.max(bas, haut) };
}

/**
 * Une garantie publique du loyer, contre une prime : rien si la prime couvre
 * le risque, comme le programme le veut ; au plus, si l'État le portait seul,
 * ce que coûterait une garantie de presque tout le parc privé, telle que le
 * Gouvernement l'évaluait en 2013.
 */
function garantie(donnees) {
  return estimation("garantie", -donnees.valeur("gul_besoin") / 1000, 0);
}

/**
 * Un impayé jugé en trois mois, avec l'accompagnement social dès le premier
 * mois d'impayé.
 *
 * L'accompagnement : l'enquête sociale qu'une partie des ménages assignés
 * reçoit aujourd'hui, à son coût unitaire, offerte à chaque ménage en impayé —
 * au moins à ceux qui reçoivent un commandement de payer, au plus à tous ceux
 * qui connaissent un retard dans l'année —, moins ce qui s'y dépense déjà.
 * Les juges : rien si le délai tient par la procédure, au plus le double des
 * magistrats et des greffiers que le contentieux des expulsions occupe.
 */
function impaye(donnees) {
  const parEnquete = (donnees.valeur("enquetes_sociales_cout") * 1e6)
    / donnees.valeur("enquetes_sociales");
  const accompagner = (menages) => (menages * parEnquete) / 1e9
    - donnees.valeur("enquetes_sociales_cout") / 1000;
  const juges = (donnees.valeur("etp_magistrats_expulsions") * donnees.valeur("cout_magistrat")
    + donnees.valeur("etp_greffiers_expulsions") * donnees.valeur("cout_greffier")) / 1e9;
  return {
    ...estimation("impaye",
      -(accompagner(donnees.valeur("menages_impayes") * 1e6) + juges),
      -accompagner(donnees.valeur("commandements_payer"))),
    parEnquete,
    juges,
  };
}

/**
 * La clause de sauvegarde, à son coût de la première année : le complément y
 * est entier, et il décroît ensuite jusqu'à s'éteindre.
 *
 * À enveloppe constante, la perte des ménages aidés est celle que l'IPP a
 * simulée pour une aide qui dépend du revenu, de la taille du ménage et de la
 * zone, et non du loyer. Ses perdants perdent en moyenne une somme donnée ;
 * ses allocataires — les ménages que la réforme touche — reçoivent en moyenne
 * une aide donnée ; le rapport des deux dit quelle part de l'enveloppe les
 * perdants perdent.
 *
 * `ecart` est ce que le chèque retenu retire aux ménages aidés, en milliards
 * par an, face à l'aide moyenne d'aujourd'hui ; négatif, il leur donne. La
 * clause rend ce qu'il retire, au moins aux perdants et au plus à tous ; ce
 * qu'il donne réduit les pertes, au plus d'autant, sans les rendre négatives.
 */
function clause(donnees, allocations, ecart) {
  const touches = 100 - donnees.valeur("ipp_neutres");
  const perdants = donnees.valeur("ipp_perdants") / touches;
  const part = (perdants * donnees.valeur("ipp_perte_moyenne"))
    / donnees.valeur("ipp_aide_moyenne");
  const perte = part * allocations;
  const [moins, plus] = ecart >= 0
    ? [perte + ecart * perdants, perte + ecart]
    : [Math.max(0, perte + ecart * perdants), perte];
  return { ...estimation("clause", -plus, -moins), part };
}

/**
 * Le régime unique des revenus fonciers, sur la seule part que
 * l'administration a chiffrée : la location meublée rangée sous le régime de la
 * location nue, selon l'abattement retenu. Impôt sur le revenu seul.
 */
function regime(donnees) {
  return estimation("regime", donnees.valeur("meuble_regime_foncier_50") / 1000,
    donnees.valeur("meuble_regime_foncier") / 1000);
}

/**
 * L'arithmétique de la proposition, en milliards d'euros par an.
 *
 * Elle pose ses gestes poste par poste, chacun face à ce qu'il est aujourd'hui,
 * et les additionne :
 *
 *   1. les aides personnelles — APL, ALS, ALF —, les bonifications de taux et
 *      les dépenses fiscales sont supprimées : c'est ce que la réforme cesse
 *      de dépenser ;
 *   2. un chèque logement est versé à la place, à un nombre de ménages donné,
 *      pour un montant mensuel donné ;
 *   3. les autres prestations sociales du logement — l'aide sociale à
 *      l'hébergement, les fonds de solidarité logement, le chèque énergie —
 *      ne sont pas des aides personnelles, et restent ce qu'elles sont ;
 *   4. les subventions à la pierre sont conservées, en tout ou partie ;
 *   5. les droits de mutation sont supprimés — c'est une recette qui manque.
 *
 * Les postes qui ne bougent pas sont dans la liste : un compte face à
 * aujourd'hui doit montrer ce qu'il garde, et non seulement ce qu'il change.
 * Le solde est la somme des effets, et rien d'autre ; il est positif quand la
 * réforme dégage une marge, négatif quand elle demande un financement.
 *
 * Les mesures qu'aucun agrégat publié ne mesure — le recours, l'impayé, la
 * garantie du loyer, l'accession, la clause de sauvegarde, le régime unique
 * des revenus fonciers — sont estimées et additionnées à part : `estimeBas` et
 * `estimeHaut` bornent leur total, `soldeBas` et `soldeHaut` le solde qui les
 * compte.
 *
 * Aucun effet de comportement n'est modélisé : ni la construction que la
 * libération du droit des sols déclencherait, ni les recettes qu'elle
 * apporterait, ni la baisse de loyer qu'une offre plus abondante produirait.
 * Ils joueraient tous dans le même sens, et les compter serait se faire
 * plaisir.
 */
export function chiffrage(donnees, reglages) {
  const {
    chequeMensuel, menages, supprimerDmto = true, partSubventions = 1.0,
  } = reglages;

  const allocations = donnees.valeur("allocations_logement");
  const prestations = donnees.valeur("prestations_sociales");
  const bonifications = donnees.valeur("bonifications");
  const niches = donnees.valeur("depenses_fiscales");
  const subventions = donnees.valeur("subventions");
  const dmto = donnees.valeur("dmto");

  const remplacees = allocations + bonifications + niches;
  const autresPrestations = prestations - allocations;
  const cheque = (chequeMensuel * 12 * menages) / 1000;
  const perteDmto = supprimerDmto ? dmto : 0;
  const subventionsGardees = subventions * partSubventions;
  const subventionsRendues = subventions - subventionsGardees;

  const postes = [
    poste("allocations", "depense", allocations, 0),
    poste("bonifications", "depense", bonifications, 0),
    poste("niches", "depense", niches, 0),
    poste("cheque", "depense", 0, cheque),
    poste("autres_prestations", "depense", autresPrestations, autresPrestations),
    poste("pierre", "depense", subventions, subventionsGardees),
    poste("dmto", "recette", dmto, dmto - perteDmto),
  ];
  const somme = (garder) => postes
    .filter((p) => garder(p.effet))
    .reduce((total, p) => total + p.effet, 0);
  const plus = somme((effet) => effet > 0);
  const moins = somme((effet) => effet < 0);

  // L'ouverture du chèque à l'accession : les ménages accédants aidés
  // retrouvent la part qu'ils avaient en 2017, dernière année où l'aide
  // personnelle leur était ouverte, et chacun reçoit le chèque retenu.
  const accedantsNouveaux = (donnees.valeur("accedants")
    * (donnees.valeur("accedants_aides_2017") - donnees.valeur("accedants_aides"))) / 100;
  const aideMoyenneActuelle = (allocations * 1000) / (menages * 12);

  // Le recours jugé dans un délai fixe : le délai existe, l'instance unique
  // aussi en zone tendue ; les étendre ne demande pas de juge, en supprimer
  // l'appel en libère. Compté pour zéro, et la ligne dit pourquoi.
  const estimations = [
    estimation("recours", 0),
    impaye(donnees),
    garantie(donnees),
    estimation("accession", -(chequeMensuel * 12 * accedantsNouveaux) / 1000),
    clause(donnees, allocations,
      ((aideMoyenneActuelle - chequeMensuel) * 12 * menages) / 1000),
    regime(donnees),
  ];
  const estimeBas = estimations.reduce((total, e) => total + e.bas, 0);
  const estimeHaut = estimations.reduce((total, e) => total + e.haut, 0);

  return {
    allocations,
    prestations,
    autresPrestations,
    bonifications,
    niches,
    subventions,
    subventionsGardees,
    subventionsRendues,
    dmto,
    remplacees,
    cheque,
    perteDmto,
    postes,
    plus,
    moins,
    solde: plus + moins,
    accedantsNouveaux,
    estimations,
    estimeBas,
    estimeHaut,
    soldeBas: plus + moins + estimeBas,
    soldeHaut: plus + moins + estimeHaut,
    // Ce que reçoit un ménage aidé aujourd'hui, en moyenne et par mois : le
    // point de comparaison du chèque, et il se déduit des deux agrégats.
    aideMoyenneActuelle,
  };
}

/**
 * Les bornes du chèque : en deçà, la réforme prend à des ménages modestes ;
 * au-delà, elle coûte plus que ce qu'elle remplace. Ce sont des repères
 * d'affichage, pas des règles.
 *
 * Le point de comparaison est l'aide personnelle — APL, ALS, ALF — et elle
 * seule : c'est elle que le chèque remplace. Le total des prestations sociales
 * du logement y ajoutait l'aide sociale à l'hébergement des personnes âgées et
 * le chèque énergie, et gonflait d'autant la « moyenne versée aujourd'hui ».
 */
export function bornesCheque(donnees, menages) {
  const actuelle = (donnees.valeur("allocations_logement") * 1000) / (menages * 12);
  return { plancher: Math.floor(actuelle / 10) * 10, actuelle };
}
