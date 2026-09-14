-- Keep publication under institutional control even when a teacher calls the
-- REST API directly instead of using the course editor.

drop policy if exists courses_update on public.courses;
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

drop policy if exists course_modules_insert on public.course_modules;
drop policy if exists course_modules_update on public.course_modules;
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

drop policy if exists lessons_insert_for_course_editor on public.lessons;
drop policy if exists lessons_update_for_course_editor on public.lessons;
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

drop policy if exists quizzes_insert on public.quizzes;
drop policy if exists quizzes_update on public.quizzes;
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
