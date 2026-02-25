-- Migration: Add SOS Alerts feature
-- Creates the sos_alerts table and trigger_sos RPC function for the Security module SOS button.

-- 1. SOS Alerts table
CREATE TABLE IF NOT EXISTS sos_alerts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  location         jsonb,
  status           text        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'resolved')),
  resolved_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at      timestamptz,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;

-- Members of the same org can view alerts
DROP POLICY IF EXISTS "sos_alerts_select" ON sos_alerts;
CREATE POLICY "sos_alerts_select" ON sos_alerts
  FOR SELECT USING (
    get_org_role_for_user(organization_id) IS NOT NULL
  );

-- Any authenticated user can insert their own alert (the RPC validates ownership)
DROP POLICY IF EXISTS "sos_alerts_insert" ON sos_alerts;
CREATE POLICY "sos_alerts_insert" ON sos_alerts
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins/owners can resolve alerts
DROP POLICY IF EXISTS "sos_alerts_update" ON sos_alerts;
CREATE POLICY "sos_alerts_update" ON sos_alerts
  FOR UPDATE USING (
    get_org_role_for_user(organization_id) IN ('owner', 'admin')
  );

-- 2. Realtime: enable for live supervisor dashboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE sos_alerts;

-- 3. RPC: trigger_sos
-- Called from the mobile app. Uses SECURITY DEFINER so it can look up
-- organization_members regardless of the caller's RLS context.
CREATE OR REPLACE FUNCTION trigger_sos(p_user_id uuid, p_location jsonb DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id   uuid;
  v_alert_id uuid;
BEGIN
  -- Look up the user's organisation via organization_members
  SELECT organization_id
    INTO v_org_id
    FROM organization_members
   WHERE user_id = p_user_id
   LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User % is not a member of any organisation', p_user_id;
  END IF;

  -- Insert the SOS alert
  INSERT INTO sos_alerts (organization_id, user_id, location)
  VALUES (v_org_id, p_user_id, p_location)
  RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION trigger_sos(uuid, jsonb) TO authenticated;

-- 4. Helper: resolve an SOS alert (called by supervisors)
CREATE OR REPLACE FUNCTION resolve_sos(p_alert_id uuid, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sos_alerts
     SET status      = 'resolved',
         resolved_by = auth.uid(),
         resolved_at = now(),
         notes       = COALESCE(p_notes, notes)
   WHERE id = p_alert_id;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_sos(uuid, text) TO authenticated;
