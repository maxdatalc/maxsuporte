# CLAUDE.md — MAX SUPORTE

Guia técnico completo do projeto para uso com Claude Code (ou qualquer LLM assistant) no VS Code após migração para desenvolvimento próprio.

---

## 1. Visão geral

**MAX SUPORTE** é um sistema interno da MAXDATA para gestão de:

- **Implantações** de sistemas (Basic / Manager / Web) por analistas.
- **Demandas operacionais (POP)** baseadas em templates com checklist + evidências fotográficas.
- **Visitas técnicas** com engine de IA (recomendações + feedback).
- **CRM / Vendas** — leads, pipeline Kanban, formulário público, geração de proposta PDF, contrato digitalizado, conversão em implantação.
- **Comissões** de analistas por implantação concluída.
- **Multi-filial** — isolamento de dados por filial via RLS restritiva.
- **MCP Server** — expõe ferramentas para agentes (Claude, ChatGPT etc.) via OAuth do Supabase.

Idioma da UI: **Português (BR)**. Datas: **DD/MM/YYYY**. Moeda: **BRL**.
Cores da marca: **#C4161C** (vermelho MaxData) e branco.

---

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite 5 + TypeScript 5 |
| UI | Tailwind CSS v3 + shadcn/ui (Radix) + `lucide-react` |
| Estado remoto | `@tanstack/react-query` v5 |
| Formulários | `react-hook-form` + `zod` |
| Drag & drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| PDF | `jspdf` + `jspdf-autotable` |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions Deno) |
| MCP | `@lovable.dev/mcp-js` + OAuth Supabase |
| Testes | Vitest |

Node 18+. Gerenciador: `npm` ou `bun`.

---

## 3. Layout de pastas

```
src/
├── App.tsx                 # rotas (react-router-dom)
├── main.tsx
├── index.css               # design tokens (HSL) + fontes
├── components/
│   ├── layout/             # Sidebar, Header, DashboardLayout, FilialSelector
│   ├── ui/                 # shadcn primitives (não editar sem necessidade)
│   ├── checklist/          # ChecklistItemCard
│   ├── commission/         # modais e forms de comissão
│   ├── conclusion/         # RequestConclusionModal
│   ├── implementation/     # NegotiatedTimeCard
│   ├── visitas/            # AIRecommendation*, feedback, versões
│   ├── ForgotPasswordDialog.tsx
│   ├── AvatarUpload.tsx
│   └── ProtectedRoute.tsx
├── pages/
│   ├── Login.tsx / Cadastro.tsx / ResetPassword.tsx / OAuthConsent.tsx
│   ├── PerfilUsuario.tsx
│   ├── admin/              # tudo que exige role=admin
│   ├── implantador/        # dashboard do analista
│   ├── demandas/ visitas/ vendas/
│   └── ImplantacaoDetalhe.tsx
├── lib/
│   ├── auth.tsx            # AuthProvider, useAuth, sessão + profile + refresh
│   ├── filial.tsx          # FilialContext (filial ativa, "Global")
│   ├── roleLabels.ts       # labels PT-BR + MODULE_LABELS
│   ├── crm/                # rules.ts, format.ts, logActivity.ts, pdf.ts, types.ts
│   ├── mcp/                # index.ts + tools/*
│   ├── webhookService.ts   # dispara make.com via edge function send-webhook
│   └── utils.ts            # cn()
├── hooks/                  # use-toast, use-mobile, useTimer
├── integrations/supabase/  # client.ts + types.ts (auto-gerado, NÃO editar)
└── test/                   # setup + exemplo vitest

supabase/
├── config.toml             # verify_jwt por função
├── migrations/             # todas as migrações versionadas (usar no remix)
└── functions/
    ├── analyze-visit/      # chamada da IA para recomendações de visita
    ├── mcp/                # servidor MCP (OAuth Supabase)
    ├── submit-crm-form/    # form público (verify_jwt=false)
    ├── send-webhook/       # dispara make.com
    └── process-email-queue/# worker de fila de emails (pgmq + pg_cron)
```

---

## 4. Autenticação e papéis

Arquivo central: `src/lib/auth.tsx`.

- `AuthProvider` registra `onAuthStateChange`, carrega `profiles` + `user_roles` + `avatar_url` para o usuário logado.
- `useAuth()` retorna `{ user, session, profile, role, loading, refreshProfile, signOut }`.
- Reset de senha: `ForgotPasswordDialog` → `resetPasswordForEmail` com `redirectTo = origin + '/reset-password'`. A rota `/reset-password` detecta `type=recovery` no hash e faz `updateUser({ password })`.
- OAuth do agente: `/.lovable/oauth/consent` (`OAuthConsent.tsx`). Login e cadastro preservam `?next=` para reentrada no fluxo.

### Enum `app_role`

- `admin` — acesso total.
- `implantador` — **rótulo na UI é "Analista"** (o nome do enum está congelado por compatibilidade histórica).
- `vendedor` — módulo CRM.

Storage de papel: tabela `public.user_roles(user_id, role)` (NUNCA em `profiles` — regra de segurança).

Verificação: função `public.has_role(_user_id, _role)` `SECURITY DEFINER STABLE`, usada em todas as políticas de RLS.

### Módulos concedidos ao usuário

Tabela `user_module_permissions(user_id, module_type, allowed)`. Módulos possíveis: `implantacoes | visitas | demandas | relatorios | administracao | crm` (ver `MODULE_LABELS` em `roleLabels.ts`). Admin gerencia em `/admin/usuarios`.

---

## 5. Multi-filial (multi-tenant)

- Tabela `filiais` (semeada com "Matriz" — `00000000-0000-0000-0000-000000000001`).
- Tabela ponte `user_filiais(user_id, filial_id, role, is_default)`.
- Todas as tabelas de negócio têm `filial_id NOT NULL DEFAULT '000...001'`.
- Isolamento por **RLS RESTRICTIVE** (`user_has_filial(auth.uid(), filial_id) OR has_role(auth.uid(),'admin')`).
- No frontend, `FilialContext` (`src/lib/filial.tsx`) mantém filial ativa em `localStorage`. Admins têm opção "Visão Global".
- Trigger `handle_new_user` insere o novo user na Matriz por padrão.

---

## 6. Domínio funcional (tabelas principais)

| Área | Tabelas |
|---|---|
| Cadastros base | `filiais`, `profiles`, `user_roles`, `user_filiais`, `user_module_permissions` |
| Implantações | `implementations`, `implementation_analysts`, `implementation_commissions`, `clients`, `checklist_items`, `episodes`, `episode_audit_logs`, `conclusion_requests`, `commission_types`, `commission_rules` |
| Demandas | `demand_templates`, `demand_template_steps`, `demands`, `demand_steps`, `demand_step_evidences`, `demand_analysts` |
| Visitas + IA | `visitas`, `visita_interacoes`, `recomendacoes_visita`, `ia_recommendations`, `ia_recommendation_versions`, `ia_feedback`, `ia_training_dataset`, `base_conhecimento_ia` |
| CRM | `leads`, `deals`, `form_responses`, `deal_proposals`, `deal_signature_documents`, `deal_activity_logs`, `crm_settings` |
| Emails | `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails` (fila `pgmq` + `pg_cron` — ver seção 10) |
| Webhooks | `webhook_logs` |
| Oncenter (legado, não usado na UI) | `oncenter_*` — mantido só para não quebrar histórico. Pode ser dropado no novo projeto. |

### Regras principais

- **Data string → Date**: sempre concatenar `'T00:00:00'` antes de `new Date(...)` (rule global — ver `mem`).
- **Formulário de deal**: o público envia via `submit-crm-form` (upsert em `form_responses`, atualiza `deals.formulario_preenchido = true` e etapa para `diagnostico`, recalcula sugestão).
- **Ganho → Implantação**: mover deal para `ganho` cria `clients` (se novo) + `implementations` (`status='agendada'`, `implementer_id=null`) e vincula `deals.implementation_id`.
- **Conclusão de implantação**: só admin pode marcar `status='concluida'` (validado por trigger `validate_implementation_status_update`). Ao concluir, `set_implementation_commission` define `commission_value` a partir de `commission_rules` ativas.
- **Comissão**: nunca deletar `commission_types` vinculados a registros (soft-check no UI).

### Triggers-chave

- `handle_new_user` (auth.users → profiles + user_roles + user_filiais).
- `validate_deal_stage` — bloqueia `ganho` sem proposta gerada; seta `status`/`closed_at`.
- `log_deal_stage_change`, `log_proposal`, `log_form_response`, `log_signature_doc` — audit trail em `deal_activity_logs`.
- `update_updated_at_column` — genérico para `updated_at`.
- `email_queue_wake` (após insert em `pgmq.q_*`) — arma cron `process-email-queue`.

Todas as funções são `SECURITY DEFINER SET search_path = public` (ou `''` para as de sistema).

---

## 7. RLS — padrão

- Todas as tabelas de `public` têm `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` (+ `service_role`).
- Policies típicas: `admin OU (dono/analista atribuído) E user_has_filial`.
- Camada **RESTRICTIVE** força `filial_id` do usuário em todas as tabelas de negócio.
- `get_public_profiles(_user_ids uuid[])` — função `SECURITY DEFINER` que expõe **apenas** `user_id, name, avatar_url` para telas que listam analistas sem vazar email.

---

## 8. Storage buckets

| Bucket | Público | Uso |
|---|---|---|
| `avatars` | ✅ | Foto de perfil (JPG/PNG ≤ 5MB) |
| `crm-assets` | ✅ | Logo/imagens usadas em proposta |
| `demand-evidences` | ❌ | Fotos de evidência de POP |
| `crm-proposals` | ❌ | PDFs de proposta |
| `crm-contracts` | ❌ | Contratos digitalizados |

Todos com RLS por pasta = `auth.uid()` (usuário só mexe na própria pasta) — exceto os públicos, que continuam por RLS de INSERT/UPDATE.

---

## 9. Edge Functions

Todas em `supabase/functions/`. Deploy: `supabase functions deploy <name>` (ou pelo dashboard).

| Função | verify_jwt | Descrição |
|---|---|---|
| `submit-crm-form` | false | Valida `deal_id + token` do formulário público, faz upsert em `form_responses`, atualiza deal. |
| `analyze-visit` | true | Chama Lovable AI Gateway (`LOVABLE_API_KEY`) para gerar recomendações e grava em `ia_recommendations`. |
| `send-webhook` | true | Dispara payload para URL Make.com salva em `crm_settings` / configuração. Registra em `webhook_logs`. |
| `mcp` | false (OAuth) | Servidor MCP com 5 tools (`whoami`, `list_implementations`, `list_demands`, `list_visitas`, `list_deals`). Usa token do usuário → respeita RLS. |
| `process-email-queue` | true | Worker da fila (pgmq) de emails autenticação/transacionais. Rodada por `pg_cron` on-demand. |

Secrets consumidos: `LOVABLE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SITE_ACCESS_PASSWORD` (gate simples de preview).

---

## 10. Infra de emails

- Fila via extensão **pgmq**: `q_auth_emails`, `q_transactional_emails`.
- Job **pg_cron** `process-email-queue` a cada 5s, auto-agendado ao enfileirar e auto-desagendado quando ambas as filas estão vazias.
- Wrappers `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq` no schema `public` (SECURITY DEFINER).
- Domínio de envio: `notify.maxsuporte.lctecnologias.com.br` (Lovable Cloud — no novo projeto, reconfigurar ou trocar por SMTP próprio).

---

## 11. MCP (agente)

`src/lib/mcp/index.ts` define o servidor com auth OAuth apontando para o Supabase (`https://<project-ref>.supabase.co/auth/v1`, `audience=authenticated`). Cinco tools em `src/lib/mcp/tools/`. Consentimento em `/.lovable/oauth/consent`. Manifesto extraído em `.lovable/mcp/manifest.json`.

Ao migrar: atualize `VITE_SUPABASE_PROJECT_ID` no `.env` — o issuer é montado a partir dele.

---

## 12. Variáveis de ambiente

`.env` na raiz (usadas pelo Vite):

```
VITE_SUPABASE_PROJECT_ID="<novo-project-ref>"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon-key-do-novo-projeto>"
VITE_SUPABASE_URL="https://<novo-project-ref>.supabase.co"
```

Secrets do Supabase (Edge Functions):
```
LOVABLE_API_KEY          # opcional, para analyze-visit; pode ser trocado por OpenAI/Anthropic direto
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
SUPABASE_URL
SITE_ACCESS_PASSWORD     # opcional (gate simples)
```

---

## 13. Rotas principais (`src/App.tsx`)

Público: `/login`, `/cadastro`, `/reset-password`, `/formulario/:dealId/:token`, `/.lovable/oauth/consent`.

Auth (dentro de `ProtectedRoute`): `/admin/*`, `/implantador/*`, `/demandas/*`, `/visitas/*`, `/vendas/*`, `/implantacao/:id`.

Sidebar dinâmica em `Sidebar.tsx` — mostra grupos conforme `role` e `user_module_permissions`.

---

## 14. Design system

`src/index.css` define tokens **HSL semânticos** (`--primary`, `--background`, `--foreground`, `--sidebar-*`, `--brand-red` etc.). `tailwind.config.ts` mapeia esses tokens.

**Regra dura:** nunca hardcode `text-white`, `bg-[#...]`, cores fixas em componentes. Use `bg-primary`, `text-foreground`, `bg-sidebar` etc.

Fonts, radius e sombras também são tokens.

---

## 15. Regras de código que o Claude deve respeitar

1. Sempre validar formulários com **zod**.
2. Datas string (YYYY-MM-DD) → concatenar `'T00:00:00'` antes de `new Date`.
3. Nunca modificar `src/integrations/supabase/client.ts` nem `types.ts` — são gerados.
4. Nunca criar migração que altere schemas `auth`, `storage`, `realtime`, `supabase_functions`, `vault`.
5. Toda nova tabela `public` precisa: `GRANT` → `ENABLE RLS` → `CREATE POLICY` (nessa ordem).
6. Papéis em `user_roles`, nunca em `profiles`.
7. UI em PT-BR, moeda BRL, data DD/MM/YYYY.
8. Não renomear enum `implementation_type` nem valor `implantador` no DB.

---

## 16. Comandos

```bash
# Dev
npm install
npm run dev              # http://localhost:8080

# Build / preview
npm run build
npm run preview

# Lint / testes
npm run lint
npm run test

# Supabase CLI (opcional, para versionar migrations locais)
supabase link --project-ref <novo-ref>
supabase db push         # aplica migrations
supabase functions deploy <name>
```

---

## 17. Migração para novo projeto

Veja **`MIGRATION.md`** — passo a passo com scripts prontos.
