-- Indexes for Submissions
CREATE INDEX IF NOT EXISTS idx_submissions_form_created ON submissions(form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_user_created ON submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_client_visit ON submissions(client_id, visit_id);

-- Indexes for Assignments
CREATE INDEX IF NOT EXISTS idx_assignments_user_status ON form_assignments(user_id, status);

-- Indexes for Visits
CREATE INDEX IF NOT EXISTS idx_visits_user_scheduled ON visits(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_visits_client ON visits(client_id);
