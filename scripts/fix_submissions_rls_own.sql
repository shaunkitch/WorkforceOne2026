
-- Allow users to update their own submissions
DROP POLICY IF EXISTS "Users can update own submissions" ON submissions;
CREATE POLICY "Users can update own submissions" ON submissions 
FOR UPDATE
USING (user_id = auth.uid());
