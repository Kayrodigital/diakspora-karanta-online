# Rapport QA Karanta — M9

- Date : 2026-10-10T17:25:02.501Z
- Commit de base : ff90383 (les modifications QA locales peuvent être non commitées)
- Environnement : UI locale hors ligne
- Suite : M9 Auth UI smoke
- Résultat Playwright : passed
- Tests : 24 ; PASS 24 ; FAIL 0 ; SKIP 0
- Durée cumulée : 35 s
- Captures/traces : `playwright-report/` et `test-results/` pour l'UI non sensible uniquement ; désactivées pour les tests Auth réels.

## Échecs

Aucun dans la suite exécutée.

## Constats de la branche QA

- Le premier smoke a détecté un routage imbriqué incorrect de `/auth/complete`. Il a été corrigé localement sans déploiement ; le smoke a ensuite été rejoué.
- Le bouton d'en-tête « Inviter une personne » est désormais conditionné aux rôles `owner` et `admin`. La fonction Edge conserve son contrôle serveur ; la recette authentifiée reste nécessaire.
- Les accès directs `/admin`, `/professeur` et `/eleve` gardent le portail demandé. L'ancien lien de récupération arrivant sur `/` rejoint `/auth/complete` et son fragment d'erreur est retiré de l'URL.
- La landing éditoriale est vérifiée à 390, 768 et 1440 px, sans débordement horizontal.

## Couverture non validée par cette exécution

- Activation réelle d'invitation, réception email, lien expiré/renvoyé et récupération complète.
- Aucun compte de recette n'a été créé : le coût d'une branche Supabase isolée n'est pas disponible via le connecteur, et la production ne doit pas servir de recette.
- Délivrabilité Brevo, en-têtes SPF/DKIM/DMARC et configuration des six templates hébergés.
- Google OAuth (désactivé), permissions M10, parcours M11–M13 et non-régression de production.

## Validation humaine requise

- Fournir une base Supabase QA isolée, des comptes et boîtes de test autorisés ; contrôler les emails sans copier les liens à usage unique dans un rapport.
- Vérifier séparément l'activation complète et la délivrabilité avant tout verdict de lancement.

**Recommandation : NO-GO pour validation M9 complète.** Un test SKIP ou une UI hors ligne n'est pas une preuve E2E.
