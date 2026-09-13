-- Learning objectives displayed before each demo lesson.
UPDATE public.lessons AS lesson
SET content = lesson.content || jsonb_build_object(
  'key_points',
  CASE lesson.title
    WHEN 'Les 14 lettres solaires' THEN jsonb_build_array(
      'Reconnaître les 14 lettres solaires',
      'Comprendre pourquoi le ل de ال ne se prononce pas',
      'Prononcer correctement des mots fréquents avec assimilation'
    )
    WHEN 'Les 14 lettres lunaires' THEN jsonb_build_array(
      'Reconnaître les 14 lettres lunaires',
      'Comprendre pourquoi le ل de ال reste audible',
      'Prononcer clairement des mots fréquents avec ال'
    )
    WHEN 'Je reconnais et je prononce' THEN jsonb_build_array(
      'Distinguer rapidement une lettre solaire d’une lettre lunaire',
      'Choisir la bonne prononciation de l’article ال',
      'Valider la règle avec le quiz final'
    )
  END
)
FROM public.courses AS course
JOIN public.organizations AS organization ON organization.id = course.organization_id
WHERE lesson.course_id = course.id
  AND organization.slug = 'diakspora'
  AND course.slug = 'lire-arabe-lettres-solaires-lunaires'
  AND lesson.title IN (
    'Les 14 lettres solaires',
    'Les 14 lettres lunaires',
    'Je reconnais et je prononce'
  );

UPDATE public.lessons AS lesson
SET content = lesson.content || jsonb_build_object(
  'key_points',
  CASE lesson.title
    WHEN 'Leçon 1 — L’eau pure et purifiante' THEN jsonb_build_array(
      'Comprendre ce que signifie une eau pure en elle-même',
      'Comprendre ce que signifie une eau capable de purifier',
      'Repérer les conditions et les exemples donnés par le professeur'
    )
    WHEN 'Leçon 2 — Reconnaître l’eau qui purifie' THEN jsonb_build_array(
      'Reconnaître une eau utilisable pour la purification rituelle',
      'Identifier les changements qui peuvent affecter l’eau',
      'Consolider la notion d’eau pure et purifiante avant le quiz'
    )
  END
)
FROM public.courses AS course
JOIN public.organizations AS organization ON organization.id = course.organization_id
WHERE lesson.course_id = course.id
  AND organization.slug = 'diakspora'
  AND course.slug = 'mukhtasar-al-akhdari-purification'
  AND lesson.title IN (
    'Leçon 1 — L’eau pure et purifiante',
    'Leçon 2 — Reconnaître l’eau qui purifie'
  );
