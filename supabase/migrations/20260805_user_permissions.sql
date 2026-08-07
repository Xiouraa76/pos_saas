-- Migration: user_permissions table

CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    can_access_dashboard BOOLEAN NOT NULL DEFAULT false,
    can_access_pos BOOLEAN NOT NULL DEFAULT false,
    can_access_settings BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookup by user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own permissions
CREATE POLICY "Users can view their own permissions"
    ON public.user_permissions
    FOR SELECT
    USING (auth.uid() = user_id);

-- (Insert/Update/Delete will be handled by API route using Service Role key which bypasses RLS)
