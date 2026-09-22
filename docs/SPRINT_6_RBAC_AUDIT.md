# Sprint 6 — Audit RBAC et préparation avant Codex

## Statut du projet au démarrage

- Sprint 3 — Classes & planning : validé.
- Sprint 4 — Admissions / CRM : validé.
- Le projet est connecté à Supabase et Vercel.
- Les migrations Sprint 3 et Sprint 4 sont présentes dans GitHub et appliquées dans le projet Supabase `Karanta`.
- Le dernier état Vercel observé est sain : aucun runtime error détecté sur les 7 derniers jours.
- Cette branche de préparation ne modifie pas `main` ni la production.

## Conclusion d'architecture

Ne pas créer un nouveau système `users -> user_roles -> roles`.

Le projet possède déjà un modèle multi-rôle exploitable :

`organization_memberships`

avec :

- `organization_id`
- `user_id`
- `role`
- `status`
- `is_default`

et une contrainte :

`UNIQUE (organization_id, user_id, role)`

Un même utilisateur peut donc déjà posséder plusieurs rôles dans une même organisation via plusieurs lignes de membership.

La fonction privée `private.has_organization_role(organization_id, roles[])` sait déjà vérifier plusieurs rôles.

Le Sprint 6 doit faire évoluer cette architecture existante, pas la remplacer.

## Rôles techniques déjà existants

Rôles organisationnels :

- owner
- admin
- technician
- commercial
- accounting
- support
- pedagogical_manager
- teacher
- class_manager
- parent
- learner

Rôles plateforme séparés dans `platform_administrators` :

- platform_owner
- platform_admin
- platform_support

## Mapping métier Sprint 6

Pour éviter les migrations destructives et préserver l'existant, conserver les clés techniques et modifier principalement les labels, capacités et règles d'accès.

| Rôle métier | Clé existante |
| --- | --- |
| Super Admin plateforme | platform_owner / platform_admin |
| Direction | owner |
| Assistant administratif | admin |
| Responsable pédagogique | pedagogical_manager |
| Gestionnaire classes | class_manager |
| Commercial / Admissions | commercial |
| Finance | accounting |
| Support | support |
| Technique interne | technician |
| Professeur | teacher |
| Parent | parent |
| Élève | learner |

Le rôle `technician` reste un rôle interne technique et ne fait pas partie des 8 rôles métier visibles à présenter comme structure organisationnelle principale.

## Capacités existantes déjà présentes côté base

Le projet possède déjà des fonctions privées de domaine :

- `private.has_organization_role()`
- `private.can_manage_learning()`
- `private.can_manage_planning()`
- `private.can_read_admissions()`
- `private.can_manage_admissions()`
- `private.can_manage_admission_finance()`
- `private.can_teach_cohort()`
- `private.can_teach_course()`
- `private.is_platform_administrator()`

Il faut poursuivre cette stratégie plutôt que coder des dizaines de comparaisons `role === "..."` dispersées.

## Problèmes multi-rôles identifiés

### P0 — Edge Function admin-members

`supabase/functions/admin-members/index.ts` récupère actuellement un rôle manager avec :

`.in("role", managerRoles).maybeSingle()`

Dès qu'un utilisateur possède plusieurs rôles manager actifs dans une organisation, cette requête peut retourner plusieurs lignes et faire échouer `maybeSingle()`.

Correction Sprint 6 :

- charger tous les rôles actifs du caller ;
- constituer un Set de rôles ;
- remplacer `requireRole()` par une vérification d'intersection avec les rôles autorisés ;
- ne jamais sélectionner arbitrairement un seul rôle.

### P0 — Portal access ne transporte qu'un rôle

`src/lib/auth/portal-access.ts` charge toutes les memberships, mais `loadPortalAccess()` sélectionne ensuite une seule membership et renvoie uniquement `membership.role`.

Conséquence : les composants reçoivent un rôle unique alors que la base peut en fournir plusieurs.

Correction Sprint 6 :

- retourner la membership de contexte si nécessaire ;
- ajouter `roles: OrganizationRole[]` ;
- ajouter des helpers comme `hasRole()` / `hasAnyRole()` ou des capacités calculées ;
- ne pas casser les propriétés actuellement utilisées.

### P1 — UI Admin pensée mono-rôle

`AdminWorkspace`, `AdmissionsWorkspace` et `PlanningWorkspace` reçoivent aujourd'hui un prop `role: OrganizationRole`.

Le Sprint 6 doit migrer progressivement vers :

- `roles: OrganizationRole[]`
- ou `permissions/capabilities`

sans dupliquer la logique d'autorisation de la base.

### P1 — Gestion des rôles absente

Le dashboard admin permet d'inviter un utilisateur avec un rôle et de suspendre des membres, mais ne fournit pas encore une interface dédiée permettant :

- voir tous les rôles d'un utilisateur ;
- ajouter un rôle supplémentaire ;
- retirer un rôle ;
- protéger le dernier rôle Direction/owner ;
- empêcher une auto-suppression critique ;
- journaliser ces changements.

Le Sprint 6 doit l'ajouter.

## Matrice cible

### Super Admin plateforme

Accès global technique et organisationnel.

Doit rester séparé des rôles d'organisation.

### Direction — owner

- gestion membres et rôles ;
- pédagogie ;
- classes et planning ;
- admissions ;
- finance ;
- support ;
- reporting ;
- paramètres organisation ;
- audit.

### Assistant administratif — admin

- utilisateurs et dossiers administratifs ;
- admissions ;
- classes en lecture / opérations courantes selon besoin ;
- relances ;
- support administratif.

Ne doit pas devenir automatiquement un équivalent de Direction pour :
- paramètres sensibles ;
- gouvernance ;
- finance complète ;
- attribution des rôles les plus élevés.

### Responsable pédagogique — pedagogical_manager

- professeurs ;
- élèves ;
- classes ;
- cours ;
- devoirs ;
- évaluations ;
- progression ;
- validation et publication pédagogique.

Pas de finance complète.

### Gestionnaire classes — class_manager

- classes ;
- affectations ;
- planning ;
- présences ;
- propositions / confirmation de classe côté admissions lorsque nécessaire.

Pas de paramètres globaux ni finance complète.

### Commercial / Admissions — commercial

- demandes d'inscription ;
- qualification ;
- pipeline ;
- relances ;
- proposition de classes ;
- suivi CRM.

Pas d'accès pédagogique sensible ni validation financière.

### Finance — accounting

- paiements ;
- échéances ;
- impayés ;
- remboursements ;
- reçus ;
- données d'identité strictement nécessaires.

Pas de contenu pédagogique.

### Support — support

- état des comptes ;
- première connexion ;
- problèmes d'accès ;
- informations nécessaires au support.

Pas d'accès financier complet ni pédagogique non nécessaire.

### Technique interne — technician

Accès réservé à l'exploitation technique.

Ne pas présenter ce rôle comme un rôle métier standard.

## Fonctions de permission à stabiliser

Le Sprint 6 doit conserver les helpers existants et ajouter/ajuster les fonctions suivantes si nécessaire :

- `can_manage_members`
- `can_manage_roles`
- `can_manage_learning`
- `can_manage_planning`
- `can_read_admissions`
- `can_manage_admissions`
- `can_manage_admission_finance`
- `can_manage_support`
- `can_manage_settings`
- `can_read_audit_logs`

Principe :

- RLS et fonctions serveur = source d'autorité ;
- frontend = ergonomie et masquage ;
- aucun droit ne doit reposer seulement sur un menu masqué.

## Points à corriger dans les règles existantes

### Finance

`private.can_manage_admission_finance()` autorise actuellement :

- owner
- admin
- accounting

Si `admin` devient l'Assistant administratif métier, revoir ce droit. La cible recommandée est :

- owner
- accounting
- platform admin

et éventuellement un droit explicite séparé si l'assistant doit seulement lire un statut de paiement.

### Pédagogie

`private.can_manage_learning()` autorise actuellement :

- owner
- admin
- technician
- pedagogical_manager

Si `admin` devient Assistant administratif, ne pas lui laisser une capacité pédagogique complète par défaut.

### Admissions

Les règles Sprint 4 sont déjà différenciées par rôle et doivent être conservées autant que possible.

Le trigger `guard_admission_application_update()` constitue une bonne base : il limite déjà les champs modifiables par commercial, class manager, pédagogie et support.

## Sécurité Supabase observée

Toutes les tables `public` listées ont RLS activée.

Advisors actuels :

- `pg_net` installé dans le schéma public ;
- fonctions SECURITY DEFINER publiquement exécutables détectées ;
- protection contre mots de passe compromis désactivée ;
- une FK de `lesson_notes` sans index couvrant ;
- deux cas de policies permissives multiples ;
- nombreux index actuellement non utilisés sur cette base encore peu chargée.

Ces éléments ne doivent pas détourner le Sprint 6. Ils sont à conserver dans la dette technique / Sprint 20 sécurité finale, sauf si une modification Sprint 6 touche directement l'un d'eux.

Les RPC publiques `list_public_cohorts` et `submit_enrollment_application` sont volontairement liées au parcours d'inscription public ; ne pas supprimer leur accès sans analyser leur logique interne.

## État Vercel

- Projet : `diakspora-karanta-online`
- Déploiements Sprint 3 et Sprint 4 : READY.
- Aucun runtime error détecté sur les 7 derniers jours lors de l'audit.

## Fichiers principaux concernés par Sprint 6

### Auth / portail

- `src/lib/auth/portal-access.ts`
- `src/routes/admin.tsx`
- `src/routes/professeur.tsx`
- `src/routes/planning.tsx`
- `src/routes/inscriptions.tsx`
- `src/routes/_authenticated/route.tsx`

### Administration

- `src/features/admin/AdminWorkspace.tsx`
- `src/features/admin/admin-data.ts`

### Admissions / planning

- `src/features/admissions/AdmissionsWorkspace.tsx`
- `src/features/admissions/admissions-data.ts`
- `src/features/planning/PlanningWorkspace.tsx`
- `src/features/planning/planning-data.ts`

### Backend

- `supabase/functions/admin-members/index.ts`
- nouvelle migration Sprint 6
- tests pgTAP Sprint 6
- types Supabase régénérés si le schéma change

## Actions attendues de la nouvelle migration Sprint 6

Éviter toute table de rôles redondante.

La migration doit principalement :

1. conserver `organization_memberships` ;
2. conserver la compatibilité des rôles existants ;
3. créer/ajuster les helpers privés de permission ;
4. ajuster les RLS concernées selon la matrice finale ;
5. préserver les policies Sprint 3 et Sprint 4 ;
6. créer les éléments nécessaires à la journalisation des changements de rôles si non couverts ;
7. ne supprimer aucune donnée existante.

## Interface de gestion des rôles

Réservée à Direction / Super Admin autorisés.

Fonctions minimales :

- recherche utilisateur ;
- liste des rôles actifs ;
- ajout de rôle ;
- retrait de rôle ;
- affichage des capacités héritées ;
- protection du dernier `owner` ;
- interdiction de retirer son propre dernier accès critique ;
- journalisation dans `audit_logs`.

## Navigation

Le menu doit être dérivé des capacités, pas seulement d'un rôle unique.

Exemples :

- Finance ne voit pas les outils de publication pédagogique.
- Commercial ne voit pas les paramètres organisation.
- Support ne voit pas la finance complète.
- Pédagogie ne voit pas les remboursements.
- Utilisateur multi-rôle voit l'union des fonctions autorisées.

## Tests obligatoires Sprint 6

### Multi-rôles

- utilisateur commercial + accounting ;
- utilisateur pedagogical_manager + class_manager ;
- utilisateur avec un seul rôle ;
- rôle suspendu ignoré ;
- plusieurs memberships actives ne cassent pas admin-members.

### Routes

- accès autorisé ;
- accès interdit par URL directe ;
- refresh navigateur ;
- session existante après changement de rôle.

### RLS

Tester au minimum :

- Direction ;
- Assistant administratif ;
- Pédagogique ;
- Gestion classes ;
- Commercial ;
- Finance ;
- Support ;
- professeur ;
- parent ;
- élève ;
- utilisateur multi-rôle.

### Sécurité des changements de rôle

- seul le rôle autorisé peut ajouter/retirer un rôle ;
- impossibilité de retirer le dernier owner ;
- impossibilité de s'octroyer un rôle supérieur sans autorisation ;
- toutes les mutations sont auditées.

### Non-régression

- Sprint 3 classes/planning ;
- Sprint 4 admissions/CRM ;
- espace professeur ;
- parents/élèves ;
- création de cours ;
- publication ;
- invitations ;
- confirmation d'admission.

## Validation finale

Le Sprint 6 n'est validé que si :

- le multi-rôle fonctionne réellement ;
- l'Edge Function ne suppose plus une seule membership ;
- le frontend tient compte de l'union des rôles/capacités ;
- les rôles métier sont clairement libellés ;
- les changements de rôle sont administrables et audités ;
- les RLS reflètent la séparation des responsabilités ;
- les routes directes restent protégées ;
- les Sprints 3–4 n'ont aucune régression ;
- TypeScript, ESLint, build et tests RLS passent ;
- preview Vercel validée avant merge vers `main`.
