
DROP POLICY IF EXISTS "Public profile fields readable" ON public.profiles;

-- Recreate view without security_invoker so it runs as owner and
-- bypasses RLS on profiles, but only exposes the three safe columns.
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
SELECT user_id, name, avatar_url
FROM public.profiles;

ALTER VIEW public.public_profiles OWNER TO postgres;
GRANT SELECT ON public.public_profiles TO authenticated, anon;
