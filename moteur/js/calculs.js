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
 *     dit.
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
    // Ce que reçoit un ménage aidé aujourd'hui, en moyenne et par mois : le
    // point de comparaison du chèque, et il se déduit des deux agrégats.
    aideMoyenneActuelle: (allocations * 1000) / (menages * 12),
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
