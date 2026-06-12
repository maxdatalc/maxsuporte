
-- Fase A3: Camada RESTRICTIVE de isolamento por filial
-- Não toca nas policies existentes; apenas adiciona um AND obrigatório.

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'profiles','implementations','deals','leads','demands','visitas','clients',
    'commission_rules','commission_types','base_conhecimento_ia','crm_settings',
    'conclusion_requests','demand_templates'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Drop if exists (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS "filial_isolation_select" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "filial_isolation_modify" ON public.%I', t);

    -- SELECT: admin OR user belongs to row's filial
    EXECUTE format($f$
      CREATE POLICY "filial_isolation_select" ON public.%I
      AS RESTRICTIVE FOR SELECT TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.user_has_filial(auth.uid(), filial_id)
      )
    $f$, t);

    -- INSERT/UPDATE/DELETE: same rule, applied to new row (WITH CHECK) and existing row (USING)
    EXECUTE format($f$
      CREATE POLICY "filial_isolation_modify" ON public.%I
      AS RESTRICTIVE FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.user_has_filial(auth.uid(), filial_id)
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.user_has_filial(auth.uid(), filial_id)
      )
    $f$, t);
  END LOOP;
END $$;
