/** Domain types for teams, sessions, voting, and users. */

export type Team = {
  id: string;
  name: string;
  created_at: string;
};

export type Membership = {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
};

export type SessionStatus = "open" | "closed";

export type Session = {
  id: string;
  team_id: string;
  status: SessionStatus;
  created_at: string;
  closed_at: string | null;
};

export type Candidate = {
  id: string;
  session_id: string;
  user_id: string;
  menu_name: string;
  created_at: string;
};

export type Vote = {
  id: string;
  session_id: string;
  user_id: string;
  candidate_id: string;
  voted_at: string;
};

export type Decision = {
  id: string;
  session_id: string;
  candidate_id: string;
  decided_at: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
};
