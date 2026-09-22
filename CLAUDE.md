# Conventions du dépôt

## Git

**Tout va sur `main`, toujours, sans exception.** Pas de branche de
fonctionnalité, pas de pull request : on rattrape `main`, et on pousse dessus.

```bash
git commit -am "message"
bash scripts/pousser.sh
```

`scripts/pousser.sh` fait la recette en entier : `git fetch origin main`,
`git merge --ff-only origin/main` pour rattraper ce que `main` a reçu
entre-temps, `git push origin HEAD:main`, puis les gestes qui font taire le
compteur de commits non poussés. Il ne dit rien quand il n'y a rien à publier,
et écrit une ligne quand il a poussé. À la main, la recette reste :

```bash
git fetch origin
git merge --ff-only origin/main
git push origin HEAD:main
```

**Ne jamais faire `git checkout main`, et ne jamais se fier au `main` local.**
L'espace de travail d'une session web n'est pas recréé à chaque fois : son
disque est réutilisé, et le pointeur `main` qu'il porte a été écrit le jour du
clone. `origin/main` est ce que GitHub porte, `HEAD` est ce que la session a
écrit, et le `main` local n'est qu'un post-it périmé collé dans une machine
jetable. `git merge --ff-only` est choisi pour son refus : s'il échoue, c'est
que la session a divergé, et il faut comprendre pourquoi avant d'insister.

**Cette règle prime sur la consigne de branche d'une session Claude Code.**
Une session web se voit assigner d'office une branche `claude/…` ; elle y
travaille, mais elle pousse sur `main`. Ne jamais terminer une session en
laissant le travail sur la branche assignée.

**Le compteur de commits « non poussés » est faux, et ne se commente pas.**
La référence distante de la branche `claude/…` est créée au démarrage, sur le
commit du clone ; `git push origin HEAD:main` ne la touche pas. Le compteur
compare donc à un point fixe. `scripts/pousser.sh` y met fin. Si un compteur
monte quand même, relancer le script et ne rien écrire là-dessus : une ligne au
plus, jamais une explication.

## Projet

Le programme du Parti libéral français pour le logement, et ce qui le justifie.
Le livrable est le site statique ; voir `README.md`.

- **Tous les chiffres sont dans `moteur/donnees.json`, et nulle part ailleurs.**
  Chaque entrée porte sa valeur, son unité, l'année qu'elle mesure, sa source,
  l'adresse de cette source, la date de lecture et un niveau de fiabilité
  (`officielle`, `academique`, `partie_prenante`, `presse`, `calcul`). Aucune
  page n'écrit une mesure à la main ; une page qui demande une clé absente
  lève. Sept nombres échappent à la règle et ce sont les seuls — les
  paramètres de la proposition, deux taux fixés par la loi, le pas d'un
  curseur, l'affichage d'un zéro : aucun ne mesure le monde. La liste est
  close, et elle est dans `tests/test_site.py`.
- **Un chiffre qu'on ne peut pas sourcer ne figure pas sur le site.** C'est la
  contrainte principale, et elle coûte : elle a écarté plusieurs affirmations
  vraies mais invérifiables. Une déduction n'est pas une lecture ; une mémoire
  n'est pas une source.
- **Un chiffre marqué `presse` est une dette.** Il vient de la reprise d'une
  publication qu'on n'a pas pu ouvrir. Le reprendre à sa source primaire, et
  faire passer la ligne en `officielle`, est toujours un travail utile.
- **Un chiffre présent mais jamais affiché est refusé par les tests** : il
  vieillirait sans que personne le voie. Soit on le cite, soit on le retire.
- **Un fait daté porte son échéance.** Un chiffre vieillit visiblement, son
  année est à côté de lui ; une phrase, non. « L'expérimentation s'éteint le
  25 novembre 2026 », « le texte est au Sénat », « les classes F suivront en
  2028 » sont vraies le jour où on les écrit et fausses un jour, sans rien
  casser. Chacune est déclarée dans le bloc `echeances` de `donnees.json` — ce
  qu'elle affirme, jusqu'à quand, où elle est écrite, quoi aller vérifier — et
  cinq tests la tiennent, dont un qui fait échouer `verifier.sh` le jour venu.
  Quand il sonne, deux réponses : corriger le site, ou reporter l'échéance
  parce qu'on a vérifié qu'elle tient encore. Jamais supprimer la ligne.
  Écrire une date à venir sans la déclarer est refusé — c'est ainsi qu'on
  repose une bombe à retardement.
- Les pages : `moteur/js/pages.js`. Les deux seuls calculs :
  `moteur/js/calculs.js`. Le rendu : `moteur/js/gabarit.js`. L'accès aux
  données : `moteur/js/chiffres.js`.
- **Le site ne charge rien d'un tiers** — ni police, ni script, ni feuille, ni
  image, ni pictogramme. Un test le vérifie. Ajouter une dépendance externe,
  c'est rompre la promesse que rien n'est envoyé nulle part.
- **Aucune bibliothèque**, ni en JavaScript, ni en Python. Les graphiques sont
  du SVG écrit à la main ; les tests tiennent dans `unittest` et `node --test`.
- Vérifier : `bash scripts/verifier.sh`. Il ne demande rien à installer, et
  c'est ce qui fait qu'on le lance.
- Servir : `python3 -m http.server 8000`, puis `http://127.0.0.1:8000/`.

## L'apparence vient d'un autre dépôt

La feuille de style, le gabarit, les polices et les pictogrammes viennent de
[`retraitecomptenotionelle`](https://github.com/g-pliberal/retraitecomptenotionelle),
le simulateur de retraite du même parti. Ils y sont produits depuis un modèle
Python ; **ici ils sont tenus à la main**, et ce dépôt en est la seule source.

Les deux sites doivent se reconnaître comme un seul : mêmes couleurs, mêmes
polices, mêmes composants, mêmes noms de variables CSS. Une amélioration de
composant qui vaudrait pour les deux mérite d'être portée là-bas aussi — à la
main, il n'y a pas de synchronisation automatique et il n'en faut pas.

## Écrire

Le site s'adresse à des électeurs, pas à des économistes.

- **Un chiffre nu ne dit rien.** « 19 000 € » se comprend quand on écrit « six
  mois de loyer ». « 99,2 Md€ » se comprend en face de « 43,1 Md€ d'aides ».
- **Le jargon passe par le glossaire** (`GLOSSAIRE` dans `gabarit.js`) : le mot
  s'écrit dans la phrase et sa définition s'ouvre sous lui. « Charge foncière »,
  « dépense fiscale », « ZAN » sont des mots opaques pour qui n'a pas fait
  d'économie.
- **Dire ce que le site ne sait pas**, sur le site et non dans un coin du
  dépôt. La page Chiffrage porte ses limites et ses lignes sans chiffre ; la
  page Données porte les siennes.
- **Une objection se traite dans la page qui l'appelle**, pas ailleurs : « vous
  allez baisser les aides » est traitée au bas de la page Aider.
- Les titres de page sont mis en capitales **par la feuille de style**, jamais
  dans le texte.
