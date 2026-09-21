/**
 * L'accès aux données du site, et le refus de ce qui n'y est pas.
 *
 * Tout ce que les pages affichent de chiffré vient de `moteur/donnees.json`,
 * où chaque entrée porte sa source, son adresse, l'année qu'elle mesure et la
 * date à laquelle elle a été lue. Une page qui demande une clé absente LÈVE :
 * mieux vaut une page qui ne s'affiche pas qu'un chiffre inventé, et le test
 * `tests/test_donnees.py` refuse d'ailleurs la citation d'une clé inconnue
 * avant même qu'un navigateur ne l'ouvre.
 */

import { formatFixe } from "./format.js";

/** Espace insécable fin, séparateur de milliers à la française. */
const FINE = " ";

/**
 * Le nom d'un niveau tel qu'il se lit : la clé porte un souligné, la page non.
 * Un niveau absent d'ici s'affiche sous sa clé, qui reste lisible.
 */
export const NOM_FIABILITE = Object.freeze({
  academique: "académique",
  partie_prenante: "partie prenante",
});

/** Le niveau tel qu'il s'écrit dans une phrase ou une colonne. */
export function nomFiabilite(niveau) {
  return NOM_FIABILITE[niveau] ?? niveau;
}

/** Ce qu'un niveau de fiabilité dit au lecteur, en toutes lettres. */
export const FIABILITES = Object.freeze({
  officielle: "Service statistique public, juridiction financière ou texte "
    + "officiel. C'est le chiffre tel que l'administration le publie.",
  academique: "Article de recherche à comité de lecture. Le chiffre est une "
    + "estimation, avec sa méthode et son intervalle.",
  partie_prenante: "Source primaire, publiée par un acteur qui est partie au "
    + "débat — fédération professionnelle, association. Le chiffre est le "
    + "sien, et son intérêt aussi : nous le citons en le disant.",
  presse: "Source secondaire — la reprise d'une publication que nous n'avons "
    + "pas pu ouvrir directement. À reprendre à la source primaire.",
  calcul: "Obtenu sur ce site à partir d'autres entrées. La formule est dans "
    + "la note.",
});

/** Le paquet de données, et les deux seules façons d'y entrer. */
export class Donnees {
  constructor(paquet) {
    this.paquet = paquet;
    this.chiffres = paquet.chiffres;
    this.series = paquet.series;
  }

  /** L'entrée complète — valeur, unité, source, date. */
  chiffre(cle) {
    const entree = this.chiffres[cle];
    if (!entree) {
      throw new Error(`chiffre absent des données : ${cle}`);
    }
    return entree;
  }

  /** La seule valeur, pour un calcul. */
  valeur(cle) {
    return this.chiffre(cle).valeur;
  }

  serie(cle) {
    const entree = this.series[cle];
    if (!entree) {
      throw new Error(`série absente des données : ${cle}`);
    }
    return entree;
  }

  /** Les clés, pour la page Données. */
  toutesLesCles() {
    return Object.keys(this.chiffres);
  }
}

/** Nombre à la française : virgule décimale, espace insécable des milliers. */
export function nombre(valeur, decimales = 1) {
  return formatFixe(valeur, decimales, true).replace(/,/g, FINE).replace(".", ",");
}

/**
 * Un chiffre tel qu'il se lit dans une phrase : la valeur, puis son unité.
 *
 * Les unités du paquet sont écrites pour être lues telles quelles — « Md€ »,
 * « % », « millions » —, et celles qui commencent par un signe se collent au
 * nombre là où les autres s'en séparent d'une espace insécable.
 */
export function avecUnite(valeur, unite, decimales = 1) {
  const texte = nombre(valeur, decimales);
  if (unite === "%") {
    return `${texte}${FINE}%`;
  }
  if (unite === "Md€" || unite === "€/m²") {
    return `${texte}${FINE}${unite}`;
  }
  return `${texte} ${unite}`;
}

/**
 * Le nombre de décimales qu'une valeur mérite : aucune quand elle est entière,
 * une sinon. « 45,9 Md€ » et « 69 communes », jamais « 69,0 communes ».
 */
export function decimalesUtiles(valeur) {
  return Number.isInteger(valeur) ? 0 : 1;
}

/** Un montant en milliards, tel qu'il se dit. */
export function milliards(valeur, decimales = 1) {
  return `${nombre(valeur, decimales)}${FINE}Md€`;
}

/** Un montant en euros, arrondi à l'euro. */
export function euros(montant) {
  return `${nombre(montant, 0)}${FINE}€`;
}
