-- Replace the placeholder learner path with two realistic Diakspora demo courses.
-- Records are resolved through stable organization/course slugs, never generated IDs.

DO $$
DECLARE
  v_organization_id uuid;
  v_owner_id uuid;
  v_cohort_id uuid;
  v_subject_id uuid;
  v_course_id uuid;
  v_module_id uuid;
  v_lesson_id uuid;
  v_quiz_id uuid;
  v_question_id uuid;
BEGIN
  SELECT id INTO v_organization_id
  FROM public.organizations
  WHERE slug = 'diakspora';

  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'The Diakspora organization must exist before seeding demo courses';
  END IF;

  SELECT user_id INTO v_owner_id
  FROM public.organization_memberships
  WHERE organization_id = v_organization_id
    AND role IN ('owner', 'admin')
    AND status = 'active'
  ORDER BY CASE WHEN role = 'owner' THEN 0 ELSE 1 END, created_at
  LIMIT 1;

  SELECT id INTO v_cohort_id
  FROM public.cohorts
  WHERE organization_id = v_organization_id AND code = 'DEMO-2026'
  LIMIT 1;

  IF v_cohort_id IS NULL THEN
    RAISE EXCEPTION 'The Diakspora demo cohort must exist before seeding demo courses';
  END IF;

  -- Only the two presentation courses remain visible to learners.
  UPDATE public.courses
  SET status = 'archived', updated_at = now()
  WHERE organization_id = v_organization_id
    AND slug NOT IN ('lire-arabe-lettres-solaires-lunaires', 'mukhtasar-al-akhdari-purification');

  INSERT INTO public.subjects (
    organization_id, name, slug, description, color, status, order_index
  )
  VALUES (
    v_organization_id,
    'Langue arabe',
    'langue-arabe',
    'Lecture, prononciation et compréhension progressive de la langue arabe.',
    '#C9932F',
    'active',
    1
  )
  ON CONFLICT (organization_id, slug) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description, color = EXCLUDED.color, status = 'active'
  RETURNING id INTO v_subject_id;

  INSERT INTO public.courses (
    organization_id, subject_id, title, slug, description, learning_objectives,
    language, level, cover_url, status, access_scope, created_by, published_at
  )
  VALUES (
    v_organization_id,
    v_subject_id,
    'Lire l’arabe — Lettres solaires et lunaires',
    'lire-arabe-lettres-solaires-lunaires',
    'Un mini-cours pour reconnaître et prononcer correctement l’article ال devant les lettres solaires et lunaires.',
    ARRAY[
      'Comprendre le rôle de l’article défini ال',
      'Reconnaître les 14 lettres solaires',
      'Reconnaître les 14 lettres lunaires',
      'Choisir la bonne prononciation dans des exemples courants'
    ],
    'fr',
    'Débutant',
    '/brands/diakspora/courses/lettres-solaires-lunaires.webp',
    'published',
    'cohort',
    v_owner_id,
    now()
  )
  ON CONFLICT (organization_id, slug) DO UPDATE
  SET subject_id = EXCLUDED.subject_id,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      learning_objectives = EXCLUDED.learning_objectives,
      level = EXCLUDED.level,
      cover_url = EXCLUDED.cover_url,
      status = 'published',
      access_scope = 'cohort',
      published_at = COALESCE(public.courses.published_at, now()),
      updated_at = now()
  RETURNING id INTO v_course_id;

  INSERT INTO public.course_cohorts (organization_id, course_id, cohort_id, assigned_by)
  VALUES (v_organization_id, v_course_id, v_cohort_id, v_owner_id)
  ON CONFLICT (course_id, cohort_id) DO NOTHING;

  INSERT INTO public.course_modules (
    organization_id, course_id, title, description, order_index, status
  )
  VALUES (
    v_organization_id,
    v_course_id,
    'Module 1 — Comprendre et prononcer',
    'Quatre étapes courtes : règle, exemples, entraînement et validation.',
    0,
    'published'
  )
  ON CONFLICT (course_id, order_index) DO UPDATE
  SET title = EXCLUDED.title, description = EXCLUDED.description, status = 'published', updated_at = now()
  RETURNING id INTO v_module_id;

  INSERT INTO public.lessons (
    organization_id, course_id, module_id, title, summary, content,
    duration_minutes, order_index, lesson_type, status, created_by
  )
  VALUES (
    v_organization_id,
    v_course_id,
    v_module_id,
    'Comprendre l’article ال « al- »',
    'Découvre comment ال transforme un nom indéfini en nom défini et pourquoi sa prononciation change selon la lettre suivante.',
    jsonb_build_object('key_points', jsonb_build_array('ال rend le nom défini', 'L’article reste toujours écrit', 'Seule la prononciation du ل change')),
    8,
    0,
    'on_demand',
    'published',
    v_owner_id
  )
  RETURNING id INTO v_lesson_id;

  INSERT INTO public.lesson_resources (
    organization_id, lesson_id, resource_type, title, description, transcript,
    order_index, status, created_by
  )
  VALUES
    (
      v_organization_id, v_lesson_id, 'text', 'Comprendre',
      'Le passage du nom indéfini au nom défini.',
      E'كِتَابٌ — kitābun — un livre\nالْكِتَابُ — al-kitābu — le livre\n\nL’article ال « al- » rend le nom défini. Il reste toujours écrit, mais le ل n’est pas toujours prononcé de la même manière.',
      0, 'active', v_owner_id
    ),
    (
      v_organization_id, v_lesson_id, 'text', 'Question de départ',
      'Observe la différence entre le soleil et la lune.',
      E'Pourquoi écrit-on الشَّمْسُ mais prononce-t-on « ash-shams » et non « al-shams » ?\n\nParce que ش est une lettre solaire : le son du ل s’assimile à la consonne suivante.',
      1, 'active', v_owner_id
    );

  INSERT INTO public.lessons (
    organization_id, course_id, module_id, title, summary, content,
    duration_minutes, order_index, lesson_type, status, created_by
  )
  VALUES (
    v_organization_id,
    v_course_id,
    v_module_id,
    'Les 14 lettres solaires',
    'Apprends à reconnaître les lettres devant lesquelles le ل de ال ne se prononce pas.',
    jsonb_build_object('arabic_title', 'الحروف الشمسية'),
    10,
    1,
    'on_demand',
    'published',
    v_owner_id
  )
  RETURNING id INTO v_lesson_id;

  INSERT INTO public.lesson_resources (
    organization_id, lesson_id, resource_type, title, description, transcript,
    order_index, status, created_by
  )
  VALUES
    (
      v_organization_id, v_lesson_id, 'text', 'Les lettres solaires',
      'الحروف الشمسية',
      E'ت ث د ذ ر ز س ش ص ض ط ظ ل ن\n\nDevant une lettre solaire, le ل de ال n’est pas prononcé. La consonne suivante est renforcée et porte généralement une shadda dans un texte vocalisé.',
      0, 'active', v_owner_id
    ),
    (
      v_organization_id, v_lesson_id, 'text', 'Exemples à prononcer',
      'Lis lentement puis répète à voix haute.',
      E'الشَّمْس — ash-shams — le soleil\nالنَّجْم — an-najm — l’étoile\nالرَّجُل — ar-rajul — l’homme\nالسَّمَاء — as-samā’ — le ciel',
      1, 'active', v_owner_id
    );

  INSERT INTO public.lessons (
    organization_id, course_id, module_id, title, summary, content,
    duration_minutes, order_index, lesson_type, status, created_by
  )
  VALUES (
    v_organization_id,
    v_course_id,
    v_module_id,
    'Les 14 lettres lunaires',
    'Reconnais les lettres devant lesquelles le ل de ال est clairement prononcé.',
    jsonb_build_object('arabic_title', 'الحروف القمرية'),
    10,
    2,
    'on_demand',
    'published',
    v_owner_id
  )
  RETURNING id INTO v_lesson_id;

  INSERT INTO public.lesson_resources (
    organization_id, lesson_id, resource_type, title, description, transcript,
    order_index, status, created_by
  )
  VALUES
    (
      v_organization_id, v_lesson_id, 'text', 'Les lettres lunaires',
      'الحروف القمرية',
      E'ا ب ج ح خ ع غ ف ق ك م هـ و ي\n\nDevant une lettre lunaire, le ل de ال est clairement prononcé.',
      0, 'active', v_owner_id
    ),
    (
      v_organization_id, v_lesson_id, 'text', 'Exemples à prononcer',
      'Lis lentement puis répète à voix haute.',
      E'الْقَمَر — al-qamar — la lune\nالْكِتَاب — al-kitāb — le livre\nالْبَيْت — al-bayt — la maison\nالْمَسْجِد — al-masjid — la mosquée',
      1, 'active', v_owner_id
    );

  INSERT INTO public.lessons (
    organization_id, course_id, module_id, title, summary, content,
    duration_minutes, order_index, lesson_type, status, created_by
  )
  VALUES (
    v_organization_id,
    v_course_id,
    v_module_id,
    'Je reconnais et je prononce',
    'Compare plusieurs mots courants, puis valide ta maîtrise avec le quiz final.',
    jsonb_build_object('practice_words', jsonb_build_array('النَّاس', 'الْقُرْآن', 'الرَّحْمَن', 'الْحَمْد', 'الدِّين', 'الْكِتَاب')),
    12,
    3,
    'on_demand',
    'published',
    v_owner_id
  )
  RETURNING id INTO v_lesson_id;

  INSERT INTO public.lesson_resources (
    organization_id, lesson_id, resource_type, title, description, transcript,
    order_index, status, created_by
  )
  VALUES (
    v_organization_id, v_lesson_id, 'text', 'Écoute, choisis, prononce',
    'Entraîne-toi avant le quiz.',
    E'النَّاس — an-nās\nالْقُرْآن — al-qur’ān\nالرَّحْمَن — ar-raḥmān\nالْحَمْد — al-ḥamd\nالدِّين — ad-dīn\nالْكِتَاب — al-kitāb',
    0, 'active', v_owner_id
  );

  INSERT INTO public.quizzes (
    organization_id, lesson_id, title, description, passing_score, max_attempts, status, created_by
  )
  VALUES (
    v_organization_id, v_lesson_id, 'Quiz final — Lettres solaires et lunaires',
    'Cinq questions pour vérifier que la règle est maîtrisée.', 70, 10, 'published', v_owner_id
  )
  RETURNING id INTO v_quiz_id;

  INSERT INTO public.quiz_questions (
    organization_id, quiz_id, question_type, prompt, explanation, points, order_index
  ) VALUES (
    v_organization_id, v_quiz_id, 'single_choice',
    'Quelle est la bonne prononciation de الشَّمْس ?',
    'ش est solaire : le ل ne se prononce pas et la consonne ش est renforcée.', 1, 0
  ) RETURNING id INTO v_question_id;
  WITH choices(label, order_index, is_correct) AS (VALUES
    ('al-shams', 0, false), ('ash-shams', 1, true), ('a-shams', 2, false), ('shams-al', 3, false)
  ), saved AS (
    INSERT INTO public.quiz_options (organization_id, question_id, label, order_index)
    SELECT v_organization_id, v_question_id, label, order_index FROM choices
    RETURNING id, label
  )
  INSERT INTO public.quiz_option_keys (option_id, organization_id, is_correct)
  SELECT saved.id, v_organization_id, choices.is_correct FROM saved JOIN choices USING (label);

  INSERT INTO public.quiz_questions (
    organization_id, quiz_id, question_type, prompt, explanation, points, order_index
  ) VALUES (
    v_organization_id, v_quiz_id, 'single_choice',
    'Dans quel groupe se trouve la lettre ق ?',
    'ق appartient aux 14 lettres lunaires.', 1, 1
  ) RETURNING id INTO v_question_id;
  WITH choices(label, order_index, is_correct) AS (VALUES
    ('Lettres solaires', 0, false), ('Lettres lunaires', 1, true)
  ), saved AS (
    INSERT INTO public.quiz_options (organization_id, question_id, label, order_index)
    SELECT v_organization_id, v_question_id, label, order_index FROM choices RETURNING id, label
  )
  INSERT INTO public.quiz_option_keys (option_id, organization_id, is_correct)
  SELECT saved.id, v_organization_id, choices.is_correct FROM saved JOIN choices USING (label);

  INSERT INTO public.quiz_questions (
    organization_id, quiz_id, question_type, prompt, explanation, points, order_index
  ) VALUES (
    v_organization_id, v_quiz_id, 'single_choice',
    'Quelle est la bonne prononciation de الْقَمَر ?',
    'ق est lunaire : le ل de ال reste prononcé.', 1, 2
  ) RETURNING id INTO v_question_id;
  WITH choices(label, order_index, is_correct) AS (VALUES
    ('aq-qamar', 0, false), ('al-qamar', 1, true), ('ar-qamar', 2, false)
  ), saved AS (
    INSERT INTO public.quiz_options (organization_id, question_id, label, order_index)
    SELECT v_organization_id, v_question_id, label, order_index FROM choices RETURNING id, label
  )
  INSERT INTO public.quiz_option_keys (option_id, organization_id, is_correct)
  SELECT saved.id, v_organization_id, choices.is_correct FROM saved JOIN choices USING (label);

  INSERT INTO public.quiz_questions (
    organization_id, quiz_id, question_type, prompt, explanation, points, order_index
  ) VALUES (
    v_organization_id, v_quiz_id, 'single_choice',
    'Que devient le ل de ال devant une lettre solaire ?',
    'Il reste écrit, mais son son s’assimile à la consonne suivante.', 1, 3
  ) RETURNING id INTO v_question_id;
  WITH choices(label, order_index, is_correct) AS (VALUES
    ('Il disparaît de l’écriture', 0, false), ('Il n’est pas prononcé', 1, true), ('Il devient une voyelle', 2, false)
  ), saved AS (
    INSERT INTO public.quiz_options (organization_id, question_id, label, order_index)
    SELECT v_organization_id, v_question_id, label, order_index FROM choices RETURNING id, label
  )
  INSERT INTO public.quiz_option_keys (option_id, organization_id, is_correct)
  SELECT saved.id, v_organization_id, choices.is_correct FROM saved JOIN choices USING (label);

  INSERT INTO public.quiz_questions (
    organization_id, quiz_id, question_type, prompt, explanation, points, order_index
  ) VALUES (
    v_organization_id, v_quiz_id, 'single_choice',
    'Quelle paire permet de mémoriser les deux catégories ?',
    'Le soleil الشَّمْس illustre une solaire et la lune الْقَمَر une lunaire.', 1, 4
  ) RETURNING id INTO v_question_id;
  WITH choices(label, order_index, is_correct) AS (VALUES
    ('Le soleil et la lune', 0, true), ('Le livre et la plume', 1, false), ('La maison et la porte', 2, false)
  ), saved AS (
    INSERT INTO public.quiz_options (organization_id, question_id, label, order_index)
    SELECT v_organization_id, v_question_id, label, order_index FROM choices RETURNING id, label
  )
  INSERT INTO public.quiz_option_keys (option_id, organization_id, is_correct)
  SELECT saved.id, v_organization_id, choices.is_correct FROM saved JOIN choices USING (label);

  -- Advanced course built around the two teacher-provided YouTube lessons.
  INSERT INTO public.subjects (
    organization_id, name, slug, description, color, status, order_index
  )
  VALUES (
    v_organization_id,
    'Fiqh malikite',
    'fiqh-malikite',
    'Étude progressive des règles de jurisprudence selon l’école malikite.',
    '#1E5631',
    'active',
    2
  )
  ON CONFLICT (organization_id, slug) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description, color = EXCLUDED.color, status = 'active'
  RETURNING id INTO v_subject_id;

  INSERT INTO public.courses (
    organization_id, subject_id, title, slug, description, learning_objectives,
    language, level, cover_url, status, access_scope, created_by, published_at
  )
  VALUES (
    v_organization_id,
    v_subject_id,
    'Mukhtasar Al-Akhdari — La purification',
    'mukhtasar-al-akhdari-purification',
    'Deux séances en langue communautaire sur la notion d’eau pure et purifiante dans le chapitre de la purification du Mukhtasar Al-Akhdari.',
    ARRAY[
      'Suivre une explication traditionnelle structurée dans notre langue',
      'Comprendre la notion d’eau pure et purifiante',
      'Identifier l’eau utilisable pour la purification rituelle'
    ],
    'fr',
    'Intermédiaire / avancé',
    'https://i.ytimg.com/vi/tlcqA7snWUc/hqdefault.jpg',
    'published',
    'cohort',
    v_owner_id,
    now()
  )
  ON CONFLICT (organization_id, slug) DO UPDATE
  SET subject_id = EXCLUDED.subject_id,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      learning_objectives = EXCLUDED.learning_objectives,
      level = EXCLUDED.level,
      cover_url = EXCLUDED.cover_url,
      status = 'published',
      access_scope = 'cohort',
      published_at = COALESCE(public.courses.published_at, now()),
      updated_at = now()
  RETURNING id INTO v_course_id;

  INSERT INTO public.course_cohorts (organization_id, course_id, cohort_id, assigned_by)
  VALUES (v_organization_id, v_course_id, v_cohort_id, v_owner_id)
  ON CONFLICT (course_id, cohort_id) DO NOTHING;

  INSERT INTO public.course_modules (
    organization_id, course_id, title, description, order_index, status
  )
  VALUES (
    v_organization_id,
    v_course_id,
    'باب الطهارة — Le chapitre de la purification',
    'Deux séances vidéo sur l’eau pure et purifiante, accompagnées de repères et d’une validation courte.',
    0,
    'published'
  )
  ON CONFLICT (course_id, order_index) DO UPDATE
  SET title = EXCLUDED.title, description = EXCLUDED.description, status = 'published', updated_at = now()
  RETURNING id INTO v_module_id;

  INSERT INTO public.lessons (
    organization_id, course_id, module_id, title, summary, content,
    duration_minutes, order_index, lesson_type, status, created_by
  )
  VALUES (
    v_organization_id,
    v_course_id,
    v_module_id,
    'Leçon 1 — L’eau pure et purifiante',
    'Découvre, dans notre langue, la notion d’eau pure en elle-même et capable de purifier.',
    jsonb_build_object('source_title', 'Akhdari 6', 'teacher_channel', 'MAJLISS 03 /yahoo'),
    45,
    0,
    'on_demand',
    'published',
    v_owner_id
  )
  RETURNING id INTO v_lesson_id;

  INSERT INTO public.lesson_resources (
    organization_id, lesson_id, resource_type, title, description, external_url,
    transcript, order_index, status, created_by
  )
  VALUES
    (
      v_organization_id, v_lesson_id, 'youtube', 'Cours en vidéo — L’eau pure et purifiante (1)',
      'Première leçon en langue communautaire sur la pureté de l’eau.',
      'https://www.youtube.com/watch?v=tlcqA7snWUc', NULL, 0, 'active', v_owner_id
    ),
    (
      v_organization_id, v_lesson_id, 'text', 'Notion centrale',
      'Le repère à comprendre pendant l’écoute.', NULL,
      E'الماء الطهور — l’eau pure et purifiante\n\nElle est pure en elle-même et peut servir à accomplir la purification rituelle. Écoute attentivement les conditions et les exemples donnés par le professeur : sa formulation dans le cours reste la référence.',
      1, 'active', v_owner_id
    );

  INSERT INTO public.lessons (
    organization_id, course_id, module_id, title, summary, content,
    duration_minutes, order_index, lesson_type, status, created_by
  )
  VALUES (
    v_organization_id,
    v_course_id,
    v_module_id,
    'Leçon 2 — Reconnaître l’eau qui purifie',
    'Poursuis l’étude de l’eau pure et purifiante avec les précisions et les exemples du professeur.',
    jsonb_build_object('source_title', 'Akhdari 7', 'teacher_channel', 'MAJLISS 03 /yahoo'),
    45,
    1,
    'on_demand',
    'published',
    v_owner_id
  )
  RETURNING id INTO v_lesson_id;

  INSERT INTO public.lesson_resources (
    organization_id, lesson_id, resource_type, title, description, external_url,
    transcript, order_index, status, created_by
  )
  VALUES
    (
      v_organization_id, v_lesson_id, 'youtube', 'Cours en vidéo — L’eau pure et purifiante (2)',
      'Deuxième leçon en langue communautaire sur la pureté de l’eau.',
      'https://www.youtube.com/watch?v=TKO0w9XUPP0', NULL, 0, 'active', v_owner_id
    ),
    (
      v_organization_id, v_lesson_id, 'text', 'À retenir',
      'Une synthèse avant le quiz.', NULL,
      E'Une eau dite « pure et purifiante » réunit deux qualités :\n• elle est pure en elle-même ;\n• elle peut être utilisée pour purifier.\n\nPendant la séance, repère les exemples d’eaux utilisables, les changements qui peuvent affecter l’eau et les distinctions données par le professeur. Sa formulation précise reste la référence du cours.',
      1, 'active', v_owner_id
    );

  INSERT INTO public.quizzes (
    organization_id, lesson_id, title, description, passing_score, max_attempts, status, created_by
  )
  VALUES (
    v_organization_id, v_lesson_id, 'Quiz — L’eau pure et purifiante',
    'Cinq questions pour vérifier les notions essentielles des deux leçons.', 70, 10, 'published', v_owner_id
  )
  RETURNING id INTO v_quiz_id;

  INSERT INTO public.quiz_questions (
    organization_id, quiz_id, question_type, prompt, explanation, points, order_index
  ) VALUES (
    v_organization_id, v_quiz_id, 'single_choice',
    'Que signifie « une eau pure et purifiante » ?',
    'Elle est pure en elle-même et peut servir à accomplir la purification.', 1, 0
  ) RETURNING id INTO v_question_id;
  WITH choices(label, order_index, is_correct) AS (VALUES
    ('Elle est seulement agréable à boire', 0, false),
    ('Elle est pure en elle-même et peut purifier', 1, true),
    ('Elle est uniquement réservée au nettoyage', 2, false)
  ), saved AS (
    INSERT INTO public.quiz_options (organization_id, question_id, label, order_index)
    SELECT v_organization_id, v_question_id, label, order_index FROM choices RETURNING id, label
  )
  INSERT INTO public.quiz_option_keys (option_id, organization_id, is_correct)
  SELECT saved.id, v_organization_id, choices.is_correct FROM saved JOIN choices USING (label);

  INSERT INTO public.quiz_questions (
    organization_id, quiz_id, question_type, prompt, explanation, points, order_index
  ) VALUES (
    v_organization_id, v_quiz_id, 'single_choice',
    'Quel terme arabe est associé dans le cours à l’eau pure et purifiante ?',
    'Le repère présenté est الماء الطهور.', 1, 1
  ) RETURNING id INTO v_question_id;
  WITH choices(label, order_index, is_correct) AS (VALUES
    ('الماء الطهور', 0, true), ('وقت الصلاة', 1, false), ('اتجاه القبلة', 2, false)
  ), saved AS (
    INSERT INTO public.quiz_options (organization_id, question_id, label, order_index)
    SELECT v_organization_id, v_question_id, label, order_index FROM choices RETURNING id, label
  )
  INSERT INTO public.quiz_option_keys (option_id, organization_id, is_correct)
  SELECT saved.id, v_organization_id, choices.is_correct FROM saved JOIN choices USING (label);

  INSERT INTO public.quiz_questions (
    organization_id, quiz_id, question_type, prompt, explanation, points, order_index
  ) VALUES (
    v_organization_id, v_quiz_id, 'single_choice',
    'Pourquoi faut-il étudier les changements qui affectent l’eau ?',
    'Ils permettent de déterminer, selon les règles expliquées, si l’eau reste utilisable pour purifier.', 1, 2
  ) RETURNING id INTO v_question_id;
  WITH choices(label, order_index, is_correct) AS (VALUES
    ('Pour déterminer si elle reste utilisable pour purifier', 0, true),
    ('Uniquement pour connaître sa température', 1, false),
    ('Seulement pour choisir son récipient', 2, false)
  ), saved AS (
    INSERT INTO public.quiz_options (organization_id, question_id, label, order_index)
    SELECT v_organization_id, v_question_id, label, order_index FROM choices RETURNING id, label
  )
  INSERT INTO public.quiz_option_keys (option_id, organization_id, is_correct)
  SELECT saved.id, v_organization_id, choices.is_correct FROM saved JOIN choices USING (label);

  INSERT INTO public.quiz_questions (
    organization_id, quiz_id, question_type, prompt, explanation, points, order_index
  ) VALUES (
    v_organization_id, v_quiz_id, 'single_choice',
    'À quoi peut servir une eau qui possède la qualité de purifier ?',
    'Elle peut être utilisée pour la purification rituelle selon les conditions expliquées dans le cours.', 1, 3
  ) RETURNING id INTO v_question_id;
  WITH choices(label, order_index, is_correct) AS (VALUES
    ('À accomplir la purification rituelle', 0, true),
    ('Uniquement à décorer un récipient', 1, false),
    ('À remplacer toute autre règle du chapitre', 2, false)
  ), saved AS (
    INSERT INTO public.quiz_options (organization_id, question_id, label, order_index)
    SELECT v_organization_id, v_question_id, label, order_index FROM choices RETURNING id, label
  )
  INSERT INTO public.quiz_option_keys (option_id, organization_id, is_correct)
  SELECT saved.id, v_organization_id, choices.is_correct FROM saved JOIN choices USING (label);

  INSERT INTO public.quiz_questions (
    organization_id, quiz_id, question_type, prompt, explanation, points, order_index
  ) VALUES (
    v_organization_id, v_quiz_id, 'single_choice',
    'Quelle source faut-il retenir pour les conditions et les exemples précis ?',
    'L’explication du professeur dans les deux vidéos constitue la référence pédagogique.', 1, 4
  ) RETURNING id INTO v_question_id;
  WITH choices(label, order_index, is_correct) AS (VALUES
    ('L’explication du professeur', 0, true),
    ('La couleur de la page', 1, false),
    ('Le titre de la vignette YouTube', 2, false)
  ), saved AS (
    INSERT INTO public.quiz_options (organization_id, question_id, label, order_index)
    SELECT v_organization_id, v_question_id, label, order_index FROM choices RETURNING id, label
  )
  INSERT INTO public.quiz_option_keys (option_id, organization_id, is_correct)
  SELECT saved.id, v_organization_id, choices.is_correct FROM saved JOIN choices USING (label);
END
$$;
