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

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
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
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  employee_number text, -- Auto-generated unique number within org
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id),
  UNIQUE(organization_id, employee_number) -- Ensure uniqueness within org
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
DROP POLICY IF EXISTS "Members can view forms" ON forms;
CREATE POLICY "Members can view forms" ON forms FOR SELECT
  USING (get_org_role_for_user(organization_id) IS NOT NULL);
DROP POLICY IF EXISTS "Public can view published forms" ON forms;
CREATE POLICY "Public can view published forms" ON forms FOR SELECT
  USING (is_published = true);
DROP POLICY IF EXISTS "Admins/Owners can create forms" ON forms;
CREATE POLICY "Admins/Owners can create forms" ON forms FOR INSERT
  WITH CHECK (get_org_role_for_user(organization_id) IN ('owner', 'admin'));
DROP POLICY IF EXISTS "Admins/Owners/Editors can update forms" ON forms;
CREATE POLICY "Admins/Owners/Editors can update forms" ON forms FOR UPDATE
  USING (get_org_role_for_user(organization_id) IN ('owner', 'admin', 'editor'));
DROP POLICY IF EXISTS "Admins/Owners can delete forms" ON forms;
CREATE POLICY "Admins/Owners can delete forms" ON forms FOR DELETE
  USING (get_org_role_for_user(organization_id) IN ('owner', 'admin'));

-- RLS Policies for Submissions
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view submissions of their organization's forms" ON submissions;
CREATE POLICY "Members can view submissions of their organization's forms" ON submissions FOR SELECT
  USING (
    EXISTS (
        SELECT 1 FROM forms f
        WHERE f.id = submissions.form_id
        AND get_org_role_for_user(f.organization_id) IS NOT NULL
    )
  );
DROP POLICY IF EXISTS "Public can insert submissions" ON submissions;
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

-- RLS Policies for Form Assignments
ALTER TABLE form_assignments ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Users can see their own assignments. Admins/Owners/Editors can see all.
DROP POLICY IF EXISTS "Users view own assignments" ON form_assignments;
CREATE POLICY "Users view own assignments" ON form_assignments FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM forms f
      WHERE f.id = form_assignments.form_id
      AND get_org_role_for_user(f.organization_id) IN ('owner', 'admin', 'editor')
    )
  );

-- 2. INSERT: Admins/Owners/Editors can assign.
DROP POLICY IF EXISTS "Admins assign forms" ON form_assignments;
CREATE POLICY "Admins assign forms" ON form_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms f
      WHERE f.id = form_assignments.form_id
      AND get_org_role_for_user(f.organization_id) IN ('owner', 'admin', 'editor')
    )
  );

-- 3. UPDATE: Users can update status of their OWN assignments (e.g. to completed).
--    Admins can also update.
DROP POLICY IF EXISTS "Users update own assignments" ON form_assignments;
CREATE POLICY "Users update own assignments" ON form_assignments FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM forms f
      WHERE f.id = form_assignments.form_id
      AND get_org_role_for_user(f.organization_id) IN ('owner', 'admin', 'editor')
    )
  );

-- 4. DELETE: Admins/Owners can remove assignments.
DROP POLICY IF EXISTS "Admins remove assignments" ON form_assignments;
CREATE POLICY "Admins remove assignments" ON form_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM forms f
      WHERE f.id = form_assignments.form_id
      AND get_org_role_for_user(f.organization_id) IN ('owner', 'admin')
    )
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

-- Advanced Fields moved to after table creations

-- Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL, -- INSERT, UPDATE, DELETE, ACTION
  target_resource text NOT NULL, -- Human readable: "Updated User John Doe"
  table_name text, -- machine readable: "profiles"
  record_id uuid, -- target record id
  previous_data jsonb, -- Snapshot before change
  new_data jsonb, -- Snapshot after change
  details jsonb, -- Metadata
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


-- TRIGGER: Link Submission to Assignment & Complete Assignment
CREATE OR REPLACE FUNCTION public.link_submission_to_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  matching_assignment_id uuid;
BEGIN
  -- 1. Try to find a PENDING assignment for this user and form
  --    (Matches based on the user who submitted and the form_id)
  SELECT id INTO matching_assignment_id
  FROM public.form_assignments
  WHERE form_id = new.form_id
    AND user_id = auth.uid()
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  -- 2. If found, update the submission with the assignment_id
  --    AND update the assignment status to 'completed'
  IF matching_assignment_id IS NOT NULL THEN
    -- Update submission (NEW row)
    -- Since this is BEFORE INSERT, we can just assign to NEW.
    NEW.assignment_id := matching_assignment_id;

    -- Update Assignment
    UPDATE public.form_assignments
    SET status = 'completed'
    WHERE id = matching_assignment_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_submission_on_insert ON public.submissions;
CREATE TRIGGER link_submission_on_insert
  BEFORE INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE PROCEDURE public.link_submission_to_assignment();
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
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS app_logo_url text;
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

-- RLS Policies for Sites
DROP POLICY IF EXISTS "Members can view sites" ON sites;
CREATE POLICY "Members can view sites" ON sites FOR SELECT
USING (get_org_role_for_user(organization_id) IS NOT NULL);

DROP POLICY IF EXISTS "Admins/Owners can manage sites" ON sites;
CREATE POLICY "Admins/Owners can manage sites" ON sites FOR ALL
USING (get_org_role_for_user(organization_id) IN ('owner', 'admin'));

-- PHASE 3: SALES & CRM
-- 1. Clients
CREATE TABLE IF NOT EXISTS clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  client_number SERIAL,
  latitude double precision,
  longitude double precision,
  status text DEFAULT 'active', -- 'active', 'lead', 'archived'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Visits / Appointments
CREATE TABLE IF NOT EXISTS visits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL, -- Assigned Rep
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL,
  completed_at timestamptz,
  status text CHECK (status IN ('scheduled', 'completed', 'cancelled', 'missed')) DEFAULT 'scheduled',
  location jsonb, -- Check-in location
  created_at timestamptz DEFAULT now()
);

-- RLS for Clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view clients" ON clients;
CREATE POLICY "Members can view clients" ON clients FOR SELECT
  USING (get_org_role_for_user(organization_id) IS NOT NULL);
DROP POLICY IF EXISTS "Admins/Owners/Editors can manage clients" ON clients;
CREATE POLICY "Admins/Owners/Editors can manage clients" ON clients FOR ALL
  USING (get_org_role_for_user(organization_id) IN ('owner', 'admin', 'editor'));

-- RLS for Visits
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view visits" ON visits;
CREATE POLICY "Members can view visits" ON visits FOR SELECT
  USING (get_org_role_for_user(organization_id) IS NOT NULL);
DROP POLICY IF EXISTS "Admins/Owners/Editors can manage visits" ON visits;
CREATE POLICY "Admins/Owners/Editors can manage visits" ON visits FOR ALL
  USING (get_org_role_for_user(organization_id) IN ('owner', 'admin', 'editor'));
DROP POLICY IF EXISTS "Users can manage their own visits" ON visits;
CREATE POLICY "Users can manage their own visits" ON visits FOR UPDATE
  USING (user_id = auth.uid()); -- Allow rep to complete visit

-- UPDATES for Advanced Fields (Moved here because clients and visits tables must exist first)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS signature_url text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS location jsonb;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES form_assignments(id) ON DELETE SET NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS visit_id uuid REFERENCES visits(id) ON DELETE SET NULL;

-- 3. Quotes / Estimates
CREATE TABLE IF NOT EXISTS quotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  number serial, -- Auto-incrementing quote number
  title text NOT NULL,
  status text CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'invoiced')) DEFAULT 'draft',
  total_amount numeric(10, 2) DEFAULT 0,
  valid_until date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10, 2) DEFAULT 1,
  unit_price numeric(10, 2) DEFAULT 0,
  total_price numeric(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamptz DEFAULT now()
);

-- RLS for Quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view quotes" ON quotes;
CREATE POLICY "Members can view quotes" ON quotes FOR SELECT
  USING (get_org_role_for_user(organization_id) IS NOT NULL);
DROP POLICY IF EXISTS "Admins/Owners/Editors can manage quotes" ON quotes;
CREATE POLICY "Admins/Owners/Editors can manage quotes" ON quotes FOR ALL
  USING (get_org_role_for_user(organization_id) IN ('owner', 'admin', 'editor'));

-- RLS for Quote Items
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view quote items" ON quote_items;
CREATE POLICY "Members can view quote items" ON quote_items FOR SELECT
  USING (
    EXISTS (
        SELECT 1 FROM quotes q
        WHERE q.id = quote_items.quote_id
        AND get_org_role_for_user(q.organization_id) IS NOT NULL
    )
  );
DROP POLICY IF EXISTS "Admins/Owners/Editors can manage quote items" ON quote_items;
CREATE POLICY "Admins/Owners/Editors can manage quote items" ON quote_items FOR ALL
  USING (
     EXISTS (
        SELECT 1 FROM quotes q
        WHERE q.id = quote_items.quote_id
        AND get_org_role_for_user(q.organization_id) IN ('owner', 'admin', 'editor')
    )
  );


  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '{}'::jsonb;

 SELECT column_name FROM information_schema.columns WHERE table_name = 'organizations';

-- --- APPENDED FROM create_notifications_table.sql ---
-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    resource_type TEXT,
    resource_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications (mark as read)" ON public.notifications;
CREATE POLICY "Users can update their own notifications (mark as read)"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);


-- --- APPENDED FROM migration_security_module.sql ---
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


-- --- APPENDED FROM migration_submissions_visit_fields.sql ---
-- Add client_id and visit_id to submissions table
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS visit_id uuid REFERENCES visits(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_submissions_client_id ON submissions(client_id);
CREATE INDEX IF NOT EXISTS idx_submissions_visit_id ON submissions(visit_id);


-- --- APPENDED FROM fix_submissions_schema.sql ---
-- 1. Ensure submissions table has user_id and assignment_id
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES form_assignments(id) ON DELETE SET NULL;

-- 2. Drop existing policies on submissions to start fresh
DROP POLICY IF EXISTS "Public can insert submissions" ON submissions;
DROP POLICY IF EXISTS "Members can view submissions of their organization's forms" ON submissions;

-- 3. Enable RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- 4. INSERT: Allow anyone to insert (public forms) OR authenticated users (app forms)
CREATE POLICY "Anyone can insert submissions" ON submissions FOR INSERT
WITH CHECK (true);

-- 5. SELECT: 
--    a) Users can see their OWN submissions
--    b) Org Members (Admins/Editors) can see submissions for their org's forms
CREATE POLICY "Users can view own submissions" ON submissions FOR SELECT
USING (
  user_id = auth.uid()
);

CREATE POLICY "Org members can view form submissions" ON submissions FOR SELECT
USING (
  EXISTS (
      SELECT 1 FROM forms f
      WHERE f.id = submissions.form_id
      AND get_org_role_for_user(f.organization_id) IN ('owner', 'admin', 'editor', 'viewer')
  )
);


-- --- APPENDED FROM fix_checkpoints_schema.sql ---
-- Add missing columns to checkpoints table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checkpoints' AND column_name='is_active') THEN
        ALTER TABLE checkpoints ADD COLUMN is_active boolean DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checkpoints' AND column_name='order') THEN
        ALTER TABLE checkpoints ADD COLUMN "order" integer DEFAULT 0;
    END IF;
    
    -- Also check for updated_at which seemed missing in the log but might be there
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checkpoints' AND column_name='updated_at') THEN
        ALTER TABLE checkpoints ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;


-- --- APPENDED FROM fix_assignments_schema.sql ---

-- Add completed_at column to form_assignments if it doesn't exist
ALTER TABLE form_assignments 
ADD COLUMN IF NOT EXISTS completed_at timestamptz;


-- --- APPENDED FROM fix_submissions_profiles_fk.sql ---
-- Add explicit FK to profiles for easy joining (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_submissions_profiles'
      AND table_name = 'submissions'
  ) THEN
    ALTER TABLE submissions
    ADD CONSTRAINT fk_submissions_profiles
    FOREIGN KEY (user_id)
    REFERENCES profiles(id)
    ON DELETE SET NULL;
  END IF;
END $$;


-- --- APPENDED FROM fix_notifications_rls.sql ---
-- Allow users (admins/system) to insert notifications for others
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT user_id FROM public.organization_members WHERE organization_id = notifications.organization_id
    ));


-- --- APPENDED FROM migration_assignment_trigger.sql ---
-- Trigger to automatically complete assignments when a submission is received

CREATE OR REPLACE FUNCTION public.link_submission_to_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  matching_assignment_id uuid;
BEGIN
  -- 1. Try to find a PENDING assignment for this user and form
  SELECT id INTO matching_assignment_id
  FROM public.form_assignments
  WHERE form_id = new.form_id
    AND user_id = auth.uid()
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  -- 2. If found, update the submission with the assignment_id
  --    AND update the assignment status to 'completed'
  IF matching_assignment_id IS NOT NULL THEN
    NEW.assignment_id := matching_assignment_id;

    UPDATE public.form_assignments
    SET status = 'completed'
    WHERE id = matching_assignment_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_submission_on_insert ON public.submissions;
CREATE TRIGGER link_submission_on_insert
  BEFORE INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE PROCEDURE public.link_submission_to_assignment();


-- --- APPENDED FROM migration_assignments_rls.sql ---
-- RLS Policies for Form Assignments
ALTER TABLE form_assignments ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Users can see their own assignments. Admins/Owners/Editors can see all.
DROP POLICY IF EXISTS "Users view own assignments" ON form_assignments;
CREATE POLICY "Users view own assignments" ON form_assignments FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM forms f
      WHERE f.id = form_assignments.form_id
      AND get_org_role_for_user(f.organization_id) IN ('owner', 'admin', 'editor')
    )
  );

-- 2. INSERT: Admins/Owners/Editors can assign.
DROP POLICY IF EXISTS "Admins assign forms" ON form_assignments;
CREATE POLICY "Admins assign forms" ON form_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms f
      WHERE f.id = form_assignments.form_id
      AND get_org_role_for_user(f.organization_id) IN ('owner', 'admin', 'editor')
    )
  );

-- 3. UPDATE: Users can update status of their OWN assignments (e.g. to completed).
--    Admins can also update.
DROP POLICY IF EXISTS "Users update own assignments" ON form_assignments;
CREATE POLICY "Users update own assignments" ON form_assignments FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM forms f
      WHERE f.id = form_assignments.form_id
      AND get_org_role_for_user(f.organization_id) IN ('owner', 'admin', 'editor')
    )
  );

-- 4. DELETE: Admins/Owners can remove assignments.
DROP POLICY IF EXISTS "Admins remove assignments" ON form_assignments;
CREATE POLICY "Admins remove assignments" ON form_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM forms f
      WHERE f.id = form_assignments.form_id
      AND get_org_role_for_user(f.organization_id) IN ('owner', 'admin')
    )
  );


-- --- APPENDED FROM migration_submissions_rls.sql ---
-- Allow users to view their own submissions
DROP POLICY IF EXISTS "Users can view own submissions" ON submissions;
CREATE POLICY "Users can view own submissions" ON submissions FOR SELECT
  USING (user_id = auth.uid());


-- --- APPENDED FROM migration_add_app_logo.sql ---
-- Add the missing column for App Logo
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS app_logo_url text;

-- Reload Supabase Schema Cache
NOTIFY pgrst, 'reload';


-- --- APPENDED FROM scaling_phase1_indexes.sql ---
-- Indexes for Submissions
CREATE INDEX IF NOT EXISTS idx_submissions_form_created ON submissions(form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_user_created ON submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_client_visit ON submissions(client_id, visit_id);

-- Indexes for Assignments
CREATE INDEX IF NOT EXISTS idx_assignments_user_status ON form_assignments(user_id, status);

-- Indexes for Visits
CREATE INDEX IF NOT EXISTS idx_visits_user_scheduled ON visits(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_visits_client ON visits(client_id);


-- --- APPENDED FROM scaling_phase1_form_stats.sql ---
-- Create a table to store aggregated form statistics
CREATE TABLE IF NOT EXISTS form_statistics (
    form_id uuid PRIMARY KEY REFERENCES forms(id) ON DELETE CASCADE,
    submission_count integer DEFAULT 0,
    last_submission_at timestamptz
);

-- Function to update statistics on insert/delete
CREATE OR REPLACE FUNCTION update_form_statistics()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO form_statistics (form_id, submission_count, last_submission_at)
        VALUES (NEW.form_id, 1, NEW.created_at)
        ON CONFLICT (form_id) DO UPDATE SET
            submission_count = form_statistics.submission_count + 1,
            last_submission_at = GREATEST(form_statistics.last_submission_at, NEW.created_at);
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE form_statistics
        SET submission_count = GREATEST(0, submission_count - 1)
        WHERE form_id = OLD.form_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for submissions table
DROP TRIGGER IF EXISTS tr_update_form_stats ON submissions;
CREATE TRIGGER tr_update_form_stats
AFTER INSERT OR DELETE ON submissions
FOR EACH ROW EXECUTE FUNCTION update_form_statistics();

-- Backfill existing data
INSERT INTO form_statistics (form_id, submission_count, last_submission_at)
SELECT 
    form_id, 
    COUNT(*) as submission_count, 
    MAX(created_at) as last_submission_at
FROM submissions
GROUP BY form_id
ON CONFLICT (form_id) DO UPDATE SET
    submission_count = EXCLUDED.submission_count,
    last_submission_at = EXCLUDED.last_submission_at;


-- --- APPENDED FROM scaling_phase2_batch_sync.sql ---
DROP FUNCTION IF EXISTS submit_batch(jsonb[]);
CREATE OR REPLACE FUNCTION submit_batch(submissions jsonb)
RETURNS jsonb AS $$
DECLARE
    submission_record jsonb;
    new_id uuid;
    result_ids uuid[] := ARRAY[]::uuid[];
BEGIN
    FOR submission_record IN SELECT * FROM jsonb_array_elements(submissions)
    LOOP
        INSERT INTO submissions (
            id,
            form_id,
            user_id,
            assignment_id,
            visit_id,
            client_id,
            data,
            location,
            status,
            submitted_at
        )
        VALUES (
            COALESCE((submission_record->>'id')::uuid, gen_random_uuid()),
            (submission_record->>'form_id')::uuid,
            (submission_record->>'user_id')::uuid,
            (submission_record->>'assignment_id')::uuid,
            (submission_record->>'visit_id')::uuid,
            (submission_record->>'client_id')::uuid,
            (submission_record->>'data')::jsonb,
            (submission_record->>'location')::jsonb,
            COALESCE(submission_record->>'status', 'submitted'),
            COALESCE((submission_record->>'submitted_at')::timestamptz, now())
        )
        RETURNING id INTO new_id;
        
        -- Update assignment if needed
        IF (submission_record->>'assignment_id') IS NOT NULL THEN
            UPDATE form_assignments 
            SET status = 'completed', completed_at = now()
            WHERE id = (submission_record->>'assignment_id')::uuid;
        END IF;

        -- Update visit if needed
        IF (submission_record->>'visit_id') IS NOT NULL THEN
            UPDATE visits
            SET status = 'completed'
            WHERE id = (submission_record->>'visit_id')::uuid;
        END IF;

        result_ids := array_append(result_ids, new_id);
    END LOOP;

    RETURN jsonb_build_object('success_ids', result_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
