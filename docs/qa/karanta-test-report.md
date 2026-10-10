# Rapport QA Karanta — M9

- Date : 2026-10-10T16:22:53.143Z
- Commit de base : cd9a6b6 (les modifications QA locales peuvent être non commitées)
- Environnement : UI locale hors ligne
- Suite : M9 Auth UI smoke
- Résultat Playwright : passed
- Tests : 15 ; PASS 15 ; FAIL 0 ; SKIP 0
- Durée cumulée : 28 s
- Captures/traces : `playwright-report/` et `test-results/` pour l'UI non sensible uniquement ; désactivées pour les tests Auth réels.

## Échecs

Aucun dans la suite exécutée.

## Constats de la branche QA

- Le premier smoke a détecté un routage imbriqué incorrect de `/auth/complete`. Il a été corrigé localement sans déploiement ; le smoke a ensuite été rejoué.
- Le bouton d'en-tête « Inviter une personne » reste visible pour certains rôles non invités à gérer les invitations. La fonction Edge refuse ces rôles ; l'interface doit être confirmée en recette.

## Couverture non validée par cette exécution

- Activation réelle d'invitation, réception email, lien expiré/renvoyé et récupération complète.
- Délivrabilité Brevo, en-têtes SPF/DKIM/DMARC et configuration des six templates hébergés.
- Google OAuth (désactivé), permissions M10, parcours M11–M13 et non-régression de production.

## Validation humaine requise

- Fournir une base Supabase QA isolée, des comptes et boîtes de test autorisés ; contrôler les emails sans copier les liens à usage unique dans un rapport.
- Vérifier séparément l'activation complète et la délivrabilité avant tout verdict de lancement.

**Recommandation : NO-GO pour validation M9 complète.** Un test SKIP ou une UI hors ligne n'est pas une preuve E2E.
