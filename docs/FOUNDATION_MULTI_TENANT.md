# Fondation multi-organisation Karanta

## Ce que cette fondation garantit

- Une organisation Supabase correspond à l'infrastructure Diakspora.
- Une organisation Karanta correspond à une école, un professeur ou une association cliente.
- Un compte peut appartenir à plusieurs organisations et posséder plusieurs rôles.
- Les rôles sont stockés dans `organization_memberships`, jamais dans des métadonnées modifiables par l'utilisateur.
- Toutes les données pédagogiques sont filtrées par `organization_id` et par RLS.
- Les portails famille, professeur et administration refusent l'accès sans rôle actif.
- Le profil contient seulement des données d'identité et ne constitue pas une source d'autorisation.

## Mise en service sur le nouveau projet Diakspora

1. Créer l'organisation Supabase `Diakspora` et le projet `diakspora-karanta`.
2. Copier `.env.example` vers `.env.local` et renseigner uniquement les valeurs du nouveau projet.
3. Lier le dépôt au projet :

   ```bash
   npx supabase login
   npx supabase link --project-ref VOTRE_PROJECT_REF
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

6. Créer le premier compte depuis `/auth?portal=family` ou depuis Supabase Auth.
7. Dans le SQL Editor, créer l'organisation Karanta et attribuer le rôle propriétaire au compte choisi.

## Amorçage de Diakspora dans Karanta

Remplacer `USER_UUID` par l'identifiant du premier administrateur Auth :

```sql
WITH new_organization AS (
  INSERT INTO public.organizations (
    name,
    slug,
    created_by,
    primary_color,
    accent_color,
    enabled_locales
  )
  VALUES (
    'Diakspora',
    'diakspora',
    'USER_UUID'::uuid,
    '#1E5631',
    '#C9932F',
    ARRAY['fr', 'ar', 'en']::text[]
  )
  RETURNING id
)
INSERT INTO public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  is_default
)
SELECT id, 'USER_UUID'::uuid, 'owner', 'active', true
FROM new_organization;
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
