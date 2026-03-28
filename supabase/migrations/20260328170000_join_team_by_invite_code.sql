-- Single-step join by invite only (no separate team-id lookup oracle for clients).
-- Revokes EXECUTE on lookup_team_invite from authenticated — use server/RPC join only.

CREATE OR REPLACE FUNCTION public.join_team_by_invite_code(p_invite text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT t.id INTO v_team_id
  FROM public.teams t
  WHERE upper(trim(t.invite_code)) = upper(trim(p_invite))
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'invalid_invite' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.team_id = v_team_id AND m.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'already_member' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.memberships (team_id, user_id, role)
  VALUES (v_team_id, auth.uid(), 'member');

  RETURN v_team_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_team_by_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_team_by_invite_code(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.lookup_team_invite(text) FROM authenticated;
