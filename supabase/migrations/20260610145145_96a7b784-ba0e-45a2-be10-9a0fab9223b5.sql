
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
CREATE POLICY "Only admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile or admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view feedback" ON public.ia_feedback;
CREATE POLICY "Users view own feedback or admin" ON public.ia_feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view evidences" ON public.demand_step_evidences;
CREATE POLICY "Assigned users view evidences" ON public.demand_step_evidences
  FOR SELECT TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.demand_steps ds
      JOIN public.demand_analysts da ON da.demand_id = ds.demand_id
      WHERE ds.id = demand_step_evidences.demand_step_id
        AND da.analyst_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view evidences" ON storage.objects;
CREATE POLICY "Assigned users view demand evidence files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'demand-evidences'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR (auth.uid())::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.demand_step_evidences e
        JOIN public.demand_steps ds ON ds.id = e.demand_step_id
        JOIN public.demand_analysts da ON da.demand_id = ds.demand_id
        WHERE e.file_path = storage.objects.name
          AND da.analyst_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert webhook logs" ON public.webhook_logs;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_implementation_commission() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_default_checklist(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.validate_deal_stage() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.log_proposal() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.validate_implementation_status_update() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.log_deal_stage_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.log_signature_doc() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.log_form_response() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_scheduled_implementations() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.calculate_ai_quality_score() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_active_commission(implementation_type) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, authenticated, public;
