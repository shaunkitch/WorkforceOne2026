-- Create Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    amount numeric(10, 2) NOT NULL,
    currency text DEFAULT 'USD',
    merchant text,
    date date NOT NULL,
    category text,
    confidence_score numeric(3, 2), -- 0.00 to 1.00 AI confidence
    receipt_url text,
    description text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS Policies for Expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own expenses" ON expenses
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND get_org_role_for_user(organization_id) IS NOT NULL);

CREATE POLICY "Users can view their own expenses" ON expenses
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all org expenses" ON expenses
    FOR SELECT TO authenticated
    USING (get_org_role_for_user(organization_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can update org expenses" ON expenses
    FOR UPDATE TO authenticated
    USING (get_org_role_for_user(organization_id) IN ('owner', 'admin'));
