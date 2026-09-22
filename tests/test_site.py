"""Ce que le site s'interdit.

Ces tests n'ouvrent aucun navigateur et n'installent rien : la bibliothèque
standard suffit, et c'est voulu. Un site statique dont la vérification demande
un environnement à monter n'est pas vérifié longtemps.

    python3 -m unittest discover -s tests -v

Ils tiennent quatre promesses du dépôt :

  1. tout chiffre affiché porte sa source, son année et sa date de lecture ;
  2. aucune page ne cite un chiffre qui n'existe pas, et aucun chiffre ne
     dort dans les données sans être cité ;
  3. la page ne demande aucune ressource à un tiers ;
  4. les pictogrammes écrits dans le gabarit sont ceux des fichiers.
"""

import json
import re
import unittest
from datetime import date
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
DONNEES = json.loads((RACINE / "moteur" / "donnees.json").read_text(encoding="utf-8"))
PAGES = (RACINE / "moteur" / "js" / "pages.js").read_text(encoding="utf-8")
GABARIT = (RACINE / "moteur" / "js" / "gabarit.js").read_text(encoding="utf-8")
CALCULS = (RACINE / "moteur" / "js" / "calculs.js").read_text(encoding="utf-8")
INDEX = (RACINE / "index.html").read_text(encoding="utf-8")

CHAMPS = ("libelle", "valeur", "unite", "annee", "fiabilite", "source", "url", "lu_le")
FIABILITES = ("officielle", "academique", "partie_prenante", "presse", "calcul")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class Chiffres(unittest.TestCase):
    """Un chiffre sans source n'est pas un chiffre, c'est une opinion."""

    def test_chaque_chiffre_est_complet(self):
        for cle, entree in DONNEES["chiffres"].items():
            with self.subTest(chiffre=cle):
                for champ in CHAMPS:
                    self.assertIn(champ, entree, f"{cle} : champ « {champ} » manquant")
                self.assertIn(entree["fiabilite"], FIABILITES)
                self.assertRegex(entree["lu_le"], DATE)
                self.assertTrue(entree["url"].startswith("https://"),
                                f"{cle} : la source doit être une adresse https")
                self.assertIsInstance(entree["valeur"], (int, float))
                self.assertIsInstance(entree["annee"], int)
                self.assertGreaterEqual(entree["annee"], 1900)

    def test_un_calcul_dit_sa_formule(self):
        """« calcul » est le seul niveau qui n'a pas de source externe : il doit
        donc dire, dans sa note, d'où il sort."""
        for cle, entree in DONNEES["chiffres"].items():
            if entree["fiabilite"] == "calcul":
                with self.subTest(chiffre=cle):
                    self.assertIn("note", entree)
                    self.assertGreater(len(entree["note"]), 40)

    def test_les_series_sont_alignees(self):
        for cle, serie in DONNEES["series"].items():
            with self.subTest(serie=cle):
                longueur = len(serie["annees"])
                for nom, valeurs in serie.items():
                    if isinstance(valeurs, list):
                        self.assertEqual(len(valeurs), longueur,
                                         f"{cle}.{nom} n'a pas la longueur des années")
                for champ in ("source", "url", "lu_le", "fiabilite"):
                    self.assertIn(champ, serie)

    def test_une_source_designe_un_document_et_non_un_site(self):
        """Renvoyer à l'accueil d'une institution n'est pas citer : le lecteur
        qui veut vérifier doit tomber sur la publication, pas sur un menu."""
        for cle, entree in DONNEES["chiffres"].items():
            with self.subTest(chiffre=cle):
                chemin = entree["url"].split("//", 1)[1]
                self.assertIn("/", chemin.rstrip("/"),
                              f"{cle} : l'adresse ne désigne aucun document")

    def test_une_reprise_dit_qu_elle_en_est_une(self):
        """« presse » est une dette : elle doit être écrite quelque part, ou
        personne ne la remboursera."""
        for cle, entree in DONNEES["chiffres"].items():
            if entree["fiabilite"] == "presse":
                with self.subTest(chiffre=cle):
                    self.assertIn("note", entree,
                                  f"{cle} : une reprise sans note ne dit pas sa dette")

    def test_le_solde_public_ne_compte_les_niches_qu_une_fois(self):
        """Le seul chiffre calculé du paquet : il doit tomber juste.

        Les prélèvements du compte du logement sont nets des niches fiscales ;
        les aides, elles, les comprennent. Le solde a d'abord été calculé
        comme leur différence, qui retranchait les niches deux fois. Il se
        calcule sur les aides versées, et il doit valoir exactement la même
        chose quand on compte les niches des deux côtés."""
        c = {cle: e["valeur"] for cle, e in DONNEES["chiffres"].items()}
        self.assertAlmostEqual(c["aides_totales_2024"],
                               c["aides_hors_fiscales"] + c["depenses_fiscales"], places=1)
        self.assertAlmostEqual(c["solde_public"],
                               c["prelevements"] - c["aides_hors_fiscales"], places=1)
        self.assertAlmostEqual(c["solde_public"],
                               c["prelevements"] + c["depenses_fiscales"]
                               - c["aides_totales_2024"], places=1)
        self.assertNotAlmostEqual(c["solde_public"],
                                  c["prelevements"] - c["aides_totales_2024"], places=1,
                                  msg="le solde retranche de nouveau les niches")


class Citations(unittest.TestCase):
    """Les pages et les données doivent se recouvrir exactement."""

    @staticmethod
    def cles_citees():
        # Toutes les formes d'appel des pages : v(d, "x"), vc(d, "x"),
        # n(d, "x"), an(d, "x"), sources(d, "x", "y"), d.chiffre("x").
        citees = set()
        for appel in re.finditer(r"\b(?:v|vc|n|an)\(d,\s*\"([a-z0-9_]+)\"", PAGES):
            citees.add(appel.group(1))
        for appel in re.finditer(r"sources\(d,([^)]*)\)", PAGES, re.S):
            citees.update(re.findall(r"\"([a-z0-9_]+)\"", appel.group(1)))
        for appel in re.finditer(r"donnees\.valeur\(\"([a-z0-9_]+)\"\)", PAGES + CALCULS):
            citees.add(appel.group(1))
        for appel in re.finditer(r"d\.valeur\(\"([a-z0-9_]+)\"\)", PAGES):
            citees.add(appel.group(1))
        return citees

    def test_aucune_page_ne_cite_un_chiffre_absent(self):
        manquants = self.cles_citees() - set(DONNEES["chiffres"])
        self.assertEqual(manquants, set(),
                         f"clés citées mais absentes des données : {sorted(manquants)}")

    def test_aucun_chiffre_ne_dort_dans_les_donnees(self):
        """Un chiffre que personne n'affiche est un chiffre que personne ne
        vérifie : il finit par vieillir sans qu'on le voie."""
        orphelins = set(DONNEES["chiffres"]) - self.cles_citees()
        self.assertEqual(orphelins, set(),
                         f"chiffres présents mais jamais affichés : {sorted(orphelins)}")

    def test_chaque_serie_est_tracee(self):
        for cle in DONNEES["series"]:
            with self.subTest(serie=cle):
                self.assertIn(f'serie("{cle}")', PAGES)


class NombresEnDur(unittest.TestCase):
    """Aucune page n'écrit un nombre.

    C'est la règle du dépôt, et elle s'était desserrée sans bruit : des
    chiffres étaient réapparus dans la prose, hors données, hors source, hors
    date. Ils y vieillissaient seuls, et divergeaient de la valeur que la même
    page affichait deux lignes plus haut. Ces deux tests referment la porte.
    """

    #: `nombre(3.4, 1)` : une statistique passée en clair au formateur.
    #: Une expression (`milliards(10 * 12 * n(d, "x") / 1000)`) reste permise :
    #: ses facteurs sont des constantes de calcul, non des mesures.
    LITTERAL = re.compile(
        r"(?:nombre|milliards|euros|avecUnite)\(\s*-?\d+(?:\.\d+)?\s*[,)]")

    #: « 850 000 », « 18 100 » : un nombre séparé par milliers, donc une
    #: grandeur, écrite à la main dans une phrase.
    GRANDEUR = re.compile(r"\d{1,3}[\u00a0\u202f ]\d{3}(?![\d])")

    def test_aucune_statistique_n_est_passee_en_clair_au_formateur(self):
        fautes = [PAGES[:m.start()].count("\n") + 1
                  for m in self.LITTERAL.finditer(PAGES)]
        self.assertEqual(fautes, [], f"pages.js : nombre écrit en dur, lignes {fautes}")

    #: Un chiffre suivi de son unité dans une phrase : « 24 % », « 80 € ».
    MESURE = re.compile(
        r"(?<![\w.])(\d+(?:[,.]\d+)?)"
        r"(?=&nbsp;%|\s%|&nbsp;€|\s€|\sMd€|\sM€)")

    #: Les seuls nombres qu'une page a le droit d'écrire : ce ne sont pas des
    #: mesures. Un paramètre de la proposition (« 10 ans de recettes »), un
    #: taux fixé par la loi (la contribution de sécurité immobilière, le
    #: barème des droits de mutation), un pas de calcul (« par tranche de
    #: 10 € »), un zéro d'affichage. Tout le reste mesure quelque chose, et
    #: ce qui mesure vient de donnees.json, avec sa source et sa date.
    #: Cette liste est volontairement close : y ajouter une ligne demande de
    #: dire, ici, pourquoi le nombre n'est pas une mesure.
    NON_MESURES = {
        ("10 ans", "ce que la proposition rend à la commune"),
        ("0 %", "le taux de droits de mutation que la proposition vise"),
        ("0,10 %", "la contribution de sécurité immobilière, fixée par la loi"),
        ("4,50", "l'ancien plafond départemental des droits de mutation"),
        ("5,00", "le plafond départemental ouvert par la loi de finances 2025"),
        ("0 Md€", "l'affichage d'un poste nul"),
        ("10 €", "le pas du levier « chèque » sur la page Chiffrage"),
    }

    def test_une_mesure_ne_s_ecrit_pas_a_la_main(self):
        """Le site promet que ses mesures viennent toutes des données. Ce test
        est cette promesse : il refuse un nombre suivi de son unité qui ne
        serait pas dans la liste, close, de ce qui n'est pas une mesure."""
        permis = {valeur for valeur, _ in self.NON_MESURES}
        fautes = []
        for m in self.MESURE.finditer(PAGES):
            valeur = m.group(1)
            if re.fullmatch(r"(19|20)\d\d", valeur):
                continue  # une année n'est pas une grandeur
            entier = PAGES[m.start():m.end() + 12]
            if valeur in permis or any(entier.startswith(v) for v in permis):
                continue
            ligne = PAGES[:m.start()].count("\n") + 1
            fautes.append(f"ligne {ligne} : « {valeur} »")
        self.assertEqual(fautes, [],
                         "pages.js : mesure écrite à la main, elle doit venir "
                         "de donnees.json — " + " ; ".join(fautes))

    def test_aucune_grandeur_n_est_ecrite_dans_la_prose(self):
        fautes = []
        for m in self.GRANDEUR.finditer(PAGES):
            ligne = PAGES[:m.start()].count("\n") + 1
            fautes.append(f"ligne {ligne} : « {m.group(0)} »")
        self.assertEqual(fautes, [],
                         "pages.js : grandeur écrite à la main, "
                         "elle doit venir de donnees.json — " + " ; ".join(fautes))


class Peremption(unittest.TestCase):
    """Un fait daté se périme, et personne ne le voit.

    Le site dit qu'une expérimentation s'éteint à telle date, qu'un texte est
    au Sénat, qu'une interdiction suivra en 2028. Ces phrases sont vraies le
    jour où on les écrit et fausses un jour sans que rien ne prévienne : elles
    ne lèvent pas, elles ne cassent aucun test, elles vieillissent en silence
    au milieu de chiffres, eux, tenus à jour. C'est la façon la plus sûre de
    perdre la confiance qu'on met des années à gagner.

    `donnees.json` porte donc, à côté des chiffres, une liste d'échéances :
    chacune dit ce que le site affirme, jusqu'à quand cette affirmation tient,
    où elle est écrite, et quoi aller vérifier. Ces tests sont le réveil.
    Quand l'un d'eux sonne, il y a deux réponses acceptables — corriger le
    site, ou reporter l'échéance parce qu'on a vérifié qu'elle tient encore —
    et une seule inacceptable : supprimer l'échéance.
    """

    MOIS = ("janvier|février|mars|avril|mai|juin|juillet|août|septembre"
            "|octobre|novembre|décembre")
    #: « 25 novembre 2026 », « 1er avril 2025 » : une date écrite en toutes
    #: lettres dans une phrase du site.
    DATE = re.compile(r"\b((?:1er|\d{1,2}) (?:" + MOIS + r") (20\d\d))\b")
    #: Une année seule, qui peut annoncer un fait à venir.
    ANNEE = re.compile(r"(?<![\d/-])(20[2-9]\d)(?![\d/-])")

    #: Les années à venir qu'une page peut citer sans qu'une veille s'impose.
    #: Y ajouter une ligne demande de dire pourquoi la date ne se périme pas.
    ANNEES_SANS_ECHEANCE = {
        "2031": "l'ancienne échéance du ZAN, citée seulement pour dire "
                "qu'elle a été repoussée : c'est un fait passé",
        "2050": "l'horizon du ZAN. Une veille à vingt-cinq ans ne réveille "
                "personne ; la loi qui le porte est suivie par trace_zan",
    }

    #: Tout ce que le site écrit, pages et notes des données réunies : une
    #: date se périme aussi bien dans une note que dans un paragraphe.
    TEXTE = PAGES + "\n" + "\n".join(
        entree.get("note", "") for entree in DONNEES["chiffres"].values())

    @staticmethod
    def echeances():
        return DONNEES.get("echeances", {})

    def test_chaque_echeance_est_complete(self):
        """Une échéance sans mode d'emploi ne sert qu'à être supprimée le jour
        où elle sonne."""
        self.assertTrue(self.echeances(), "aucune échéance déclarée")
        for cle, entree in self.echeances().items():
            with self.subTest(echeance=cle):
                for champ in ("libelle", "echeance", "ou", "verifier", "url"):
                    self.assertIn(champ, entree, f"{cle} : « {champ} » manquant")
                self.assertRegex(entree["echeance"], DATE)
                self.assertTrue(entree["url"].startswith("https://"))
                self.assertGreater(len(entree["verifier"]), 60,
                                   f"{cle} : dire quoi vérifier, pas seulement "
                                   "qu'il faut vérifier")

    def test_aucune_echeance_n_est_passee(self):
        """Le réveil. Il sonne le lendemain du jour où une phrase du site a pu
        cesser d'être vraie."""
        aujourd_hui = date.today().isoformat()
        sonnees = [(cle, e) for cle, e in self.echeances().items()
                   if e["echeance"] < aujourd_hui]
        if sonnees:
            details = "\n".join(
                f"\n  ── {cle} (échéance du {e['echeance']})\n"
                f"     {e['libelle']}.\n"
                f"     Où : {e['ou']}\n"
                f"     Vérifier : {e['verifier']}\n"
                f"     Source : {e['url']}"
                for cle, e in sonnees)
            self.fail(
                f"{len(sonnees)} fait(s) daté(s) ont passé leur échéance au "
                f"{aujourd_hui}. Corriger le site, ou reporter l'échéance "
                f"après avoir vérifié qu'elle tient encore — jamais la "
                f"supprimer.{details}\n")

    def test_une_echeance_declaree_est_encore_ecrite(self):
        """Une échéance qui surveille une phrase disparue surveille le vide, et
        laisse croire que la veille est faite."""
        for cle, entree in self.echeances().items():
            if "ecrit" in entree:
                with self.subTest(echeance=cle):
                    # `assertIn` recopierait tout le site dans le message ;
                    # ce qu'il faut lire tient en une ligne.
                    self.assertTrue(
                        entree["ecrit"] in self.TEXTE,
                        f"{cle} : « {entree['ecrit']} » n'est plus écrit nulle "
                        "part. Soit la phrase a changé et l'échéance doit "
                        "suivre, soit elle a disparu et l'échéance n'a plus "
                        "d'objet — mais une échéance orpheline fait croire "
                        "qu'une veille est tenue.")

    def test_aucune_date_future_n_est_ecrite_sans_echeance(self):
        """L'autre sens : une date à venir posée dans une phrase sans que
        personne ne se soit engagé à la surveiller."""
        aujourd_hui = date.today().isoformat()
        MOIS_NUM = {nom: i + 1 for i, nom in enumerate(self.MOIS.split("|"))}
        declarees = {e["ecrit"] for e in self.echeances().values() if "ecrit" in e}
        orphelines = []
        for texte, annee in self.DATE.findall(self.TEXTE):
            jour, mois = texte.split(" ")[0], texte.split(" ")[1]
            iso = "%s-%02d-%02d" % (annee, MOIS_NUM[mois],
                                    1 if jour == "1er" else int(jour))
            if iso >= aujourd_hui and texte not in declarees:
                orphelines.append(texte)
        self.assertEqual(sorted(set(orphelines)), [],
                         "date à venir écrite sans échéance déclarée dans "
                         "donnees.json : " + ", ".join(sorted(set(orphelines))))

    def test_aucune_annee_future_n_est_citee_sans_veille(self):
        """Les faits à venir ne se datent pas toujours au jour près : « les
        classes F suivront en 2028 » est une promesse comme une autre."""
        annees_veillees = {e["echeance"][:4] for e in self.echeances().values()}
        cette_annee = str(date.today().year)
        orphelines = sorted({
            annee for annee in self.ANNEE.findall(self.TEXTE)
            if annee > cette_annee
            and annee not in annees_veillees
            and annee not in self.ANNEES_SANS_ECHEANCE})
        self.assertEqual(orphelines, [],
                         "année à venir citée sans échéance qui tombe cette "
                         "année-là, ni exemption motivée : " + ", ".join(orphelines))


class Autonomie(unittest.TestCase):
    """La page ne demande rien à personne."""

    RESSOURCES = re.compile(
        r"<(?:link|script|img|iframe|source)\b[^>]*?(?:href|src)=\"([^\"]+)\"")

    def test_index_ne_charge_aucune_ressource_tierce(self):
        for adresse in self.RESSOURCES.findall(INDEX):
            with self.subTest(ressource=adresse):
                self.assertFalse(adresse.startswith(("http://", "https://", "//")),
                                 f"ressource tierce chargée : {adresse}")

    def test_la_feuille_de_style_ne_charge_que_ses_polices(self):
        feuille = (RACINE / "moteur" / "style.css").read_text(encoding="utf-8")
        for adresse in re.findall(r"url\(([^)]+)\)", feuille):
            with self.subTest(ressource=adresse):
                self.assertTrue(adresse.startswith("polices/"),
                                f"la feuille charge autre chose qu'une police : {adresse}")

    def test_les_modules_preannonces_sont_ceux_du_dossier(self):
        annonces = set(re.findall(r'modulepreload\" href=\"moteur/js/([a-z-]+\.js)\"', INDEX))
        presents = {fichier.name for fichier in (RACINE / "moteur" / "js").glob("*.js")}
        self.assertEqual(annonces, presents,
                         "la liste des modules préchargés a dérivé du dossier")


class Pictogrammes(unittest.TestCase):
    """Le tracé écrit dans le gabarit est celui du fichier d'origine."""

    @staticmethod
    def tracés(svg):
        # Les balises du fichier Lucide, sans les espaces ni les retours à la
        # ligne : c'est la forme dans laquelle le gabarit les écrit.
        contenu = re.sub(r"<!--.*?-->", "", svg, flags=re.S)
        interieur = re.search(r"<svg[^>]*>(.*)</svg>", contenu, re.S)
        balises = re.findall(r"<(path|circle|line|rect|polyline)\b[^>]*/>",
                             interieur.group(1))
        return [re.sub(r"\s+", " ", balise).strip()
                for balise in re.findall(r"<(?:path|circle|line|rect|polyline)\b[^>]*/>",
                                         interieur.group(1))]

    def test_chaque_entree_de_la_table_a_son_fichier(self):
        table = re.search(r"export const ICONES = \{(.*?)\n\};", GABARIT, re.S).group(1)
        noms = re.findall(r"^\s{2}\"?([a-z0-9-]+)\"?:", table, re.M)
        self.assertTrue(noms, "la table des pictogrammes n'a pas été trouvée")
        for nom in noms:
            with self.subTest(pictogramme=nom):
                fichier = RACINE / "moteur" / "icones" / f"{nom}.svg"
                self.assertTrue(fichier.exists(), f"{nom}.svg manque dans moteur/icones/")

    def test_aucun_pictogramme_ne_dort_dans_le_depot(self):
        """Un dessin que personne n'affiche est un fichier qu'on traîne.

        On cherche le nom hors de la table des tracés : dans un appel à
        `icone`, ou dans la liste que la page des chantiers lui passe."""
        table = re.search(r"export const ICONES = \{.*?\n\};", GABARIT, re.S)
        ailleurs = GABARIT[:table.start()] + GABARIT[table.end():] + PAGES
        fichiers = {chemin.stem for chemin in (RACINE / "moteur" / "icones").glob("*.svg")}
        oublies = {nom for nom in fichiers if f'"{nom}"' not in ailleurs}
        self.assertEqual(oublies, set(),
                         f"pictogrammes présents mais jamais affichés : {sorted(oublies)}")

    def test_la_table_dit_ce_que_disent_les_fichiers(self):
        table = re.search(r"export const ICONES = \{(.*?)\n\};", GABARIT, re.S).group(1)
        # Chaque entrée, de son nom jusqu'au nom suivant : c'est le morceau de
        # code où son tracé est écrit.
        entrees = re.split(r"\n  (?=\"?[a-z0-9-]+\"?:)", table.strip())
        for entree in entrees:
            nom = re.match(r"\"?([a-z0-9-]+)\"?:", entree.strip()).group(1)
            with self.subTest(pictogramme=nom):
                fichier = RACINE / "moteur" / "icones" / f"{nom}.svg"
                original = re.sub(r"\s+", " ", fichier.read_text(encoding="utf-8"))
                for balise in self.tracés(fichier.read_text(encoding="utf-8")):
                    # Le gabarit coupe ses longues chaînes : on compare les
                    # tracés, débarrassés de ce que la coupure ajoute.
                    ecrit = re.sub(r"'\s*\+\s*'", "", entree)
                    ecrit = re.sub(r"\s+", " ", ecrit)
                    self.assertIn(balise, ecrit,
                                  f"{nom} : le gabarit s'écarte de {fichier.name}")
                self.assertTrue(original)


class Routes(unittest.TestCase):
    """Chaque page annoncée existe, et chaque page a sa description."""

    def test_les_trois_tables_ont_les_memes_routes(self):
        titres = set(re.findall(r'^  \"(/[a-z-]*)\":', 
                                re.search(r"export const TITRES = Object\.freeze\(\{(.*?)\}\);",
                                          PAGES, re.S).group(1), re.M))
        descriptions = set(re.findall(r'^  \"(/[a-z-]*)\":',
                                      re.search(r"export const DESCRIPTIONS = Object\.freeze\(\{(.*?)\n\}\);",
                                                PAGES, re.S).group(1), re.M))
        rendues = set(re.findall(r'^  \"(/[a-z-]*)\": page',
                                 re.search(r"const PAGES = Object\.freeze\(\{(.*?)\}\);",
                                           PAGES, re.S).group(1), re.M))
        self.assertEqual(titres, descriptions, "une page n'a pas sa description")
        self.assertEqual(titres, rendues, "une page annoncée n'est pas rendue")

    def test_la_navigation_ne_mene_nulle_part_ailleurs(self):
        groupes = re.search(r"export const GROUPES_NAVIGATION = \[(.*?)\n\];",
                            GABARIT, re.S).group(1)
        chemins = set(re.findall(r'\[\"(/[a-z-]*)\",', groupes))
        titres = set(re.findall(r'^  \"(/[a-z-]*)\":',
                                re.search(r"export const TITRES = Object\.freeze\(\{(.*?)\}\);",
                                          PAGES, re.S).group(1), re.M))
        self.assertTrue(chemins <= titres,
                        f"la navigation pointe vers des pages inconnues : {sorted(chemins - titres)}")


if __name__ == "__main__":
    unittest.main()
