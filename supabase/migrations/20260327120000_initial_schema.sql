-- "오늘 뭐 먹지?" — initial schema (2-A)
-- Applied to linked Supabase project via MCP; keep in sync for local `supabase db` workflows.

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  menu_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, menu_name)
);

CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  voted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

CREATE TABLE public.decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  decided_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);

CREATE INDEX idx_memberships_team_id ON public.memberships(team_id);
CREATE INDEX idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX idx_sessions_team_id ON public.sessions(team_id);
CREATE INDEX idx_candidates_session_id ON public.candidates(session_id);
CREATE INDEX idx_votes_session_id ON public.votes(session_id);
CREATE INDEX idx_votes_user_id ON public.votes(user_id);
CREATE INDEX idx_decisions_session_id ON public.decisions(session_id);

CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE team_id = p_team_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_session(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sessions s
    INNER JOIN public.memberships m ON m.team_id = s.team_id
    WHERE s.id = p_session_id AND m.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_team_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.user_can_access_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_access_session(uuid) TO authenticated;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

-- INSERT: any authenticated user may create a team; app then inserts membership for creator.
CREATE POLICY "teams_select_member" ON public.teams
  FOR SELECT TO authenticated
  USING (public.is_team_member(id));

CREATE POLICY "teams_insert_authenticated" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "memberships_select_team_members" ON public.memberships
  FOR SELECT TO authenticated
  USING (public.is_team_member(team_id));

CREATE POLICY "memberships_insert_self" ON public.memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sessions_select_team_members" ON public.sessions
  FOR SELECT TO authenticated
  USING (public.is_team_member(team_id));

CREATE POLICY "sessions_insert_team_members" ON public.sessions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(team_id));

CREATE POLICY "sessions_update_team_members" ON public.sessions
  FOR UPDATE TO authenticated
  USING (public.is_team_member(team_id))
  WITH CHECK (public.is_team_member(team_id));

CREATE POLICY "sessions_delete_team_members" ON public.sessions
  FOR DELETE TO authenticated
  USING (public.is_team_member(team_id));

CREATE POLICY "candidates_all_team_members" ON public.candidates
  FOR ALL TO authenticated
  USING (public.user_can_access_session(session_id))
  WITH CHECK (public.user_can_access_session(session_id));

CREATE POLICY "votes_all_team_members" ON public.votes
  FOR ALL TO authenticated
  USING (public.user_can_access_session(session_id))
  WITH CHECK (public.user_can_access_session(session_id));

CREATE POLICY "decisions_all_team_members" ON public.decisions
  FOR ALL TO authenticated
  USING (public.user_can_access_session(session_id))
  WITH CHECK (public.user_can_access_session(session_id));

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.votes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decisions TO authenticated;
