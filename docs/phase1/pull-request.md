# Simplifier le parcours famille et présenter les professeurs publiés

Le parent dispose de premiers pas guidés, d’un ajout minimal d’enfant protégé par des flags désactivés par défaut et d’accès directs aux méthodes et aux classes existantes. Un annuaire public et une fiche professeur présentent les biographies, portraits publiés et enseignements Majliss approuvés. Le menu accueil fonctionne désormais sur tablette ; la promesse et un premier visuel famille sont intégrés.

Cette branche reprend les évolutions `codex/majliss-v2-r2-qa` (incluant la consolidation V1) encore absentes de `main`, afin de conserver l’authentification stricte, l’administration validée et les dépôts audio récents. Aucun changement de l’architecture pédagogique ni des progressions.

La nouvelle RPC parent reste une proposition dans `supabase/plans/phase1/`, hors migrations automatiques. Ses tests utilisent PostgreSQL isolé en mémoire. Son activation exige une recette sur le schéma canonique complet, dont des prérequis historiques M4 ne figurent pas dans les migrations du dépôt. Aucun SQL distant appliqué, aucun flag activé, aucune fusion ni production déployée.

Validation et captures : voir `docs/phase1/audit-et-livraison.md` et `docs/phase1/validation.md`. Les tests UI utilisent exclusivement des données QA interceptées et ne prouvent pas l’Auth, les policies ou les médias réels de Supabase.
