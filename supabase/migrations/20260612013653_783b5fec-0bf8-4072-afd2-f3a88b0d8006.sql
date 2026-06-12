
-- Fase A2: filial_id NOT NULL + DEFAULT Matriz
-- Backfill já foi feito na Fase A1; garantimos novamente por segurança.

DO $$
DECLARE
  matriz_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  t TEXT;
  tables TEXT[] := ARRAY[
    'profiles','implementations','deals','leads','demands','visitas','clients',
    'commission_rules','commission_types','base_conhecimento_ia','crm_settings',
    'conclusion_requests','demand_templates'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('UPDATE public.%I SET filial_id = %L WHERE filial_id IS NULL', t, matriz_id);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN filial_id SET DEFAULT %L', t, matriz_id);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN filial_id SET NOT NULL', t);
  END LOOP;
END $$;
