-- Create notification settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Email notifications
    email_notifications_enabled BOOLEAN DEFAULT true,
    email_fishing_logs BOOLEAN DEFAULT true,
    email_vessel_updates BOOLEAN DEFAULT true,
    email_system_alerts BOOLEAN DEFAULT true,
    email_market_updates BOOLEAN DEFAULT true,
    email_security_alerts BOOLEAN DEFAULT true,
    email_approval_requests BOOLEAN DEFAULT true,
    email_daily_reports BOOLEAN DEFAULT true,
    email_weekly_reports BOOLEAN DEFAULT true,
    
    -- SMS notifications
    sms_notifications_enabled BOOLEAN DEFAULT false,
    sms_fishing_logs BOOLEAN DEFAULT false,
    sms_vessel_updates BOOLEAN DEFAULT false,
    sms_system_alerts BOOLEAN DEFAULT true,
    sms_security_alerts BOOLEAN DEFAULT true,
    
    -- Push notifications (for future use)
    push_notifications_enabled BOOLEAN DEFAULT false,
    push_fishing_logs BOOLEAN DEFAULT false,
    push_vessel_updates BOOLEAN DEFAULT false,
    push_system_alerts BOOLEAN DEFAULT true,
    push_security_alerts BOOLEAN DEFAULT true,
    
    -- Role-based notification permissions
    can_receive_admin_notifications BOOLEAN DEFAULT false,
    can_receive_captain_notifications BOOLEAN DEFAULT false,
    can_receive_owner_notifications BOOLEAN DEFAULT false,
    can_receive_fleet_notifications BOOLEAN DEFAULT false,
    can_receive_processing_notifications BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for notification_settings table
CREATE POLICY "Users can view their own notification settings" ON notification_settings
    FOR SELECT
    USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own notification settings" ON notification_settings
    FOR UPDATE
    USING (auth.uid() = auth_id);

CREATE POLICY "Users can insert their own notification settings" ON notification_settings
    FOR INSERT
    WITH CHECK (auth.uid() = auth_id);

-- Also add a policy for admins to manage all notification settings
CREATE POLICY "Admins can manage all notification settings" ON notification_settings
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid()
        AND role IN ('super_admin', 'admin')
    ));

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to get role-based notification settings
CREATE OR REPLACE FUNCTION get_role_based_notification_settings(user_role TEXT)
RETURNS TABLE (
    can_receive_admin_notifications BOOLEAN,
    can_receive_captain_notifications BOOLEAN,
    can_receive_owner_notifications BOOLEAN,
    can_receive_fleet_notifications BOOLEAN,
    can_receive_processing_notifications BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN user_role IN ('super_admin', 'admin') THEN true
            ELSE false
        END as can_receive_admin_notifications,
        
        CASE 
            WHEN user_role IN ('super_admin', 'admin', 'Captain', 'crew_manager') THEN true
            ELSE false
        END as can_receive_captain_notifications,
        
        CASE 
            WHEN user_role IN ('super_admin', 'admin', 'Owner', 'ship_owner') THEN true
            ELSE false
        END as can_receive_owner_notifications,
        
        CASE 
            WHEN user_role IN ('super_admin', 'admin', 'fleet_management', 'manager') THEN true
            ELSE false
        END as can_receive_fleet_notifications,
        
        CASE 
            WHEN user_role IN ('super_admin', 'admin', 'nm_processing', 'processing') THEN true
            ELSE false
        END as can_receive_processing_notifications;
END;
$$ LANGUAGE plpgsql;

-- Create function to initialize notification settings for a user
CREATE OR REPLACE FUNCTION initialize_user_notification_settings(user_auth_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    role_settings RECORD;
BEGIN
    -- Get user role
    SELECT role INTO user_role FROM users WHERE auth_id = user_auth_id;
    
    -- Get role-based settings
    SELECT * INTO role_settings FROM get_role_based_notification_settings(user_role);
    
    -- Insert or update notification settings
    INSERT INTO notification_settings (
        auth_id,
        can_receive_admin_notifications,
        can_receive_captain_notifications,
        can_receive_owner_notifications,
        can_receive_fleet_notifications,
        can_receive_processing_notifications
    ) VALUES (
        user_auth_id,
        role_settings.can_receive_admin_notifications,
        role_settings.can_receive_captain_notifications,
        role_settings.can_receive_owner_notifications,
        role_settings.can_receive_fleet_notifications,
        role_settings.can_receive_processing_notifications
    )
    ON CONFLICT (auth_id) DO UPDATE SET
        can_receive_admin_notifications = EXCLUDED.can_receive_admin_notifications,
        can_receive_captain_notifications = EXCLUDED.can_receive_captain_notifications,
        can_receive_owner_notifications = EXCLUDED.can_receive_owner_notifications,
        can_receive_fleet_notifications = EXCLUDED.can_receive_fleet_notifications,
        can_receive_processing_notifications = EXCLUDED.can_receive_processing_notifications,
        updated_at = NOW();
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;
