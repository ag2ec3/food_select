-- RLS: avoid permissive INSERT on teams; auth.uid() initplan on memberships (Supabase linters 0024, 0003).
-- Performance: covering indexes on FK columns (linter 0001).

DROP POLICY IF EXISTS "teams_insert_authenticated" ON public.teams;
CREATE POLICY "teams_insert_authenticated" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (
    trim(name) <> ''
    AND trim(invite_code) <> ''
  );

DROP POLICY IF EXISTS "memberships_insert_self" ON public.memberships;
CREATE POLICY "memberships_insert_self" ON public.memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE INDEX IF NOT EXISTS idx_candidates_user_id ON public.candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_decisions_candidate_id ON public.decisions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_candidate_id ON public.votes(candidate_id);
