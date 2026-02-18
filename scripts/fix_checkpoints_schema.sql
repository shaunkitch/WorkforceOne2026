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
