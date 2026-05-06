
-- Bonus bets (one row per user)
CREATE TABLE public.bonus_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  winner_country text,
  top_player text,
  final_home_country text,
  final_away_country text,
  final_home_score integer,
  final_away_score integer,
  points_awarded integer NOT NULL DEFAULT 0,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bonus_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own bonus bet"
  ON public.bonus_bets FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Insert own bonus bet"
  ON public.bonus_bets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (locked_at IS NULL OR locked_at > now()));

CREATE POLICY "Update own bonus bet before lock"
  ON public.bonus_bets FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND (locked_at IS NULL OR locked_at > now()));

CREATE TRIGGER update_bonus_bets_updated_at
  BEFORE UPDATE ON public.bonus_bets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- League invites
CREATE TABLE public.league_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL,
  inviter_id uuid NOT NULL,
  invitee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (league_id, invitee_id)
);

ALTER TABLE public.league_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View invites I sent or received"
  ON public.league_invites FOR SELECT TO authenticated
  USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

CREATE POLICY "Send invite if league member"
  ON public.league_invites FOR INSERT TO authenticated
  WITH CHECK (inviter_id = auth.uid() AND public.is_league_member(league_id, auth.uid()));

CREATE POLICY "Respond to my invite"
  ON public.league_invites FOR UPDATE TO authenticated
  USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

CREATE POLICY "Delete my invite"
  ON public.league_invites FOR DELETE TO authenticated
  USING (invitee_id = auth.uid() OR inviter_id = auth.uid());
