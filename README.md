# Diakspora Karanta

Académie en ligne d'arabe et de sciences islamiques pour la diaspora musulmane francophone.

**Publics :**
- Enfants et adolescents
- Adultes débutants
- Public avancé

## Statut

Application connectée à **Supabase**, **GitHub** et **Vercel**.

État fonctionnel au démarrage du Sprint 6 :

- fondations multi-tenant et authentification ;
- espaces élève, parent, professeur et administration ;
- espace professeur bilingue français / arabe ;
- assistant IA de création de cours ;
- règles de brouillons professeur et publication contrôlée ;
- parcours public d'inscription ;
- classes, planning, séances et présences ;
- Admissions / CRM avec pipeline, matching de classes, paiements administratifs et imports CSV ;
- RLS Supabase sur les tables publiques ;
- déploiements Vercel synchronisés.

**Sprints validés :**
- Sprint 1 — assainissement produit ;
- Sprint 2 — parcours public / inscription ;
- Sprint 3 — classes & planning ;
- Sprint 4 — admissions / CRM.

**Sprint en préparation :**
- Sprint 6 — rôles administratifs / RBAC multi-rôles.

Voir :
- `docs/SPRINT_6_RBAC_AUDIT.md`
- `docs/SPRINT_6_CODEX_HANDOFF.md`

## Identité visuelle

- **Palette :** vert profond (primaire), doré / ambre (accent), anthracite (texte), crème (fond). Tokens définis dans `src/styles.css`.
- **Typographie :** Cormorant Garamond (titres serif), Inter (corps), Amiri (arabe / RTL).
- **Ton :** sérieux, chaleureux et familial — héritage de l'enseignement traditionnel et outil numérique moderne.

## Routes principales

| URL | Usage |
| --- | --- |
| `/` | Page d'accueil publique |
| `/auth` | Authentification |
| `/eleve` | Espace élève |
| `/parent` | Espace parent |
| `/professeur` | Espace professeur |
| `/admin` | Console d'administration |
| `/planning` | Classes et planning |
| `/inscriptions` | Admissions / CRM |

D'autres routes pédagogiques existent pour les leçons, devoirs, directs, messages et progression.

## Architecture des rôles

Les rôles d'organisation sont stockés dans `public.organization_memberships`.

Un utilisateur peut posséder plusieurs rôles dans une même organisation : la clé d'unicité porte sur `(organization_id, user_id, role)`.

Rôles actuels :

- `owner`
- `admin`
- `technician`
- `commercial`
- `accounting`
- `support`
- `pedagogical_manager`
- `teacher`
- `class_manager`
- `parent`
- `learner`

Les administrateurs de plateforme sont séparés dans `platform_administrators`.

Les règles d'autorisation reposent principalement sur les helpers privés Supabase, notamment `private.has_organization_role(...)`, et sur les policies RLS. Le frontend ne doit pas être considéré comme la source d'autorité.

## Architecture pédagogique et fonctionnelle

Le projet contient notamment :

- `organizations` / `organization_memberships` ;
- `learner_profiles` et relations familiales ;
- `cohorts` et affectations ;
- `courses` → `course_modules` → `lessons` ;
- ressources et quiz ;
- devoirs et progression ;
- séances en direct et présences ;
- évaluations, compétences et bulletins ;
- messagerie pédagogique et support ;
- admissions / CRM ;
- paiements administratifs d'admission ;
- boutique.

## Sécurité

- RLS activée sur les tables publiques du projet.
- Les permissions métier doivent être vérifiées côté base / serveur, et non uniquement par l'interface.
- Les clés `service_role` ne doivent jamais être exposées côté client.
- Les changements de rôles et actions sensibles doivent être journalisés.
- Les fonctions `SECURITY DEFINER` et les policies doivent être revues lors des sprints de sécurité.

## Développement et déploiement

Le projet est connecté à Lovable.

**Ne pas réécrire l'historique Git déjà publié :**
- pas de force push ;
- pas de rebase/amend/squash sur les commits déjà poussés.

Les changements importants doivent être réalisés sur une branche dédiée, validés par TypeScript/ESLint/build/tests, puis contrôlés sur une preview Vercel avant merge vers `main`.
