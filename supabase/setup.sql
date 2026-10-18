-- =====================================================================
-- SUPABASE DATABASE SETUP SCRIPT (supabase/setup.sql)
-- =====================================================================
-- This script creates 4 tables, enables Row Level Security (RLS),
-- sets up access rules based on user roles, auto-creates profiles for new users,
-- and enables real-time live updates for stock and alerts.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ---------------------------------------------------------------------
-- Stores extra details for users, connected to Supabase auth.users.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('commander', 'logistics_officer', 'post_commander', 'viewer')),
  post_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 2. STOCK TABLE
-- ---------------------------------------------------------------------
-- Stores inventory items and quantities per post.
CREATE TABLE IF NOT EXISTS public.stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  item TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 3. ALERTS TABLE
-- ---------------------------------------------------------------------
-- Stores tactical and operational warnings.
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  item TEXT,
  severity TEXT NOT NULL DEFAULT 'INFO',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 4. AUDIT_LOG TABLE
-- ---------------------------------------------------------------------
-- Tracks important actions taken by users in the system.
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 5. TRIGGER: AUTO-CREATE PROFILE ON NEW USER SIGNUP
-- ---------------------------------------------------------------------
-- When a new user signs up in auth.users, this automatically gives them
-- a matching row in the profiles table with the default role of 'viewer'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, post_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'viewer',
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- 6. HELPER FUNCTIONS FOR SECURITY RULES (RLS)
-- ---------------------------------------------------------------------
-- These simple helper functions look up the role and post_id of the
-- person currently logged in without triggering endless RLS loops.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_post_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT post_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- 7. TURN ON ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------
-- Row Level Security ensures users can only see or edit rows
-- they are explicitly allowed to by the rules below.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 8. SECURITY RULES: PROFILES TABLE
-- ---------------------------------------------------------------------
-- Any logged-in user can view profiles.
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can edit their own basic info (like full_name), BUT CANNOT change their role.
-- If someone tries to change their role, it is rejected unless they are a commander.
CREATE POLICY "profiles_update_self_without_role_change"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      public.current_user_role() = 'commander'
      OR (role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) AND post_id IS NOT DISTINCT FROM (SELECT p.post_id FROM public.profiles p WHERE p.id = auth.uid()))
    )
  );

-- Only a commander can update other people's roles or profiles.
CREATE POLICY "profiles_commander_update_any"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'commander')
  WITH CHECK (public.current_user_role() = 'commander');

-- Extra Defense-in-Depth Trigger: Blocks ANY attempt by a non-commander to modify the role column
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF public.current_user_role() IS DISTINCT FROM 'commander' THEN
      RAISE EXCEPTION 'Access Denied: Only a Commander can alter user roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- ---------------------------------------------------------------------
-- 9. SECURITY RULES: STOCK TABLE
-- ---------------------------------------------------------------------
-- Read Rule:
-- - commander, logistics_officer, and viewer can read all stock.
-- - post_commander can only read stock for their assigned post_id.
CREATE POLICY "stock_select_policy"
  ON public.stock
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('commander', 'logistics_officer', 'viewer')
    OR (
      public.current_user_role() = 'post_commander'
      AND post_id = public.current_user_post_id()
    )
  );

-- Update Rule:
-- - Only commander and logistics_officer can update stock.
CREATE POLICY "stock_update_policy"
  ON public.stock
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() IN ('commander', 'logistics_officer')
  )
  WITH CHECK (
    public.current_user_role() IN ('commander', 'logistics_officer')
  );

-- Insert Rule:
-- - Only commander and logistics_officer can insert stock.
CREATE POLICY "stock_insert_policy"
  ON public.stock
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('commander', 'logistics_officer')
  );

-- ---------------------------------------------------------------------
-- 10. SECURITY RULES: ALERTS TABLE
-- ---------------------------------------------------------------------
-- Read Rule:
-- - commander, logistics_officer, and viewer can read all alerts.
-- - post_commander can only read alerts for their assigned post_id.
CREATE POLICY "alerts_select_policy"
  ON public.alerts
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('commander', 'logistics_officer', 'viewer')
    OR (
      public.current_user_role() = 'post_commander'
      AND post_id = public.current_user_post_id()
    )
  );

-- Insert Rule:
-- - Only commander and logistics_officer can create alerts.
CREATE POLICY "alerts_insert_policy"
  ON public.alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('commander', 'logistics_officer')
  );

-- ---------------------------------------------------------------------
-- 11. SECURITY RULES: AUDIT_LOG TABLE
-- ---------------------------------------------------------------------
-- Insert Rule: Any logged-in user can record an audit entry.
CREATE POLICY "audit_log_insert_authenticated"
  ON public.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = actor OR actor IS NULL
  );

-- Read Rule: Only a commander can read audit logs.
CREATE POLICY "audit_log_select_commander"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'commander'
  );

-- (Nobody can update or delete: no UPDATE or DELETE policies are created,
-- which means Supabase will block all update/delete requests by default).

-- ---------------------------------------------------------------------
-- 12. REALTIME (LIVE UPDATES)
-- ---------------------------------------------------------------------
-- Publish real-time events for the stock and alerts tables so clients
-- can listen to live database changes instantly.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'stock'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stock;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
  END IF;
END $$;
