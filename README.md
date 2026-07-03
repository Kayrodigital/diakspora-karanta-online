# Diakspora Karanta

Académie en ligne d'arabe et de sciences islamiques pour la diaspora musulmane francophone.

**Publics :**
- Enfants 6–12 ans (priorité)
- Adultes débutants
- Public avancé

## Statut

Structure de base + identité visuelle en place. **Aucune base de données cloud
n'est encore branchée** — les dashboards `/eleve`, `/parent`, `/professeur`, `/admin`
sont des placeholders qui listent les fonctionnalités prévues.

## Identité visuelle

- **Palette :** vert profond (primaire), doré / ambre (accent), anthracite (texte),
  crème (fond). Tokens définis dans `src/styles.css`.
- **Typographie :** Cormorant Garamond (titres serif), Inter (corps), Amiri (arabe / RTL).
- **Ton :** sérieux mais chaleureux et familial — académie traditionnelle rencontrant
  un outil numérique moderne.

## Routes

| URL          | Rôle                                                                 |
| ------------ | -------------------------------------------------------------------- |
| `/`          | Page d'accueil publique                                              |
| `/eleve`     | Dashboard élève                                                      |
| `/parent`    | Dashboard parent (suivi enfants)                                     |
| `/professeur`| Dashboard professeur — support **RTL / arabe** prévu                 |
| `/admin`     | Console d'administration                                             |

## Modèle de données prévu (à implémenter plus tard avec Lovable Cloud)

Ces entités sont **planifiées** — aucune table n'est encore créée.

- **users** — rôles : `eleve`, `parent`, `professeur`, `admin` (les rôles sont
  stockés dans une table `user_roles` séparée, jamais sur le profil, pour éviter
  toute élévation de privilèges côté client).
- **cohorts** — groupes d'élèves suivis par un ou plusieurs professeurs.
- **courses** → **modules** → **lessons** — arborescence pédagogique.
- **quizzes** / **quiz_results** — évaluations et résultats par élève.
- **writing_entries** — productions écrites en arabe (calligraphie, dictées…).
- **homework_submissions** — devoirs déposés en **photo** et/ou **audio**.
- **progress** — progression détaillée par élève / leçon.
- **reviews_schedule** — révisions espacées (spaced repetition).
- **attendance** — présence aux sessions live.
- **regularity_score** — indicateur de régularité par élève (agrégat).
- **alerts** — alertes automatiques (décrochage, absences, retards).
- **catchup_plans** — plans de rattrapage personnalisés déclenchés par les alertes.
- **certificates** — certificats délivrés (fin de module, hifdh, niveau…).
- **teachers** — profils enseignants (spécialités, disponibilités, langues).
- **zoom_sessions** — sessions live planifiées (lien Zoom, cohorte, professeur).
- **messages** — messagerie interne, avec **traduction arabe ⇄ français**
  (utile parent ↔ professeur arabophone).

### Notes de sécurité (pour la phase Cloud)

- Les rôles vivent dans `user_roles` + fonction `has_role(uuid, app_role)`
  en `security definer`.
- RLS activée sur toutes les tables `public.*` + `GRANT` explicites pour
  `authenticated` / `service_role` dans la même migration.
- Les vérifications de rôle admin se font **exclusivement côté serveur**
  (jamais depuis `localStorage`).
