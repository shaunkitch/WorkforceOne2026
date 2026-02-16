-- Create Organization Table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE,
  license_key text UNIQUE,
  license_tier text DEFAULT 'free'::text,
  license_status text DEFAULT 'active'::text,
  limits_forms int DEFAULT 1,
  limits_submissions int DEFAULT 100,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  is_super_admin boolean DEFAULT false
);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$;

-- Trigger to call handle_new_user on signup
-- Note: You might need to drop it first if it conflicts, but usually 'create trigger if not exists' isn't standard in older postgres, 
-- so specific drop then create is safer, or just create.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create Organization Members Table
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Create Forms Table
CREATE TABLE IF NOT EXISTS forms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  content jsonb,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Create Submissions Table
CREATE TABLE IF NOT EXISTS submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id uuid REFERENCES forms(id) ON DELETE CASCADE,
  data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS on_organization_members_organization_id ON organization_members (organization_id);
CREATE INDEX IF NOT EXISTS on_organization_members_user_id ON organization_members (user_id);
CREATE INDEX IF NOT EXISTS on_forms_organization_id ON forms (organization_id);
CREATE INDEX IF NOT EXISTS on_submissions_form_id ON submissions (form_id);

-- CLEANUP: Drop ALL existing policies to ensure no stale recursion
DO $$ 
DECLARE 
  pol record; 
BEGIN 
  -- Drop policies on organization_members
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'organization_members' 
  LOOP 
    EXECUTE format('DROP POLICY "%s" ON organization_members', pol.policyname); 
  END LOOP;
  
  -- Drop policies on organizations
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'organizations' 
  LOOP 
    EXECUTE format('DROP POLICY "%s" ON organizations', pol.policyname); 
  END LOOP;
  
   -- Drop policies on forms
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'forms' 
  LOOP 
    EXECUTE format('DROP POLICY "%s" ON forms', pol.policyname); 
  END LOOP;
  
   -- Drop policies on submissions
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'submissions' 
  LOOP 
    EXECUTE format('DROP POLICY "%s" ON submissions', pol.policyname); 
  END LOOP;
END $$;

-- Drop old function if exists
DROP FUNCTION IF EXISTS get_user_role(uuid);

-- NEW Function to get user's role in an organization
-- Renamed to get_org_role_for_user to prevent any caching issues
CREATE OR REPLACE FUNCTION get_org_role_for_user(org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM organization_members
  WHERE organization_id = org_id AND user_id = auth.uid();
  RETURN user_role;
END;
$$;

-- RLS Policies for Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 1. INSERT: Allow any authenticated user to create an organization
-- Using (true) because we trust the server action to populate fields correctly,
-- and the table constraints (NOT NULL) handle validity. 
-- We restrict this policy to the 'authenticated' role to be safe.
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations" ON organizations FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. SELECT: Users can view organizations they created OR are members of
DROP POLICY IF EXISTS "Users can view their own organizations" ON organizations;
CREATE POLICY "Users can view their own organizations" ON organizations FOR SELECT
TO authenticated
USING (
  created_by_user_id = auth.uid() 
  OR 
  get_org_role_for_user(id) IS NOT NULL
);

-- 3. UPDATE: Owners can update
DROP POLICY IF EXISTS "Owners can update their organization" ON organizations;
CREATE POLICY "Owners/Admins can update their organization" ON organizations FOR UPDATE
TO authenticated
USING (get_org_role_for_user(id) IN ('owner', 'admin'));

-- 4. DELETE: Owners can delete
DROP POLICY IF EXISTS "Owners can delete their organization" ON organizations;
CREATE POLICY "Owners can delete their organization" ON organizations FOR DELETE
TO authenticated
USING (get_org_role_for_user(id) = 'owner');

-- RLS Policies for Organization Members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of organizations they belong to" ON organization_members FOR SELECT
  USING (
    -- Direct check for self
    user_id = auth.uid() 
    OR 
    -- Check permissions via function (which now safely bypasses RLS)
    get_org_role_for_user(organization_id) IS NOT NULL
  );

CREATE POLICY "Allow initial owner to self-assign" ON organization_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND NOT EXISTS (
      SELECT 1 FROM organization_members om_check
      WHERE om_check.organization_id = organization_id
    )
  );

CREATE POLICY "Owners/Admins can add other members" ON organization_members FOR INSERT
  WITH CHECK (
    get_org_role_for_user(organization_id) IN ('owner', 'admin')
  );

CREATE POLICY "Owners/Admins can update member roles" ON organization_members FOR UPDATE
  USING (get_org_role_for_user(organization_id) IN ('owner', 'admin'));

CREATE POLICY "Owners can remove members" ON organization_members FOR DELETE
  USING (get_org_role_for_user(organization_id) = 'owner');

-- RLS Policies for Forms
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view forms" ON forms FOR SELECT
  USING (get_org_role_for_user(organization_id) IS NOT NULL);
CREATE POLICY "Public can view published forms" ON forms FOR SELECT
  USING (is_published = true);
CREATE POLICY "Admins/Owners can create forms" ON forms FOR INSERT
  WITH CHECK (get_org_role_for_user(organization_id) IN ('owner', 'admin'));
CREATE POLICY "Admins/Owners/Editors can update forms" ON forms FOR UPDATE
  USING (get_org_role_for_user(organization_id) IN ('owner', 'admin', 'editor'));
CREATE POLICY "Admins/Owners can delete forms" ON forms FOR DELETE
  USING (get_org_role_for_user(organization_id) IN ('owner', 'admin'));

-- RLS Policies for Submissions
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view submissions of their organization's forms" ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM forms f
      WHERE f.id = submissions.form_id
        AND get_org_role_for_user(f.organization_id) IS NOT NULL
    )
  );
CREATE POLICY "Public can insert submissions" ON submissions FOR INSERT
  WITH CHECK (true);

-- UPDATES for Workforce Management (Profiles Expansion)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mobile text;

-- Create Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create Form Assignments Table
CREATE TABLE IF NOT EXISTS form_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id uuid REFERENCES forms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(form_id, user_id)
);

-- RLS Policies for Teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view teams" ON teams;
CREATE POLICY "Members can view teams" ON teams FOR SELECT
  USING (get_org_role_for_user(organization_id) IS NOT NULL);
DROP POLICY IF EXISTS "Admins/Owners can manage teams" ON teams;
CREATE POLICY "Admins/Owners can manage teams" ON teams FOR ALL
  USING (get_org_role_for_user(organization_id) IN ('owner', 'admin'));

-- RLS Policies for Team Members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view team members" ON team_members;
CREATE POLICY "Members can view team members" ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
        AND get_org_role_for_user(t.organization_id) IS NOT NULL
    )
  );
DROP POLICY IF EXISTS "Admins/Owners can manage team members" ON team_members;
CREATE POLICY "Admins/Owners can manage team members" ON team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
        AND get_org_role_for_user(t.organization_id) IN ('owner', 'admin')
    )
  );

-- RLS Policies for Form Assignments
ALTER TABLE form_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view assignments" ON form_assignments;
CREATE POLICY "Members can view assignments" ON form_assignments FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM forms f
        WHERE f.id = form_assignments.form_id
        AND get_org_role_for_user(f.organization_id) IN ('owner', 'admin', 'editor')
    )
  );
DROP POLICY IF EXISTS "Admins/Editors can manage assignments" ON form_assignments;
CREATE POLICY "Admins/Editors can manage assignments" ON form_assignments FOR ALL
  USING (
     EXISTS (
        SELECT 1 FROM forms f
        WHERE f.id = form_assignments.form_id
        AND get_org_role_for_user(f.organization_id) IN ('owner', 'admin', 'editor')
    )
  );

-- UPDATES for Organization Settings
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_color text DEFAULT '#292524';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS storage_used bigint DEFAULT 0;

-- UPDATES for Advanced Fields
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS signature_url text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS location jsonb;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES form_assignments(id) ON DELETE SET NULL;

-- Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_resource text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS for Audit Logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins/Owners can view audit logs" ON audit_logs;
CREATE POLICY "Admins/Owners can view audit logs" ON audit_logs FOR SELECT
  USING (get_org_role_for_user(organization_id) IN ('owner', 'admin'));
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT
  WITH CHECK (true); -- Ideally restricted to server-side only, but for this demo true allows the authorized user to log their action.

-- Automations Table
CREATE TABLE IF NOT EXISTS automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'submission_created',
  conditions JSONB DEFAULT '[]'::jsonb, -- Array of { field, operator, value }
  actions JSONB DEFAULT '[]'::jsonb, -- Array of { type, ...config }
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Automations
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organization members can view automations" ON automations;
CREATE POLICY "Organization members can view automations" ON automations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = automations.form_id
      AND get_org_role_for_user(forms.organization_id) IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Organization admins/editors can manage automations" ON automations;
CREATE POLICY "Organization admins/editors can manage automations" ON automations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = automations.form_id
      AND get_org_role_for_user(forms.organization_id) IN ('owner', 'admin', 'editor')
    )
  );

-- HR & Payroll Extensions

-- Update Profiles for Payroll
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hourly_rate numeric(10, 2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';

-- Time Entries Table
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  clock_in timestamptz NOT NULL,
  clock_out timestamptz,
  duration_minutes int, -- Calculated on clock_out
  notes text,
  location jsonb, -- { lat, lng } or similar
  created_at timestamptz DEFAULT now()
);

-- RLS for Time Entries
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Users can view/insert/update their own entries
DROP POLICY IF EXISTS "Users can manage own time entries" ON time_entries;
CREATE POLICY "Users can manage own time entries" ON time_entries
  FOR ALL
  USING (user_id = auth.uid());

-- Admins/Owners/Editors can view all entries in their org
DROP POLICY IF EXISTS "Admins/Owners/Editors can view org time entries" ON time_entries;
CREATE POLICY "Admins/Owners/Editors can view org time entries" ON time_entries
  FOR SELECT
  USING (get_org_role_for_user(organization_id) IN ('owner', 'admin', 'editor'));

-- Admins/Owners can manage all entries (corrections)
DROP POLICY IF EXISTS "Admins/Owners can manage org time entries" ON time_entries;
CREATE POLICY "Admins/Owners can manage org time entries" ON time_entries
  FOR UPDATE
  USING (get_org_role_for_user(organization_id) IN ('owner', 'admin'));

-- Payroll Runs Table
CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  title text, -- e.g. "January 2024 - 1st Half"
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  status text CHECK (status IN ('draft', 'finalized', 'paid')) DEFAULT 'draft',
  total_amount numeric(10, 2) DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- RLS for Payroll Runs
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins/Owners can manage payroll" ON payroll_runs;
CREATE POLICY "Admins/Owners can manage payroll" ON payroll_runs
  FOR ALL
  USING (get_org_role_for_user(organization_id) IN ('owner', 'admin'));

-- Payroll Items (Line items for each user)
CREATE TABLE IF NOT EXISTS payroll_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_run_id uuid REFERENCES payroll_runs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  total_hours numeric(10, 2) DEFAULT 0,
  hourly_rate numeric(10, 2) DEFAULT 0,
  gross_pay numeric(10, 2) DEFAULT 0,
  bonuses numeric(10, 2) DEFAULT 0,
  deductions numeric(10, 2) DEFAULT 0,
  net_pay numeric(10, 2) DEFAULT 0,
  calculated_at timestamptz DEFAULT now()
);

-- RLS for Payroll Items
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins/Owners can manage payroll items" ON payroll_items;
CREATE POLICY "Admins/Owners can manage payroll items" ON payroll_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM payroll_runs r 
      WHERE r.id = payroll_items.payroll_run_id 
      AND get_org_role_for_user(r.organization_id) IN ('owner', 'admin')
    )
  );

-- Users can view their own payroll items (Payslips)
DROP POLICY IF EXISTS "Users can view own payslips" ON payroll_items;
CREATE POLICY "Users can view own payslips" ON payroll_items
  FOR SELECT
  USING (user_id = auth.uid());

-- LEAVE MANAGEMENT
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  leave_type text NOT NULL, -- 'annual', 'sick', 'unpaid', 'other'
  reason text,
  status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  manager_note text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Leave Requests
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own leave requests" ON leave_requests;
CREATE POLICY "Users can view their own leave requests" ON leave_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own leave requests" ON leave_requests;
CREATE POLICY "Users can create their own leave requests" ON leave_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins/Owners can view all leave requests" ON leave_requests;
CREATE POLICY "Admins/Owners can view all leave requests" ON leave_requests
  FOR ALL USING (
    exists (
      select 1 from organization_members
      where organization_members.organization_id = leave_requests.organization_id
      and organization_members.user_id = auth.uid()
      and (organization_members.role = 'owner' or organization_members.role = 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins/Owners can update leave requests" ON leave_requests;
CREATE POLICY "Admins/Owners can update leave requests" ON leave_requests
  FOR UPDATE USING (
    exists (
      select 1 from organization_members
      where organization_members.organization_id = leave_requests.organization_id
      and organization_members.user_id = auth.uid()
      and (organization_members.role = 'owner' or organization_members.role = 'admin')
    )
  );

-- Add missing columns to organizations table (Settings)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_color text DEFAULT '#000000';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS favicon_url text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';

-- DISABLE RLS (TEMPORARY FOR DEBUGGING/DEVELOPMENT)
-- RLS enabled by default for all tables above.

-- PHASE 2: OPERATIONS & LOGISTICS

-- 1. Sites (Locations)
-- Used for Geofencing and organizing Checkpoints/Inventory
CREATE TABLE IF NOT EXISTS sites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  latitude double precision,
  longitude double precision,
  radius integer DEFAULT 100, -- Geofence radius in meters
  created_at timestamptz DEFAULT now()
);

-- 2. Checkpoints (Guard Tour Points)
-- Specific points within a site that must be scanned
CREATE TABLE IF NOT EXISTS checkpoints (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  qr_code text NOT NULL, -- The value encoded in the QR
  created_at timestamptz DEFAULT now()
);

-- 3. Inventory (Warehouse Items)
-- Basic product database for scanning
CREATE TABLE IF NOT EXISTS inventory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  quantity integer DEFAULT 0,
  barcode text, -- EAN/UPC or internal
  location text, -- Shelf/Bin location
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Explicitly ENABLE RLS for these new tables to be safe
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;