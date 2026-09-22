# Sprint 6 — Handoff Codex

Lire d'abord `docs/SPRINT_6_RBAC_AUDIT.md`.

## Mission

Implémenter le Sprint 6 RBAC en faisant évoluer l'architecture existante, sans recréer un système de rôles parallèle.

## Contraintes fortes

1. Ne pas remplacer `organization_memberships`.
2. Le multi-rôle existe déjà en base via plusieurs lignes `(organization_id, user_id, role)`.
3. Corriger le bug mono-rôle dans `admin-members`.
4. Étendre `PortalAccess` pour exposer tous les rôles actifs utiles.
5. Centraliser les capacités ; limiter les comparaisons de rôles dispersées.
6. RLS / serveur restent l'autorité.
7. Préserver les Sprints 3 et 4.
8. Ne pas réécrire l'historique Git publié ; le projet est connecté à Lovable.
9. Travailler sur une branche dédiée issue de `prep/sprint-6-rbac` ou reprendre cette branche.
10. Ne pas merger vers `main` avant validation.

## Mapping métier à conserver

- Super Admin plateforme -> platform_owner / platform_admin
- Direction -> owner
- Assistant administratif -> admin
- Responsable pédagogique -> pedagogical_manager
- Gestionnaire classes -> class_manager
- Commercial / Admissions -> commercial
- Finance -> accounting
- Support -> support
- Technique interne -> technician

Teacher, parent et learner restent inchangés.

## P0

### admin-members

Remplacer la récupération `.maybeSingle()` du rôle manager par le chargement de tous les rôles actifs.

`requireRole(allowed)` doit réussir si l'intersection entre les rôles actifs et `allowed` n'est pas vide.

### portal-access

Retourner les rôles actifs de l'organisation et fournir des helpers d'autorisation.

Ne pas casser les usages actuels de `membership` lors de la première passe ; effectuer une migration progressive.

## P1

- interface ajout/retrait de rôles ;
- capacités et navigation ;
- durcissement de la séparation Direction / admin / finance / pédagogie ;
- audit_logs pour chaque mutation de rôle.

## RLS

Réviser en particulier :

- `can_manage_learning`
- `can_manage_admission_finance`
- memberships
- profiles
- audit_logs

Ne pas modifier les règles sans tests pgTAP.

## Tests / commandes

Exécuter :

- TypeScript / build ;
- ESLint ;
- tests Supabase / pgTAP existants ;
- nouveaux tests Sprint 6 ;
- preview Vercel ;
- vérification runtime.

## Livrable final attendu

Fournir :

- commit(s) ;
- migration(s) ;
- fonctions/RLS modifiées ;
- fichiers frontend modifiés ;
- tests ajoutés ;
- résultats build/lint/tests ;
- URL preview Vercel ;
- liste des éventuelles limitations.

Ne pas déclarer le Sprint 6 validé : la validation finale est effectuée séparément après audit GitHub + Supabase + Vercel.
