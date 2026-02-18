-- Allow users (admins/system) to insert notifications for others
CREATE POLICY "Users can insert notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT user_id FROM public.organization_members WHERE organization_id = notifications.organization_id
    ));
