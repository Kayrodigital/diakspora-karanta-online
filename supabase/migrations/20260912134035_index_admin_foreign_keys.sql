-- Cover the foreign keys introduced by the administration foundation.
CREATE INDEX learner_profiles_user_idx
  ON public.learner_profiles (user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX learner_profiles_created_by_idx
  ON public.learner_profiles (created_by)
  WHERE created_by IS NOT NULL;
CREATE INDEX learner_cohort_memberships_created_by_idx
  ON public.learner_cohort_memberships (created_by)
  WHERE created_by IS NOT NULL;
CREATE INDEX organization_invitations_user_idx
  ON public.organization_invitations (user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX organization_invitations_cohort_idx
  ON public.organization_invitations (cohort_id)
  WHERE cohort_id IS NOT NULL;
CREATE INDEX organization_invitations_invited_by_idx
  ON public.organization_invitations (invited_by);
