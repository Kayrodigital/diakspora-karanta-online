# Karanta — audit court et phase 1

## État des branches inspectées

- `main` : `0e2100526b08f21e3750cc167b4e7ad5e5979f9f`.
- `codex/karanta-v1-consolidation` : `c1bc48310bf08cb28c14ed6fa37d50620dcab47f`.
- `codex/majliss-v2-r2-qa` : `9387b3b97609c0c62322f619a31501f1c8f79f23`, descendant de la consolidation.
- Branche de travail : `codex/karanta-phase1-familles-professeurs`, avancée jusqu’au dernier commit Majliss pour conserver les travaux récents. Aucun changement sur `main`, aucune fusion distante ni déploiement de production.

| Domaine | Existant dans le code | À corriger / manquant | Phase 1 |
|---|---|---|---|
| Auth | Portails stricts, invitations, récupération, fin d’activation, tests M9 | Validation réelle de la délivrabilité et comptes isolés | Conservé |
| Parent | Profils canoniques, sélecteur, progression, évaluations, planning | Ajout guidé d’enfant absent ; longs messages internes dans l’espace famille | Nouveau composant guidé, sélection des enfants, liens vers méthodes et classes |
| Catalogue | Discipline → Livre/Méthode → Chapitre → Leçon → Séance ; progression M8 | Vérifier les accès réels sur recette | Conservé, aucune modification d’identifiants ou de progression |
| Professeurs publics | Biographie et enregistrements dans la page Majliss village/professeur | Pas d’annuaire transversal ni fiche dédiée | `/enseignants`, `/enseignants/$teacherSlug`, portrait publié, biographie, langues des audios et liens vers enseignements approuvés |
| Références scientifiques | Ressources et contenu éditorial existants | Informations de formation, diplômes, références et associations professeur/cours à documenter | Aucune information inventée ni association déduite d’un nom |
| Navigation | Accueil et shell apprentissage | Menu accueil absent entre 640 et 1023 px | Menu tablette rétabli, accès Professeurs ajouté |
| Studio | `EditorialBookEditor` : drag/drop, ordre et aperçu ; RPC atomique `update_editorial_session` | Audit approfondi annulation, historique, droits et 57 séances Al-Akhdari | Préservé ; phase 2 à réaliser |
| Majliss | Villages, professeurs, lecteur, progression, dépôt audio V2, contrôle de fichiers et plan de stockage privé QA | Validation réelle des transferts, interruptions, publication et permissions | Préservé ; lien vers fiche professeur et filtres explicites de publication |
| Boutique / admissions | Boutique, classes publiques, demande d’inscription, CRM staff | Parcours réel à tester sur recette | Préservé |
| Assets | Identité verte, ivoire et or | Nouveaux packs à intégrer progressivement | Pack centralisé WebP/SVG importé ; scène famille dans une carte à taille adaptée, sans portrait fictif de professeur |

## Fonctionnement livré

L’accueil utilise la promesse demandée et un CTA vers le portail parent. L’ajout d’enfant demande seulement un nom d’usage et la confirmation du responsable légal. Il ne crée aucun compte Auth pour l’enfant et ne lui accorde aucun droit payant ou inscription de classe. Le parent retrouve les méthodes publiées et le parcours existant de choix d’une classe, qui conserve ses règles d’âge et de niveau. Les droits restent ceux du backend existant.

L’opération d’ajout est **désactivée par défaut**. L’interface l’affiche seulement lorsque `profile_identity_v2` et `family_onboarding_v1` sont vrais pour l’organisation. Le serveur vérifie aussi ces flags, le compte authentifié, le rôle parent actif, le profil canonique actif, l’organisation et le consentement. L’écriture crée profil, lien familial et pont `learner_profiles` dans une seule transaction. Un identifiant stable protège contre les doublons lors d’une reprise réseau. Les erreurs conservent le formulaire.

## Proposition de migration et limites de schéma

`supabase/plans/phase1/create_my_child_profile.sql` est un **plan SQL**, pas une migration automatiquement appliquée. Aucun flag n’a été activé ni SQL exécuté sur Supabase. Le dépôt utilise des colonnes et fonctions canoniques M4 (`profiles.auth_user_id`, `profile_type`, `family_relationships.parent_profile_id`, `private.can_act_as_profile`) dont le DDL complet n’apparaît pas dans l’historique de migrations. Rejouer cet historique seul ne prouve donc pas la compatibilité avec la base de production.

Les tests PGlite utilisent un schéma minimal avec les colonnes canoniques connues. Ils démontrent le contrat de la nouvelle RPC, ses droits EXECUTE, les contrôles métier, l’atomicité et l’idempotence. Ils **ne remplacent pas** un test sur une copie complète du schéma canonique et de ses triggers/RLS. Avant activation : revoir la migration sur recette isolée, vérifier les clés étrangères de `profiles.id` (l’enfant ne doit pas référencer `auth.users`), les contraintes des tables et les policies existantes ; appliquer uniquement à cette recette ; vérifier création, sélection, accès autorisé et refus inter-familles avec des comptes QA. Les flags restent faux jusqu’à cette recette.

## Fichiers principaux

- `src/features/family/FamilyOnboarding.tsx`, `src/routes/parent.tsx` : parcours parent.
- `src/features/teachers/PublicTeachers.tsx`, `src/routes/enseignants*.tsx` : annuaire et fiches.
- `src/features/majliss/majliss-data.ts` : requêtes publiques limitées aux champs utiles ; aucune signature d’URL privée ni lecture de progression familiale dans l’annuaire.
- `src/features/majliss/MajlissUi.tsx`, `src/features/learning/LearningUi.tsx`, `src/routes/index.tsx` : navigation et accueil.
- `public/assets/karanta/`, `src/lib/karanta-assets.ts` : 25 visuels WebP et icônes des packs fournis. Images illustratives générées, jamais traitées comme archives ou preuves religieuses. Seule la scène famille a été intégrée dans cette phase ; les écritures décoratives des autres images nécessitent une revue avant usage.
- `tests/unit/family-onboarding-sql.test.mjs`, `tests/e2e/phase1.smoke.spec.ts` : tests serveur isolés et contrats UI avec données fictives explicitement réservées à la recette.

## Accès externes

- Figma : aucun outil du plugin disponible ; accès HTTP refusé par la politique réseau. Les exigences du document servent de référence ; aucune conformité pixel à pixel revendiquée.
- Supabase : aucune variable Supabase disponible dans le processus ou dans les bindings de l’environnement. Aucun accès production validé, aucune écriture distante effectuée.
- Vercel : connexion décrite par `docs/VERCEL_DEPLOYMENT.md`, mais aucun binding/outil Vercel ni configuration locale `.vercel`. Aucune URL de prévisualisation vérifiée.
- GitHub : lecture Git et branches accessibles via le proxy ; API `api.github.com` refusée par la politique réseau lors de la vérification. La création de PR dépend de cet accès.
- Les domaines nécessaires ont été ajoutés au brouillon de configuration, sans application ni publication automatique. Une sauvegarde du brouillon ne prouve pas leur accès runtime.

## Prochaines phases

Phase 2 : contrôler le studio existant et la restauration, tester les 57 séances sans altérer leurs IDs, simplifier l’édition et les validations professeur/assistant, éprouver les transferts et les droits sur recette isolée. Phase 3 : consolidation visuelle complète selon Figma après accès, placements éditoriaux des visuels approuvés et mesure des performances mobiles. Aucun lancement production avant validation explicite.
