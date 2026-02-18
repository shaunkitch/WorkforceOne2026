-- SECURITY OPERATIONS MODULE MIGRATION
-- Checkpoints, Patrols, Incidents

-- 1. Checkpoints
-- Specific points within a site that must be scanned.
-- Note: 'checkpoints' table was mentioned in previous schema dump as "Guard Tour Points", let's ensure it exists and has correct fields.
CREATE TABLE IF NOT EXISTS checkpoints (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE, -- Explicit org_id for easier RLS
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  qr_code text NOT NULL, -- Text content of the QR
  "order" integer DEFAULT 0, -- Suggested patrol order
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure organization_id exists (in case table existed without it)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checkpoints' AND column_name='organization_id') THEN
        ALTER TABLE checkpoints ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- RLS for Checkpoints
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view checkpoints" ON checkpoints;
CREATE POLICY "Members can view checkpoints" ON checkpoints FOR SELECT
USING (get_org_role_for_user(organization_id) IS NOT NULL);

DROP POLICY IF EXISTS "Admins/Owners can manage checkpoints" ON checkpoints;
CREATE POLICY "Admins/Owners can manage checkpoints" ON checkpoints FOR ALL
USING (get_org_role_for_user(organization_id) IN ('owner', 'admin'));

-- 2. Patrols
-- Represents a single patrol session by a guard.
CREATE TABLE IF NOT EXISTS patrols (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text CHECK (status IN ('started', 'completed', 'incomplete')) DEFAULT 'started',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS for Patrols
ALTER TABLE patrols ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view patrols" ON patrols;
CREATE POLICY "Members can view patrols" ON patrols FOR SELECT
USING (get_org_role_for_user(organization_id) IS NOT NULL);

DROP POLICY IF EXISTS "Guards can create patrols" ON patrols;
CREATE POLICY "Guards can create patrols" ON patrols FOR INSERT
WITH CHECK (get_org_role_for_user(organization_id) IS NOT NULL); 

DROP POLICY IF EXISTS "Guards can update own patrols" ON patrols;
CREATE POLICY "Guards can update own patrols" ON patrols FOR UPDATE
USING (user_id = auth.uid());

-- 3. Patrol Logs (Scans)
-- Individual scan events during a patrol.
CREATE TABLE IF NOT EXISTS patrol_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patrol_id uuid REFERENCES patrols(id) ON DELETE CASCADE,
  checkpoint_id uuid REFERENCES checkpoints(id) ON DELETE SET NULL,
  scanned_at timestamptz DEFAULT now(),
  location jsonb, -- { lat, lng }
  status text DEFAULT 'checked', -- 'checked', 'issue_reported'
  created_at timestamptz DEFAULT now()
);

-- RLS for Patrol Logs
ALTER TABLE patrol_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view patrol logs" ON patrol_logs;
CREATE POLICY "Members can view patrol logs" ON patrol_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM patrols p
    WHERE p.id = patrol_logs.patrol_id
    AND get_org_role_for_user(p.organization_id) IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Guards can create patrol logs" ON patrol_logs;
CREATE POLICY "Guards can create patrol logs" ON patrol_logs FOR INSERT
WITH CHECK (
   EXISTS (
    SELECT 1 FROM patrols p
    WHERE p.id = patrol_logs.patrol_id
    AND p.user_id = auth.uid()
  )
);

-- 4. Incidents
-- Reports of issues, linked to a patrol or standalone.
CREATE TABLE IF NOT EXISTS incidents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  patrol_id uuid REFERENCES patrols(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
  status text CHECK (status IN ('open', 'investigating', 'resolved', 'closed')) DEFAULT 'open',
  photos text[], -- Array of image URLs
  location jsonb, -- { lat, lng }
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for Incidents
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view incidents" ON incidents;
CREATE POLICY "Members can view incidents" ON incidents FOR SELECT
USING (get_org_role_for_user(organization_id) IS NOT NULL);

DROP POLICY IF EXISTS "Members can create incidents" ON incidents;
CREATE POLICY "Members can create incidents" ON incidents FOR INSERT
WITH CHECK (get_org_role_for_user(organization_id) IS NOT NULL);

DROP POLICY IF EXISTS "Creators can update incidents" ON incidents;
CREATE POLICY "Creators can update incidents" ON incidents FOR UPDATE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins/Owners can update incidents" ON incidents;
CREATE POLICY "Admins/Owners can update incidents" ON incidents FOR UPDATE
USING (get_org_role_for_user(organization_id) IN ('owner', 'admin'));

-- 5. Organization Role Extensions (Metadata)
-- We will use a JSONB column 'metadata' on organization_members if it exists, or create it.
-- Let's check organization_members.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization_members' AND column_name='metadata') THEN
        ALTER TABLE organization_members ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkpoints_site ON checkpoints(site_id);
CREATE INDEX IF NOT EXISTS idx_patrols_user ON patrols(user_id);
CREATE INDEX IF NOT EXISTS idx_patrols_org ON patrols(organization_id);
CREATE INDEX IF NOT EXISTS idx_incidents_org ON incidents(organization_id);
