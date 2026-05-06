
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  total_points INTEGER NOT NULL DEFAULT 0,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- update_updated_at_column helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Friendships
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own friendships" ON public.friendships FOR SELECT TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Create friendship requests" ON public.friendships FOR INSERT TO authenticated
WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Update own friendships" ON public.friendships FOR UPDATE TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Delete own friendships" ON public.friendships FOR DELETE TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Leagues
CREATE TABLE public.leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT upper(substring(replace(gen_random_uuid()::text,'-',''),1,8)),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id)
);
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

-- Helper to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.is_league_member(_league_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.league_members WHERE league_id = _league_id AND user_id = _user_id);
$$;

CREATE POLICY "Members view leagues" ON public.leagues FOR SELECT TO authenticated
USING (public.is_league_member(id, auth.uid()) OR created_by = auth.uid());
CREATE POLICY "Anyone create league" ON public.leagues FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creator updates league" ON public.leagues FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Creator deletes league" ON public.leagues FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Members view league members" ON public.league_members FOR SELECT TO authenticated
USING (public.is_league_member(league_id, auth.uid()));
CREATE POLICY "Join league" ON public.league_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Leave league" ON public.league_members FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Bets (score predictions)
CREATE TABLE public.bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL,
  match_utc TIMESTAMPTZ NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  predicted_home INTEGER NOT NULL CHECK (predicted_home >= 0 AND predicted_home <= 30),
  predicted_away INTEGER NOT NULL CHECK (predicted_away >= 0 AND predicted_away <= 30),
  actual_home INTEGER,
  actual_away INTEGER,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id, league_id)
);
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View bets in shared league or own" ON public.bets FOR SELECT TO authenticated
USING (user_id = auth.uid() OR (league_id IS NOT NULL AND public.is_league_member(league_id, auth.uid())));
CREATE POLICY "Insert own bet before kickoff" ON public.bets FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND match_utc > now());
CREATE POLICY "Update own bet before kickoff" ON public.bets FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND match_utc > now());
CREATE POLICY "Delete own bet" ON public.bets FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_bets_updated_at BEFORE UPDATE ON public.bets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- H2H Challenges
CREATE TABLE public.h2h_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL,
  match_utc TIMESTAMPTZ NOT NULL,
  challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenger_pick TEXT NOT NULL CHECK (challenger_pick IN ('home','draw','away')),
  opponent_pick TEXT CHECK (opponent_pick IN ('home','draw','away')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','settled')),
  winner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.h2h_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own h2h" ON public.h2h_challenges FOR SELECT TO authenticated
USING (auth.uid() IN (challenger_id, opponent_id));
CREATE POLICY "Create h2h" ON public.h2h_challenges FOR INSERT TO authenticated
WITH CHECK (auth.uid() = challenger_id AND match_utc > now());
CREATE POLICY "Respond h2h" ON public.h2h_challenges FOR UPDATE TO authenticated
USING (auth.uid() IN (challenger_id, opponent_id));

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own notifications" ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "Update own notifications" ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE INDEX idx_bets_user ON public.bets(user_id);
CREATE INDEX idx_bets_match ON public.bets(match_id);
CREATE INDEX idx_notif_user ON public.notifications(user_id, read);
