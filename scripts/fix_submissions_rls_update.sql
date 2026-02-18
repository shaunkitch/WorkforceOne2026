
-- Allow Admins/Owners/Editors to update submissions
CREATE POLICY "Admins/Owners/Editors can update submissions" ON submissions
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM forms f
        WHERE f.id = submissions.form_id
        AND get_org_role_for_user(f.organization_id) IN ('owner', 'admin', 'editor')
    )
);
