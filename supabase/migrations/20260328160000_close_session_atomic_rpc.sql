-- Atomic session close: decision + session update in one transaction (FOR UPDATE prevents double-close).

CREATE OR REPLACE FUNCTION public.close_session_pick_winner(p_team_id uuid, p_session_id uuid)
RETURNS TABLE (candidate_id uuid, decided_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_status text;
  v_picked uuid;
  v_decided timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ERR_CLOSE_NOT_AUTHENTICATED' USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.is_team_member(p_team_id) THEN
    RAISE EXCEPTION 'ERR_CLOSE_NOT_MEMBER' USING ERRCODE = 'P0001';
  END IF;

  SELECT s.team_id, s.status
  INTO v_team_id, v_status
  FROM public.sessions s
  WHERE s.id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_CLOSE_SESSION_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF v_team_id IS DISTINCT FROM p_team_id THEN
    RAISE EXCEPTION 'ERR_CLOSE_WRONG_TEAM' USING ERRCODE = 'P0001';
  END IF;

  IF v_status = 'closed' THEN
    RAISE EXCEPTION 'ERR_CLOSE_ALREADY_CLOSED' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.candidates c WHERE c.session_id = p_session_id
  ) THEN
    RAISE EXCEPTION 'ERR_CLOSE_NO_CANDIDATES' USING ERRCODE = 'P0001';
  END IF;

  WITH tallies AS (
    SELECT v.candidate_id, COUNT(*)::bigint AS cnt
    FROM public.votes v
    INNER JOIN public.candidates c ON c.id = v.candidate_id AND c.session_id = p_session_id
    WHERE v.session_id = p_session_id
    GROUP BY v.candidate_id
  ),
  all_cands AS (
    SELECT c.id, COALESCE(t.cnt, 0)::bigint AS cnt
    FROM public.candidates c
    LEFT JOIN tallies t ON t.candidate_id = c.id
    WHERE c.session_id = p_session_id
  ),
  mx AS (
    SELECT MAX(ac.cnt) AS m FROM all_cands ac
  )
  SELECT ac.id INTO v_picked
  FROM all_cands ac, mx
  WHERE ac.cnt = mx.m
  ORDER BY random()
  LIMIT 1;

  v_decided := clock_timestamp();

  INSERT INTO public.decisions (session_id, candidate_id, decided_at)
  VALUES (p_session_id, v_picked, v_decided);

  UPDATE public.sessions
  SET status = 'closed', closed_at = v_decided
  WHERE id = p_session_id AND team_id = p_team_id;

  RETURN QUERY SELECT v_picked, v_decided;
END;
$$;

REVOKE ALL ON FUNCTION public.close_session_pick_winner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_session_pick_winner(uuid, uuid) TO authenticated;
