CREATE INDEX books_created_by_idx ON public.books (created_by);
CREATE INDEX books_subject_organization_idx ON public.books (subject_id, organization_id);

CREATE INDEX cohort_memberships_created_by_idx ON public.cohort_memberships (created_by);
CREATE INDEX cohort_memberships_organization_idx ON public.cohort_memberships (organization_id);

CREATE INDEX course_cohorts_assigned_by_idx ON public.course_cohorts (assigned_by);
CREATE INDEX course_cohorts_cohort_organization_idx ON public.course_cohorts (cohort_id, organization_id);
CREATE INDEX course_cohorts_course_organization_idx ON public.course_cohorts (course_id, organization_id);
CREATE INDEX course_cohorts_organization_idx ON public.course_cohorts (organization_id);

CREATE INDEX course_enrollments_course_organization_idx ON public.course_enrollments (course_id, organization_id);
CREATE INDEX course_enrollments_enrolled_by_idx ON public.course_enrollments (enrolled_by);
CREATE INDEX course_enrollments_organization_idx ON public.course_enrollments (organization_id);

CREATE INDEX course_modules_course_organization_idx ON public.course_modules (course_id, organization_id);
CREATE INDEX course_modules_organization_idx ON public.course_modules (organization_id);

CREATE INDEX courses_book_organization_idx ON public.courses (book_id, organization_id);
CREATE INDEX courses_created_by_idx ON public.courses (created_by);
CREATE INDEX courses_subject_organization_idx ON public.courses (subject_id, organization_id);

CREATE INDEX lesson_resources_created_by_idx ON public.lesson_resources (created_by);
CREATE INDEX lesson_resources_lesson_organization_idx ON public.lesson_resources (lesson_id, organization_id);
CREATE INDEX lesson_resources_organization_idx ON public.lesson_resources (organization_id);

CREATE INDEX lessons_course_organization_idx ON public.lessons (course_id, organization_id);
CREATE INDEX lessons_created_by_idx ON public.lessons (created_by);
CREATE INDEX lessons_module_organization_idx ON public.lessons (module_id, organization_id);

CREATE INDEX live_sessions_cohort_organization_idx ON public.live_sessions (cohort_id, organization_id);
CREATE INDEX live_sessions_course_organization_idx ON public.live_sessions (course_id, organization_id);
CREATE INDEX live_sessions_created_by_idx ON public.live_sessions (created_by);
CREATE INDEX live_sessions_lesson_organization_idx ON public.live_sessions (lesson_id, organization_id);
CREATE INDEX live_sessions_organization_idx ON public.live_sessions (organization_id);

CREATE INDEX quiz_answers_attempt_organization_idx ON public.quiz_answers (attempt_id, organization_id);
CREATE INDEX quiz_answers_organization_idx ON public.quiz_answers (organization_id);
CREATE INDEX quiz_answers_question_organization_idx ON public.quiz_answers (question_id, organization_id);

CREATE INDEX quiz_attempts_organization_idx ON public.quiz_attempts (organization_id);
CREATE INDEX quiz_attempts_quiz_organization_idx ON public.quiz_attempts (quiz_id, organization_id);

CREATE INDEX quiz_option_keys_option_organization_idx ON public.quiz_option_keys (option_id, organization_id);
CREATE INDEX quiz_options_organization_idx ON public.quiz_options (organization_id);
CREATE INDEX quiz_options_question_organization_idx ON public.quiz_options (question_id, organization_id);

CREATE INDEX quiz_questions_organization_idx ON public.quiz_questions (organization_id);
CREATE INDEX quiz_questions_quiz_organization_idx ON public.quiz_questions (quiz_id, organization_id);

CREATE INDEX quizzes_created_by_idx ON public.quizzes (created_by);
CREATE INDEX quizzes_lesson_organization_idx ON public.quizzes (lesson_id, organization_id);
CREATE INDEX quizzes_organization_idx ON public.quizzes (organization_id);
