-- A small, realistic curriculum used to validate the complete learner journey.
-- Records are resolved through stable tenant slugs/codes instead of generated IDs.

DO $$
DECLARE
  v_tenant_id uuid;
  v_owner_id uuid;
  v_subject_id uuid;
  v_cohort_id uuid;
  v_course_id uuid;
  v_module_id uuid;
  v_lesson_id uuid;
  v_quiz_id uuid;
  v_question_one_id uuid;
  v_question_two_id uuid;
  v_option_id uuid;
BEGIN
  SELECT id INTO v_tenant_id
  FROM public.organizations
  WHERE slug = 'diakspora';

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'The Diakspora organization must exist before seeding the demo course';
  END IF;

  SELECT id INTO v_owner_id
  FROM auth.users
  WHERE email IN ('kayro.digital@gmail.com', 'contact@diakspora.com')
  ORDER BY CASE WHEN email = 'kayro.digital@gmail.com' THEN 0 ELSE 1 END
  LIMIT 1;

  INSERT INTO public.subjects (
    organization_id, name, slug, description, color, status, order_index
  )
  VALUES (
    v_tenant_id,
    'Fondements',
    'fondements',
    'Comprendre les bases et les mettre en pratique au quotidien.',
    '#1E5631',
    'active',
    1
  )
  ON CONFLICT (organization_id, slug) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description, status = 'active'
  RETURNING id INTO v_subject_id;

  INSERT INTO public.cohorts (
    organization_id, name, code, description, level, status, starts_on, timezone
  )
  VALUES (
    v_tenant_id,
    'Classe Démo Karanta',
    'DEMO-2026',
    'Classe réservée à la validation du parcours élève.',
    'Débutant',
    'active',
    current_date,
    'Europe/Paris'
  )
  ON CONFLICT (organization_id, code) WHERE code IS NOT NULL DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description, status = 'active'
  RETURNING id INTO v_cohort_id;

  INSERT INTO public.courses (
    organization_id, subject_id, title, slug, description,
    learning_objectives, language, level, status, access_scope,
    created_by, published_at
  )
  VALUES (
    v_tenant_id,
    v_subject_id,
    'Découvrir les fondements',
    'demo-decouvrir-les-fondements',
    'Un parcours court pour découvrir l’expérience pédagogique Karanta.',
    ARRAY['Comprendre le rôle de l’intention', 'Écouter et regarder une leçon', 'Valider ses acquis par un quiz'],
    'fr',
    'Débutant',
    'published',
    'cohort',
    v_owner_id,
    now()
  )
  ON CONFLICT (organization_id, slug) DO UPDATE
  SET
    subject_id = EXCLUDED.subject_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    learning_objectives = EXCLUDED.learning_objectives,
    status = 'published',
    access_scope = 'cohort',
    published_at = COALESCE(public.courses.published_at, now())
  RETURNING id INTO v_course_id;

  INSERT INTO public.course_cohorts (
    organization_id, course_id, cohort_id, assigned_by
  )
  VALUES (v_tenant_id, v_course_id, v_cohort_id, v_owner_id)
  ON CONFLICT (course_id, cohort_id) DO NOTHING;

  SELECT id INTO v_module_id
  FROM public.course_modules
  WHERE public.course_modules.course_id = v_course_id AND order_index = 1;

  IF v_module_id IS NULL THEN
    INSERT INTO public.course_modules (
      organization_id, course_id, title, description, order_index, status
    )
    VALUES (
      v_tenant_id, v_course_id, 'Module 1 — Commencer avec une intention claire',
      'Une première étape simple, accessible sur mobile.', 1, 'published'
    )
    RETURNING id INTO v_module_id;
  END IF;

  SELECT id INTO v_lesson_id
  FROM public.lessons
  WHERE public.lessons.course_id = v_course_id AND order_index = 1
  LIMIT 1;

  IF v_lesson_id IS NULL THEN
    INSERT INTO public.lessons (
      organization_id, course_id, module_id, title, summary, content,
      duration_minutes, order_index, lesson_type, status, created_by
    )
    VALUES (
      v_tenant_id,
      v_course_id,
      v_module_id,
      'Leçon 1 — L’intention',
      'Découvrir pourquoi chaque apprentissage commence par une intention claire.',
      '{"body":"Écoute l’audio, regarde la courte vidéo puis réponds aux deux questions."}'::jsonb,
      8,
      1,
      'on_demand',
      'published',
      v_owner_id
    )
    RETURNING id INTO v_lesson_id;
  ELSE
    UPDATE public.lessons
    SET module_id = v_module_id, status = 'published', updated_at = now()
    WHERE id = v_lesson_id;
  END IF;

  INSERT INTO public.lesson_resources (
    organization_id, lesson_id, resource_type, title, description,
    external_url, mime_type, duration_seconds, order_index, status, created_by
  ) VALUES
    (
      v_tenant_id, v_lesson_id, 'audio', 'Audio — Poser son intention',
      'Un court extrait audio pour tester l’écoute mobile.',
      'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
      'audio/mpeg', 5, 1, 'active', v_owner_id
    ),
    (
      v_tenant_id, v_lesson_id, 'video', 'Vidéo — Se préparer à apprendre',
      'Une courte vidéo de démonstration.',
      'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      'video/mp4', 30, 2, 'active', v_owner_id
    ),
    (
      v_tenant_id, v_lesson_id, 'text', 'À retenir',
      'L’intention donne une direction à l’apprentissage et aide à rester régulier.',
      NULL, 'text/plain', NULL, 3, 'active', v_owner_id
    )
  ON CONFLICT (lesson_id, order_index) DO UPDATE
  SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    external_url = EXCLUDED.external_url,
    mime_type = EXCLUDED.mime_type,
    status = 'active';

  SELECT id INTO v_quiz_id
  FROM public.quizzes
  WHERE public.quizzes.lesson_id = v_lesson_id
  ORDER BY created_at
  LIMIT 1;

  IF v_quiz_id IS NULL THEN
    INSERT INTO public.quizzes (
      organization_id, lesson_id, title, description, passing_score,
      max_attempts, status, created_by
    )
    VALUES (
      v_tenant_id, v_lesson_id, 'Quiz — L’intention',
      'Deux questions pour vérifier les idées essentielles.',
      50, 5, 'published', v_owner_id
    )
    RETURNING id INTO v_quiz_id;
  ELSE
    UPDATE public.quizzes
    SET status = 'published', passing_score = 50, max_attempts = 5, updated_at = now()
    WHERE id = v_quiz_id;
  END IF;

  INSERT INTO public.quiz_questions (
    organization_id, quiz_id, question_type, prompt, explanation, points, order_index
  )
  VALUES (
    v_tenant_id, v_quiz_id, 'single_choice',
    'À quoi sert une intention claire avant d’apprendre ?',
    'Elle donne une direction à l’effort et aide à rester constant.', 1, 1
  )
  ON CONFLICT (quiz_id, order_index) DO UPDATE
  SET prompt = EXCLUDED.prompt, explanation = EXCLUDED.explanation
  RETURNING id INTO v_question_one_id;

  INSERT INTO public.quiz_questions (
    organization_id, quiz_id, question_type, prompt, explanation, points, order_index
  )
  VALUES (
    v_tenant_id, v_quiz_id, 'single_choice',
    'Quelle est la prochaine étape après l’écoute et la vidéo ?',
    'Le quiz permet de vérifier ce qui a été compris.', 1, 2
  )
  ON CONFLICT (quiz_id, order_index) DO UPDATE
  SET prompt = EXCLUDED.prompt, explanation = EXCLUDED.explanation
  RETURNING id INTO v_question_two_id;

  INSERT INTO public.quiz_options (organization_id, question_id, label, order_index)
  VALUES (v_tenant_id, v_question_one_id, 'Donner une direction à son apprentissage', 1)
  ON CONFLICT (question_id, order_index) DO UPDATE SET label = EXCLUDED.label
  RETURNING id INTO v_option_id;
  INSERT INTO public.quiz_option_keys (option_id, organization_id, is_correct)
  VALUES (v_option_id, v_tenant_id, true)
  ON CONFLICT (option_id) DO UPDATE SET is_correct = true;

  INSERT INTO public.quiz_options (organization_id, question_id, label, order_index)
  VALUES (v_tenant_id, v_question_one_id, 'Finir le cours plus rapidement', 2)
  ON CONFLICT (question_id, order_index) DO UPDATE SET label = EXCLUDED.label
  RETURNING id INTO v_option_id;
  INSERT INTO public.quiz_option_keys (option_id, organization_id, is_correct)
  VALUES (v_option_id, v_tenant_id, false)
  ON CONFLICT (option_id) DO UPDATE SET is_correct = false;

  INSERT INTO public.quiz_options (organization_id, question_id, label, order_index)
  VALUES (v_tenant_id, v_question_two_id, 'Passer le quiz', 1)
  ON CONFLICT (question_id, order_index) DO UPDATE SET label = EXCLUDED.label
  RETURNING id INTO v_option_id;
  INSERT INTO public.quiz_option_keys (option_id, organization_id, is_correct)
  VALUES (v_option_id, v_tenant_id, true)
  ON CONFLICT (option_id) DO UPDATE SET is_correct = true;

  INSERT INTO public.quiz_options (organization_id, question_id, label, order_index)
  VALUES (v_tenant_id, v_question_two_id, 'Quitter immédiatement la plateforme', 2)
  ON CONFLICT (question_id, order_index) DO UPDATE SET label = EXCLUDED.label
  RETURNING id INTO v_option_id;
  INSERT INTO public.quiz_option_keys (option_id, organization_id, is_correct)
  VALUES (v_option_id, v_tenant_id, false)
  ON CONFLICT (option_id) DO UPDATE SET is_correct = false;

  IF NOT EXISTS (
    SELECT 1 FROM public.live_sessions
    WHERE public.live_sessions.course_id = v_course_id
      AND title = 'Direct de bienvenue — Classe Démo'
      AND starts_at > now()
  ) THEN
    INSERT INTO public.live_sessions (
      organization_id, course_id, cohort_id, title, description, provider,
      join_url, starts_at, ends_at, timezone, status, recording_status,
      host_user_id, created_by
    )
    VALUES (
      v_tenant_id, v_course_id, v_cohort_id, 'Direct de bienvenue — Classe Démo',
      'Un rendez-vous de démonstration pour valider l’affichage des directs.',
      'google_meet', 'https://meet.google.com/',
      now() + interval '1 day', now() + interval '1 day 45 minutes',
      'Europe/Paris', 'scheduled', 'not_requested', v_owner_id, v_owner_id
    );
  END IF;
END
$$;
