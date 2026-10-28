# M9 — activation Auth (préparation, sans changement de production)

Le code M9 ne modifie ni schéma ni configuration distante. Les étapes ci-dessous doivent être validées et réalisées par un administrateur du projet Supabase **avant** un test d'invitation réel ou une publication.

## Configuration Supabase Auth à valider

1. Dans **Auth → URL Configuration**, conserver le Site URL `https://diakspora-karanta-online.vercel.app`. Autoriser explicitement les retours `/auth?portal=family`, `/auth?portal=teacher`, `/auth?portal=admin` et `/auth/complete?flow=invite|recovery&portal=...` pour les portails utilisés. Pour tester une preview, ajouter ses URL exactes (sans wildcard couvrant tous les déploiements Vercel), puis les retirer si elles ne sont plus utiles.
2. Dans **Auth → SMTP**, activer le relais transactionnel **Brevo SMTP** après vérification du domaine `diakspora.com` et de l'expéditeur `karanta@diakspora.com`. Brevo fournit `smtp-relay.brevo.com`, un login SMTP et une **clé SMTP** distincte de la clé API des notifications live. Saisir ces valeurs directement dans le tableau de bord, jamais dans Git, dans Vercel ou dans le navigateur. Désactiver le suivi/réécriture de liens pour les emails Auth et vérifier SPF, DKIM et DMARC.
3. Dans **Auth → Email Templates**, copier les cinq fichiers `supabase/templates/m9-*.html` vers Invitation, Confirmation, Recovery, Magic Link et Email Change, avec des objets en français. Vérifier le rendu et le lien `{{ .ConfirmationURL }}` par un email test. Les modèles présents dans le dépôt ne sont **pas** automatiquement appliqués au projet hébergé.
4. Vérifier côté Edge Function `admin-members` que `APP_URL` pointe sur l'application voulue. Le renvoi d'une invitation en attente utilise la clé API Brevo existante et exige `BREVO_SENDER_EMAIL=karanta@diakspora.com`; ne jamais rendre ces secrets publics.
5. Google OAuth reste **désactivé par défaut** dans le frontend (`VITE_GOOGLE_OAUTH_ENABLED` absent ou `false`). Pour un essai ultérieur, configurer le fournisseur Google dans Supabase, enregistrer `https://tcbxscwgorxixlwyiico.supabase.co/auth/v1/callback` chez Google, autoriser l'URL de retour de la preview, puis activer le flag **uniquement sur la preview**. Tester avec un compte de test distinct et vérifier qu'aucun rôle staff n'est créé par OAuth.

## Gate de tests réels — comptes de test autorisés uniquement

- Super Admin invite un professeur neuf et un administrateur neuf : un compte Auth, un profil Auth canonique et un membership attendu par email ; aucun doublon après répétition.
- Vérifier le lien reçu, l'écran `/auth/complete?flow=invite`, la définition du mot de passe, l'acceptation puis le bon portail. Tester le refus des autres portails et d'une invitation envoyée par un rôle non autorisé.
- Expirer un lien **de test** ou utiliser un lien déjà consommé : afficher une erreur claire, puis renvoyer une invitation et confirmer que le nouveau lien fonctionne sans nouvel utilisateur Auth.
- Demander « Mot de passe oublié », recevoir l'email, définir un nouveau mot de passe, se reconnecter ; ancien mot de passe refusé. Vérifier le retour Famille ainsi que Teacher/Admin.
- Vérifier dans les en-têtes de l'email que l'expéditeur est `karanta@diakspora.com` et que SPF/DKIM/DMARC passent. Tester une boîte externe à l'équipe Supabase et suivre la délivrabilité dans Brevo.
- Si Google est activé en preview : connexion fonctionnelle pour le compte de test, refus d'accès staff sans membership et aucun doublon d'identité non voulu.
- Recontrôler les comptes existants sans changement de `auth.users.id`, `profiles.id`, memberships ni accès historiques.

Sans SMTP validé, URL de retour de preview autorisée et comptes de test approuvés, ces tests restent **non exécutés** : un build ou une simulation ne prouve pas la délivrabilité ni l'activation réelle.

## M10 — préparation, non commencée

Priorité : matrice de délégation des rôles, gestion parent/enfant par opérations contrôlées et audit obligatoire des changements de memberships / invitations privilégiées. Aucun élargissement RLS ne doit être déduit de M9.
