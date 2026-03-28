-- Teams: invite_code + RPCs for create/join flows that must work under RLS

ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS invite_code text;

UPDATE public.teams
SET invite_code = 'INV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE invite_code IS NULL;

ALTER TABLE public.teams ALTER COLUMN invite_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS teams_invite_code_unique ON public.teams (invite_code);

CREATE OR REPLACE FUNCTION public.lookup_team_invite(p_invite text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id
  FROM public.teams
  WHERE upper(trim(invite_code)) = upper(trim(p_invite))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.create_team_with_owner(p_name text, p_invite_code text)
RETURNS public.teams
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_team public.teams;
BEGIN
  IF trim(p_name) = '' THEN
    RAISE EXCEPTION 'invalid_name' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.teams (name, invite_code)
  VALUES (trim(p_name), trim(p_invite_code))
  RETURNING * INTO new_team;

  INSERT INTO public.memberships (team_id, user_id, role)
  VALUES (new_team.id, auth.uid(), 'owner');

  RETURN new_team;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_team_by_invite(p_team_id uuid, p_invite text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.teams
    WHERE id = p_team_id AND upper(trim(invite_code)) = upper(trim(p_invite))
  ) THEN
    RAISE EXCEPTION 'invalid_invite' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.memberships
    WHERE team_id = p_team_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'already_member' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.memberships (team_id, user_id, role)
  VALUES (p_team_id, auth.uid(), 'member');
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_team_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_team_invite(text) TO authenticated;

REVOKE ALL ON FUNCTION public.create_team_with_owner(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_team_with_owner(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.join_team_by_invite(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_team_by_invite(uuid, text) TO authenticated;
