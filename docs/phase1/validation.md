# Validation — consolidation phase 1, 28 octobre 2026

| Contrôle                                                         | Résultat              | Portée réelle                                                                                |
| ---------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| `npm ci`                                                         | Réussi                | Lockfile de la branche existante, aucune nouvelle dépendance produit                         |
| `npm run test:types`                                             | Réussi                | Application et routes TypeScript                                                             |
| `npm run lint`                                                   | Réussi                | ESLint et formatage                                                                          |
| `npm run build`                                                  | Réussi                | Build client et serveur ; cible Vercel vérifiée séparément par le déploiement Preview        |
| `npm run test:unit`                                              | **40/40 réussis**     | Portails/rôles, invitations, templates, audio, préflight de protection et contrat SQL parent |
| Playwright Auth + phase 1                                        | **39/39 réussis**     | 27 smoke Auth/accueil et 12 parcours phase 1, sur 1440×900, 390×844 et 768×1024              |
| Contrôle mobile après ajustement des libellés                    | **1/1 réussi**        | Six liens sur une seule ligne, absence de débordement, capture professeur actualisée         |
| Inspection visuelle                                              | Effectuée             | Fiche professeur desktop/mobile et parcours parent mobile ; captures uniquement QA           |
| Supabase production                                              | Lecture seule réussie | Schéma/contraintes/triggers, flags et catalogue publié ; Al-Akhdari : 57 séances, ordre 0–56 |
| Supabase QA réelle                                               | **Bloquée**           | Projet existant inactif, remise en service refusée pour limite de projets gratuits actifs    |
| Auth réelle, RLS familles et médias réels                        | Non exécutés          | Ni comptes réels, ni écritures sur la production                                             |
| Studio, sauvegarde d’ordre, conservation réelle des progressions | Non exécutés          | Phase 2, aucune modification d’ordre ou de progression dans cette livraison                  |

## Scénarios UI du parcours parent

Création simulée avec consentement obligatoire, erreur 503 puis reprise conservant le formulaire, enfant créé et sélectionné, erreur de chargement des livres puis reprise, filtrage par niveau, choix d’un livre, remise à zéro du choix quand le niveau change, navigation effective vers le livre existant et changement de profil sans réutiliser le choix d’un autre profil. Les requêtes du nouveau sélecteur sont vérifiées pour l’organisation et le statut publié.

La fiche professeur est testée avec un professeur publié, un brouillon non affiché, un audio approuvé, un audio en attente exclu, un profil absent et une erreur réseau. Les trois blocs de confiance et les liens vers les enseignements et le catalogue sont vérifiés. Les scénarios ne démontrent pas les policies RLS : les réponses API sont simulées sur un domaine fictif.

## Reproduire

```sh
npm ci
npm run test:types
npm run lint
npm run test:unit
npm run build
npx playwright install --with-deps chromium
npm run test:e2e:smoke
npm run test:e2e:phase1
```

Le téléchargement standard Chromium n’aboutit pas dans cet environnement. Le navigateur Chromium 143 fourni par `@sparticuz/chromium@143.0.4`, installé hors dépôt, a permis d’exécuter les tests. Une configuration locale temporaire indiquait le binaire et les options nécessaires au conteneur ; elle n’est pas livrée. La CI conserve le Chromium standard Playwright. Les polices web distantes peuvent être remplacées par leurs fallbacks dans les captures du conteneur.

## Captures

Les personnes et les livres de recette sont explicitement nommés QA et ne représentent pas des enseignants ou élèves réels.

| Page                                                | Desktop                                             | Mobile                                             | Tablette                                           |
| --------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------- |
| Professeur actualisé                                | [Voir](screenshots/professeur-desktop-chromium.png) | [Voir](screenshots/professeur-mobile-chromium.png) | [Voir](screenshots/professeur-tablet-chromium.png) |
| Parent actualisé                                    | [Voir](screenshots/parent-desktop-chromium.png)     | [Voir](screenshots/parent-mobile-chromium.png)     | [Voir](screenshots/parent-tablet-chromium.png)     |
| Accueil conservé, captures de la branche précédente | [Voir](screenshots/accueil-desktop-chromium.png)    | [Voir](screenshots/accueil-mobile-chromium.png)    | [Voir](screenshots/accueil-tablet-chromium.png)    |

Le build et les tests locaux sont réussis. Le lancement de l’ajout autonome d’enfant reste conditionné à la recette Supabase isolée. Le build Preview Vercel et son commit sont consultables depuis la PR ; une preview ne constitue pas une recette des écritures serveur.
