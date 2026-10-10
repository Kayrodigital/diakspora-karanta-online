# Matrice de couverture QA M9–M13

Statuts : **auto local** = test reproductible sans Supabase réel ; **prêt recette** = code de test écrit mais non exécuté sans instance isolée ; **manuel** = vérification humaine/tiers ; **à construire** = sprint futur non couvert. Un SKIP n'est jamais un PASS.

| ID / Fonction | Niveau | Statut | Preuve attendue / limite |
|---|---|---|---|
| AUTH-01 connexion professeur | Intégration + navigateur | Prêt recette | Membership `teacher`, profil Auth et portail `/professeur`. |
| AUTH-02 mauvais mot de passe | Intégration + navigateur | Prêt recette | Aucune session, message visible. |
| AUTH-03 invitation professeur | Intégration + humain | Prêt recette partiel | Unicité compte/invitation/membership ; activation par email reste manuelle. |
| AUTH-04 invitation admin | Intégration + humain | Prêt recette partiel | Rôle admin sans owner ; activation et permissions finales manuelles. |
| AUTH-05 renvoi | Intégration | Prêt recette | Même `user_id`, une seule invitation ; nécessite SMTP de recette. |
| AUTH-06 lien expiré | UI + humain | Auto local partiel | État invalide testé ; génération/renvoi d'un vrai lien expiré non automatisés. |
| AUTH-07 mot de passe oublié | UI + navigateur + humain | Prêt recette partiel | Formulaire, demande ; réception/changement/ancien mot de passe restent manuels. |
| AUTH-08 portail interdit | Unitaire + navigateur | Prêt recette | Professeur refusé sur `/admin`. |
| AUTH-09 déconnexion | Navigateur | Prêt recette | Session terminée, portail protégé inaccessible. |
| AUTH-10 Google OAuth | Humain/tiers | Manuel, désactivé | Aucun test simulé ne valide OAuth. |
| Emails Supabase/Brevo | Statique + humain | Auto local partiel | Cinq templates locaux contrôlés ; sixième hébergé, objets, sender, délivrabilité et DNS non vérifiés. |
| M10 rôles/memberships | Unitaire + intégration RLS | À construire | Matrice owner/admin/technician/pedagogical_manager/teacher/class_manager/parent/learner, cumul, suspension, audit. |
| M10 assistant pédagogique | Audit + intégration | À construire | Rôle effectif à confirmer, aucun droit inventé. |
| M10 familles/enfants | Intégration + E2E | À construire | Profil actif, isolation cross-family, affectation, devoirs, interdictions. |
| M11 hiérarchie/cours Akhdari | SQL + E2E | À construire | Ordre 01→57, ressources, brouillons et publication ; réutiliser `supabase/tests/`. |
| M11 progression Solo | Intégration + E2E | À construire | Reprise et distinction `completed` / `validated`. |
| M11 exercices/autocorrection | E2E | À construire | Correction masquée puis dévoilée, quiz, aucune soumission Solo au professeur. |
| M12 classes/directs | Intégration + E2E + humain | À construire | Affectations, cross-class, fuseaux, Meet/Zoom ; caméra mineurs à vérifier chez le fournisseur. |
| M12 notifications | Intégration worker + capture mail | À construire | File, déduplication, reprise, annulation, fuseaux ; aucun envoi massif réel. |
| M13 Majliss | E2E | À construire | Village → professeur → enregistrement, lecteur, état vide, isolation. |
| M13 Boutique/support/portails | E2E smoke | À construire | Régression des fonctions existantes, sans créer de fausses fonctionnalités. |

## Constat de sécurité QA à suivre

Le smoke a trouvé que `/auth/complete` était imbriqué sous `/auth` : le formulaire d'activation ne s'affichait pas. La route a été rendue non imbriquée **uniquement sur cette branche**, puis les 15 smoke tests sont passés ; aucune mise en production n'a eu lieu.

Le bouton d'en-tête « Inviter une personne » est actuellement rendu sans condition de rôle dans `src/features/admin/AdminWorkspace.tsx`. La fonction Edge M9 vérifie `owner/admin`, donc aucune élévation n'est démontrée, mais le contrôle visuel promis aux rôles non autorisés n'est pas complet. À confirmer en recette avec un compte `technician` ; ne pas considérer le test d'interface comme PASS avant correction/validation.
