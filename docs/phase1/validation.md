# Validation phase 1 — 28 octobre 2026

| Contrôle | Résultat | Portée |
|---|---|---|
| Installation verrouillée npm | Réussie | Dépendances de la branche récente installées ; ajout de PGlite 0.3.15 pour tests SQL isolés |
| `npm run build` | Réussi | Build client/serveur de production, routes générées |
| `npm run test:types` | Réussi | Application et routes TypeScript |
| `npm run lint` | Réussi | ESLint et conventions Prettier |
| `npm run test:unit` | 6 fichiers de tests réussis | Rôles M9, invitations, templates, audio, garde-fous QA et nouveau contrat SQL parent |
| Contrat SQL parent | 10 sous-scénarios réussis | Refus anonyme ; refus écriture directe ; consentement/nom/organisation ; rôles non parent ; flags et suspension ; rollback ; création ; retry ; refus autre parent ; deuxième enfant |
| Smoke Auth/landing existant | 27 scénarios réussis | 9 scénarios sur desktop 1440×900, mobile 390×844 et tablette 768×1024 ; endpoint volontairement fictif |
| Smoke phase 1 | 12 scénarios réussis | 4 scénarios sur les trois formats : accueil/menu/asset, annuaire/fiche, professeur absent/erreur, parent/retry/sélection |
| Auth, RLS et médias Supabase réels | Non exécutés | Aucune configuration de recette isolée disponible |
| Studio, ordre Al-Akhdari, conservation réelle des progressions | Non exécutés | Phase 2 ; aucune donnée pédagogique ni ordre modifié dans cette phase |
| Déploiement Vercel de prévisualisation | Non vérifié | Aucun outil/binding Vercel ; aucune URL de déploiement obtenue |

## Reproduire

```sh
npm ci
npm run test:unit
npm run test:types
npm run lint
npm run build
npx playwright install --with-deps chromium
npm run test:e2e:smoke
npm run test:e2e:phase1
```

Dans cette machine, le CDN Playwright était interdit par la politique réseau. Les tests ont été exécutés avec Chromium 153 distribué via `@sparticuz/chromium` (installé hors dépôt dans `/tmp/karanta-browser`) et Playwright, avec une configuration locale temporaire indiquant `/tmp/chromium`, `--no-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu`, `--no-zygote`. Aucun contournement TLS, désactivation des règles web ou accès direct à un domaine interdit. La CI conserve la distribution Chromium standard Playwright.

Une première exécution avec `--single-process` provoquait la fermeture du navigateur entre les contextes : ce paramètre a été retiré. Deux tests ajoutés ont été corrigés : cliquer le vrai `<summary>` plutôt que son libellé masqué, et simuler un refus d’accès immédiat pour vérifier l’état d’erreur sans les retries automatiques des réponses 503. La requête de l’annuaire limite ses reprises et offre un bouton Réessayer. Les 12 scénarios ont ensuite passé ; les 27 scénarios Auth/landing ont également passé avec le navigateur multiprocessus.

Les captures contiennent uniquement des profils de recette explicitement nommés QA, jamais des élèves ou enseignants réels. Elles ne prouvent pas les données, permissions ou connexions distantes. Les visuels fournis sont des illustrations, pas des témoignages ni portraits documentaires.

## Captures

| Page | Desktop | Mobile | Tablette |
|---|---|---|---|
| Accueil | [Voir](screenshots/accueil-desktop-chromium.png) | [Voir](screenshots/accueil-mobile-chromium.png) | [Voir](screenshots/accueil-tablet-chromium.png) |
| Professeur | [Voir](screenshots/professeur-desktop-chromium.png) | [Voir](screenshots/professeur-mobile-chromium.png) | [Voir](screenshots/professeur-tablet-chromium.png) |
| Parent | [Voir](screenshots/parent-desktop-chromium.png) | [Voir](screenshots/parent-mobile-chromium.png) | [Voir](screenshots/parent-tablet-chromium.png) |
