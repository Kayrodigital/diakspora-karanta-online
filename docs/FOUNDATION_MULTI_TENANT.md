# Fondation multi-organisation Karanta

## Ce que cette fondation garantit

- Une organisation Supabase correspond à l'infrastructure Diakspora.
- Une organisation Karanta correspond à une école, un professeur ou une association cliente.
- Un compte peut appartenir à plusieurs organisations et posséder plusieurs rôles.
- Les rôles sont stockés dans `organization_memberships`, jamais dans des métadonnées modifiables par l'utilisateur.
- Toutes les données pédagogiques sont filtrées par `organization_id` et par RLS.
- Les portails famille, professeur et administration refusent l'accès sans rôle actif.
- Le profil contient seulement des données d'identité et ne constitue pas une source d'autorisation.

## Projet Supabase de production

Le projet `Karanta` est actif dans l'organisation Supabase Diakspora :

- référence : `tcbxscwgorxixlwyiico` ;
- région : `eu-west-2` ;
- tenant initial : `diakspora` ;
- migrations de fondation appliquées le 12 septembre 2026.

Pour travailler localement :

1. Copier `.env.example` vers `.env.local` et renseigner uniquement les valeurs de ce projet.
2. Lier le dépôt au projet :

   ```bash
   npx supabase login
   npx supabase link --project-ref tcbxscwgorxixlwyiico
   ```

4. Examiner les migrations puis les appliquer :

   ```bash
   npx supabase migration list --linked
   npx supabase db push
   ```

5. Exécuter les contrôles :

   ```bash
   npx supabase db lint --linked
   npx supabase db advisors --linked
   ```

6. Créer le premier compte depuis Supabase Auth ou l'écran de connexion.
7. Attribuer au compte choisi le rôle `owner` dans le tenant `diakspora`.

## Attribution du premier propriétaire

Remplacer `USER_UUID` par l'identifiant du premier administrateur Auth :

```sql
INSERT INTO public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  is_default
)
SELECT id, 'USER_UUID'::uuid, 'owner', 'active', true
FROM public.organizations
WHERE slug = 'diakspora';
```

## Variables d'environnement

Les variables `VITE_*` sont visibles dans le navigateur et ne doivent contenir que la clé publiable. La clé `SUPABASE_SERVICE_ROLE_KEY` reste exclusivement côté serveur et ne doit jamais être copiée dans une variable préfixée par `VITE_`.

Après raccordement du projet, renseigner les mêmes variables dans Vercel pour les environnements Preview et Production. Le fichier `.env` historique a été retiré du dépôt public.

## Vérifications obligatoires avant données réelles

- tests RLS avec au moins deux organisations et plusieurs rôles ;
- contrôle des Database Advisors ;
- vérification des routes en navigation directe ;
- test de rattachement parent-enfant ;
- test d'isolation du stockage des devoirs ;
- test Safari iOS pour photo, micro et PWA ;
- vérification qu'aucune clé secrète n'est présente dans le bundle client.
