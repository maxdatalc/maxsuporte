
-- =========================================================
-- FASE A1: Fundação Multiloja (não-destrutiva)
-- =========================================================

-- 1) Tabela filiais
CREATE TABLE public.filiais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.filiais TO authenticated;
GRANT ALL ON public.filiais TO service_role;
ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view filiais"
  ON public.filiais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert filiais"
  ON public.filiais FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update filiais"
  ON public.filiais FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete filiais"
  ON public.filiais FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_filiais_updated_at
  BEFORE UPDATE ON public.filiais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed "Matriz" com ID fixo conhecido
INSERT INTO public.filiais (id, nome, cnpj)
VALUES ('00000000-0000-0000-0000-000000000001', 'Matriz', NULL);

-- 2) Tabela user_filiais (multi-filial por usuário)
CREATE TABLE public.user_filiais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, filial_id)
);

CREATE INDEX idx_user_filiais_user ON public.user_filiais(user_id);
CREATE INDEX idx_user_filiais_filial ON public.user_filiais(filial_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_filiais TO authenticated;
GRANT ALL ON public.user_filiais TO service_role;
ALTER TABLE public.user_filiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User views own filiais or admin sees all"
  ON public.user_filiais FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage user_filiais insert"
  ON public.user_filiais FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage user_filiais update"
  ON public.user_filiais FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage user_filiais delete"
  ON public.user_filiais FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3) Funções auxiliares (preparação; ainda não usadas em RLS)
CREATE OR REPLACE FUNCTION public.current_filial()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT filial_id FROM public.user_filiais
  WHERE user_id = auth.uid()
  ORDER BY is_default DESC, created_at ASC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_filial() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_filial() TO authenticated;

CREATE OR REPLACE FUNCTION public.user_has_filial(_user_id UUID, _filial_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_filiais
    WHERE user_id = _user_id AND filial_id = _filial_id
  )
$$;

REVOKE ALL ON FUNCTION public.user_has_filial(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_filial(UUID, UUID) TO authenticated;

-- 4) Adicionar filial_id NULLABLE nas tabelas-raiz
ALTER TABLE public.profiles               ADD COLUMN filial_id UUID REFERENCES public.filiais(id);
ALTER TABLE public.implementations        ADD COLUMN filial_id UUID REFERENCES public.filiais(id);
ALTER TABLE public.deals                  ADD COLUMN filial_id UUID REFERENCES public.filiais(id);
ALTER TABLE public.leads                  ADD COLUMN filial_id UUID REFERENCES public.filiais(id);
ALTER TABLE public.demands                ADD COLUMN filial_id UUID REFERENCES public.filiais(id);
ALTER TABLE public.visitas                ADD COLUMN filial_id UUID REFERENCES public.filiais(id);
ALTER TABLE public.clients                ADD COLUMN filial_id UUID REFERENCES public.filiais(id);
ALTER TABLE public.commission_rules       ADD COLUMN filial_id UUID REFERENCES public.filiais(id);
ALTER TABLE public.commission_types       ADD COLUMN filial_id UUID REFERENCES public.filiais(id);
ALTER TABLE public.base_conhecimento_ia   ADD COLUMN filial_id UUID REFERENCES public.filiais(id);
ALTER TABLE public.crm_settings           ADD COLUMN filial_id UUID REFERENCES public.filiais(id);
ALTER TABLE public.conclusion_requests    ADD COLUMN filial_id UUID REFERENCES public.filiais(id);
ALTER TABLE public.demand_templates       ADD COLUMN filial_id UUID REFERENCES public.filiais(id);

-- Índices para futuras buscas por filial
CREATE INDEX IF NOT EXISTS idx_profiles_filial             ON public.profiles(filial_id);
CREATE INDEX IF NOT EXISTS idx_implementations_filial      ON public.implementations(filial_id);
CREATE INDEX IF NOT EXISTS idx_deals_filial                ON public.deals(filial_id);
CREATE INDEX IF NOT EXISTS idx_leads_filial                ON public.leads(filial_id);
CREATE INDEX IF NOT EXISTS idx_demands_filial              ON public.demands(filial_id);
CREATE INDEX IF NOT EXISTS idx_visitas_filial              ON public.visitas(filial_id);
CREATE INDEX IF NOT EXISTS idx_clients_filial              ON public.clients(filial_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_filial     ON public.commission_rules(filial_id);
CREATE INDEX IF NOT EXISTS idx_commission_types_filial     ON public.commission_types(filial_id);
CREATE INDEX IF NOT EXISTS idx_base_conhecimento_filial    ON public.base_conhecimento_ia(filial_id);
CREATE INDEX IF NOT EXISTS idx_crm_settings_filial         ON public.crm_settings(filial_id);
CREATE INDEX IF NOT EXISTS idx_conclusion_requests_filial  ON public.conclusion_requests(filial_id);
CREATE INDEX IF NOT EXISTS idx_demand_templates_filial     ON public.demand_templates(filial_id);

-- 5) Backfill: tudo vai para a Matriz
UPDATE public.profiles              SET filial_id = '00000000-0000-0000-0000-000000000001' WHERE filial_id IS NULL;
UPDATE public.implementations       SET filial_id = '00000000-0000-0000-0000-000000000001' WHERE filial_id IS NULL;
UPDATE public.deals                 SET filial_id = '00000000-0000-0000-0000-000000000001' WHERE filial_id IS NULL;
UPDATE public.leads                 SET filial_id = '00000000-0000-0000-0000-000000000001' WHERE filial_id IS NULL;
UPDATE public.demands               SET filial_id = '00000000-0000-0000-0000-000000000001' WHERE filial_id IS NULL;
UPDATE public.visitas               SET filial_id = '00000000-0000-0000-0000-000000000001' WHERE filial_id IS NULL;
UPDATE public.clients               SET filial_id = '00000000-0000-0000-0000-000000000001' WHERE filial_id IS NULL;
UPDATE public.commission_rules      SET filial_id = '00000000-0000-0000-0000-000000000001' WHERE filial_id IS NULL;
UPDATE public.commission_types      SET filial_id = '00000000-0000-0000-0000-000000000001' WHERE filial_id IS NULL;
UPDATE public.base_conhecimento_ia  SET filial_id = '00000000-0000-0000-0000-000000000001' WHERE filial_id IS NULL;
UPDATE public.crm_settings          SET filial_id = '00000000-0000-0000-0000-000000000001' WHERE filial_id IS NULL;
UPDATE public.conclusion_requests   SET filial_id = '00000000-0000-0000-0000-000000000001' WHERE filial_id IS NULL;
UPDATE public.demand_templates      SET filial_id = '00000000-0000-0000-0000-000000000001' WHERE filial_id IS NULL;

-- 6) Vincular todos os usuários atuais à Matriz com a role que já têm
INSERT INTO public.user_filiais (user_id, filial_id, role, is_default)
SELECT ur.user_id, '00000000-0000-0000-0000-000000000001', ur.role, true
FROM public.user_roles ur
ON CONFLICT (user_id, filial_id) DO NOTHING;

-- 7) Atualizar handle_new_user: novo usuário entra na Matriz por padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_role public.app_role;
BEGIN
  INSERT INTO public.profiles (user_id, name, email, filial_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    '00000000-0000-0000-0000-000000000001'
  );

  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'implantador');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role);

  INSERT INTO public.user_filiais (user_id, filial_id, role, is_default)
  VALUES (NEW.id, '00000000-0000-0000-0000-000000000001', v_role, true)
  ON CONFLICT (user_id, filial_id) DO NOTHING;

  RETURN NEW;
END;
$function$;
