#!/usr/bin/env bash
# Publie sur main ce que la session a commité, et aligne la branche de session.
#
# Pourquoi ce script existe : le dépôt veut tout sur main (voir CLAUDE.md), mais
# une session web est posée d'office sur une branche claude/*, dont la référence
# distante est créée au démarrage. `git push origin HEAD:main` ne touche pas
# cette référence : elle reste sur le commit du clone, le compteur de commits
# « non poussés » monte à chaque commit, et chaque session y perdait un
# paragraphe d'explication. On pousse donc sur main (c'est là que le travail
# vit) puis on fait suivre la référence de branche, qui ne porte alors jamais
# que ce que main porte déjà. On ne crée jamais cette référence si elle
# n'existe pas : une session ne pourrait pas la supprimer (403).
#
# Usage : bash scripts/pousser.sh   — silencieux s'il n'y a rien à publier,
# une ligne s'il a poussé, un message sur stderr et un code non nul s'il bloque.

set -uo pipefail

racine=$(git rev-parse --show-toplevel 2>/dev/null) || {
    echo "pousser: pas dans un dépôt git" >&2; exit 1; }
cd "$racine" || exit 1

branche=$(git rev-parse --abbrev-ref HEAD)
if [ "$branche" = HEAD ]; then
    echo "pousser: HEAD détachée, rien poussé" >&2; exit 1
fi

# Le réseau lâche : quatre essais, 2s, 4s, 8s, 16s.
avec_reprises() {
    local attente=2 essai
    for essai in 1 2 3 4 5; do
        if "$@"; then return 0; fi
        [ "$essai" = 5 ] && return 1
        sleep "$attente"
        attente=$(( attente * 2 ))
    done
}

avec_reprises git fetch --quiet origin main || {
    echo "pousser: fetch origin main impossible après 5 essais" >&2; exit 1; }

# origin/main est ce que GitHub porte ; le main local est un post-it périmé, on
# ne le nomme jamais. Trois cas, et un seul touche au répertoire de travail.
if git merge-base --is-ancestor origin/main HEAD; then
    :   # HEAD porte déjà tout main : rien à rattraper, on ne touche à rien
elif git merge-base --is-ancestor HEAD origin/main; then
    # En retard sur main : avance rapide. Elle refuse si des modifications non
    # commitées sont sur le chemin — le dire, plutôt que crier à la divergence.
    if ! git merge --ff-only origin/main >/dev/null 2>&1; then
        echo "pousser: impossible de rattraper origin/main (des modifications non commitées sont sur le chemin ?), rien poussé" >&2
        exit 1
    fi
else
    # Les deux lignées ont divergé. Le cas ordinaire est bénin — une autre
    # session a poussé pendant celle-ci, chacune a ses commits depuis une base
    # commune — et un rebasage le règle : nos commits n'ont jamais été publiés
    # sur main. On refuse dès que ça sort de ce cas.
    base=$(git merge-base HEAD origin/main 2>/dev/null || echo "")
    if [ -z "$base" ]; then
        echo "pousser: HEAD et origin/main n'ont aucun ancêtre commun, rien poussé — c'est le cas grave, voir CLAUDE.md" >&2
        exit 1
    fi
    if [ "$(git rev-list --count "$base"..HEAD)" -gt 20 ]; then
        echo "pousser: HEAD a divergé de origin/main de plus de vingt commits, rien poussé — comprendre pourquoi avant d'insister (git log --oneline --graph HEAD origin/main)" >&2
        exit 1
    fi
    if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
        echo "pousser: origin/main a avancé et des modifications ne sont pas commitées, rien poussé — commiter, puis relancer" >&2
        exit 1
    fi
    if ! git rebase --quiet origin/main >/dev/null 2>&1; then
        git rebase --abort >/dev/null 2>&1 || true
        echo "pousser: le rebasage sur origin/main bute sur un conflit, rien poussé — le résoudre à la main (git rebase origin/main)" >&2
        exit 1
    fi
fi

tete=$(git rev-parse HEAD)
avance=$(git rev-list --count origin/main..HEAD)

if [ "$avance" -gt 0 ]; then
    avec_reprises git push --quiet origin HEAD:main || {
        echo "pousser: push vers main impossible après 5 essais" >&2; exit 1; }
fi

# Faire suivre la référence de la branche de session, pour que le compteur de
# commits non poussés lise zéro. Jamais de création. `ls-remote` distingue les
# trois cas par son code de sortie, et c'est ce qui rend ce bloc sûr : 0 la
# référence est sur GitHub, 2 elle n'y est pas, autre chose le réseau a lâché.
git ls-remote --exit-code --heads origin "$branche" >/dev/null 2>&1
case $? in
    0)
        distant=$(git rev-parse --quiet --verify "refs/remotes/origin/$branche" 2>/dev/null || echo "")
        if [ "$distant" != "$tete" ]; then
            # --force-with-lease : après un rebasage, la référence de session ne
            # descend plus de ce qu'elle portait. Elle ne porte que ce que main
            # porte, et n'appartient qu'à cette session : rien à perdre. Le bail
            # refuse quand même si elle a bougé sous nos pieds.
            avec_reprises git push --quiet --force-with-lease origin "HEAD:refs/heads/$branche" >/dev/null 2>&1 || true
        fi
        ;;
    2)
        # La branche n'est pas, ou n'est plus, sur GitHub — supprimée à la main
        # depuis l'onglet Branches, comme CLAUDE.md le demande. Le script ne la
        # recrée pas : une session ne saurait pas la supprimer (403). Mais le
        # POINTEUR DE SUIVI local, lui, survit à la suppression et reste figé
        # sur le commit du clone ; tout ce qui compte « origin/$branche..HEAD »
        # lit alors une branche entière de retard sur un fantôme. C'est ce qui
        # faisait remonter le compteur malgré le script. On le supprime : le
        # geste est PUREMENT LOCAL, il ne crée ni n'efface rien sur GitHub, et
        # c'est ce que ferait `git fetch --prune`.
        git update-ref -d "refs/remotes/origin/$branche" >/dev/null 2>&1 || true
        ;;
    *)
        : # ls-remote a échoué : ne rien conclure de son silence, ne rien toucher.
        ;;
esac

# Et donner à la branche locale l'amont qu'elle n'a pas : sans lui, le compteur
# compare à un point fixe et remonte à chaque commit.
git branch --quiet --set-upstream-to=origin/main "$branche" >/dev/null 2>&1 || true

if [ "$avance" -gt 0 ]; then
    echo "main ← ${tete:0:7} ($avance commit(s))"
fi
