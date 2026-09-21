/**
 * Rendu HTML, sans moteur de gabarits.
 *
 * Les fonctions ci-dessous assemblent du HTML et échappent systématiquement ce
 * qui vient du lecteur.
 *
 * Ce fichier et `moteur/style.css` viennent du simulateur de retraite du même
 * parti — `github.com/g-pliberal/retraitecomptenotionelle` —, dont ce site
 * reprend l'affiche : même vert profond, même or, mêmes deux polices, mêmes
 * composants. Ils y étaient produits depuis un modèle Python ; ici ils sont
 * tenus à la main, et c'est le seul endroit où ils existent. Ce qui est propre
 * aux retraites en a été retiré ; ce qui fait l'identité est conservé au
 * caractère près, pour que les deux sites se reconnaissent comme un seul.
 */

import { echapper, formatFixe } from "./format.js";

export const DEPOT = "https://github.com/g-pliberal/logement";

/**
 * Le site dont cette page est une pièce. Elle ne charge rien de lui — ni
 * feuille, ni police, ni script — et n'y renvoie que par ce lien, en pied.
 */
export const SITE_PARENT = "https://partiliberalfrancais.fr/";

/**
 * Ce qui signe une carte exportée en image. Une image quittant le site n'a plus
 * ni barre d'adresse ni pied de page : sans ces deux lignes, elle circule sans
 * dire d'où elle vient ni qui l'a produite, et le premier qui la republie en
 * devient la source.
 */
export const SIGNATURE = "@pliberal";
export const SIGNATURE_SITE = "Parti libéral français — le logement";

/**
 * L'adresse qu'une image emporte. Celle du site parent, et non celle de GitHub
 * Pages : c'est là que le lecteur d'un post doit atterrir. Elle vaut pour les
 * cartes de la page Partager comme pour les images composées sous un
 * graphique — une image qui circule sans adresse ne ramène personne.
 */
export const ADRESSE_SITE = "g-pliberal.github.io/logement";

/** Espace insécable fin, séparateur de milliers à la française. */
const FINE = "\u202f";

/**
 * La navigation, par FONCTION et non par page : le message, la preuve, la
 * confiance. Copie de `GROUPES_NAVIGATION` dans `web/gabarit.py`.
 */
export const GROUPES_NAVIGATION = [
  ["Le programme", [["/", "Programme"]]],
  ["Le constat", [["/constat", "Constat"]]],
  ["Les quatre chantiers", [["/construire", "Construire"], ["/louer", "Louer"],
    ["/aider", "Aider"], ["/fiscalite", "Fiscalité"]]],
  ["La preuve", [["/chiffrage", "Chiffrage"], ["/donnees", "Données"]]],
];

export const LIENS = GROUPES_NAVIGATION.flatMap(([, liens]) => liens);

/**
 * Les réglages de modélisation en vigueur, écrits comme une requête —
 * « indexation=prix&bascule=2030 » —, et vides tant que tout est au défaut.
 *
 * C'est un état de module, et c'en est un à dessein. Les réglages doivent
 * suivre le lecteur d'une page à l'autre, sinon la page Coût affiche d'autres
 * règles que celles qu'il vient de choisir ; or `lien` est
 * appelé à plus de cinquante endroits, au fond de corps de page qui ne
 * reçoivent rien d'autre que leur contexte. Leur passer la requête à tous
 * aurait fait cinquante signatures pour une valeur qui ne change qu'une fois
 * par rendu. Elle est donc posée en UN SEUL endroit — `pages.rendre`, le point
 * d'entrée unique du rendu — et remise à zéro à chaque appel, de sorte
 * qu'aucun rendu ne peut hériter des réglages du précédent.
 */
let OPTIONS = "";

/** Fixe les réglages que porteront les liens internes. Voir `OPTIONS`. */
export function poserOptions(requete) {
  OPTIONS = requete || "";
}

/** Les réglages en vigueur, pour qui doit les écrire lui-même. */
export function options() {
  return OPTIONS;
}

/**
 * Adresse d'une page interne, réglages de modélisation compris.
 *
 * Le site tient dans une seule page : la navigation passe par l'ancre de
 * l'adresse (`#/cas-types`). L'ancre de section, elle, ne peut pas s'y ajouter
 * — la place est prise — et n'est acceptée que pour que les appels disent vers
 * quoi ils pointent.
 *
 * Quand le lecteur a changé un réglage du chiffrage, l'adresse le porte :
 * c'est ainsi qu'une page chiffrée se partage telle qu'elle a été lue. Tant
 * qu'il n'a rien changé, la requête est vide et l'adresse est nue.
 */
export function lien(chemin, ancre = "") {
  return `#${chemin}${OPTIONS ? `?${OPTIONS}` : ""}`;
}

/**
 * L'adresse NUE d'une page, sans les réglages : la cible d'un formulaire.
 *
 * Un formulaire en `GET` écrit lui-même la requête, à partir de ses champs ;
 * le routeur d'`index.html` colle celle-ci derrière l'action. Une action qui
 * porterait déjà une requête en donnerait donc deux —
 * « #/cout?indexation=prix?indexation=prix ». Les formulaires visent la route,
 * les liens visent `lien`.
 */
export function route(chemin) {
  return `#${chemin}`;
}

export function navigation(cheminActif = "/") {
  // Les liens du bandeau, par groupe : une étiquette, puis les pages.
  const liensDuGroupe = (liens) => liens.map(([chemin, libelle]) => `<a href="${lien(chemin)}"`
    + (chemin === cheminActif ? ' aria-current="page"' : "")
    + `>${echapper(libelle)}</a>`).join("");
  return GROUPES_NAVIGATION.map(([etiquette, liens]) => (
    `<span class="groupe"><span class="etiquette">${echapper(etiquette)}</span>`
    + `<span class="liens">${liensDuGroupe(liens)}</span></span>`
  )).join("");
}

/**
 * Bandeau de tête, précédé du lien d'évitement.
 *
 * Le lien d'évitement est le premier élément parcouru au clavier. Le repère de
 * navigation porte un nom : une page peut en compter plusieurs, et
 * « navigation » tout court ne dit pas laquelle on parcourt.
 */
export function entete(cheminActif = "/") {
  return `<a class="evitement" href="#contenu">Aller au contenu</a>
<header class="bandeau"><div class="interieur">
  <p class="nom"><a href="${lien("/")}">${icone("house")}<span>Logement</span></a></p>
  <nav aria-label="Navigation principale">${navigation(cheminActif)}</nav>
</div></header>`;
}

/**
 * Le bloc de tête d'une page : sur-titre, titre massif, chapeau.
 *
 * C'est l'unité qui fait de chaque page une affiche, et elle est la même
 * partout pour que les huit se reconnaissent comme un seul site. Le titre est
 * le `<h1>` de la page — le seul, depuis que le nom du site a cédé la place —,
 * et il est mis en capitales par le STYLE, jamais dans le texte.
 *
 * Copie d'`affiche` dans `web/gabarit.py`.
 */
export function affiche(surtitre, titre, chapeau) {
  return `<div class="affiche"><p class="surtitre">${echapper(surtitre)}</p>`
    + `<h1>${titre}</h1><p class="chapeau">${chapeau}</p></div>`;
}

/**
 * Pied de page.
 *
 * Il porte ce que le lecteur doit savoir avant de citer un chiffre : d'où
 * viennent les nombres, sous quelle licence ils circulent, et à quelle date ils
 * ont été lus. Un chiffre de politique publique sans sa date ne vaut rien : les
 * lois de finances en déplacent chaque année.
 *
 * Il ne porte AUCUNE mention légale. Le site qui accueille ces pages —
 * partiliberalfrancais.fr — édite et héberge ; l'identification de l'éditeur,
 * la politique de données personnelles et la déclaration d'accessibilité sont
 * les siennes, et deux déclarations concurrentes valent moins qu'une.
 */
export function pied() {
  return `<footer>
  <p><strong>Chaque chiffre de ce site porte sa source et sa date.</strong>
  Ils sont rassemblés sur la page
  <a href="${lien("/donnees")}">Données</a>, avec le lien vers la publication
  d'origine et le niveau de confiance qu'on peut leur accorder. Aucun n'est
  estimé sans le dire.</p>
  <p>Rien n'est envoyé à un serveur : les calculs de ce site — le coût d'un
  déménagement, le chiffrage de la réforme — se font dans votre navigateur, et
  les polices comme les pictogrammes sont servis par le dépôt.</p>
  <p>Textes, données et code sur <a href="${DEPOT}">GitHub</a> (code sous licence
  Apache 2.0, infographies et textes sous
  <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr">CC BY-SA 4.0</a>).</p>
  <p class="retour-site">Une proposition du <a href="${SITE_PARENT}" target="_top">Parti libéral français</a>.</p>
</footer>`;
}

// -- fragments ---------------------------------------------------------------

/** Nombre à la française : virgule décimale, espace insécable des milliers. */
export function nombre(valeur, decimales = 2) {
  return formatFixe(valeur, decimales, true).replace(/,/g, FINE).replace(".", ",");
}

/** Montant en euros. */
export function euros(montant) {
  return `${nombre(montant, 0)}${FINE}€`;
}

/**
 * Montant en euros ET en centimes.
 *
 * L'unité des PENSIONS, parce que c'est celle que la caisse verse : depuis le
 * 1er décembre 1986, les prestations de vieillesse sont payées « sur un montant
 * non arrondi (y compris les centimes) » — décrets n° 86-130 et 86-131 du
 * 28 janvier 1986, circulaire Cnav 49/86 du 25 juin 1986. La règle d'arrondi qui
 * la précédait — total trimestriel porté au multiple de 50 centimes supérieur,
 * loi n° 50-147 du 3 février 1950 — a été supprimée à cette date. Afficher
 * l'euro rond laissait croire à un arrondi que le droit ne fait pas.
 */
export function eurosCentimes(montant) {
  return `${nombre(montant, 2)}${FINE}€`;
}

export function pourcentage(valeur, signe = false, decimales = 1) {
  let texte = nombre(valeur * 100, decimales);
  if (signe && valeur >= 0) {
    texte = `+${texte}`;
  }
  return `${texte}${FINE}%`;
}

const GROUPES = /\d{1,3}(?:,\d{3})+(?:\.\d+)?/g;
const DECIMAL = /\d+\.\d+/g;
const AVANT_POURCENT = /(\d)%/g;

/**
 * Convertit les nombres à l'anglaise produits par le moteur.
 *
 * « 17,542 € × rendement 6.00% » devient « 17 542 € × rendement 6,00 % ». Le
 * moteur formate ses libellés de calcul pour un terminal ; la page web les
 * présente à un lecteur francophone, pour qui « 17,542 » se lit 17,5.
 */
export function franciser(texte) {
  return texte
    .replace(GROUPES, (trouve) => trouve.replace(/,/g, FINE))
    .replace(DECIMAL, (trouve) => trouve.replace(".", ","))
    .replace(AVANT_POURCENT, `$1${FINE}%`);
}

/**
 * Un complément d'information, sous un point d'interrogation.
 *
 * Même mécanique que `mot` — un bouton, une bulle, le basculement en écoute
 * déléguée dans `index.html` —, mais l'ancre n'est pas un mot de la phrase :
 * c'est un appel, posé après un titre ou un libellé de champ. Ce qui est
 * nécessaire pour remplir un champ ou lire un chiffre reste écrit ; ce qui
 * explique, nuance ou justifie tient ici, et ne s'ouvre que si on le demande.
 *
 * `sujet` nomme le bouton pour qui ne voit pas le point d'interrogation : c'est
 * son seul nom accessible. `texte` est du HTML, mais du HTML de PHRASE — la
 * bulle est un `<span>`, où un `<p>` ne serait pas valide.
 */
export function bulle(sujet, texte) {
  return '<span class="mot"><button type="button" class="terme appel" '
    + `aria-expanded="false" aria-label="${echapper(sujet)}">`
    + `${icone("circle-help")}</button>`
    + `<span class="bulle" role="note" hidden>${texte}</span></span>`;
}

/**
 * Le glossaire du site : un mot de spécialiste, sa définition en une ou deux
 * phrases de français courant. Copie de `GLOSSAIRE` dans `web/gabarit.py`,
 * entrée pour entrée — les témoins des pages le vérifient.
 */
export const GLOSSAIRE = Object.freeze({
  "FSL":
    "Le fonds de solidarité pour le logement : une aide départementale qui "
    + "paie un dépôt de garantie, apure une dette de loyer ou règle une "
    + "facture d'énergie, pour éviter qu'un impayé ne devienne une expulsion. "
    + "Il agit tôt ou il n'agit pas.",
  "loyer imputé":
    "Le loyer qu'un propriétaire occupant ne paie pas, et qui est pourtant un "
    + "revenu : s'il louait son logement à un autre, il l'encaisserait. La "
    + "comptabilité nationale le compte dans la richesse produite ; l'impôt "
    + "sur le revenu l'ignore. C'est l'avantage le plus important, et le plus "
    + "invisible, que le droit français accorde au fait d'être propriétaire.",
  "zone tendue":
    "Une commune où la demande de logements dépasse durablement l'offre. "
    + "L'administration en tient la liste — le « zonage » A bis, A, B1, B2, "
    + "C —, et c'est elle qui commande les aides, les plafonds de loyer et "
    + "les avantages fiscaux. Un zonage se décide à Paris, et vieillit mal.",
  "PLU":
    "Le plan local d'urbanisme : le document, communal ou intercommunal, qui "
    + "dit pour chaque parcelle ce qu'on a le droit d'y construire — hauteur, "
    + "emprise au sol, nombre de places de stationnement, aspect. C'est lui "
    + "qui fabrique la rareté, parcelle par parcelle.",
  "permis de construire":
    "L'autorisation d'urbanisme délivrée par le maire. Le délai d'instruction "
    + "est de deux à trois mois ; c'est ensuite que commencent les recours, "
    + "qui se comptent en mois, parfois en années.",
  "ZAN":
    "« Zéro artificialisation nette » : l'objectif, posé par la loi Climat et "
    + "résilience de 2021, de ne plus consommer d'espace naturel ou agricole "
    + "à l'horizon 2050, par paliers. Il plafonne le foncier constructible "
    + "que chaque territoire peut ouvrir, indépendamment de sa demande.",
  "DMTO":
    "Les droits de mutation à titre onéreux : l'impôt payé à l'achat d'un "
    + "logement, l'essentiel de ce qu'on appelle les « frais de notaire ». "
    + "Il frappe le déménagement, pas la fortune : deux ménages qui "
    + "échangent leurs logements paient deux fois.",
  "taxe foncière":
    "L'impôt annuel payé par le propriétaire, assis sur la valeur locative "
    + "cadastrale du logement — une valeur administrative fixée en 1970 et "
    + "revalorisée par coefficient depuis.",
  "APL":
    "L'aide personnalisée au logement, avec l'ALS et l'ALF : une aide versée "
    + "au locataire, calculée sur son revenu, sa famille, sa zone et son "
    + "loyer réel dans la limite d'un plafond. C'est le fait qu'elle suive le "
    + "loyer qui pose problème : une partie s'en va dans le prix.",
  "aide à la pierre":
    "L'argent public versé à qui construit ou rénove — subventions aux "
    + "bailleurs sociaux, prêts bonifiés — par opposition à l'aide versée au "
    + "ménage. Elle finance un logement, jamais une personne.",
  "dépense fiscale":
    "Une niche : un impôt qu'on renonce à percevoir pour encourager quelque "
    + "chose. Taux réduit de TVA sur les travaux, réductions d'impôt pour "
    + "investissement locatif, exonérations. Elle coûte autant qu'une "
    + "subvention, mais ne figure dans aucun budget voté ligne à ligne.",
  "encadrement des loyers":
    "Le plafonnement du loyer d'un logement mis en location, par référence à "
    + "un loyer médian de quartier. Expérimenté depuis la loi ELAN de 2018 "
    + "dans les communes qui le demandent.",
  "passoire thermique":
    "Un logement classé F ou G au diagnostic de performance énergétique. "
    + "La loi en interdit progressivement la location : G depuis 2025, F en "
    + "2028, E en 2034.",
  "DPE":
    "Le diagnostic de performance énergétique : une lettre, de A à G, censée "
    + "mesurer ce qu'un logement consomme. Sa méthode de calcul a changé en "
    + "2021, puis en 2026 — et des centaines de milliers de logements ont "
    + "changé de classe sans qu'un mur ait bougé.",
  "logement social":
    "Un logement loué sous plafond de ressources et de loyer par un bailleur "
    + "agréé. Le parc en compte 5,4 millions, un logement sur six.",
  "droit au maintien dans les lieux":
    "La règle qui permet à un locataire du parc social d'y rester quel que "
    + "soit son revenu ultérieur. Elle fait du logement social un droit "
    + "acquis à vie, alors que la file d'attente, elle, se renouvelle.",
  "charge foncière":
    "Ce que coûte le terrain dans une opération immobilière, droits à "
    + "construire compris. C'est le prix de l'autorisation autant que celui "
    + "du sol : à construction identique, il varie du simple au triple selon "
    + "ce que le PLU permet.",
  "offre":
    "Le nombre de logements réellement disponibles. C'est la grandeur que "
    + "toute politique du logement finit par rencontrer : une aide qui ne "
    + "l'augmente pas se retrouve dans le prix.",
});

/**
 * Un mot du glossaire, tel qu'il se lit dans la phrase. `cle` est l'entrée du
 * glossaire quand le mot s'écrit autrement ; un mot absent est une faute de
 * programme, et lève.
 */
export function terme(motAffiche, cle = "") {
  const entree = cle || motAffiche;
  if (!(entree in GLOSSAIRE)) {
    throw new Error(`mot absent du glossaire : ${entree}`);
  }
  return mot(motAffiche, GLOSSAIRE[entree]);
}

/**
 * Un champ, son libellé, son aide courte et, s'il en faut, sa bulle.
 *
 * `aide` tient en une ligne sous le libellé : c'est ce qu'il faut savoir pour
 * remplir le champ. `complement` est tout le reste — la raison, la nuance, la
 * source —, qui s'ouvre sous un point d'interrogation.
 */
export function champ(nom, libelle, valeur, aide = "", type = "text", attributs = {},
  complement = "") {
  const supplement = Object.entries(attributs)
    .map(([cle, val]) => ` ${cle.replace(/_+$/, "").replace(/_/g, "-")}="${echapper(val)}"`)
    .join("");
  const aideHtml = aide ? `<span class="aide">${echapper(aide)}</span>` : "";
  const appel = complement ? bulle(`${libelle} : en savoir plus`, complement) : "";
  return `<div><label for="${nom}">${echapper(libelle)}${appel}${aideHtml}</label>`
    + `<input type="${type}" id="${nom}" name="${nom}" `
    + `value="${echapper(valeur)}"${supplement}></div>`;
}

/**
 * Une date, saisie au calendrier du navigateur.
 *
 * `type="date"` et non `type="month"` : le modèle ne descend pas sous le mois,
 * et « month » serait donc le champ juste — mais Firefox et Safari ne savent
 * pas l'ouvrir, ils le rendent en texte brut où il faut écrire « 1975-03 » à
 * la main. « date » ouvre le même calendrier partout, et le navigateur l'écrit
 * dans la langue du lecteur : « 15/03/1975 » ici.
 *
 * Le jour ne sert à rien au calcul, qui compte en mois : celui de la naissance
 * est gardé tel qu'il est saisi, parce qu'une date de naissance est une date
 * et non un mois ; ceux des dates de carrière sont ramenés au premier du mois,
 * où le droit place toute prise d'effet.
 *
 * `calcul` est ce que la date vaut en âge — « soit 64 ans et 7 mois » : ce que
 * disaient les champs d'âge qu'elle remplace. Il est écrit au rendu et refait
 * à chaque frappe par le script de la page ; `aria-describedby` le rattache au
 * champ, faute de quoi il ne serait lu par personne.
 */
export function champDate(nom, libelle, valeur, aide = "", calcul = "", attributs = {},
  complement = "") {
  const supplement = Object.entries(attributs)
    .map(([cle, val]) => ` ${cle.replace(/_+$/, "").replace(/_/g, "-")}="${echapper(val)}"`)
    .join("");
  const aideHtml = aide ? `<span class="aide">${echapper(aide)}</span>` : "";
  const appel = complement ? bulle(`${libelle} : en savoir plus`, complement) : "";
  const decrit = calcul ? ` aria-describedby="${nom}-calcul"` : "";
  const calculHtml = calcul
    ? `<span class="calcul" id="${nom}-calcul" aria-live="polite">`
      + `${echapper(calcul)}</span>`
    : "";
  return `<div><label for="${nom}">${echapper(libelle)}${appel}${aideHtml}</label>`
    + `<input type="date" id="${nom}" name="${nom}" `
    + `value="${echapper(valeur)}"${decrit}${supplement}>${calculHtml}</div>`;
}

/**
 * Un champ de plusieurs lignes — le relevé de carrière, et lui seul.
 *
 * Une ligne par année : un `<input>` en donnerait une seule, où le relevé se
 * replierait en un ruban illisible. Le contenu est ÉCHAPPÉ comme partout
 * ailleurs, et posé sans espace autour : un `<textarea>` rend tout ce qu'il
 * contient, jusqu'au retour à la ligne qui suivrait la balise ouvrante.
 */
export function zone(nom, libelle, valeur, aide = "", lignes = 8, attributs = {}) {
  const supplement = Object.entries(attributs)
    .map(([cle, val]) => ` ${cle.replace(/_+$/, "").replace(/_/g, "-")}="${echapper(val)}"`)
    .join("");
  const aideHtml = aide ? `<span class="aide">${echapper(aide)}</span>` : "";
  return `<div><label for="${nom}">${echapper(libelle)}${aideHtml}</label>`
    + `<textarea id="${nom}" name="${nom}" rows="${lignes}"${supplement}>`
    + `${echapper(String(valeur))}</textarea></div>`;
}

/**
 * Un champ que le formulaire porte sans le montrer.
 *
 * Sert à ce que le formulaire renvoie un réglage qui ne se change pas dans le
 * formulaire mais par un lien — l'unité de saisie des salaires : la changer
 * convertit les montants, ce qu'un menu HTML ne sait pas faire.
 */
export function cache(nom, valeur) {
  return `<input type="hidden" name="${nom}" value="${echapper(String(valeur))}">`;
}

/**
 * Un menu déroulant. Une option est `[code, texte]`, ou
 * `[code, texte, disponible]`, ou `[code, texte, disponible, attributs]`. Une
 * option indisponible est rendue `disabled` — grisée, et impossible à
 * choisir — SAUF si elle est la sélection : un navigateur n'envoie pas la
 * valeur d'une option choisie mais désactivée, et la saisie repartirait sur
 * le statut par défaut sans que rien ne le dise. Le refus, lui, se fait au
 * calcul.
 */
export function liste(nom, libelle, options, selection, aide = "", attributs = {},
  complement = "") {
  const supplement = Object.entries(attributs)
    .map(([cle, val]) => ` ${cle.replace(/_+$/, "").replace(/_/g, "-")}="${echapper(val)}"`)
    .join("");
  const optionHtml = (option) => {
    const [code, texte] = option;
    const disponible = option.length > 2 ? option[2] : true;
    const propres = Object.entries(option.length > 3 ? option[3] : {})
      .map(([cle, val]) => ` ${cle}="${echapper(String(val))}"`)
      .join("");
    return `<option value="${echapper(code)}"`
      + (code === selection ? " selected" : "")
      + (disponible || code === selection ? "" : " disabled")
      + propres
      + `>${echapper(texte)}</option>`;
  };
  // Une entrée `[libelle, [options]]` — dont le second élément est une LISTE
  // et non un texte — est un groupe, rendu sous un `<optgroup>`.
  const choix = options.map((option) => (
    Array.isArray(option[1])
      ? `<optgroup label="${echapper(option[0])}">`
        + option[1].map(optionHtml).join("") + "</optgroup>"
      : optionHtml(option)
  )).join("");
  const aideHtml = aide ? `<span class="aide">${echapper(aide)}</span>` : "";
  const appel = complement ? bulle(`${libelle} : en savoir plus`, complement) : "";
  return `<div><label for="${nom}">${echapper(libelle)}${appel}${aideHtml}</label>`
    + `<select id="${nom}" name="${nom}"${supplement}>${choix}</select></div>`;
}

/** Cellule de tableau portant une teinte de fond proportionnelle à sa valeur. */
export class Cellule {
  constructor(html, intensite = 0.0) {
    this.html = html;
    this.intensite = intensite;
  }

  style() {
    if (!this.intensite) {
      return "";
    }
    // Teintes calibrées pour rester lisibles sur fond clair comme sur fond
    // sombre : rouge = ce qui manque, vert-de-gris = ce qui s'ajoute.
    const couleur = this.intensite < 0 ? "162, 71, 46" : "90, 116, 80";
    const alpha = Math.min(Math.abs(this.intensite), 1.0) * 0.3;
    return ` style="background: rgba(${couleur}, ${formatFixe(alpha, 2)})"`;
  }
}

/**
 * Tableau de données.
 *
 * `titre` devient le `<caption>`. Sans lui, un lecteur d'écran qui arrive sur
 * la grille annonce « tableau, 4 colonnes, 41 lignes » et rien de plus : il
 * faut en sortir pour deviner ce qu'elle contient. Il nomme aussi la zone
 * défilante, qui porte `tabindex` afin d'être atteignable au clavier là où le
 * tableau dépasse la largeur de l'écran.
 *
 * `enteteDeLigne` promeut la première cellule de chaque ligne en
 * `<th scope="row">`. C'est ce qui permet à la synthèse vocale d'annoncer
 * « Cnav, 2019, 89,4 » plutôt que trois nombres nus : sans en-tête de ligne,
 * une cellule lue au hasard dans la grille n'est rattachée à rien.
 */
export function tableau(entetes, lignes, classesColonnes = null, titre = "",
                        enteteDeLigne = false, attributsLignes = null,
                        triable = false, identifiant = "") {
  const classes = classesColonnes || entetes.map(() => "");
  // `triable` fait de chaque en-tête un bouton que le script d'`index.html`
  // écoute ; `attributsLignes` pose sur chaque `<tr>` ce que le filtre lit.
  const tete = entetes.map((intitule, i) => `<th class="${classes[i]}" scope="col">`
    + (triable
      ? `<button type="button" class="tri" data-colonne="${i}">${echapper(intitule)}</button>`
      : echapper(intitule))
    + "</th>").join("");
  const attributs = attributsLignes || lignes.map(() => ({}));
  const cellule = (valeur, classe, premiere) => {
    const balise = premiere && enteteDeLigne ? "th" : "td";
    const portee = balise === "th" ? ' scope="row"' : "";
    return `<${balise} class="${classe}"${portee}`
      + (valeur instanceof Cellule ? valeur.style() : "")
      + ">"
      + (valeur instanceof Cellule ? valeur.html : valeur)
      + `</${balise}>`;
  };
  const corps = lignes.map((ligne, rang) => "<tr"
    + Object.entries(attributs[rang])
      .map(([cle, val]) => ` ${cle}="${echapper(String(val))}"`).join("")
    + `>${
      ligne.slice(0, classes.length)
        .map((valeur, i) => cellule(valeur, classes[i], i === 0)).join("")
    }</tr>`).join("");
  const legendeHtml = titre ? `<caption><span>${echapper(titre)}</span></caption>` : "";
  const nom = titre ? ` role="region" aria-label="${echapper(titre)}"` : "";
  const cible = identifiant ? ` id="${echapper(identifiant)}"` : "";
  return `<div class="defilant" tabindex="0"${nom}><table${cible}>${legendeHtml}`
    + `<thead><tr>${tete}</tr></thead>`
    + `<tbody>${corps}</tbody></table></div>`;
}

/**
 * Les phrases qu'un tableau ne peut pas porter dans ses cellules.
 *
 * Elles tenaient jusqu'ici dans un attribut `title`, c'est-à-dire nulle part :
 * une infobulle de survol ne s'ouvre ni au clavier, ni au doigt, ni sous une
 * synthèse vocale. Sorties du tableau, elles se lisent dans tous les cas.
 */
/** Ce qu'un niveau de fiabilité s'appelle sous les yeux du lecteur : les clés
 * restent sans accent dans les attributs et les adresses. Voir le Python. */
const FIABILITE_EN_CLAIR = {
  estimee: "estimée", moyenne: "moyenne", haute: "haute", certifiee: "certifiée",
};

export function fiabiliteEnClair(niveau) {
  const cle = String(niveau);
  return FIABILITE_EN_CLAIR[cle] ?? cle;
}

export function gloses(entrees) {
  if (!entrees.length) {
    return "";
  }
  const corps = entrees
    .map(([terme, texte]) => `<dt>${echapper(terme)}</dt><dd>${echapper(texte)}</dd>`)
    .join("");
  return `<dl class="gloses">${corps}</dl>`;
}

/**
 * Un chiffre, ce qu'il mesure, et au besoin la phrase qui le situe.
 *
 * `precision` est du HTML : elle porte parfois un lien ou un mot du glossaire.
 * Elle est facultative, et l'immense majorité des fiches du site s'en passent —
 * elle n'existe que pour les trois chiffres d'ouverture de la page Coût, où
 * « 422 milliards » ne veut rien dire tant qu'on n'a pas dit « en un an, pour
 * 17 millions de retraités ».
 */
export function fiche(etiquette, valeur, precision = "", definition = "") {
  const suite = precision ? `<div class="precision">${precision}</div>` : "";
  // `definition` fait de l'étiquette un mot du glossaire : la définition
  // s'ouvre sous elle, comme partout ailleurs sur le site.
  const nom = definition ? mot(etiquette, definition) : echapper(etiquette);
  return `<div class="fiche"><div class="valeur">${valeur}</div>`
    + `<div class="etiquette">${nom}</div>${suite}</div>`;
}

/**
 * Les pictogrammes du site, et rien qu'eux.
 *
 * Ils viennent tous de Lucide 1.46.0, sous licence ISC : une seule grille —
 * 24 × 24, trait de 2, extrémités et jointures arrondies —, si bien qu'ils
 * tiennent ensemble à toutes les tailles. Le site n'affichait jusque-là aucun
 * dessin : un emoji en guise d'icône de page, un chevron tracé à coups de
 * bordures CSS, le triangle que chaque navigateur donne à ses `<details>`, un
 * point d'interrogation en caractère. Trois dessins, trois grilles, trois
 * épaisseurs, et un emoji dont le rendu change avec le système.
 *
 * Le tracé est écrit ICI, et non chargé : le portage JavaScript n'utilise
 * aucune bibliothèque, et la page ne demande aucune ressource tierce — un test
 * du dépôt l'exige. Les originaux sont recopiés sans
 * retouche dans `moteur/icones/`, et un test vérifie que cette table dit
 * exactement ce qu'ils disent, des deux côtés du portage.
 *
 * Les clés sont les noms de Lucide, en anglais comme les fichiers : c'est ce
 * qui permet de retrouver l'original d'un coup d'œil, et au test de l'ouvrir.
 */
export const ICONES = {
  "chevron-down": '<path d="m6 9 6 6 6-6" />',
  "circle-help": '<circle cx="12" cy="12" r="10" />'
    + '<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />'
    + '<path d="M12 17h.01" />',
  "share-2": '<circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" />'
    + '<circle cx="18" cy="19" r="3" />'
    + '<line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />'
    + '<line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />',
  house: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />'
    + '<path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 '
    + '21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />',
  key: '<path d="m2 21 9.6-9.6" />'
    + '<path d="m7.5 15.5 2.3 2.3a1 1 0 0 1 0 1.4l-2.1 2.1a1 1 0 0 1-1.4 0L4 19" />'
    + '<circle cx="15.5" cy="7.5" r="5.5" />',
  ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 '
    + '0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />'
    + '<path d="m14.5 12.5 2-2" /><path d="m11.5 9.5 2-2" />'
    + '<path d="m8.5 6.5 2-2" /><path d="m17.5 15.5 2-2" />',
  coins: '<path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" />'
    + '<path d="M15 6h1v4" /><path d="m6.134 14.768.866-.5 2 3.464" />'
    + '<circle cx="16" cy="8" r="6" />',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />'
    + '<path d="M16 3.128a4 4 0 0 1 0 7.744" />'
    + '<path d="M22 21v-2a4 4 0 0 0-3-3.87" />'
    + '<circle cx="9" cy="7" r="4" />',
};

/**
 * L'enveloppe commune : c'est elle qui fait la grille, et elle ne varie pas d'un
 * pictogramme à l'autre. `currentColor` les met à la couleur du texte qui les
 * porte, et `1em` à sa taille : un pictogramme suit son voisin.
 */
const ENVELOPPE_ICONE = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

/**
 * Un pictogramme de la bibliothèque, écrit dans la page.
 *
 * Sans `titre`, il est DÉCORATIF : le texte à côté dit déjà ce qu'il dit, et le
 * répéter ferait entendre deux fois la même chose à une synthèse vocale. Avec
 * `titre`, il porte à lui seul une information — un avertissement, un état — et
 * devient une image nommée.
 */
export function icone(nom, titre = "") {
  if (!(nom in ICONES)) {
    throw new Error(`pictogramme inconnu : ${nom}`);
  }
  if (titre) {
    return `<svg class="icone" ${ENVELOPPE_ICONE} role="img">`
      + `<title>${echapper(titre)}</title>${ICONES[nom]}</svg>`;
  }
  return `<svg class="icone" ${ENVELOPPE_ICONE} aria-hidden="true" `
    + `focusable="false">${ICONES[nom]}</svg>`;
}

/**
 * Le résumé d'un dépliant, chevron compris.
 *
 * Tous les dépliants du site passent par ici : c'est ce qui leur donne le même
 * chevron, au même endroit, tournant dans le même sens. Le marqueur du
 * navigateur est masqué en CSS — il n'a pas deux fois la même forme sur deux
 * moteurs, et aucune taille commune avec le reste.
 */
export function sommaire(texte) {
  return `<summary>${icone("chevron-down")}<span>${texte}</span></summary>`;
}

/**
 * Un mot de jargon, et sa définition dépliable sur place.
 *
 * Le site s'adresse à des gens qui n'ont pas fait d'économie. « Part du PIB »,
 * « charge foncière », « dépense fiscale » sont pour eux des mots opaques, et les
 * définir dans le corps du texte l'allonge d'autant pour tous les autres. La
 * définition est donc posée SOUS le mot, et ne s'ouvre que si on la demande.
 *
 * Ce n'est PAS un attribut `title` : une infobulle de survol ne s'ouvre ni au
 * clavier, ni au doigt, ni sous une synthèse vocale, et un test du dépôt
 * l'interdit d'ailleurs sur tout le site.
 *
 * Ce n'est pas non plus un `<details>` : celui-ci fait partie des balises dont
 * l'analyseur HTML FERME un `<p>` ouvert, et un mot du glossaire posé au milieu
 * d'une phrase coupait donc le paragraphe en deux. Un `<button>` est du contenu
 * de phrase — il ne ferme rien —, et il porte en plus le bon état. Le
 * basculement est dans `index.html`, en écoute déléguée.
 */
export function mot(terme, definition) {
  // Un `<span role="button">`, et non un `<button>` : Chromium rend tout bouton
  // en bloc en ligne, qui ne coule pas dans une phrase. Voir `mot` en Python.
  return '<span class="mot"><span class="terme" role="button" tabindex="0" '
    + `aria-expanded="false">${echapper(terme)}</span>`
    + `<span class="bulle" role="note" hidden>${echapper(definition)}</span></span>`;
}

/**
 * Une section repliée : son titre se lit, son contenu s'ouvre si on veut.
 *
 * Le temps du lecteur n'est pas gratuit. Tout ce qu'une page doit pouvoir
 * justifier — le détail d'un tableau, le périmètre d'une source, ce que le
 * calcul ne sait pas faire — doit être là, sans quoi la page n'est pas honnête ;
 * mais rien n'oblige à le lui faire traverser pour atteindre le résultat.
 */
/**
 * Quelques idées, une par bloc, titre puis phrase.
 *
 * C'est la forme que prend une proposition quand elle doit se lire en dix
 * secondes : quatre blocs de deux lignes, tous de même poids, à côté les uns des
 * autres. Une liste à puces dirait la même chose, mais elle se lit de haut en
 * bas et donne au premier point une importance que les autres n'ont pas.
 *
 * Les titres sont de vrais `<h3>` : c'est par eux qu'une synthèse vocale
 * parcourt une page. `texte` est du HTML.
 */
export function points(entrees) {
  if (!entrees.length) {
    return "";
  }
  const corps = entrees
    .map(([titre, texte]) => `<div class="point"><h3>${echapper(titre)}</h3>`
      + `<p>${texte}</p></div>`)
    .join("");
  return `<div class="points">${corps}</div>`;
}

/**
 * Un choix entre deux états, écrit en entier, dont l'un NAVIGUE.
 *
 * `branches` donne, pour chaque état, son libellé et l'adresse qui y mène ;
 * `actif` nomme le libellé de l'état courant, qui n'est donc pas un lien.
 *
 * Un lien seul — « Voir les montants en brut » — demande au lecteur de déduire
 * l'état courant de la phrase qui propose d'en changer, ce que personne ne
 * fait ; et il ne se voit pas, parce qu'il ressemble au texte. Les deux états
 * côte à côte disent à la fois où l'on est et où l'on peut aller.
 *
 * Des liens plutôt qu'un menu : un menu ne navigue pas sans script, et ce site
 * n'en emploie aucun pour se déplacer — l'adresse EST la saisie.
 */
export function bascule(legende, branches, actif) {
  const morceaux = [];
  for (const [libelle, cible] of branches) {
    morceaux.push(libelle === actif
      ? `<span class="actif" aria-current="true">${echapper(libelle)}</span>`
      : `<a href="${cible}">${echapper(libelle)}</a>`);
  }
  // Les deux branches sont enveloppées ENSEMBLE : sur un téléphone, c'est la
  // légende qui passe à la ligne, jamais le contrôle qui se coupe en deux.
  return `<div class="bascule" role="group" aria-label="${echapper(legende)}">`
    + `<span class="legende">${echapper(legende)}</span>`
    + `<span class="choix">${morceaux.join("")}</span></div>`;
}

export function depliant(titre, corps, identifiant = "") {
  // `identifiant` le rend joignable depuis le plan de la page.
  const cible = identifiant ? ` id="${echapper(identifiant)}"` : "";
  return `<details class="section"${cible}>${sommaire(echapper(titre))}`
    + `<div class="dedans">${corps}</div></details>`;
}

/**
 * Ce qu'un plan de page sait retrouver : un dépliant identifié et son titre,
 * ou une carte identifiée et sa question. Les deux formes dans une seule
 * expression, pour que le plan les liste dans l'ordre de la page.
 */
const SECTION_DU_PLAN = new RegExp(
  '<details class="section" id="([^"]+)"><summary>.*?<span>(.*?)</span></summary>'
  + '|<section class="cle" id="([^"]+)" tabindex="-1"><h3>(.*?)</h3>',
  "g",
);

/**
 * Le sommaire d'une page longue, DÉDUIT de ses sections.
 *
 * Il est lu dans le HTML déjà rendu, où chaque dépliant identifié porte son
 * titre : il ne peut donc pas dériver, et il est identique des deux côtés du
 * portage. Les liens ne touchent pas à l'adresse — ici l'adresse EST la route —
 * : `data-vers` désigne la section, et le script d'`index.html` l'ouvre, y
 * pose le focus et y fait défiler. Voir `plan` dans `web/gabarit.py`.
 */
export function plan(corps, chemin, etiquette = "Dans cette page") {
  const entrees = [...corps.matchAll(SECTION_DU_PLAN)]
    .map((trouve) => [trouve[1] || trouve[3], trouve[2] || trouve[4]]);
  if (!entrees.length) {
    return "";
  }
  const liens = entrees
    .map(([identifiant, titre]) => `<li><a href="${lien(chemin)}" `
      + `data-vers="${identifiant}">${titre}</a></li>`)
    .join("");
  return `<nav class="plan" aria-label="${echapper(etiquette)}">`
    + `<p class="etiquette">${echapper(etiquette)}</p><ol>${liens}</ol></nav>`;
}

/**
 * Les deux gestes du partage, sous une carte ou sous une image à publier.
 *
 * Une seule écriture pour les deux endroits où l'on partage — la carte d'un
 * graphique et la carte de la page Partager. Le comportement est dans
 * `index.html`, en écoute déléguée sur ces classes.
 *
 * Copie de `barre_partage` dans `web/gabarit.py`.
 */
export function barrePartage() {
  return '<p class="partage">'
    + '<button type="button" class="partager">'
    + `${icone("share-2")}<span>Partager</span></button>`
    + '<button type="button" class="partager-x">Publier sur X</button>'
    + '<span class="etat" role="status"></span>'
    + '<textarea class="repli" hidden readonly rows="3"'
    + ' aria-label="Texte à copier à la main"></textarea></p>';
}

/**
 * Une question, sa réponse en une phrase, et l'image qui la montre.
 *
 * C'est l'unité de lecture de la page Coût, et elle est faite pour deux
 * lecteurs à la fois. Celui qui n'a pas le temps lit la question et la réponse,
 * et s'arrête là. Celui qui veut voir descend d'un cran et trouve le tracé,
 * puis ses chiffres.
 *
 * La carte est encadrée pour une troisième raison : elle doit se découper. Une
 * capture d'écran de ce bloc porte la question, la réponse, le graphique et sa
 * source — elle se comprend hors du site.
 *
 * `reponse` et `source` sont du HTML ; `question` est du texte.
 */
export function cle(question, reponse, corps, source = "", identifiant = "") {
  const fin = source ? `<p class="source">${source}</p>` : "";
  // La barre de partage n'est pas un ornement : c'est elle qui fait de la carte
  // autre chose qu'un bloc de page, et elle est SOUS LE RÉSULTAT — le partage
  // doit être là où l'on regarde le graphique, et non dans une page à part que
  // personne ne trouve. DEUX gestes : `partager` compose l'image ET le message
  // puis ouvre la feuille de partage du système, `partager-x` ouvre X avec le
  // message déjà rédigé. Le comportement des deux est dans `index.html`, en
  // écoute déléguée, et c'est le même que celui des cartes de la page Partager.
  // Le `<span class="etat">` porte le compte rendu, le `<textarea>` le repli du
  // presse-papiers : vides et masqués tant qu'on n'en a pas besoin.
  // La barre n'apparaît que si la carte porte un TRACÉ : c'est lui que l'image
  // compose, et une carte qui n'en a pas donnerait un bouton qui échoue.
  const partage = corps.includes('<figure class="graphique"')
    ? barrePartage()
    : "";
  // Identifiée, la carte est joignable depuis le plan de la page ; le
  // `tabindex` lui permet de recevoir le focus quand on y arrive par lui.
  const cible = identifiant ? ` id="${echapper(identifiant)}" tabindex="-1"` : "";
  return `<section class="cle"${cible}><h3>${echapper(question)}</h3>`
    + `<p class="reponse">${reponse}</p>${corps}${fin}${partage}</section>`;
}


// -- graphiques --------------------------------------------------------------
//
// Le dépôt n'a pas de bibliothèque de tracé, et n'en aura pas : le site charge
// ses propres fichiers et rien d'autre. Les graphiques sont donc du SVG écrit à
// la main, en deux exemplaires — ici et dans ``web/gabarit.py`` —, et comparés
// caractère par caractère par les témoins. D'où deux règles de construction
// qu'il ne faut pas enfreindre :
//
//   * toutes les coordonnées passent par ``nombreBrut``, qui arrondit comme
//     Python le fait, pour que les deux rendus produisent la même chaîne ;
//   * le pas des graduations est cherché par ITÉRATION sur une échelle de
//     valeurs rondes, jamais par un logarithme, dont les deux langages ne
//     garantissent pas le même dernier bit.

/** Cadre de tracé, en unités du ``viewBox``. */
export const LARGEUR_TRACE = 720;
export const HAUTEUR_TRACE = 300;
export const MARGE_GAUCHE = 66;
/**
 * La marge de droite loge la MOITIÉ de la dernière graduation d'abscisse,
 * qui est centrée sur elle : trop étroite, « 2024 » déborderait du viewBox.
 */
export const MARGE_DROITE = 28;

/**
 * Écart vertical minimal, en unités du repère, entre deux étiquettes posées au
 * bout des courbes. Les couleurs des six scénarios ne suffisent pas à les
 * distinguer — mesuré : la pire paire voisine tombe à ΔE 4,3 sous
 * deutéranopie, et à 11,8 en vision normale, sous le plancher de 15. Une
 * étiquette en bout de courbe donne un second encodage, qui ne dépend pas de
 * la couleur ; encore faut-il que deux étiquettes ne se recouvrent pas.
 *
 * 22 et non 12 : sur téléphone les textes du repère sont grossis de 12 à 20
 * unités du viewBox, et deux étiquettes séparées de douze s'y chevauchaient.
 */
export const ESPACEMENT_ETIQUETTES = 22.0;
// 34 et non 26 : voir le Python — sur téléphone, les textes grossis se
// recouvraient en haut et en bas du cadre.
export const MARGE_HAUT = 34;
export const MARGE_BAS = 34;

/**
 * Nombre d'intervalles de l'axe vertical. Cinq : assez pour lire, assez peu
 * pour ne pas encombrer, et surtout assez pour qu'un maximum de 427 tienne dans
 * une échelle qui monte à 500 plutôt qu'à 800.
 */
export const DIVISIONS_Y = 5;

/** Échelle des pas de graduation admissibles, multipliée par des puissances de dix. */
const PAS_RONDS = [1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];

/**
 * Écart minimal, en années, entre une décennie graduée et une borne de l'axe.
 * Les bornes sont graduées d'office — ce sont elles qui datent la série —, et
 * une décennie trop proche de l'une d'elles ne fait que chevaucher son
 * étiquette. Six ans : « 2020 » et « 2024 » ne tiennent pas côte à côte sur
 * l'écran d'un téléphone, où les textes du repère sont grossis.
 */
const ECART_MINIMAL_GRADUATIONS = 6;

/**
 * Pas admissibles de l'axe des abscisses, du plus fin au plus large. Ce sont des
 * durées qu'un lecteur reconnaît : on gradue de dix ans en dix ans, ou de vingt,
 * jamais de treize.
 */
const PAS_GRADUATIONS_X = [10, 20, 25, 50, 100];

/**
 * Au-delà, les étiquettes se chevauchent sur un écran de téléphone, où le tracé
 * est réduit de moitié et ses textes grossis pour rester lisibles.
 */
const GRADUATIONS_X_MAXIMUM = 8;

/** Une courbe ou une bande d'un graphique. */
export class Serie {
  constructor(libelle, valeurs, couleur, tirets = false, glose = "") {
    this.libelle = libelle;
    this.valeurs = valeurs;
    this.couleur = couleur;
    this.tirets = tirets;
    this.glose = glose;
  }
}

/** Nombre à l'anglaise, pour un attribut SVG — jamais pour du texte lu. */
export function nombreBrut(valeur, decimales = 1) {
  return formatFixe(valeur, decimales);
}

/** Plus petit pas rond dont ``divisions`` intervalles couvrent ``maximum``. */
export function pasGraduation(maximum, divisions = DIVISIONS_Y) {
  if (maximum <= 0) {
    return 1.0;
  }
  let base = 1e-9;
  while (base < 1e12) {
    for (const facteur of PAS_RONDS) {
      const pas = base * facteur;
      if (pas * divisions >= maximum) {
        return pas;
      }
    }
    base *= 10.0;
  }
  return base;
}

function abscisse(annee, premiere, derniere) {
  const largeur = LARGEUR_TRACE - MARGE_GAUCHE - MARGE_DROITE;
  if (derniere === premiere) {
    return MARGE_GAUCHE + largeur / 2;
  }
  return MARGE_GAUCHE + largeur * ((annee - premiere) / (derniere - premiere));
}

/**
 * L'ordonnée d'une valeur : `plancher` en bas du cadre, `sommet` en haut. Le
 * plancher vaut zéro tant que rien n'est négatif ; une série négative
 * l'abaisse, et l'axe des abscisses monte alors dans le cadre.
 */
function ordonnee(valeur, sommet, plancher = 0.0) {
  const hauteur = HAUTEUR_TRACE - MARGE_HAUT - MARGE_BAS;
  if (sommet <= plancher) {
    return HAUTEUR_TRACE - MARGE_BAS;
  }
  return HAUTEUR_TRACE - MARGE_BAS - hauteur * ((valeur - plancher) / (sommet - plancher));
}

/** Décennies comprises dans la plage, plus les deux bornes. */
function graduationsX(premiere, derniere) {
  // La décennie est le pas naturel, et il suffit tant que la plage est courte.
  // Cent onze ans en donneraient douze : le pas s'élargit jusqu'à ce que le
  // compte tienne.
  const compte = (candidat) => {
    let total = 0;
    for (let a = premiere; a <= derniere; a += 1) { if (a % candidat === 0) total += 1; }
    return total;
  };
  const pas = PAS_GRADUATIONS_X.find((candidat) => compte(candidat) <= GRADUATIONS_X_MAXIMUM)
    ?? PAS_GRADUATIONS_X[PAS_GRADUATIONS_X.length - 1];
  const annees = [];
  for (let a = premiere; a <= derniere; a += 1) {
    if (a % pas === 0) annees.push(a);
  }
  if (!annees.includes(premiere)) annees.unshift(premiere);
  if (!annees.includes(derniere)) annees.push(derniere);
  // Deux graduations trop proches se chevauchent : on retire la décennie
  // voisine plutôt que la borne, qui porte l'information.
  return annees.filter(
    (a) => a === premiere || a === derniere
      || (a - premiere >= ECART_MINIMAL_GRADUATIONS
        && derniere - a >= ECART_MINIMAL_GRADUATIONS),
  );
}

/** Chemin SVG d'une courbe, interrompu là où la série n'a pas de valeur. */
function chemin(serie, annees, sommet, plancher = 0.0) {
  const morceaux = [];
  let commence = false;
  annees.forEach((annee, rang) => {
    const valeur = serie.valeurs[rang];
    if (valeur === null || valeur === undefined) {
      commence = false;
      return;
    }
    const x = nombreBrut(abscisse(annee, annees[0], annees[annees.length - 1]));
    const y = nombreBrut(ordonnee(valeur, sommet, plancher));
    morceaux.push(`${commence ? "L" : "M"}${x} ${y}`);
    commence = true;
  });
  return morceaux.join(" ");
}

/** Chemin fermé d'une bande empilée : le dessus à l'aller, le dessous au retour. */
function bande(basses, hautes, annees, sommet, plancher = 0.0) {
  const derniere = annees[annees.length - 1];
  const aller = annees.map((annee, rang) => `${rang === 0 ? "M" : "L"}`
    + `${nombreBrut(abscisse(annee, annees[0], derniere))} `
    + `${nombreBrut(ordonnee(hautes[rang], sommet, plancher))}`);
  const retour = [];
  for (let rang = annees.length - 1; rang >= 0; rang -= 1) {
    retour.push(`L${nombreBrut(abscisse(annees[rang], annees[0], derniere))} `
      + `${nombreBrut(ordonnee(basses[rang], sommet, plancher))}`);
  }
  return `${aller.concat(retour).join(" ")} Z`;
}

/**
 * Le ruban entre deux courbes, coloré selon celle qui est au-dessus.
 *
 * C'est ce qui fait qu'un graphique de ressources et de dépenses se lit sans
 * savoir lire un graphique : l'écart entre les deux courbes n'est plus à
 * mesurer à l'œil, il est peint. Vert quand il rentre plus qu'il ne sort, rouge
 * quand c'est l'inverse.
 *
 * Le ruban change donc de couleur en cours de route, et il en change À
 * L'ENDROIT EXACT où les courbes se croisent — pas à l'année suivante. Le
 * croisement est interpolé linéairement sur le segment, exactement comme le
 * tracé lui-même interpole entre deux points. Les segments de même signe qui se
 * suivent forment un seul polygone : sans ce regroupement, soixante-neuf
 * quadrilatères se toucheraient bord à bord et leurs jointures se verraient.
 *
 * Deux séries peuvent ne pas couvrir la même plage — le graphique de tête en
 * porte une qui remonte à 1959 et deux qui commencent en 2002. Le ruban se peint
 * alors sur la SEULE PLAGE CONTINUE où les deux sont définies, et il se tait si
 * l'une d'elles a un trou À L'INTÉRIEUR de cette plage : un ruban interpolé
 * par-dessus une année manquante affirmerait un écart que personne n'a mesuré.
 */
function airesEcart(haute, basse, annees, sommet, plancher = 0.0) {
  const presente = (valeur) => valeur !== null && valeur !== undefined;
  if (haute.valeurs.length !== annees.length
      || basse.valeurs.length !== annees.length) {
    return "";
  }
  const communs = [];
  for (let rang = 0; rang < annees.length; rang += 1) {
    if (presente(haute.valeurs[rang]) && presente(basse.valeurs[rang])) {
      communs.push(rang);
    }
  }
  if (communs.length < 2
      || communs[communs.length - 1] - communs[0] !== communs.length - 1) {
    return "";
  }
  // Les abscisses restent celles du graphique ENTIER : c'est le cadre qui les
  // fixe, pas la plage du ruban. Ses bornes sont donc retenues avant que la
  // plage ne soit restreinte.
  const premiere = annees[0];
  const derniere = annees[annees.length - 1];
  const bornees = communs.map((rang) => annees[rang]);
  const hautes = communs.map((rang) => haute.valeurs[rang]);
  const basses = communs.map((rang) => basse.valeurs[rang]);
  const point = (annee, dessus, dessous) => ({
    x: abscisse(annee, premiere, derniere),
    dessus: ordonnee(dessus, sommet, plancher),
    dessous: ordonnee(dessous, sommet, plancher),
  });

  // La chaîne des sommets du ruban : les années, plus les croisements qui
  // tombent entre deux d'entre elles. `signes` porte le signe de l'écart sur
  // chaque intervalle, et compte donc un élément de moins.
  const chaine = [point(bornees[0], hautes[0], basses[0])];
  const signes = [];
  for (let rang = 1; rang < bornees.length; rang += 1) {
    const avant = hautes[rang - 1] - basses[rang - 1];
    const apres = hautes[rang] - basses[rang];
    const courant = point(bornees[rang], hautes[rang], basses[rang]);
    if (avant * apres < 0.0) {
      const part = avant / (avant - apres);
      const precedent = chaine[chaine.length - 1];
      const x = precedent.x + part * (courant.x - precedent.x);
      // Au croisement les deux courbes se touchent : le ruban y est
      // d'épaisseur nulle, et ses deux bords doivent porter la MÊME ordonnée.
      const y = precedent.dessus + part * (courant.dessus - precedent.dessus);
      chaine.push({ x, dessus: y, dessous: y });
      signes.push(avant > 0.0 ? 1 : -1);
      chaine.push(courant);
      signes.push(apres > 0.0 ? 1 : -1);
      continue;
    }
    chaine.push(courant);
    const somme = avant + apres;
    signes.push(somme > 0.0 ? 1 : (somme < 0.0 ? -1 : 0));
  }

  const morceaux = [];
  let debut = 0;
  while (debut < signes.length) {
    let fin = debut;
    while (fin + 1 < signes.length && signes[fin + 1] === signes[debut]) {
      fin += 1;
    }
    if (signes[debut] !== 0) {
      const bornes = chaine.slice(debut, fin + 2);
      const aller = bornes.map((borne, rang) => `${rang === 0 ? "M" : "L"}`
        + `${nombreBrut(borne.x)} ${nombreBrut(borne.dessus)}`).join(" ");
      const retour = [];
      for (let rang = bornes.length - 1; rang >= 0; rang -= 1) {
        retour.push(`L${nombreBrut(bornes[rang].x)} `
          + `${nombreBrut(bornes[rang].dessous)}`);
      }
      const teinte = signes[debut] > 0 ? "plus" : "moins";
      morceaux.push(`<path class="ecart ${teinte}" `
        + `d="${aller} ${retour.join(" ")} Z"/>`);
    }
    debut = fin + 1;
  }
  return morceaux.join("");
}

/** Sommet de l'axe vertical et pas de graduation. */
/**
 * Sommet, pas et plancher de l'axe vertical. Le plancher est zéro tant
 * qu'aucune valeur n'est négative — l'échelle de tous les graphiques du site.
 * Une valeur négative étend l'échelle vers le bas : le pas est choisi pour
 * que l'AMPLITUDE tienne dans le même nombre de divisions, puis chaque borne
 * est arrondie au pas, si bien que zéro tombe toujours sur une graduation.
 */
function sommetEchelle(series, empile) {
  let maximum = 0.0;
  let minimum = 0.0;
  if (empile) {
    for (let rang = 0; rang < series[0].valeurs.length; rang += 1) {
      let somme = 0.0;
      for (const serie of series) {
        const valeur = serie.valeurs[rang];
        if (valeur !== null && valeur !== undefined) somme += valeur;
      }
      if (somme > maximum) maximum = somme;
      if (somme < minimum) minimum = somme;
    }
  } else {
    for (const serie of series) {
      for (const valeur of serie.valeurs) {
        if (valeur === null || valeur === undefined) continue;
        if (valeur > maximum) maximum = valeur;
        if (valeur < minimum) minimum = valeur;
      }
    }
  }
  if (minimum >= 0.0) {
    const pas = pasGraduation(maximum);
    return { sommet: pas * DIVISIONS_Y, pas, plancher: 0.0 };
  }
  const pas = pasGraduation(maximum - minimum);
  const plancher = Math.floor(minimum / pas) * pas;
  const sommet = Math.max(0.0, Math.ceil(maximum / pas)) * pas;
  return { sommet, pas, plancher };
}

/**
 * Graphique en courbes, ou en bandes empilées si ``empile``.
 *
 * ``titre`` n'est pas affiché : il est le texte alternatif du SVG, c'est-à-dire
 * ce que lit une synthèse vocale. Ce que voit l'œil est dans la légende et dans
 * la phrase qui précède le graphique.
 */
/**
 * Le libellé court de chaque courbe, posé à son extrémité droite.
 *
 * Second encodage de l'identité, exigé ici parce que la couleur seule ne sépare
 * pas les six scénarios. Les étiquettes sont écartées les unes des autres
 * quand deux courbes finissent trop près : sans cela, les scénarios 3 et 4, que
 * trente-huit mille euros séparent au bout de quarante ans, superposeraient
 * leurs chiffres.
 */
function etiquettesDeFin(series, sommet, etiquettes, plancher = 0.0) {
  const poses = [];
  series.forEach((serie, rang) => {
    const texte = etiquettes[rang];
    if (!texte) return;
    let derniere = null;
    for (let i = serie.valeurs.length - 1; i >= 0; i -= 1) {
      const valeur = serie.valeurs[i];
      if (valeur !== null && valeur !== undefined) { derniere = valeur; break; }
    }
    if (derniere === null) return;
    poses.push({ y: ordonnee(derniere, sommet, plancher), rang, texte });
  });
  if (!poses.length) return "";

  // Tri sur (ordonnée, rang) : le rang départage deux courbes de même hauteur,
  // pour que les deux portages posent les étiquettes dans le même ordre.
  poses.sort((a, b) => (a.y - b.y) || (a.rang - b.rang));
  const ecartees = [];
  let precedent = -Infinity;
  for (const pose of poses) {
    const y = Math.max(pose.y, precedent + ESPACEMENT_ETIQUETTES);
    ecartees.push({ y, texte: pose.texte });
    precedent = y;
  }

  // Débordement par le bas : tout le paquet remonte d'un bloc, plutôt que la
  // dernière étiquette sorte du cadre.
  const base = ordonnee(plancher, sommet, plancher);
  const debord = Math.max(0.0, precedent - base);
  const x = nombreBrut(LARGEUR_TRACE - MARGE_DROITE + 4);
  return ecartees.map(({ y, texte }) => `<text class="graduation" x="${x}" `
    + `y="${nombreBrut(y - debord)}" dy="0.32em" text-anchor="start">`
    + `${echapper(texte)}</text>`).join("");
}

export function graphique(titre, annees, series, unite = "", empile = false,
                          decimales = 0, legendeVisible = true, repere = null,
                          libelleRepere = "", etiquettes = [],
                          nomAbscisse = "Année", ecart = null,
                          libelleEcart = "", decimalesDonnees = null) {
  if (!annees.length || !series.length) {
    return "";
  }
  const { sommet, pas, plancher } = sommetEchelle(series, empile);
  const derniereAnnee = annees[annees.length - 1];
  const gauche = nombreBrut(abscisse(annees[0], annees[0], derniereAnnee));
  const droite = nombreBrut(abscisse(derniereAnnee, annees[0], derniereAnnee));

  const lignes = [];
  // Autant de graduations que l'échelle compte de pas : cinq au-dessus de
  // zéro d'ordinaire, davantage quand un plancher négatif s'y ajoute.
  const divisions = Math.round((sommet - plancher) / pas);
  for (let division = 0; division <= divisions; division += 1) {
    const valeur = plancher + pas * division;
    const y = nombreBrut(ordonnee(valeur, sommet, plancher));
    lignes.push(`<line class="grille" x1="${gauche}" y1="${y}" x2="${droite}" y2="${y}"/>`
      + `<text class="graduation" x="${nombreBrut(MARGE_GAUCHE - 6)}" y="${y}" `
      + `dy="0.32em" text-anchor="end">${nombre(valeur, decimales)}</text>`);
  }
  // L'axe des abscisses passe par zéro, et le bas du cadre par le plancher :
  // les deux coïncident tant que rien n'est négatif.
  const base = nombreBrut(ordonnee(0.0, sommet, plancher));
  const bas = nombreBrut(ordonnee(plancher, sommet, plancher));
  for (const annee of graduationsX(annees[0], derniereAnnee)) {
    const x = nombreBrut(abscisse(annee, annees[0], derniereAnnee));
    lignes.push(`<text class="graduation" x="${x}" `
      + `y="${nombreBrut(HAUTEUR_TRACE - MARGE_BAS + 27)}" `
      + `text-anchor="middle">${annee}</text>`);
  }

  const traces = [];
  // Le ruban d'abord : il est un fond, et une courbe posée par-dessus reste
  // visible là où les deux se croisent.
  if (ecart !== null && series.length > Math.max(ecart[0], ecart[1])) {
    traces.push(airesEcart(series[ecart[0]], series[ecart[1]], annees, sommet, plancher));
  }
  if (empile) {
    // La PREMIÈRE série est la bande du BAS : la légende se lit alors dans
    // l'ordre du graphique, de bas en haut, et non à l'envers.
    let cumul = annees.map(() => 0.0);
    for (const serie of series) {
      const hautes = cumul.map((bas, position) => {
        const valeur = serie.valeurs[position];
        return bas + (valeur === null || valeur === undefined ? 0.0 : valeur);
      });
      traces.push(`<path class="bande" fill="${serie.couleur}" `
        + `d="${bande(cumul, hautes, annees, sommet, plancher)}"/>`);
      cumul = hautes;
    }
  } else {
    for (const serie of series) {
      const tirets = serie.tirets ? ' stroke-dasharray="5 4"' : "";
      traces.push(`<path class="courbe" stroke="${serie.couleur}"${tirets} `
        + `d="${chemin(serie, annees, sommet, plancher)}"/>`);
    }
  }

  // L'unité part du bord gauche du repère : ancrée à `end` sur l'axe, une
  // unité longue débordait du cadre. Voir le Python.
  const uniteHtml = unite
    ? `<text class="graduation" x="0" `
      + `y="${nombreBrut(MARGE_HAUT - 16)}" text-anchor="start">${echapper(unite)}</text>`
    : "";
  // Le repère dit où l'observation s'arrête et où la projection commence — une
  // frontière qu'un graphique doit montrer, faute de quoi il donne à une
  // hypothèse l'apparence d'une mesure.
  let repereHtml = "";
  if (repere !== null && repere >= annees[0] && repere <= derniereAnnee) {
    const position = abscisse(repere, annees[0], derniereAnnee);
    const x = nombreBrut(position);
    // Du côté où il reste de la place : à gauche du trait dans la seconde
    // moitié du tracé, comme en Python.
    const aGauche = repere > (annees[0] + derniereAnnee) / 2;
    const etiquette = libelleRepere
      ? `<text class="graduation" x="${nombreBrut(position + (aGauche ? -5 : 5))}" `
        + `y="${nombreBrut(MARGE_HAUT + 8)}" text-anchor="${aGauche ? "end" : "start"}">`
        + `${echapper(libelleRepere)}</text>`
      : "";
    repereHtml = `<line class="repere" x1="${x}" y1="${nombreBrut(MARGE_HAUT)}" `
      + `x2="${x}" y2="${bas}"/>${etiquette}`;
  }
  // Ce dont la lecture au survol a besoin, et rien de plus.
  //
  // `data-gauche` et `data-droite` sont les abscisses du premier et du dernier
  // point, en unités du repère : de quoi retrouver, d'une position de pointeur,
  // le rang de l'année visée. Les VALEURS ne sont pas redites ici — elles sont
  // dans le tableau de points posé juste dessous, mises en forme exactement
  // comme la page les écrit.
  //
  // La figure est focusable et porte un `role="group"` : les flèches y
  // parcourent les années, ce qu'une image ne saurait pas faire.
  return '<figure class="graphique" tabindex="0" role="group" '
    + `aria-label="${echapper(titre)}" `
    + `data-gauche="${gauche}" data-droite="${droite}">`
    + `<svg viewBox="0 0 ${LARGEUR_TRACE} ${HAUTEUR_TRACE}" role="img" `
    + `aria-label="${echapper(titre)}">`
    + lignes.join("") + traces.join("")
    + `<line class="axe" x1="${gauche}" y1="${base}" x2="${droite}" y2="${base}"/>`
    + repereHtml + uniteHtml
    + (etiquettes.length ? etiquettesDeFin(series, sommet, etiquettes, plancher) : "")
    + '<g class="survol"></g></svg>'
    + '<div class="lecture" role="status" aria-live="polite" hidden></div>'
    + `${legendeVisible ? legende(series, libelleEcart) : ""}`
    + '<p class="aide-clavier">Flèches gauche et droite : parcourir les '
    + 'années. Échap : quitter.</p></figure>'
    + donneesDuGraphique(titre, annees, series, unite,
      decimalesDonnees === null ? decimales : decimalesDonnees, nomAbscisse);
}

/**
 * Les chiffres du graphique, année par année.
 *
 * Un tracé est une image : ce que dit son `aria-label` — de quoi il parle, sur
 * quelle plage — ne remplace pas ce qu'il montre. Le RGAA demande pour une
 * image complexe une description détaillée ; pour une courbe, la description
 * détaillée EST le tableau de ses points.
 *
 * Il est produit ici, dans la fonction qui trace, et à partir des mêmes séries
 * : aucun graphique ne peut être livré sans ses chiffres, et le tableau ne peut
 * pas s'écarter de la courbe. Les valeurs sont celles de chaque série, non le
 * cumul, y compris pour un graphique en bandes empilées — c'est ce qu'on lit
 * dans une colonne, et le cumul s'additionne de tête.
 *
 * Replié, parce que cent onze lignes couperaient la page en deux. Dépliable,
 * parce que c'est ce qui rend le graphique lisible sans le voir — et parce
 * qu'un lecteur qui veut le chiffre exact d'une année le trouve là, et nulle
 * part ailleurs.
 */
export function donneesDuGraphique(titre, annees, series, unite = "",
                                   decimales = 0, nomAbscisse = "Année") {
  if (!annees.length || !series.length) {
    return "";
  }
  const enTete = unite ? echapper(unite) : "";
  const entetes = [nomAbscisse].concat(
    series.map((serie) => serie.libelle + (enTete ? ` (${enTete})` : "")));
  const lignes = annees.map((annee, rang) => [String(annee)].concat(
    series.map((serie) => (rang < serie.valeurs.length
      && serie.valeurs[rang] !== null && serie.valeurs[rang] !== undefined
      ? nombre(serie.valeurs[rang], decimales)
      : "—"))));
  const grille = tableau(entetes, lignes,
    [""].concat(series.map(() => "nombre")), titre, true);
  const pas = nomAbscisse.toLowerCase();
  return '<details class="donnees-graphique">'
    + sommaire(`Les chiffres de ce graphique, ${pas} par ${pas} `
      + `(${annees.length} lignes)`)
    + `${grille}</details>`;
}

/**
 * Géométrie de la cascade, en unités du `viewBox`. Portage de `cascade` dans
 * `gabarit.py`, dont le docstring porte le raisonnement : le cadre est plus
 * haut que celui des courbes parce que les libellés sont posés en biais sous
 * l'axe, et le débord est mesuré au navigateur à la taille de texte du
 * téléphone.
 */
const LARGEUR_CASCADE = 760;
const HAUTEUR_CASCADE = 430;
const MARGE_GAUCHE_CASCADE = 58;
const MARGE_DROITE_CASCADE = 16;
const MARGE_HAUT_CASCADE = 40;
const MARGE_BAS_CASCADE = 150;
const PENTE_CASCADE = -35;
const PART_BARRE_CASCADE = 0.62;
const DEBORD_GAUCHE_CASCADE = 34;
const DEBORD_BAS_CASCADE = 14;

/** Une marche de la cascade : un libellé, un montant, et son rôle. */
export class Marche {
  constructor(libelle, valeur, total = false, couleur = "", glose = "") {
    this.libelle = libelle;
    this.valeur = valeur;
    this.total = total;
    this.couleur = couleur;
    this.glose = glose;
  }
}

/** Le centre de la colonne de rang `rang`, sur `marches` colonnes. */
function abscisseCascade(rang, marches) {
  const largeur = LARGEUR_CASCADE - MARGE_GAUCHE_CASCADE - MARGE_DROITE_CASCADE;
  return MARGE_GAUCHE_CASCADE + largeur * ((rang + 0.5) / marches);
}

function ordonneeCascade(valeur, sommet, plancher) {
  const hauteur = HAUTEUR_CASCADE - MARGE_HAUT_CASCADE - MARGE_BAS_CASCADE;
  if (sommet <= plancher) {
    return HAUTEUR_CASCADE - MARGE_BAS_CASCADE;
  }
  return HAUTEUR_CASCADE - MARGE_BAS_CASCADE
    - hauteur * ((valeur - plancher) / (sommet - plancher));
}

/**
 * Un montant signé, au moins typographique, et jamais « −0,0 ». Le test porte
 * sur le TEXTE et non sur le nombre : c'est le texte qui sera lu, et c'est le
 * seul essai que les deux portages font à coup sûr de la même façon.
 */
export function signeCascade(valeur, decimales) {
  const texte = nombre(Math.abs(valeur), decimales);
  if (texte === nombre(0.0, decimales)) {
    return texte;
  }
  return (valeur > 0 ? "+" : "−") + texte;
}

/**
 * Le sens d'une marche, tel que son CHIFFRE l'écrit. Une marche qui s'affiche
 * « 0,0 » n'est pas une baisse : elle est une mesure sans effet cette année-là,
 * et c'est un troisième état.
 */
function sensCascade(valeur, decimales) {
  if (nombre(Math.abs(valeur), decimales) === nombre(0.0, decimales)) {
    return "nulle";
  }
  return valeur > 0 ? "monte" : "descend";
}

/**
 * Le pont d'un total à un autre, marche par marche. Voir `cascade` dans
 * `gabarit.py` : la première barre part de zéro, chaque marche reprend le cumul
 * où la précédente l'a laissé, et la dernière retombe sur zéro. Le dessin ne
 * tient que si le compte tombe juste, et c'est ce qui en fait une vérification
 * autant qu'une figure.
 */
export function cascade(titre, marches, unite = "", decimales = 1,
                        decimalesAxe = 0, libelleMarche = "Étape") {
  if (!marches.length) {
    return "";
  }

  // Les niveaux : le cumul AVANT et APRÈS chaque marche. Un total n'est pas un
  // déplacement — il est posé sur zéro, et il REMET le cumul à sa valeur.
  const niveaux = [];
  let cumul = 0.0;
  for (const marche of marches) {
    if (marche.total) {
      niveaux.push([0.0, marche.valeur]);
      cumul = marche.valeur;
    } else {
      niveaux.push([cumul, cumul + marche.valeur]);
      cumul += marche.valeur;
    }
  }

  const bornes = niveaux.flat().concat([0.0]);
  const maximum = Math.max(...bornes);
  const minimum = Math.min(...bornes);
  let pas;
  let sommet;
  let plancher;
  if (minimum >= 0.0) {
    pas = pasGraduation(maximum);
    sommet = pas * DIVISIONS_Y;
    plancher = 0.0;
  } else {
    pas = pasGraduation(maximum - minimum);
    plancher = Math.floor(minimum / pas) * pas;
    sommet = Math.max(0.0, Math.ceil(maximum / pas)) * pas;
  }

  const gauche = nombreBrut(MARGE_GAUCHE_CASCADE);
  const droite = nombreBrut(LARGEUR_CASCADE - MARGE_DROITE_CASCADE);
  const grille = [];
  const divisions = Math.round((sommet - plancher) / pas) + 1;
  for (let division = 0; division < divisions; division += 1) {
    const valeur = plancher + pas * division;
    const y = nombreBrut(ordonneeCascade(valeur, sommet, plancher));
    grille.push(`<line class="grille" x1="${gauche}" y1="${y}" x2="${droite}" y2="${y}"/>`
      + `<text class="graduation" x="${nombreBrut(MARGE_GAUCHE_CASCADE - 6)}" `
      + `y="${y}" dy="0.32em" text-anchor="end">`
      + `${nombre(valeur, decimalesAxe)}</text>`);
  }

  const colonne = (LARGEUR_CASCADE - MARGE_GAUCHE_CASCADE - MARGE_DROITE_CASCADE)
    / marches.length;
  const largeurBarre = colonne * PART_BARRE_CASCADE;
  const basAxe = nombreBrut(ordonneeCascade(plancher, sommet, plancher));
  const yLibelles = HAUTEUR_CASCADE - MARGE_BAS_CASCADE + 24;

  const barres = [];
  const liaisons = [];
  const textes = [];
  marches.forEach((marche, rang) => {
    const [debut, fin] = niveaux[rang];
    const centre = abscisseCascade(rang, marches.length);
    const x = centre - largeurBarre / 2;
    const haut = ordonneeCascade(Math.max(debut, fin), sommet, plancher);
    const pied = ordonneeCascade(Math.min(debut, fin), sommet, plancher);
    // Une marche nulle ne dessinerait rien, et une colonne vide se lit comme
    // une colonne oubliée. Un filet d'une unité dit « mesuré, et nul ».
    const hauteur = Math.max(pied - haut, 1.0);
    const sens = sensCascade(marche.valeur, decimales);
    let classe;
    let teinte;
    if (marche.total) {
      classe = "total";
      teinte = marche.couleur ? ` fill="${marche.couleur}"` : "";
    } else {
      classe = sens;
      teinte = "";
    }
    barres.push(`<rect class="marche ${classe}"${teinte} data-rang="${rang}" `
      + `x="${nombreBrut(x)}" y="${nombreBrut(haut)}" `
      + `width="${nombreBrut(largeurBarre)}" `
      + `height="${nombreBrut(hauteur)}"/>`);
    // Le trait de liaison s'arrête devant un total, qui repart de zéro et ne
    // continue donc rien.
    if (rang + 1 < marches.length && !marches[rang + 1].total) {
      const y = nombreBrut(ordonneeCascade(fin, sommet, plancher));
      const suivante = abscisseCascade(rang + 1, marches.length) - largeurBarre / 2;
      liaisons.push(`<line class="liaison" x1="${nombreBrut(x + largeurBarre)}" `
        + `y1="${y}" x2="${nombreBrut(suivante)}" y2="${y}"/>`);
    }
    const montant = marche.total
      ? nombre(marche.valeur, decimales)
      : signeCascade(marche.valeur, decimales);
    const classeTexte = marche.total ? "valeur" : `valeur ${sens}`;
    const yValeur = (sens === "descend" && !marche.total) ? pied + 20 : haut - 9;
    textes.push(`<text class="${classeTexte}" x="${nombreBrut(centre)}" `
      + `y="${nombreBrut(yValeur)}" text-anchor="middle">${montant}</text>`);
    // Le libellé, en biais, ancré par sa FIN sous le centre de la colonne.
    const pivotX = nombreBrut(centre);
    const pivotY = nombreBrut(yLibelles);
    textes.push(`<text class="etiquette${marche.total ? " total" : ""}" `
      + `x="${pivotX}" y="${pivotY}" text-anchor="end" `
      + `transform="rotate(${PENTE_CASCADE} ${pivotX} ${pivotY})">`
      + `${echapper(marche.libelle)}</text>`);
  });

  const uniteHtml = unite
    ? `<text class="graduation" x="0" y="${nombreBrut(MARGE_HAUT_CASCADE - 18)}" `
      + `text-anchor="start">${echapper(unite)}</text>`
    : "";
  const legendeHtml = '<figcaption><ul class="legende">'
    + '<li><span class="pastille ecart-moins"></span>'
    + "<span>Ce qui s'ajoute au cumul</span></li>"
    + '<li><span class="pastille ecart-plus"></span>'
    + "<span>Ce qui s'en retranche</span></li>"
    + "</ul></figcaption>";

  // Le tableau des chiffres, tiré des mêmes marches : la description détaillée
  // qu'un dessin complexe doit au RGAA, et le seul endroit où le CUMUL se lit.
  const enTete = unite ? ` (${echapper(unite)})` : "";
  const lignes = marches.map((marche, rang) => [
    echapper(marche.libelle)
      + (marche.glose ? ` <span class="discret">${echapper(marche.glose)}</span>` : ""),
    marche.total ? nombre(marche.valeur, decimales)
      : signeCascade(marche.valeur, decimales),
    nombre(niveaux[rang][1], decimales),
  ]);
  const grilleHtml = tableau(
    [libelleMarche, `Effet${enTete}`, `Cumul${enTete}`],
    lignes, ["", "nombre", "nombre"], titre, true);
  return `<figure class="cascade" role="group" aria-label="${echapper(titre)}">`
    + `<div class="defilant" tabindex="0" role="region" aria-label="${echapper(titre)}">`
    + `<svg viewBox="${-DEBORD_GAUCHE_CASCADE} 0 `
    + `${LARGEUR_CASCADE + DEBORD_GAUCHE_CASCADE} `
    + `${HAUTEUR_CASCADE + DEBORD_BAS_CASCADE}" role="img" `
    + `aria-label="${echapper(titre)}">`
    + `${grille.join("")}${liaisons.join("")}${barres.join("")}`
    + `<line class="axe" x1="${gauche}" y1="${basAxe}" x2="${droite}" y2="${basAxe}"/>`
    + `${uniteHtml}${textes.join("")}`
    + '<g class="survol"></g></svg></div>'
    + '<div class="lecture" role="status" aria-live="polite" hidden></div>'
    + '<p class="aide-clavier">Flèches gauche et droite : parcourir les '
    + "mesures. Échap : quitter.</p>"
    + `${legendeHtml}</figure>`
    + '<details class="donnees-cascade">'
    + sommaire(`Les chiffres de cette cascade, marche par marche `
      + `(${marches.length} lignes)`)
    + `${grilleHtml}</details>`;
}

/**
 * Légende du graphique, posée en `<figcaption>`.
 *
 * Ce n'est pas un ornement : le SVG est annoncé comme une image, et la légende
 * est la seule chose qui dise, en texte, ce que chaque couleur représente. Dans
 * la figure, elle en devient le nom accessible ; hors d'elle, elle n'était
 * qu'une liste flottant sous un dessin.
 */
function legende(series, libelleEcart = "") {
  // `data-serie` et la case `.lu` : là où le script écrit la valeur de
  // l'année survolée — voir `montrerLecture` dans index.html.
  let entrees = series.map((serie, rang) => `<li data-serie="${rang}"><span class="pastille" `
    + `style="background:${serie.couleur}"></span>`
    + `<span>${echapper(serie.libelle)}`
    + (serie.glose ? ` <span class="discret">${echapper(serie.glose)}</span>` : "")
    + '</span><span class="lu"></span></li>').join("");
  // Le ruban d'écart prend une entrée de plus, à deux pastilles : sans elle, le
  // rouge et le vert du fond ne voudraient rien dire pour qui ne les a pas
  // devinés.
  if (libelleEcart) {
    entrees += '<li><span class="pastille ecart-plus"></span>'
      + '<span class="pastille ecart-moins"></span>'
      + `<span>${echapper(libelleEcart)}</span></li>`;
  }
  return `<figcaption><ul class="legende">${entrees}</ul></figcaption>`;
}
