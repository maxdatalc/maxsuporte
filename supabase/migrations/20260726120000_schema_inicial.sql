-- =============================================================
-- MAX SUPORTE — schema inicial (versão enxuta)
-- Consolida em uma única migração o estado final de:
--   auth/roles, multi-filial, implantações, comissões, backup/e-mail.
-- Módulos removidos (CRM/Vendas, Visitas, Demandas/POP, avatar de
-- perfil) não fazem parte deste schema.
-- =============================================================

-- -------------------------------------------------------------
-- Extensões (fila de e-mail transacional)
-- -------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
  END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pgmq;

-- -------------------------------------------------------------
-- Enums
-- -------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('admin', 'implantador');
CREATE TYPE public.implementation_status AS ENUM ('em_andamento', 'pausada', 'concluida', 'cancelada', 'agendada');
CREATE TYPE public.implementation_type AS ENUM ('web', 'manager', 'basic');
CREATE TYPE public.episode_type AS ENUM ('treinamento', 'parametrizacao', 'ajuste_fiscal', 'migracao', 'instalacao');
CREATE TYPE public.module_type AS ENUM ('vendas', 'financeiro', 'cadastros', 'relatorios', 'caixa', 'fiscal', 'geral');
CREATE TYPE public.conclusion_request_status AS ENUM ('pending', 'approved', 'rejected');

-- -------------------------------------------------------------
-- Tabelas
-- -------------------------------------------------------------

-- Filiais (multi-tenant)
CREATE TABLE public.filiais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perfis
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  filial_id UUID NOT NULL REFERENCES public.filiais(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Papéis (separado de profiles por segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'implantador',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Vínculo usuário <-> filial
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

-- Permissões de módulo por usuário
CREATE TABLE public.user_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module TEXT NOT NULL,
  has_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, module)
);

-- Clientes
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT,
  observations TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  filial_id UUID NOT NULL REFERENCES public.filiais(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tipos de comissão (customizáveis)
CREATE TABLE public.commission_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  value NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  filial_id UUID NOT NULL REFERENCES public.filiais(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT commission_types_name_unique UNIQUE (name)
);

-- Regras de comissão por tipo de implantação
CREATE TABLE public.commission_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  implementation_type public.implementation_type NOT NULL,
  commission_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  filial_id UUID NOT NULL REFERENCES public.filiais(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_active_rule_per_type UNIQUE (implementation_type, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Implantações
CREATE TABLE public.implementations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  implementer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status implementation_status DEFAULT 'em_andamento' NOT NULL,
  observations TEXT,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  actual_start_date TIMESTAMP WITH TIME ZONE,
  total_time_minutes INTEGER DEFAULT 0,
  negotiated_time_minutes INTEGER,
  has_data_migration BOOLEAN NOT NULL DEFAULT false,
  implementation_type implementation_type,
  commission_type_id UUID REFERENCES public.commission_types(id),
  commission_value DECIMAL(10, 2) DEFAULT NULL,
  commission_paid BOOLEAN NOT NULL DEFAULT false,
  commission_paid_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  filial_id UUID NOT NULL REFERENCES public.filiais(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON COLUMN public.implementations.negotiated_time_minutes IS 'Tempo total negociado com o cliente em minutos. Exclui migração de dados do cálculo.';

CREATE INDEX idx_implementations_commission_type_id ON public.implementations(commission_type_id);
CREATE INDEX idx_implementations_filial ON public.implementations(filial_id);

-- Analistas atribuídos à implantação (N:N)
CREATE TABLE public.implementation_analysts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  implementation_id uuid NOT NULL REFERENCES public.implementations(id) ON DELETE CASCADE,
  analyst_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(implementation_id, analyst_id)
);

-- Múltiplas comissões por implantação
CREATE TABLE public.implementation_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  implementation_id UUID NOT NULL REFERENCES public.implementations(id) ON DELETE CASCADE,
  commission_type_id UUID REFERENCES public.commission_types(id) ON DELETE SET NULL,
  commission_name TEXT NOT NULL,
  commission_value NUMERIC NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_implementation_commissions_implementation_id ON public.implementation_commissions(implementation_id);

-- Itens do checklist
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  implementation_id UUID REFERENCES public.implementations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT false NOT NULL,
  time_spent_minutes INTEGER DEFAULT 0,
  observations TEXT,
  order_index INTEGER NOT NULL,
  parent_id UUID REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Episódios (treinamentos, parametrizações etc.)
CREATE TABLE public.episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  implementation_id UUID REFERENCES public.implementations(id) ON DELETE CASCADE NOT NULL,
  episode_type episode_type NOT NULL,
  module module_type NOT NULL,
  trained_clients TEXT,
  episode_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  time_spent_minutes INTEGER NOT NULL,
  observations TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Auditoria de edição de episódios
CREATE TABLE public.episode_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  edited_by uuid NOT NULL,
  field_changed text NOT NULL,
  old_value text,
  new_value text,
  edited_at timestamptz NOT NULL DEFAULT now()
);

-- Solicitações de conclusão de implantação
CREATE TABLE public.conclusion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  implementation_id UUID NOT NULL REFERENCES public.implementations(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  status conclusion_request_status NOT NULL DEFAULT 'pending',
  requester_observation TEXT,
  admin_observation TEXT,
  approved_by UUID,
  filial_id UUID NOT NULL REFERENCES public.filiais(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_one_pending_per_implementation
  ON public.conclusion_requests (implementation_id)
  WHERE status = 'pending';

-- Logs de webhook (make.com)
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fila de e-mails: log, estado de rate-limit e supressão
CREATE TABLE public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX idx_email_send_log_recipient ON public.email_send_log(recipient_email);
CREATE INDEX idx_email_send_log_message ON public.email_send_log(message_id);
CREATE UNIQUE INDEX idx_email_send_log_message_sent_unique
  ON public.email_send_log(message_id) WHERE status = 'sent';

CREATE TABLE public.email_send_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retry_after_until TIMESTAMPTZ,
  batch_size INTEGER NOT NULL DEFAULT 10,
  send_delay_ms INTEGER NOT NULL DEFAULT 200,
  auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.suppressed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);
CREATE INDEX idx_suppressed_emails_email ON public.suppressed_emails(email);

CREATE TABLE public.email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);
CREATE INDEX idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens(token);

-- Fila pgmq (idempotente)
DO $$ BEGIN PERFORM pgmq.create('auth_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('auth_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- -------------------------------------------------------------
-- Funções
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.user_has_filial(_user_id UUID, _filial_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_filiais WHERE user_id = _user_id AND filial_id = _filial_id
  )
$$;
REVOKE ALL ON FUNCTION public.user_has_filial(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_filial(UUID, UUID) TO authenticated;

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

-- Expõe apenas colunas seguras de profiles (sem e-mail) para telas que listam analistas
CREATE OR REPLACE FUNCTION public.get_public_profiles(_user_ids uuid[] DEFAULT NULL)
RETURNS TABLE(user_id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.name
  FROM public.profiles p
  WHERE _user_ids IS NULL OR p.user_id = ANY(_user_ids);
$$;
REVOKE ALL ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Novo usuário: cria profile + role padrão + vínculo com a Matriz
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  INSERT INTO public.user_filiais (user_id, filial_id, role, is_default)
  VALUES (NEW.id, '00000000-0000-0000-0000-000000000001', v_role, true)
  ON CONFLICT (user_id, filial_id) DO NOTHING;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.create_default_checklist(impl_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.checklist_items (implementation_id, title, description, order_index, parent_id) VALUES
  (impl_id, 'Migração de Dados', 'Migração de dados do sistema anterior (opcional)', 1, NULL),
  (impl_id, 'Cadastro dos dados da empresa', 'Cadastro dos dados da empresa do Cliente no Sistema', 2, NULL),
  (impl_id, 'Configuração Tributária (CFOP)', 'Configuração de CFOPs e regime tributário', 3, NULL),
  (impl_id, 'Alinhamento Fiscal e Contábil', 'Configurações fiscais e contábeis', 4, NULL),
  (impl_id, 'Identidade Visual', 'Logo e papel de parede do cliente', 5, NULL),
  (impl_id, 'Parametrizações do Sistema', 'Regras, bloqueios e fluxo de venda', 6, NULL),
  (impl_id, 'Instalação do sistema', 'Instalação e configuração inicial do sistema no ambiente do cliente', 7, NULL),
  (impl_id, 'Treinamentos', 'Treinamentos dos módulos do sistema', 8, NULL);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_default_checklist(uuid) FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.update_scheduled_implementations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.implementations
  SET status = 'em_andamento', actual_start_date = now()
  WHERE status = 'agendada' AND start_date <= now();
END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_scheduled_implementations() FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.get_active_commission(impl_type public.implementation_type)
RETURNS DECIMAL(10, 2)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT commission_value FROM public.commission_rules
  WHERE implementation_type = impl_type AND is_active = true
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.get_active_commission(implementation_type) FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.set_implementation_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'concluida' AND OLD.status != 'concluida' AND NEW.commission_value IS NULL THEN
    NEW.commission_value := get_active_commission(NEW.implementation_type);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_implementation_commission() FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.validate_implementation_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'concluida' AND OLD.status != 'concluida' THEN
    IF NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Apenas administradores podem concluir implantações';
    END IF;
    NEW.end_date := now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.validate_implementation_status_update() FROM anon, authenticated, public;

-- Wrappers RPC para a fila pgmq (usados só pela edge function process-email-queue)
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name TEXT, batch_size INT, vt INT)
RETURNS TABLE(msg_id BIGINT, read_ct INT, message JSONB)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name TEXT, message_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(
  source_queue TEXT, dlq_name TEXT, message_id BIGINT, payload JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  RETURN new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) TO service_role;

-- -------------------------------------------------------------
-- Triggers
-- -------------------------------------------------------------
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_filiais_updated_at BEFORE UPDATE ON public.filiais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_commission_types_updated_at BEFORE UPDATE ON public.commission_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_commission_rules_updated_at BEFORE UPDATE ON public.commission_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_implementations_updated_at BEFORE UPDATE ON public.implementations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE ON public.checklist_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON public.episodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conclusion_requests_updated_at BEFORE UPDATE ON public.conclusion_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_module_permissions_updated_at BEFORE UPDATE ON public.user_module_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER validate_status_update BEFORE UPDATE ON public.implementations FOR EACH ROW EXECUTE FUNCTION public.validate_implementation_status_update();
CREATE TRIGGER set_commission_on_completion BEFORE UPDATE ON public.implementations FOR EACH ROW EXECUTE FUNCTION public.set_implementation_commission();

-- -------------------------------------------------------------
-- Grants (GRANT -> ENABLE RLS -> POLICY, conforme convenção do projeto)
-- -------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'filiais', 'profiles', 'user_roles', 'user_filiais', 'user_module_permissions',
    'clients', 'commission_types', 'commission_rules', 'implementations',
    'implementation_analysts', 'implementation_commissions', 'checklist_items',
    'episodes', 'episode_audit_logs', 'conclusion_requests', 'webhook_logs',
    'email_send_log', 'email_send_state', 'suppressed_emails', 'email_unsubscribe_tokens'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- -------------------------------------------------------------
-- RLS Policies
-- -------------------------------------------------------------

-- filiais
CREATE POLICY "Authenticated can view filiais" ON public.filiais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert filiais" ON public.filiais FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update filiais" ON public.filiais FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete filiais" ON public.filiais FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- profiles
CREATE POLICY "Users can view own profile or admin" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- user_filiais
CREATE POLICY "User views own filiais or admin sees all" ON public.user_filiais FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage user_filiais insert" ON public.user_filiais FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage user_filiais update" ON public.user_filiais FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage user_filiais delete" ON public.user_filiais FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- user_module_permissions
CREATE POLICY "Users can view own permissions" ON public.user_module_permissions FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can insert permissions" ON public.user_module_permissions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update permissions" ON public.user_module_permissions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete permissions" ON public.user_module_permissions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- clients
CREATE POLICY "Filial members or admin can view clients" ON public.clients FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR user_has_filial(auth.uid(), filial_id));
CREATE POLICY "Only admins can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can update clients" ON public.clients FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can delete clients" ON public.clients FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- commission_types
CREATE POLICY "Authenticated users can view commission types" ON public.commission_types FOR SELECT USING (true);
CREATE POLICY "Admins can insert commission types" ON public.commission_types FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update commission types" ON public.commission_types FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete commission types" ON public.commission_types FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- commission_rules
CREATE POLICY "Admins can view commission rules" ON public.commission_rules FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert commission rules" ON public.commission_rules FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update commission rules" ON public.commission_rules FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete commission rules" ON public.commission_rules FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- implementations
CREATE POLICY "Users can view implementations" ON public.implementations FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (implementer_id = auth.uid())
  OR (EXISTS (SELECT 1 FROM implementation_analysts ia WHERE ia.implementation_id = implementations.id AND ia.analyst_id = auth.uid()))
);
CREATE POLICY "Only admins can insert implementations" ON public.implementations FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all, implementers their own" ON public.implementations FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (implementer_id = auth.uid())
  OR (EXISTS (SELECT 1 FROM implementation_analysts ia WHERE ia.implementation_id = implementations.id AND ia.analyst_id = auth.uid()))
);
CREATE POLICY "Only admins can delete implementations" ON public.implementations FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- implementation_analysts
CREATE POLICY "Admins can manage implementation_analysts" ON public.implementation_analysts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Analysts can view their own assignments" ON public.implementation_analysts FOR SELECT USING (analyst_id = auth.uid());

-- implementation_commissions
CREATE POLICY "Users can view implementation commissions" ON public.implementation_commissions FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM implementations i
    WHERE i.id = implementation_commissions.implementation_id
      AND (i.implementer_id = auth.uid() OR EXISTS (SELECT 1 FROM implementation_analysts ia WHERE ia.implementation_id = i.id AND ia.analyst_id = auth.uid()))
  )
);
CREATE POLICY "Admins can insert implementation commissions" ON public.implementation_commissions FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update implementation commissions" ON public.implementation_commissions FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete implementation commissions" ON public.implementation_commissions FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- checklist_items
CREATE POLICY "Users can view checklist items" ON public.checklist_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM implementations i WHERE i.id = checklist_items.implementation_id AND (
      has_role(auth.uid(), 'admin'::app_role) OR i.implementer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM implementation_analysts ia WHERE ia.implementation_id = i.id AND ia.analyst_id = auth.uid())
    )
  )
);
CREATE POLICY "Users can update checklist items" ON public.checklist_items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM implementations i WHERE i.id = checklist_items.implementation_id AND (
      has_role(auth.uid(), 'admin'::app_role) OR i.implementer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM implementation_analysts ia WHERE ia.implementation_id = i.id AND ia.analyst_id = auth.uid())
    )
  )
);
CREATE POLICY "Only admins can insert checklist items" ON public.checklist_items FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can delete checklist items" ON public.checklist_items FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- episodes
CREATE POLICY "Users can view episodes" ON public.episodes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM implementations i WHERE i.id = episodes.implementation_id AND (
      has_role(auth.uid(), 'admin'::app_role) OR i.implementer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM implementation_analysts ia WHERE ia.implementation_id = i.id AND ia.analyst_id = auth.uid())
    )
  )
);
CREATE POLICY "Users can insert episodes" ON public.episodes FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM implementation_analysts ia WHERE ia.implementation_id = episodes.implementation_id AND ia.analyst_id = auth.uid())
  OR EXISTS (SELECT 1 FROM implementations i WHERE i.id = episodes.implementation_id AND i.implementer_id = auth.uid())
);
CREATE POLICY "Users can update episodes" ON public.episodes FOR UPDATE USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete episodes" ON public.episodes FOR DELETE USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- episode_audit_logs
CREATE POLICY "Admins can view audit logs" ON public.episode_audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can insert audit logs" ON public.episode_audit_logs FOR INSERT TO authenticated WITH CHECK (edited_by = auth.uid());

-- conclusion_requests
CREATE POLICY "Assigned users can create conclusion requests" ON public.conclusion_requests FOR INSERT TO authenticated WITH CHECK (
  requester_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM implementations i WHERE i.id = implementation_id AND i.implementer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM implementation_analysts ia WHERE ia.implementation_id = conclusion_requests.implementation_id AND ia.analyst_id = auth.uid())
  )
);
CREATE POLICY "Users can view conclusion requests" ON public.conclusion_requests FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR requester_id = auth.uid());
CREATE POLICY "Admins can update conclusion requests" ON public.conclusion_requests FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete conclusion requests" ON public.conclusion_requests FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- webhook_logs (INSERT feito via service_role nas edge functions, sem policy para authenticated)
CREATE POLICY "Admins can view webhook logs" ON public.webhook_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete webhook logs" ON public.webhook_logs FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- fila de e-mail: só service_role
CREATE POLICY "Service role can read send log" ON public.email_send_log FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Service role can insert send log" ON public.email_send_log FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can update send log" ON public.email_send_log FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage send state" ON public.email_send_state FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can read tokens" ON public.email_unsubscribe_tokens FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Service role can insert tokens" ON public.email_unsubscribe_tokens FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can mark tokens as used" ON public.email_unsubscribe_tokens FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- -------------------------------------------------------------
-- Camada RESTRICTIVE de isolamento por filial
-- (AND obrigatório sobre as policies permissivas acima, nas tabelas com filial_id)
-- -------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['profiles', 'implementations', 'clients', 'commission_rules', 'commission_types', 'conclusion_requests'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format($f$
      CREATE POLICY "filial_isolation_select" ON public.%I
      AS RESTRICTIVE FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.user_has_filial(auth.uid(), filial_id))
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "filial_isolation_modify" ON public.%I
      AS RESTRICTIVE FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.user_has_filial(auth.uid(), filial_id))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.user_has_filial(auth.uid(), filial_id))
    $f$, t);
  END LOOP;
END $$;

-- -------------------------------------------------------------
-- Dados semente
-- -------------------------------------------------------------
INSERT INTO public.filiais (id, nome, cnpj) VALUES ('00000000-0000-0000-0000-000000000001', 'Matriz', NULL);

INSERT INTO public.commission_rules (implementation_type, commission_value, is_active) VALUES
  ('web', 150.00, true),
  ('manager', 250.00, true),
  ('basic', 100.00, true);

-- -------------------------------------------------------------
-- Storage buckets (evidências e contratos do CRM/Demandas/Visitas
-- e avatares NÃO fazem parte deste schema)
-- -------------------------------------------------------------
-- Nenhum bucket é necessário para os módulos mantidos.

-- -------------------------------------------------------------
-- Passos pós-migração (fora do escopo de SQL estático — aplicar via
-- Supabase Dashboard/CLI depois do deploy, com os secrets do projeto):
--   1. Vault: armazenar a service_role key como 'email_queue_service_role_key'.
--   2. pg_cron: agendar job 'process-email-queue' (intervalo de 5s) chamando
--      a edge function via net.http_post com a chave acima.
-- -------------------------------------------------------------
