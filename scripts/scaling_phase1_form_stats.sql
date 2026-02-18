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
