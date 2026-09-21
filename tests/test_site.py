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
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
DONNEES = json.loads((RACINE / "moteur" / "donnees.json").read_text(encoding="utf-8"))
PAGES = (RACINE / "moteur" / "js" / "pages.js").read_text(encoding="utf-8")
GABARIT = (RACINE / "moteur" / "js" / "gabarit.js").read_text(encoding="utf-8")
CALCULS = (RACINE / "moteur" / "js" / "calculs.js").read_text(encoding="utf-8")
INDEX = (RACINE / "index.html").read_text(encoding="utf-8")

CHAMPS = ("libelle", "valeur", "unite", "annee", "fiabilite", "source", "url", "lu_le")
FIABILITES = ("officielle", "academique", "presse", "calcul")
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

    def test_le_solde_public_est_la_difference_annoncee(self):
        """Le seul chiffre calculé du paquet : il doit tomber juste."""
        chiffres = DONNEES["chiffres"]
        attendu = chiffres["prelevements"]["valeur"] - chiffres["aides_totales_2024"]["valeur"]
        self.assertAlmostEqual(chiffres["solde_public"]["valeur"], attendu, places=1)


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

    def test_aucune_grandeur_n_est_ecrite_dans_la_prose(self):
        fautes = []
        for m in self.GRANDEUR.finditer(PAGES):
            ligne = PAGES[:m.start()].count("\n") + 1
            fautes.append(f"ligne {ligne} : « {m.group(0)} »")
        self.assertEqual(fautes, [],
                         "pages.js : grandeur écrite à la main, "
                         "elle doit venir de donnees.json — " + " ; ".join(fautes))


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
