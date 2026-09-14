-- Teachers may create and maintain their own course drafts. Institutional
-- courses created by another member remain read-only for them.

create or replace function private.can_edit_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.courses as course
    where course.id = p_course_id
      and (
        private.can_manage_learning(course.organization_id)
        or (
          course.created_by = (select auth.uid())
          and course.status = 'draft'
          and private.has_organization_role(
            course.organization_id,
            array['teacher', 'class_manager']
          )
        )
      )
  );
$$;

create or replace function private.can_edit_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lessons as lesson
    where lesson.id = p_lesson_id
      and lesson.course_id is not null
      and private.can_edit_course(lesson.course_id)
  );
$$;

create or replace function private.can_edit_quiz(p_quiz_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.quizzes as quiz
    where quiz.id = p_quiz_id
      and private.can_edit_lesson(quiz.lesson_id)
  );
$$;

create or replace function private.can_edit_quiz_question(p_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.quiz_questions as question
    where question.id = p_question_id
      and private.can_edit_quiz(question.quiz_id)
  );
$$;

revoke all on function private.can_edit_course(uuid) from public;
revoke all on function private.can_edit_lesson(uuid) from public;
revoke all on function private.can_edit_quiz(uuid) from public;
revoke all on function private.can_edit_quiz_question(uuid) from public;
grant execute on function private.can_edit_course(uuid) to authenticated;
grant execute on function private.can_edit_lesson(uuid) to authenticated;
grant execute on function private.can_edit_quiz(uuid) to authenticated;
grant execute on function private.can_edit_quiz_question(uuid) to authenticated;

create or replace function private.can_access_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.courses as course
    where course.id = p_course_id
      and (
        private.can_edit_course(course.id)
        or private.can_teach_course(course.id)
        or (
          course.status = 'published'
          and private.is_organization_member(course.organization_id)
          and (
            course.access_scope = 'organization'
            or exists (
              select 1
              from public.course_enrollments as enrollment
              where enrollment.course_id = course.id
                and enrollment.user_id = (select auth.uid())
                and enrollment.status in ('active', 'completed')
            )
            or exists (
              select 1
              from public.course_cohorts as assignment
              join public.cohort_memberships as membership
                on membership.cohort_id = assignment.cohort_id
              where assignment.course_id = course.id
                and membership.user_id = (select auth.uid())
                and membership.status in ('active', 'completed')
            )
          )
        )
      )
  );
$$;

drop policy if exists courses_insert on public.courses;
drop policy if exists courses_update on public.courses;
drop policy if exists courses_delete on public.courses;
create policy courses_insert on public.courses for insert to authenticated
  with check (
    private.can_manage_learning(organization_id)
    or (
      created_by = (select auth.uid())
      and status = 'draft'
      and private.has_organization_role(organization_id, array['teacher', 'class_manager'])
    )
  );
create policy courses_update on public.courses for update to authenticated
  using (private.can_edit_course(id))
  with check (
    private.can_manage_learning(organization_id)
    or (
      created_by = (select auth.uid())
      and status = 'draft'
      and private.has_organization_role(organization_id, array['teacher', 'class_manager'])
    )
  );
create policy courses_delete on public.courses for delete to authenticated
  using (private.can_edit_course(id));

drop policy if exists course_cohorts_insert on public.course_cohorts;
drop policy if exists course_cohorts_update on public.course_cohorts;
drop policy if exists course_cohorts_delete on public.course_cohorts;
create policy course_cohorts_insert on public.course_cohorts for insert to authenticated
  with check (
    private.can_manage_learning(organization_id)
    or (private.can_edit_course(course_id) and private.can_teach_cohort(cohort_id))
  );
create policy course_cohorts_update on public.course_cohorts for update to authenticated
  using (
    private.can_manage_learning(organization_id)
    or (private.can_edit_course(course_id) and private.can_teach_cohort(cohort_id))
  )
  with check (
    private.can_manage_learning(organization_id)
    or (private.can_edit_course(course_id) and private.can_teach_cohort(cohort_id))
  );
create policy course_cohorts_delete on public.course_cohorts for delete to authenticated
  using (
    private.can_manage_learning(organization_id)
    or (private.can_edit_course(course_id) and private.can_teach_cohort(cohort_id))
  );

drop policy if exists course_modules_insert on public.course_modules;
drop policy if exists course_modules_update on public.course_modules;
drop policy if exists course_modules_delete on public.course_modules;
create policy course_modules_insert on public.course_modules for insert to authenticated
  with check (
    private.can_manage_learning(organization_id)
    or (status = 'draft' and private.can_edit_course(course_id))
  );
create policy course_modules_update on public.course_modules for update to authenticated
  using (private.can_edit_course(course_id))
  with check (
    private.can_manage_learning(organization_id)
    or (status = 'draft' and private.can_edit_course(course_id))
  );
create policy course_modules_delete on public.course_modules for delete to authenticated
  using (private.can_edit_course(course_id));

drop policy if exists "lessons_insert_for_teaching_staff" on public.lessons;
drop policy if exists "lessons_update_for_teaching_staff" on public.lessons;
drop policy if exists "lessons_delete_for_teaching_staff" on public.lessons;
create policy lessons_insert_for_course_editor on public.lessons for insert to authenticated
  with check (
    course_id is not null
    and (
      private.can_manage_learning(organization_id)
      or (status = 'draft' and private.can_edit_course(course_id))
    )
  );
create policy lessons_update_for_course_editor on public.lessons for update to authenticated
  using (private.can_edit_lesson(id))
  with check (
    private.can_manage_learning(organization_id)
    or (status = 'draft' and course_id is not null and private.can_edit_course(course_id))
  );
create policy lessons_delete_for_course_editor on public.lessons for delete to authenticated
  using (private.can_edit_lesson(id));

drop policy if exists lesson_resources_insert on public.lesson_resources;
drop policy if exists lesson_resources_update on public.lesson_resources;
drop policy if exists lesson_resources_delete on public.lesson_resources;
create policy lesson_resources_insert on public.lesson_resources for insert to authenticated
  with check (private.can_edit_lesson(lesson_id));
create policy lesson_resources_update on public.lesson_resources for update to authenticated
  using (private.can_edit_lesson(lesson_id))
  with check (private.can_edit_lesson(lesson_id));
create policy lesson_resources_delete on public.lesson_resources for delete to authenticated
  using (private.can_edit_lesson(lesson_id));

drop policy if exists quizzes_insert on public.quizzes;
drop policy if exists quizzes_update on public.quizzes;
drop policy if exists quizzes_delete on public.quizzes;
create policy quizzes_insert on public.quizzes for insert to authenticated
  with check (
    private.can_manage_learning(organization_id)
    or (status = 'draft' and private.can_edit_lesson(lesson_id))
  );
create policy quizzes_update on public.quizzes for update to authenticated
  using (private.can_edit_quiz(id))
  with check (
    private.can_manage_learning(organization_id)
    or (status = 'draft' and private.can_edit_lesson(lesson_id))
  );
create policy quizzes_delete on public.quizzes for delete to authenticated
  using (private.can_edit_quiz(id));

drop policy if exists quiz_questions_insert on public.quiz_questions;
drop policy if exists quiz_questions_update on public.quiz_questions;
drop policy if exists quiz_questions_delete on public.quiz_questions;
create policy quiz_questions_insert on public.quiz_questions for insert to authenticated
  with check (private.can_edit_quiz(quiz_id));
create policy quiz_questions_update on public.quiz_questions for update to authenticated
  using (private.can_edit_quiz(quiz_id))
  with check (private.can_edit_quiz(quiz_id));
create policy quiz_questions_delete on public.quiz_questions for delete to authenticated
  using (private.can_edit_quiz(quiz_id));

drop policy if exists quiz_options_insert on public.quiz_options;
drop policy if exists quiz_options_update on public.quiz_options;
drop policy if exists quiz_options_delete on public.quiz_options;
create policy quiz_options_insert on public.quiz_options for insert to authenticated
  with check (private.can_edit_quiz_question(question_id));
create policy quiz_options_update on public.quiz_options for update to authenticated
  using (private.can_edit_quiz_question(question_id))
  with check (private.can_edit_quiz_question(question_id));
create policy quiz_options_delete on public.quiz_options for delete to authenticated
  using (private.can_edit_quiz_question(question_id));

drop policy if exists quiz_option_keys_insert on public.quiz_option_keys;
drop policy if exists quiz_option_keys_update on public.quiz_option_keys;
drop policy if exists quiz_option_keys_delete on public.quiz_option_keys;
create policy quiz_option_keys_insert on public.quiz_option_keys for insert to authenticated
  with check (
    exists (
      select 1 from public.quiz_options as option
      where option.id = option_id
        and private.can_edit_quiz_question(option.question_id)
    )
  );
create policy quiz_option_keys_update on public.quiz_option_keys for update to authenticated
  using (
    exists (
      select 1 from public.quiz_options as option
      where option.id = option_id
        and private.can_edit_quiz_question(option.question_id)
    )
  )
  with check (
    exists (
      select 1 from public.quiz_options as option
      where option.id = option_id
        and private.can_edit_quiz_question(option.question_id)
    )
  );
create policy quiz_option_keys_delete on public.quiz_option_keys for delete to authenticated
  using (
    exists (
      select 1 from public.quiz_options as option
      where option.id = option_id
        and private.can_edit_quiz_question(option.question_id)
    )
  );
