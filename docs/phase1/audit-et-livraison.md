# Karanta — audit et consolidation de la phase 1

État vérifié le 28 octobre 2026. Branche de travail : `codex/karanta-phase1-consolidation-20261028`.

## Code conservé

| Branche                                     | Commit inspecté | Relation et décision                                                                                        |
| ------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------- |
| `main`                                      | `0e21005`       | Base de production inchangée                                                                                |
| `codex/karanta-v1-consolidation`            | `c1bc483`       | Auth M9, routage strict des portails, administration et accueil conservés                                   |
| `codex/majliss-v2-r2-qa`                    | `9387b3b`       | Descend de la consolidation ; dépôts audio V2 conservés                                                     |
| `codex/karanta-phase1-familles-professeurs` | `9ec8fb1`       | Descend de Majliss V2 ; base de la nouvelle branche, pour conserver le travail famille/professeurs existant |

La nouvelle branche ne fusionne aucune branche distante. Elle conserve l’historique publié. La PR vise `main` et contient donc également les travaux antérieurs non fusionnés, dont ceux de la PR #8 ; ce point doit être pris en compte à la revue.

## Existant / à corriger / manquant

| Domaine                | Existant vérifié dans le code                                                                            | Correction livrée dans cette consolidation                                                                                                                                     | Encore manquant                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parent                 | Connexion, profils canoniques, lien familial, progression, devoirs et planning                           | Choix du niveau réel et d’un premier livre publié depuis l’enfant sélectionné ; retour vers le livre existant ; reprise après erreur réseau ; choix réinitialisé entre profils | Activation serveur de l’ajout d’enfant sur recette complète ; choix durable de parcours et qualification par âge                                        |
| Ajout d’enfant         | Formulaire court, consentement, identifiant stable et plan RPC transactionnel dans la branche précédente | Vérification en lecture des colonnes, contraintes, triggers et flags en production ; maintien du verrou d’activation                                                           | RPC absente en production et flag `family_onboarding_v1` absent : création désactivée ; recette réelle obligatoire                                      |
| Professeurs            | Annuaire, biographie, portraits publiés et audios approuvés                                              | Fiche responsive issue du Figma : présentation vert profond, trois blocs de confiance, liens vers les enseignements                                                            | Formation, maîtres, ouvrages, disciplines et associations professeur/cours non modélisés dans le catalogue Majliss actuel ; aucune association inventée |
| Navigation             | Accueil, méthodes, Majliss, boutique et portails                                                         | Six liens de navigation mobile sur six colonnes ; textes contenus ; sélecteur de profil adapté aux petits écrans ; libellé accessible de déconnexion                           | Recette authentifiée de tous les rôles                                                                                                                  |
| Pédagogie              | Discipline → Livre/Méthode → Chapitre → Leçon → Séance → Ressource ; progression canonique               | Structure, IDs, médias et progressions inchangés                                                                                                                               | Studio, annulation/historique et sauvegarde : phase 2                                                                                                   |
| Al-Akhdari             | Requête agrégée en production : 57 séances, 57 IDs distincts, 57 positions distinctes, de 0 à 56         | Constat en lecture seulement                                                                                                                                                   | Vérification pédagogique de l’ordre des titres à partir des sources, et réorganisation en recette                                                       |
| Professeur / assistant | Espaces existants, dépôt guidé et workflow audio V2                                                      | Conservés                                                                                                                                                                      | Recette de transfert, interruption, doublons et validation : phase 2                                                                                    |
| Accueil et images      | Landing éditoriale et packs WebP/SVG de la branche précédente                                            | Conservés et retestés sur trois formats                                                                                                                                        | Consolidation visuelle complète de l’accueil selon Figma : phase 3                                                                                      |

## Figma et intégration

Les nœuds `32:3` (parent) et `32:39` (fiche professeur) du fichier `dYByPMucwnpdwXKPfwz5tT` ont été lus via le connecteur Figma avec leur code et leurs captures. Les composants existants et les polices déjà déclarées sont réutilisés. Le nom, les titres et les cours d’exemple du wireframe ne sont pas copiés comme des données réelles. La fiche reprend la composition du wireframe, adaptée aux données publiées disponibles. Il ne s’agit pas d’une conformité pixel à pixel de l’ensemble de la plateforme. Les styles nouveaux sont limités à la fiche publique ; l’administration n’est pas modifiée.

Le premier parcours charge uniquement les champs utiles de `books`, avec les filtres d’organisation et de publication. Les niveaux proviennent des données, sans classement pédagogique inventé. Le choix ouvre la page de livre existante ; il ne crée ni inscription en classe, ni droit premium, ni progression artificielle. Il reste temporaire et doit être refait à la prochaine visite. Les contrôles d’accès aux séances restent ceux du backend existant.

## Accès externes constatés

- GitHub : dépôt et branches accessibles par le connecteur ; clone local effectué. Les modifications sont publiées sur la branche dédiée, avec une PR de revue, sans fusion.
- Vercel : projet `diakspora-karanta-online`, équipe Kayro Digital, Node 24 ; variables Supabase présentes pour Preview, Development et Production. Aucune valeur secrète publiée et aucune variable modifiée. La prévisualisation est protégée par l’authentification Vercel. Son URL et le commit construit sont indiqués dans la PR.
- Supabase production `tcbxscwgorxixlwyiico` : état `ACTIVE_HEALTHY`. Uniquement des requêtes SELECT de métadonnées, flags, catalogue publié et comptage des séances ont été exécutées. Aucune lecture de fiches d’enfants, aucune écriture ni migration.
- Supabase `Karanta QA`, référence `wtwrxxuqdvtfkkeimird` : projet isolé existant, inactif. La tentative de remise en service a été refusée par Supabase, qui indique la limite de deux projets gratuits actifs atteinte. Aucun projet actif n’a été suspendu, supprimé ou changé d’offre. Aucune recette distante avec écritures n’a pu être effectuée.

## Fichiers modifiés dans cette consolidation

- `src/features/family/FirstLearningPath.tsx` : nouveau choix du niveau et du livre, chargement, erreur et reprise.
- `src/features/family/FamilyOnboarding.tsx` : rattachement du choix au profil actif et exclusion des profils suspendus de la liste d’enfants affichée.
- `src/routes/parent.tsx` : titre de progression adapté au profil et nom accessible de déconnexion.
- `src/components/ActiveProfileSwitcher.tsx` : largeur responsive.
- `src/features/teachers/PublicTeachers.tsx`, `src/styles.css` : fiche publique et tokens locaux.
- `src/features/learning/LearningUi.tsx` : navigation mobile.
- `tests/e2e/phase1.smoke.spec.ts` : contrats et scénarios de régression enrichis.
- Rapports et captures dans `docs/phase1/`.

## SQL proposé et condition de lancement

Aucune migration nouvelle dans cette consolidation. Le plan existant `supabase/plans/phase1/create_my_child_profile.sql` est conservé sans application. Les métadonnées observées confirment les colonnes canoniques et les triggers M2/M3 ; la clé primaire `profiles.id` n’est pas liée à `auth.users`. Cela ne valide pas le comportement de tous les triggers, policies et contraintes en recette réelle.

Les 40 tests unitaires, dont le contrat SQL PGlite, ne reconstruisent pas tout le schéma Supabase. Il faut rendre un environnement QA disponible, y revoir et tester le plan RPC avec les policies et triggers réels, vérifier les refus inter-familles, puis décider de son activation. Ne pas activer le flag en production avant cette étape.

La phase 1 est livrée pour revue du code et de l’interface ; l’ajout autonome d’enfant n’est pas prêt à être activé en production. Les phases 2 et 3 restent à réaliser. Aucun déploiement de production ni fusion sans autorisation explicite.
