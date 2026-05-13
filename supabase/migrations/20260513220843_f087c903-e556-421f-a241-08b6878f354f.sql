
-- Enums
DO $$ BEGIN CREATE TYPE public.deal_status AS ENUM ('ativo','ganho','perdido'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.deal_stage AS ENUM ('lead','contato','diagnostico','proposta','negociacao','ganho','perdido'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.deal_suggested_type AS ENUM ('basic','manager','web'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.deal_complexity AS ENUM ('baixa','media','alta'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.signature_doc_type AS ENUM ('contrato_digitalizado','termo_assinatura','outro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.signature_doc_status AS ENUM ('pendente','anexado','enviado','assinado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text NOT NULL,
  email text,
  empresa text,
  origem text,
  observacoes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_created_by_phone ON public.leads(created_by, telefone);

CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  vendedor_id uuid NOT NULL,
  nome_negocio text NOT NULL,
  valor_estimado numeric(14,2) DEFAULT 0,
  status public.deal_status NOT NULL DEFAULT 'ativo',
  etapa public.deal_stage NOT NULL DEFAULT 'lead',
  probabilidade integer NOT NULL DEFAULT 0 CHECK (probabilidade BETWEEN 0 AND 100),
  formulario_preenchido boolean NOT NULL DEFAULT false,
  form_token uuid NOT NULL DEFAULT gen_random_uuid(),
  implementation_id uuid,
  suggested_type public.deal_suggested_type,
  complexidade public.deal_complexity,
  horas_estimadas integer,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deals_vendedor ON public.deals(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_deals_etapa ON public.deals(etapa);
CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_form_token ON public.deals(form_token);

CREATE TABLE IF NOT EXISTS public.form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL UNIQUE REFERENCES public.deals(id) ON DELETE CASCADE,
  razao_social text, nome_fantasia text, cnpj text, email_empresa text,
  telefone_fixo text, telefone_celular text, regime_tributario text, quantidade_computadores integer,
  responsavel_nome text, responsavel_cpf text, responsavel_rg text, responsavel_email text, responsavel_telefone_celular text,
  nome_vendedor text, valor_implantacao numeric(14,2), valor_mensalidade numeric(14,2),
  sistema_contratado text[], qtd_licencas_maquinas integer, licencas_automax_mobile integer,
  licencas_maxbip integer, modulos_adicionais text[],
  sistema_atual text,
  migrar_banco_dados text CHECK (migrar_banco_dados IN ('sim','nao','a_definir') OR migrar_banco_dados IS NULL),
  particularidades_identificadas text,
  submitted_by uuid,
  submission_origin text NOT NULL DEFAULT 'publico' CHECK (submission_origin IN ('publico','vendedor','admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deal_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  valor numeric(14,2),
  valor_implantacao numeric(14,2),
  valor_mensalidade numeric(14,2),
  sistema_contratado text[],
  qtd_licencas_maquinas integer,
  licencas_automax_mobile integer,
  licencas_maxbip integer,
  modulos_adicionais text[],
  escopo text,
  prazo_dias integer,
  condicoes_comerciais text,
  observacoes_comerciais text,
  validade_proposta_dias integer DEFAULT 15,
  pdf_path text,
  gerado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deal_proposals_deal ON public.deal_proposals(deal_id);

CREATE TABLE IF NOT EXISTS public.deal_signature_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  form_response_id uuid REFERENCES public.form_responses(id) ON DELETE SET NULL,
  document_type public.signature_doc_type NOT NULL DEFAULT 'contrato_digitalizado',
  title text NOT NULL,
  file_path text NOT NULL,
  uploaded_by uuid NOT NULL,
  status public.signature_doc_status NOT NULL DEFAULT 'anexado',
  sent_to_client boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  signed boolean NOT NULL DEFAULT false,
  signed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deal_signature_deal ON public.deal_signature_documents(deal_id);

CREATE TABLE IF NOT EXISTS public.deal_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descricao text NOT NULL,
  payload jsonb,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deal_logs_deal ON public.deal_activity_logs(deal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  header_html text,
  footer_html text,
  logo_url text,
  cor_primaria text DEFAULT '#C4161C',
  proposta_template_html text,
  contrato_instrucoes_padrao text,
  texto_validade_proposta text DEFAULT 'Esta proposta tem validade de 15 dias.',
  texto_condicoes_comerciais_padrao text,
  texto_observacoes_padrao text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.crm_settings (singleton) VALUES (true) ON CONFLICT DO NOTHING;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_signature_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_analyst_on_deal_impl(_deal_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deals d
    JOIN public.implementation_analysts ia ON ia.implementation_id = d.implementation_id
    WHERE d.id = _deal_id AND ia.analyst_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.deals d
    JOIN public.implementations i ON i.id = d.implementation_id
    WHERE d.id = _deal_id AND i.implementer_id = auth.uid()
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_analyst_on_deal_impl(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_analyst_on_deal_impl(uuid) TO authenticated;

CREATE POLICY "Admins manage leads" ON public.leads FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Vendedor select own leads" ON public.leads FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Vendedor insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND (has_role(auth.uid(),'vendedor') OR has_role(auth.uid(),'admin')));
CREATE POLICY "Vendedor update own leads" ON public.leads FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Vendedor delete own leads" ON public.leads FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Admins manage deals" ON public.deals FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Vendedor select own deals" ON public.deals FOR SELECT TO authenticated USING (vendedor_id = auth.uid());
CREATE POLICY "Vendedor insert own deals" ON public.deals FOR INSERT TO authenticated WITH CHECK (vendedor_id = auth.uid() AND has_role(auth.uid(),'vendedor'));
CREATE POLICY "Vendedor update own deals" ON public.deals FOR UPDATE TO authenticated USING (vendedor_id = auth.uid());
CREATE POLICY "Analyst sees deal of own impl" ON public.deals FOR SELECT TO authenticated USING (implementation_id IS NOT NULL AND is_analyst_on_deal_impl(id));

CREATE POLICY "Admins manage form_responses" ON public.form_responses FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Owner select form_responses" ON public.form_responses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.vendedor_id = auth.uid()));
CREATE POLICY "Owner upsert form_responses" ON public.form_responses FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.vendedor_id = auth.uid()));
CREATE POLICY "Owner update form_responses" ON public.form_responses FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.vendedor_id = auth.uid()));
CREATE POLICY "Analyst sees form of own impl" ON public.form_responses FOR SELECT TO authenticated USING (is_analyst_on_deal_impl(deal_id));

CREATE POLICY "Admins manage proposals" ON public.deal_proposals FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Owner select proposals" ON public.deal_proposals FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.vendedor_id = auth.uid()));
CREATE POLICY "Owner insert proposals" ON public.deal_proposals FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.vendedor_id = auth.uid()));
CREATE POLICY "Owner update proposals" ON public.deal_proposals FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.vendedor_id = auth.uid()));

CREATE POLICY "Admins manage signature docs" ON public.deal_signature_documents FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Owner select signature docs" ON public.deal_signature_documents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.vendedor_id = auth.uid()));
CREATE POLICY "Owner insert signature docs" ON public.deal_signature_documents FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.vendedor_id = auth.uid()));
CREATE POLICY "Owner update signature docs" ON public.deal_signature_documents FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.vendedor_id = auth.uid()));
CREATE POLICY "Analyst select signature docs" ON public.deal_signature_documents FOR SELECT TO authenticated USING (is_analyst_on_deal_impl(deal_id));

CREATE POLICY "Admins manage logs" ON public.deal_activity_logs FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Owner select logs" ON public.deal_activity_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.vendedor_id = auth.uid()));
CREATE POLICY "Authenticated insert logs" ON public.deal_activity_logs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.vendedor_id = auth.uid() OR has_role(auth.uid(),'admin'))));

CREATE POLICY "All read crm_settings" ON public.crm_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update crm_settings" ON public.crm_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert crm_settings" ON public.crm_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_deals_updated BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_form_responses_updated BEFORE UPDATE ON public.form_responses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_signature_updated BEFORE UPDATE ON public.deal_signature_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_deal_stage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.etapa = 'ganho' AND (OLD.etapa IS DISTINCT FROM 'ganho') THEN
    IF NOT EXISTS (SELECT 1 FROM public.deal_proposals WHERE deal_id = NEW.id) THEN
      RAISE EXCEPTION 'Não é possível mover para Fechado Ganho sem ao menos uma proposta gerada.';
    END IF;
    NEW.status := 'ganho'; NEW.closed_at := now();
  ELSIF NEW.etapa = 'perdido' AND (OLD.etapa IS DISTINCT FROM 'perdido') THEN
    NEW.status := 'perdido'; NEW.closed_at := now();
  ELSIF NEW.etapa NOT IN ('ganho','perdido') THEN
    NEW.status := 'ativo';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.validate_deal_stage() FROM anon, public;
CREATE TRIGGER trg_deals_validate_stage BEFORE UPDATE ON public.deals FOR EACH ROW WHEN (OLD.etapa IS DISTINCT FROM NEW.etapa) EXECUTE FUNCTION public.validate_deal_stage();

CREATE OR REPLACE FUNCTION public.log_deal_stage_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.deal_activity_logs(deal_id, tipo, descricao, payload, user_id)
  VALUES (NEW.id, 'stage_change', 'Etapa alterada de ' || OLD.etapa::text || ' para ' || NEW.etapa::text, jsonb_build_object('from', OLD.etapa, 'to', NEW.etapa), auth.uid());
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_deal_stage_change() FROM anon, public;
CREATE TRIGGER trg_deals_log_stage AFTER UPDATE ON public.deals FOR EACH ROW WHEN (OLD.etapa IS DISTINCT FROM NEW.etapa) EXECUTE FUNCTION public.log_deal_stage_change();

CREATE OR REPLACE FUNCTION public.log_form_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.deal_activity_logs(deal_id, tipo, descricao, user_id)
  VALUES (NEW.deal_id, CASE WHEN TG_OP='INSERT' THEN 'form_submitted' ELSE 'form_updated' END,
    CASE WHEN TG_OP='INSERT' THEN 'Formulário preenchido pelo cliente' ELSE 'Formulário atualizado' END, NEW.submitted_by);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_form_response() FROM anon, public;
CREATE TRIGGER trg_form_response_log AFTER INSERT OR UPDATE ON public.form_responses FOR EACH ROW EXECUTE FUNCTION public.log_form_response();

CREATE OR REPLACE FUNCTION public.log_proposal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.deal_activity_logs(deal_id, tipo, descricao, payload, user_id)
  VALUES (NEW.deal_id, 'proposta_gerada', 'Proposta versão ' || NEW.version || ' gerada', jsonb_build_object('version', NEW.version, 'valor', NEW.valor), NEW.gerado_por);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_proposal() FROM anon, public;
CREATE TRIGGER trg_proposal_log AFTER INSERT ON public.deal_proposals FOR EACH ROW EXECUTE FUNCTION public.log_proposal();

CREATE OR REPLACE FUNCTION public.log_signature_doc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO public.deal_activity_logs(deal_id, tipo, descricao, user_id) VALUES (NEW.deal_id, 'contrato_anexado', 'Documento "' || NEW.title || '" anexado', NEW.uploaded_by);
  ELSIF TG_OP='UPDATE' THEN
    IF NEW.sent_to_client AND NOT OLD.sent_to_client THEN
      INSERT INTO public.deal_activity_logs(deal_id, tipo, descricao, user_id) VALUES (NEW.deal_id, 'contrato_enviado', 'Documento marcado como enviado ao cliente', auth.uid());
    END IF;
    IF NEW.signed AND NOT OLD.signed THEN
      INSERT INTO public.deal_activity_logs(deal_id, tipo, descricao, user_id) VALUES (NEW.deal_id, 'contrato_assinado', 'Documento marcado como assinado', auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_signature_doc() FROM anon, public;
CREATE TRIGGER trg_signature_doc_log AFTER INSERT OR UPDATE ON public.deal_signature_documents FOR EACH ROW EXECUTE FUNCTION public.log_signature_doc();

INSERT INTO storage.buckets (id, name, public) VALUES ('crm-proposals','crm-proposals',false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('crm-contracts','crm-contracts',false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('crm-assets','crm-assets',true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "crm-proposals admin all" ON storage.objects FOR ALL TO authenticated USING (bucket_id='crm-proposals' AND has_role(auth.uid(),'admin')) WITH CHECK (bucket_id='crm-proposals' AND has_role(auth.uid(),'admin'));
CREATE POLICY "crm-proposals vendedor own" ON storage.objects FOR ALL TO authenticated USING (bucket_id='crm-proposals' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.deals WHERE vendedor_id=auth.uid())) WITH CHECK (bucket_id='crm-proposals' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.deals WHERE vendedor_id=auth.uid()));
CREATE POLICY "crm-contracts admin all" ON storage.objects FOR ALL TO authenticated USING (bucket_id='crm-contracts' AND has_role(auth.uid(),'admin')) WITH CHECK (bucket_id='crm-contracts' AND has_role(auth.uid(),'admin'));
CREATE POLICY "crm-contracts vendedor own" ON storage.objects FOR ALL TO authenticated USING (bucket_id='crm-contracts' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.deals WHERE vendedor_id=auth.uid())) WITH CHECK (bucket_id='crm-contracts' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.deals WHERE vendedor_id=auth.uid()));
CREATE POLICY "crm-assets admin write" ON storage.objects FOR ALL TO authenticated USING (bucket_id='crm-assets' AND has_role(auth.uid(),'admin')) WITH CHECK (bucket_id='crm-assets' AND has_role(auth.uid(),'admin'));
