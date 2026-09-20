#!/usr/bin/env bash
# Tout ce que le dépôt vérifie, en une commande et sans rien installer.
#
#     bash scripts/verifier.sh
#
# Deux suites : celle de Python, qui relit les données et les fichiers du site
# (bibliothèque standard seule), et celle de Node, qui exécute les deux calculs
# et compose les huit pages. Aucune des deux ne demande de dépendance.

set -uo pipefail
racine=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$racine" || exit 1

echec=0

echo "— les données et les fichiers du site"
python3 -m unittest discover -s tests || echec=1

echo
echo "— les calculs et le rendu des pages"
node --test tests/js/*.test.js || echec=1

echo
if [ "$echec" = 0 ]; then
    echo "Tout passe."
else
    echo "Au moins une vérification a échoué." >&2
fi
exit "$echec"
