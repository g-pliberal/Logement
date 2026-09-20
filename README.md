# Logement — le programme du Parti libéral français

**Ce dépôt est un site : le programme du Parti libéral français pour le
logement, et ce qui le justifie.** Il dit ce que la politique française du
logement dépense, prélève et produit, puis ce qu'il faut changer — avec, sous
chaque chiffre, la source et la date à laquelle elle a été lue.

Le site est statique, tient en une page, et se lit sans rien installer :

    https://g-pliberal.github.io/logement/

## La thèse, en trois phrases

Un logement est cher là où il est rare. Il est rare là où il est interdit d'en
construire — par le plan local d'urbanisme, par le zéro artificialisation
nette, par le recours du voisin, par la norme qui change tous les trois ans.
Toute politique qui distribue de l'argent sans lever l'interdiction se contente
de déplacer la file d'attente, et l'aide finit dans le prix.

Les chiffres qui portent cette thèse, tous datés et sourcés :

| | |
|---|---|
| 264 800 | logements mis en chantier en 2025, contre 433 900 en 2017 |
| +55 % | l'écart du prix des logements anciens à la tendance qu'il a suivie de 1965 à 2001, rapporté au revenu par ménage |
| 2,87 M | ménages en attente d'un logement social au 30 juin 2025, pour ~450 000 attributions par an |
| 99,2 Md€ | prélevés sur le logement en 2024, contre 43,1 Md€ d'aides |

## Les cinq engagements

1. **Le droit de construire redevient la règle.** Dans les zones tendues, le
   plan local d'urbanisme autorise d'office jusqu'à un gabarit écrit d'avance ;
   la division, la surélévation et le changement d'usage sont de droit ; le
   zéro artificialisation nette est abrogé au profit d'une protection par
   parcelle.
2. **La commune qui autorise garde ce que le logement rapporte**, pendant dix
   ans. Un maire qui construit paie aujourd'hui l'école et ne touche plus la
   taxe d'habitation : il a raison de refuser, et c'est cette arithmétique
   qu'il faut renverser.
3. **Louer redevient un contrat.** Fin de l'encadrement des loyers et des
   interdictions au diagnostic énergétique ; en échange, un impayé jugé en
   trois mois et une garantie publique du loyer.
4. **Une aide au ménage, jamais au logement.** Un chèque logement unique,
   sous condition de ressources, dont le montant ne dépend pas du loyer
   effectivement payé — c'est ce lien qui fait qu'une aide remonte dans le
   prix.
5. **Plus de droits de mutation.** Déménager cesse d'être taxé ; la
   compensation vient de la fin des niches et d'une taxe foncière enfin assise
   sur des valeurs de ce siècle.

Le [chiffrage](https://g-pliberal.github.io/logement/#/chiffrage) montre que
l'ensemble tient dans les agrégats publiés, sans impôt nouveau : les aides
supprimées (38,4 Md€) financent le chèque et la suppression des droits de
mutation, et laissent une marge à montant d'aide inchangé. Le lecteur y déplace
lui-même les trois hypothèses qui pèsent.

## Ce que le dépôt contient

| | |
|---|---|
| `index.html` | La page, son routeur et ses cinq comportements (formulaires, glossaire, plan, tri, partage). |
| `moteur/donnees.json` | **Tous les chiffres du site**, et rien qu'eux : valeur, unité, année mesurée, source, adresse, date de lecture, niveau de fiabilité. |
| `moteur/js/pages.js` | Les huit pages, et le routeur qui les choisit. |
| `moteur/js/calculs.js` | Les deux seuls calculs : le coût fiscal d'un achat, et l'arithmétique de la réforme. |
| `moteur/js/gabarit.js` | Le rendu HTML : affiche, cartes, tableaux, graphiques SVG, glossaire. |
| `moteur/js/chiffres.js` | L'accès aux données, et le refus de ce qui n'y est pas. |
| `moteur/style.css` | La feuille de style, seule et entière. |
| `moteur/polices/`, `moteur/icones/` | Les deux polices (OFL) et les pictogrammes (Lucide, ISC), servis par le dépôt. |
| `tests/` | Ce que le site s'interdit. |

## La règle des chiffres

**Aucune page n'écrit un nombre en dur.** Tout ce qui est chiffré vient de
`moteur/donnees.json`, où chaque entrée porte sa source et sa date. Une page qui
demanderait une clé absente lève, et ne s'affiche pas.

Quatre niveaux de fiabilité sont distingués, et affichés sur la page
[Données](https://g-pliberal.github.io/logement/#/donnees) :

- **officielle** — service statistique public, juridiction financière, texte
  officiel ;
- **académique** — article à comité de lecture ;
- **presse** — la reprise d'une publication que nous n'avons pas pu ouvrir
  directement, *à reprendre à la source primaire* ;
- **calcul** — obtenu ici à partir d'autres entrées, la formule est dans la
  note.

Un test refuse une entrée incomplète, un chiffre cité mais absent, et un chiffre
présent mais jamais affiché — ce dernier étant celui qui vieillit sans qu'on le
voie.

## Vérifier, servir, publier

```bash
bash scripts/verifier.sh          # les deux suites, sans rien installer
python3 -m http.server 8000       # puis http://127.0.0.1:8000/
bash scripts/pousser.sh           # publie sur main
```

Les tests ne demandent **aucune dépendance** : `unittest` de la bibliothèque
standard pour les données et les fichiers, `node --test` pour les calculs et le
rendu. C'est délibéré — un site statique dont la vérification demande un
environnement à monter n'est pas vérifié longtemps.

## Ce que ce site ne sait pas

- **Qui gagne et qui perd.** Le chiffrage raisonne sur des moyennes
  nationales ; il ne dit rien d'un ménage donné dans une commune donnée.
- **Les délais.** Rien n'est daté en trajectoire : entre le vote d'une réforme
  du droit des sols et le premier logement livré, il s'écoule des années.
- **L'effet exact sur les prix.** Les expériences étrangères citées — Auckland,
  San Francisco — donnent un sens et un ordre de grandeur, pas une prévision
  française.
- **Le détail des collectivités.** La compensation de la suppression des droits
  de mutation est posée en principe ; sa répartition entre départements demande
  un travail qui n'est pas fait ici.

Ces limites sont écrites sur le site lui-même, et non reléguées ici.

## Apparence

La charte — vert profond, or, crème, titres massifs en capitales — vient du
simulateur de retraite du même parti,
[`retraitecomptenotionelle`](https://github.com/g-pliberal/retraitecomptenotionelle),
dont ce dépôt reprend la feuille de style, le gabarit, les polices et les
pictogrammes. Elle y était produite depuis un modèle Python ; ici elle est tenue
à la main, et c'est le seul endroit où elle existe. Les deux sites doivent se
reconnaître comme un seul.

Le site **ne charge rien d'un tiers** : ni police, ni script, ni feuille, ni
image. Un test le vérifie. Les calculs se font dans le navigateur, et rien n'est
envoyé nulle part.

## Licence

Code sous licence Apache 2.0 ; textes, données et infographies sous
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr). Les
polices sont sous SIL Open Font License 1.1, les pictogrammes sous ISC — leurs
licences sont recopiées à côté des fichiers.
