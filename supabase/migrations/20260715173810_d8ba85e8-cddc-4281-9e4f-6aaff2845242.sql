
-- 1. GRANTS for existing tables (Data API access)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.lessons TO authenticated, anon;
GRANT ALL ON public.lessons TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.progress TO authenticated;
GRANT ALL ON public.progress TO service_role;

GRANT SELECT, INSERT ON public.quiz_results TO authenticated;
GRANT ALL ON public.quiz_results TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.homework_submissions TO authenticated;
GRANT ALL ON public.homework_submissions TO service_role;

GRANT SELECT ON public.cohorts TO authenticated;
GRANT ALL ON public.cohorts TO service_role;

GRANT SELECT, INSERT ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;

GRANT SELECT ON public.regularity_score TO authenticated;
GRANT ALL ON public.regularity_score TO service_role;

-- 2. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regularity_score ENABLE ROW LEVEL SECURITY;

-- 3. Policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "lessons_read_all" ON public.lessons;
CREATE POLICY "lessons_read_all" ON public.lessons FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "progress_own" ON public.progress;
CREATE POLICY "progress_own" ON public.progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "quiz_results_own" ON public.quiz_results;
CREATE POLICY "quiz_results_own" ON public.quiz_results FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "homework_own" ON public.homework_submissions;
CREATE POLICY "homework_own" ON public.homework_submissions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cohorts_read_auth" ON public.cohorts;
CREATE POLICY "cohorts_read_auth" ON public.cohorts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "attendance_own" ON public.attendance;
CREATE POLICY "attendance_own" ON public.attendance FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "regularity_own" ON public.regularity_score;
CREATE POLICY "regularity_own" ON public.regularity_score FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    'eleve',
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Seed lessons if empty
INSERT INTO public.lessons (title, duration_minutes, order_index)
SELECT * FROM (VALUES
  ('Sourate Al-Mulk — versets 1 à 5', 5, 1),
  ('Sourate Al-Fatiha', 4, 2),
  ('Le pronom أنا', 4, 3)
) AS v(title, duration_minutes, order_index)
WHERE NOT EXISTS (SELECT 1 FROM public.lessons);
