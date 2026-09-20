# Les pictogrammes du site

Ils viennent tous de **[Lucide](https://lucide.dev) 1.46.0**, sous licence ISC
(`LICENSE`, à côté). Un seul jeu, une seule grille — 24 × 24, trait de 2,
extrémités et jointures arrondies —, et rien qui soit dessiné à la main : c'est
ce qui les fait tenir ensemble à toutes les tailles, ce qu'un emoji ou un
caractère Unicode ne font pas, leur dessin changeant d'un système à l'autre.

**Les fichiers de ce dossier sont les originaux, recopiés sans retouche.** Le
site ne les charge pas : `moteur/js/gabarit.js` écrit leur tracé DANS la page,
parce que le site n'utilise aucune bibliothèque et ne demande aucune ressource
tierce. `tests/test_site.py` relit ces fichiers et vérifie que la table
`ICONES` dit exactement ce qu'ils disent.

`../icone.svg` est l'icône du site elle-même : la même grille, le même trait,
le tracé de `house` posé sur un carré à l'arrondi de la charte.

## Ajouter un pictogramme

```bash
npm pack lucide-static@1.46.0          # ou npm install, puis copier le fichier
cp .../icons/nom.svg moteur/icones/
```

puis ajouter la même entrée dans `ICONES`, dans `moteur/js/gabarit.js`. Le
test refuse une table qui s'écarte du fichier, et une entrée sans fichier.
