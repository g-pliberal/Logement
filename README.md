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
| 264 800 | logements mis en chantier en 2025, contre 433 900 au dernier sommet de 2017 — et 493 800 en 2006 |
| +55 % | l'écart du prix des logements anciens à la tendance qu'il a suivie de 1965 à 2001, rapporté au revenu par ménage |
| 2,885 M | ménages en attente d'un logement social fin 2025 — dont 890 000 déjà logés dans le parc — pour 394 000 attributions dans l'année |
| 99,2 Md€ | prélevés sur le logement en 2024, contre 43,1 Md€ d'aides, niches fiscales comprises : 72,0 Md€ net, chaque euro compté une fois |

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
supprimées (34,7 Md€ — aides personnelles, bonifications de taux, dépenses
fiscales) financent le chèque et la suppression des droits de mutation, et
laissent une marge à montant d'aide inchangé. Chaque mesure des quatre chantiers
y est mise en face de la situation actuelle, dans un tableau qui dit ce qu'elle
rapporte (+), ce qu'elle coûte (−), pourquoi elle ne coûte rien, ou pourquoi on
ne sait pas la chiffrer. Le lecteur y déplace lui-même les trois hypothèses qui
pèsent.

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

**Aucune mesure n'est écrite à la main dans une phrase.** Tout ce qui mesure
quelque chose vient de `moteur/donnees.json`, où chaque entrée porte sa source
et sa date ; une page qui demanderait une clé absente lève, et ne s'affiche
pas. Sept nombres échappent à la règle et ce sont les seuls : les paramètres de
la proposition, deux taux fixés par la loi, le pas d'un curseur et l'affichage
d'un poste nul. Aucun ne mesure le monde, la liste est close, et elle est tenue
par un test.

Cinq niveaux de fiabilité sont distingués, et affichés sur la page
[Données](https://g-pliberal.github.io/logement/#/donnees) :

- **officielle** — service statistique public, juridiction financière, texte
  officiel ;
- **académique** — article à comité de lecture ;
- **partie prenante** — source primaire, publiée par un acteur qui est partie
  au débat : l'Union sociale pour l'habitat pour la demande de logement social,
  la Fondation pour le logement des défavorisés pour le mal-logement. Personne
  ne publie mieux qu'eux, et ils ont un intérêt dans la réponse — *les deux se
  disent* ;
- **presse** — la reprise d'une publication que nous n'avons pas pu ouvrir
  directement, *à reprendre à la source primaire*. **Il n'en reste aucune :
  les six dernières ont été remboursées, et trois d'entre elles étaient
  fausses** ;
- **calcul** — obtenu ici à partir d'autres entrées, la formule est dans la
  note.

Un test refuse une entrée incomplète, un chiffre cité mais absent, et un chiffre
présent mais jamais affiché — ce dernier étant celui qui vieillit sans qu'on le
voie.

## Les faits datés se périment, et le dépôt le sait

Un chiffre vieillit visiblement : son année est à côté de lui. Une phrase, non.
« L'expérimentation s'éteint le 25 novembre 2026 », « le texte est au Sénat »,
« les classes F suivront en 2028 » sont vraies le jour où on les écrit et
fausses un jour, sans que rien ne prévienne.

`moteur/donnees.json` porte donc, à côté des chiffres, un bloc `echeances`.
Chaque entrée dit ce que le site affirme, jusqu'à quand l'affirmation tient
(`echeance`), où elle est écrite (`ou`), quoi aller vérifier (`verifier`), et
la date telle qu'elle est écrite sur le site (`ecrit`, facultatif). La liste est
[affichée sur la page Données](https://g-pliberal.github.io/logement/#/donnees) :
une veille qu'on ne montre pas est une veille qu'on peut abandonner sans que
personne ne le sache.

Cinq tests la tiennent :

| Le test refuse | Pourquoi |
|---|---|
| une échéance passée | c'est le réveil : `verifier.sh` échoue, et le message dit où la phrase est écrite et quoi vérifier |
| une échéance sans mode d'emploi | une échéance qu'on ne sait pas instruire est une échéance qu'on supprimera |
| une échéance dont la phrase a disparu | elle ferait croire qu'une veille est tenue |
| une date à venir écrite sans échéance | c'est ainsi qu'on repose une bombe à retardement |
| une année à venir citée sans veille ni exemption motivée | idem, pour « en 2028 » et « en 2034 » |

Quand le réveil sonne, deux réponses sont acceptables — corriger le site, ou
reporter l'échéance parce qu'on a vérifié qu'elle tient encore. Une seule ne
l'est pas, et c'est la plus tentante : supprimer la ligne.

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
  nationales ; il ne dit rien d'un ménage donné dans une commune donnée. La
  page Chiffrage dit précisément quelle microsimulation trancherait, sur
  quelles données, et quelle clause de sauvegarde tient d'ici là.
- **Les délais.** Rien n'est daté en trajectoire : entre le vote d'une réforme
  du droit des sols et le premier logement livré, il s'écoule des années.
- **L'effet exact sur les prix.** Les expériences étrangères citées — Auckland,
  San Francisco — donnent un sens et un ordre de grandeur, pas une prévision
  française.
- **Le détail des collectivités.** La compensation de la suppression des droits
  de mutation est posée en principe ; sa répartition entre départements demande
  un travail qui n'est pas fait ici.
- **Le coût de six lignes du compte.** Le tableau mesure par mesure les
  nomme, chacune avec la raison de son absence et le repère qui existe quand il
  en existe un : la garantie publique du loyer (Visale, qui coûte de l'ordre de
  0,1 Md€ par an, sert de repère), les juges et travailleurs sociaux d'un impayé
  jugé en trois mois (le jugement prend aujourd'hui 5,1 mois), la clause de
  sauvegarde, l'ouverture du chèque à l'accession, le délai fixe des recours et
  le régime unique des revenus fonciers. Le reversement aux communes, lui, est
  chiffré comme ce qu'il est : un transfert de l'État aux communes, qui ne
  change pas le total. Chiffrer les six est le prochain travail.

Ces limites sont écrites sur le site lui-même, et non reléguées ici.

## Les objections, traitées dans la page qui les appelle

Un programme se juge sur ce qu'il oppose à ses propres chiffres. Cinq
objections sont donc portées par le site, chacune là où elle se pose :

| Objection | Où |
|---|---|
| « C'est le coût du crédit, pas le droit des sols » — 412 600 logements en 2021 | [Constat](https://g-pliberal.github.io/logement/#/constat) |
| « Il y a plus de permis délivrés que de chantiers ouverts » | [Construire](https://g-pliberal.github.io/logement/#/construire) |
| « Une commune ne peut pas être forcée d'autoriser » | [Construire](https://g-pliberal.github.io/logement/#/construire) |
| « Trois mois, c'est l'expulsion expresse » — trêve hivernale, DALO | [Louer](https://g-pliberal.github.io/logement/#/louer) |
| « Vous allez baisser les aides » | [Aider](https://g-pliberal.github.io/logement/#/aider) |
| « Vous oubliez les loyers imputés » — 11 Md€, le calcul refait : le rapport baisse, le solde ne bouge pas | [Fiscalité](https://g-pliberal.github.io/logement/#/fiscalite) |
| « Qui perd ? » — les six perdants, nommés, dont le logement social | [Fiscalité](https://g-pliberal.github.io/logement/#/fiscalite) |
| « Sans impôt nouveau » : ce que la suppression d'une niche fait vraiment | [Chiffrage](https://g-pliberal.github.io/logement/#/chiffrage) |
| « L'encadrement n'a pas réduit l'offre à Paris » — l'Apur le mesure, on le concède | [Louer](https://g-pliberal.github.io/logement/#/louer) |

| « Une ville en Nouvelle-Zélande ne prouve rien » — Minneapolis et la Californie ont échoué, et on dit pourquoi | [Construire](https://g-pliberal.github.io/logement/#/construire) |
| « Un rapport officiel recommande l'inverse » — l'IGF sur le Pinel | [Fiscalité](https://g-pliberal.github.io/logement/#/fiscalite) |

Les réserves que le site porte sur ses propres sources — Auckland, Fack — sont
écrites à côté des chiffres qu'elles concernent.

## Ce qui appuie les deux thèses causales

Le programme affirme deux mécanismes, et chacun est appuyé par plus d'une
mesure — une étrangère, une française, la française étant la plus récente :

| Mécanisme | Les preuves |
|---|---|
| Ouvrir le droit de construire fait construire | Auckland, trois estimations concordantes (4 %, 9 % du parc ; 46,5 % des permis de sept ans) — **et deux échecs**, Minneapolis et la Californie, qui n'ont relevé ni l'ampleur ni le gabarit |
| Une aide indexée sur le loyer finit dans le loyer | Fack (Insee, 78 %) ; Grislain-Letrémy et Trevien (Banque de France, 2022), qui montrent que la hausse s'arrête là où l'offre répond ; IGF-CGEDD sur le Pinel (2019) : 9,3 % de la réduction d'impôt parvient au locataire |

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
