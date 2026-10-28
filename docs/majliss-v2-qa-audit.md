# Majliss V2 — préflight QA (2026-10-11)

État : intégration R2 non commencée. Aucun changement de production.

## Avancement autorisé : stockage Supabase privé en QA

Le propriétaire a choisi de poursuivre l'interface avec le bucket Supabase QA existant et de reporter R2. Cette version ne crée aucun bucket Cloudflare, n'utilise aucune clé R2 et ne change ni la production ni les migrations de production.

- Interface commune admin/contributeur : sélection de fichiers mobile, glisser-déposer desktop, plusieurs parties, titre par partie, ordre, préécoute locale, durée détectée lorsque le navigateur le permet, progrès individuel, reprise et erreurs visibles.
- L'admin choisit un couple village–professeur existant. Un contributeur ne voit que ses affectations. Les fichiers restent privés et créent des brouillons en attente de revue ; l'URL HTTPS est une option avancée de l'admin.
- L'archivage conserve les objets ; un brouillon adossé à un fichier privé n'est plus supprimable depuis la liste sans procédure de suppression contrôlée. Filtres et total de volume référencé sont disponibles.
- Karanta QA seulement : migration `20261011140824_majliss_qa_private_audio_admin_upload` appliquée. Son SQL exact est dans `supabase/plans/majliss-v2/qa_private_audio_admin_upload.sql`, hors de `supabase/migrations` pour empêcher une application accidentelle en production. Elle limite les écritures admin à leur chemin d'organisation et ferme la lecture authentifiée accidentelle des médias Premium publiés.
- Les flags `majliss_v1` et `majliss_ingestion_v1` ont été activés pour Diakspora **QA uniquement**. Les variables Vercel Preview de `codex/majliss-v2-r2-qa` sont limitées à cette branche et pointent vers Supabase QA.
- Préflight QA : 0 enregistrement et 0 objet dans le bucket avant changement ; bucket privé confirmé après. Security Advisor avant/après : mêmes alertes historiques, aucune nouvelle. Lint, TypeScript et build local sont verts.

Limites de recette : aucun vocal réel ni affectation contributeur n'est disponible en QA. Les parcours OGG/OPUS, M4A, cinq fichiers, interruption réseau, lecture iPhone/Android et permissions de bout en bout restent à exécuter avec un compte QA affecté et des fichiers audio fournis. Un preview n'est pas une validation de codec mobile. R2 et ses tests restent reportés.

## Existant à réutiliser

- Hiérarchie indépendante : `majliss_villages` → `majliss_teachers` → `majliss_recordings`, avec table de liaison et affectations assistants.
- `MajlissDeposit` accepte déjà plusieurs fichiers audio depuis mobile, utilise un bucket Supabase privé, suit la progression, réessaie les transferts et crée des brouillons dans la file de revue.
- `MajlissAdmin` publie/archives les brouillons, mais sa création d'enregistrement impose encore une URL HTTPS.
- Les rôles éditoriaux existants passent par `private.can_manage_learning(organization_id)` : owner, admin, pedagogical_manager. Les assistants nécessitent une affectation active. Aucun droit global de publication pour un professeur standard.
- La table d'enregistrements possède déjà taille, MIME, empreinte, source, auteur, date, statut de revue et ordre ; les références média existantes doivent rester lisibles.

## État observé sur Karanta QA

- 1 village, 1 professeur, 0 enregistrement, 0 affectation assistant.
- Bucket Supabase `majliss-ingestion` privé, limite 500 Mio, MIME OPUS/OGG/M4A/MP3/AAC/WAV.
- Les flags `majliss_v1` et `majliss_ingestion_v1` ne sont pas présents pour Diakspora QA.
- La policy de lecture des objets Supabase pour `authenticated` permet la lecture d'un enregistrement publié et approuvé sans condition `access_tier='free'`. Il faut fermer ce chemin avant tout contenu Premium, sans toucher aux données existantes.

## Plus petit changement proposé

1. Réutiliser la sélection village/professeur, les affectations, la file de revue et le catalogue. Refondre le dépôt commun admin/contributeur : glisser-déposer desktop, sélection mobile, titre et ordre par partie, préécoute locale, progression, reprise, brouillon puis soumission explicite.
2. Garder l'URL externe en option avancée ; ne pas créer de contenu fictif.
3. Ajouter une extension SQL additive pour distinguer le fournisseur média (`external`/`supabase`/`r2`), tracer un lot de parties et autoriser une référence `r2://` non publique. Préserver toutes les lignes et tous les UUID.
4. Créer une Edge Function QA de signature R2 : authentification Supabase, contrôle du membership ou de l'affectation, MIME et taille, clé aléatoire unique, URL PUT courte, vérification HEAD après transfert avant insertion du brouillon. Les clés R2 restent dans les secrets serveur QA.
5. Pour la lecture, vérifier la visibilité de l'enregistrement à chaque demande et générer une URL GET temporaire ; ne jamais stocker une URL signée dans Postgres. Tester les requêtes Range et le renouvellement d'URL pendant les longues écoutes.
6. Ne jamais convertir systématiquement les formats compressés. Marquer les formats incompatibles pour une conversion asynchrone future, sans publier automatiquement une ressource illisible.
7. Archivage : filtres village/professeur/date, métriques SQL `sum(file_size_bytes)`, suppression logique/archivage prioritaire ; suppression physique séparée, confirmée et journalisée.

## Prérequis non satisfaits

- Aucun bucket privé Cloudflare R2 QA ni jeton R2 serveur n'a été confirmé. Ne pas demander ni enregistrer le secret dans le dépôt ou le chat.
- Cloudflare demande un compte avec abonnement R2 activé. L'activation passe par un checkout ; elle n'est pas autorisée par cette mission. Le quota Standard inclus est de 10 GB-month, 1 M opérations A et 10 M opérations B mensuelles ; au-delà, facturation à l'usage.
- Pour la recette authentifiée, il faut un compte admin QA actif et un contributeur QA explicitement affecté au professeur pilote. Les flags QA doivent être activés de façon contrôlée après validation du backend.
- Les tests iPhone et Android réels nécessitent leurs appareils ou un service de test compatible ; les tests Chromium responsive ne prouvent pas les codecs Safari/Android.

## Gates QA avant preview fonctionnelle

- Upload OGG/OPUS, M4A et cinq parties ; taille/MIME rejetés côté client **et** serveur ; coupure réseau, reprise et absence de doublon.
- Admin autorisé / contributeur affecté / non autorisé refusé ; impossible de publier via un simple upload ; vérification du HEAD R2 avant ligne Postgres.
- Lecture catalogue, brouillon privé, Premium privé, URL expirée, Range, navigation mobile/desktop, audit des clés et CORS.
- Comparaison objet R2 ↔ métadonnées Supabase, aucune référence orpheline non traitée, métriques de volume.
- Lint, TypeScript, tests, build, preview QA, captures mobile/desktop. Pas de push `main` ni de production sans autorisation.

Références : https://developers.cloudflare.com/r2/pricing/ ; https://developers.cloudflare.com/r2/get-started/ ; https://developers.cloudflare.com/r2/api/s3/presigned-urls/ ; https://developers.cloudflare.com/r2/buckets/cors/ .
