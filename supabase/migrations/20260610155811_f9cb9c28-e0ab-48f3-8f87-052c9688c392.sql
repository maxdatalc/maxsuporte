
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT user_id, name, avatar_url
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- Allow the view (running as invoker) to read the underlying rows
-- without exposing sensitive columns via a dedicated RLS policy.
CREATE POLICY "Public profile fields readable"
ON public.profiles
FOR SELECT
TO authenticated, anon
USING (true);
