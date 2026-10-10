# Rapport QA Karanta — M9

- Date : 2026-10-10T17:29:37.931Z
- Commit de base : 9fb9849 (les modifications QA locales peuvent être non commitées)
- Environnement : UI locale hors ligne
- Suite : M9 Auth UI smoke
- Résultat Playwright : passed
- Tests : 24 ; PASS 24 ; FAIL 0 ; SKIP 0
- Durée cumulée : 29 s
- Captures/traces : `playwright-report/` et `test-results/` pour l'UI non sensible uniquement ; désactivées pour les tests Auth réels.

## Échecs

Aucun dans la suite exécutée.

## Constats de la branche QA

- Le smoke couvre le routage `/auth/complete`, les accès directs aux trois portails et la landing responsive ; il ne remplace pas une activation Auth réelle.
- Le bouton d'invitation est limité dans l'interface aux rôles `owner` et `admin` ; le contrôle serveur doit encore être vérifié en recette authentifiée.

## Couverture non validée par cette exécution

- Activation réelle d'invitation, réception email, lien expiré/renvoyé et récupération complète.
- Délivrabilité Brevo, en-têtes SPF/DKIM/DMARC et configuration des six templates hébergés.
- Google OAuth (désactivé), permissions M10, parcours M11–M13 et non-régression de production.

## Validation humaine requise

- Fournir une base Supabase QA isolée, des comptes et boîtes de test autorisés ; contrôler les emails sans copier les liens à usage unique dans un rapport.
- Vérifier séparément l'activation complète et la délivrabilité avant tout verdict de lancement.

**Recommandation : NO-GO pour validation M9 complète.** Un test SKIP ou une UI hors ligne n'est pas une preuve E2E.
