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
