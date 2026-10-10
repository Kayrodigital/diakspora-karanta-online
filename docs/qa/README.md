# Recette automatisée Karanta M9–M13

Cette infrastructure démarre par M9. Elle **ne valide pas** les sprints M10–M13 et ne doit jamais employer la base Karanta de production pour créer un compte, envoyer un email ou modifier des données.

## Inventaire au 10 octobre 2026

- Base existante : Node `node:test` (politiques de portail et d'invitation), SQL pgTAP historiques ; aucun Playwright ni GitHub Actions avant cette branche.
- Supabase de recette : aucune branche de développement sur le projet Karanta ; pas de Docker ni de CLI Supabase locale disponible sur cet hôte. Aucun projet de recette n'a été créé.
- Application : TanStack Start ; routes Auth `/auth` et `/auth/complete`, portails `/eleve`, `/parent`, `/professeur`, `/admin`, planning, admissions, Apprendre et Majliss.
- Edge Functions concernées : `admin-members` (invitation/renvoi), `send-live-notifications` (M12). Les autres fonctions ne sont pas sollicitées par M9.
- Cinq templates M9 sont versionnés localement. La déclaration de six templates hébergés doit être vérifiée dans le dashboard Supabase ; le template de réauthentification n'est pas dans le dépôt. Aucun test local ne prouve la configuration distante.

## Niveaux de preuve

| Niveau | Commande | Ce qu'elle prouve |
|---|---|---|
| Unitaire/statique | `npm run test:unit` | Règles de rôle, garde-fou QA et contrats des cinq templates locaux. |
| Intégration isolée | `npm run test:integration` | Supabase Auth et profil/membership d'un compte professeur de recette. Refusée sans environnement isolé. |
| UI navigateur hors ligne | `npm run test:e2e:smoke` | Écrans Auth, récupération, lien absent, responsive 1440/390/768 px. Backend volontairement fictif ; pas une preuve de délivrabilité. |
| E2E Auth réel isolé | `npm run test:e2e:auth` | Connexion, refus d'un mauvais mot de passe, demande de récupération, portail interdit, déconnexion. Refusée sans environnement isolé. |
| E2E complète actuelle | `npm run test:e2e:full` | Lance les scénarios implémentés ; **ne couvre pas** encore l'activation mail ni M10–M13. Un résultat vert ne constitue pas un GO lancement. |

Le rapport de l'exécution Playwright est écrit dans `docs/qa/karanta-test-report.md`. Le rapport HTML et les captures/traces sont générés **uniquement pour l'UI non sensible**, dans `playwright-report/` et `test-results/` (ignorés par Git). Pour les parcours réels avec identifiants, captures/traces/vidéos et rapport HTML sont désactivés afin de ne pas conserver mots de passe, cookies ou liens Auth.

## Préparer une recette réelle sans production

1. Faire approuver une instance ou branche Supabase **isolée**, y compris son coût éventuel, puis y déployer le schéma et les fonctions nécessaires. Ne pas créer de branche payante automatiquement.
2. Créer des comptes **QA dédiés** et une boîte de réception contrôlée. Configurer les URL Auth de retour de l'application locale ; orienter SMTP vers une capture dédiée ou un expéditeur test. Ne pas utiliser les boîtes personnelles de l'équipe.
3. Fournir au processus local, via un gestionnaire de secrets ou un fichier `.env.local` ignoré, les variables ci-dessous. Jamais de `service_role` côté navigateur. Le préflight refusera le ref production `tcbxscwgorxixlwyiico` et une application distante.

```text
KARANTA_QA_CONFIRM_ISOLATED=yes
KARANTA_QA_START_SERVER=1
KARANTA_QA_BASE_URL=http://127.0.0.1:4173
KARANTA_QA_SUPABASE_URL=https://<ref-qa>.supabase.co
KARANTA_QA_PUBLISHABLE_KEY=<publishable-qa>
KARANTA_QA_TEACHER_EMAIL=<compte-test>
KARANTA_QA_TEACHER_PASSWORD=<secret-test>
```

`test:e2e:full` demande en plus `KARANTA_QA_OWNER_EMAIL`, `KARANTA_QA_OWNER_PASSWORD`, `KARANTA_QA_ORGANIZATION_ID`, `KARANTA_QA_INVITEE_TEACHER_EMAIL` et `KARANTA_QA_INVITEE_ADMIN_EMAIL`. Cette suite envoie de **vraies invitations sur la recette isolée**, puis vérifie l'unicité des invitations et memberships ainsi que le renvoi ; elle ne valide pas encore l'activation par lien. Ces valeurs ne doivent pas être ajoutées à Git ni aux rapports. Le préflight ne suffit pas à prouver que la base est isolée : l'administrateur doit confirmer que le ref et les données sont dédiés aux tests.

## Exécution et CI

```bash
npm ci
npm run test:unit
npm run test:e2e:smoke
npm run test:integration  # uniquement après recette Supabase isolée
npm run test:e2e:auth    # idem
```

Le workflow `.github/workflows/qa-m9.yml` se limite aux contrôles PR **sans secrets** : lint, TypeScript, unitaires, build et smoke UI hors ligne. Les suites Auth réelles ne tournent pas en PR et ne doivent utiliser que des secrets GitHub Actions liés à un environnement QA approuvé lors d'une extension ultérieure.

## Validations humaines restantes pour M9

- Invitation professeur et administrateur, unicité Auth/profil/membership, renvoi et expiration ; activation via le lien reçu ; permission effective de chaque portail.
- Réinitialisation complète : réception, nouveau mot de passe, ancien mot de passe refusé. Les liens et tokens ne doivent pas être copiés dans un rapport.
- Six templates hébergés, objets français, variables rendues, expéditeur `karanta@diakspora.com`, délivrabilité externe, SPF/DKIM/DMARC et absence de réécriture des liens par Brevo.
- Google OAuth seulement après activation officielle, avec un vrai compte QA ; aucun résultat simulé ne peut le valider.
- Non-régression des comptes réels : contrôle non destructif après validation du pilote, sans mot de passe demandé à un utilisateur.

Voir `coverage.md` pour le périmètre M9–M13 et les statuts exacts.
