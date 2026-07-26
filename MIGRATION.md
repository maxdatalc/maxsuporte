# MIGRATION.md — MAX SUPORTE

Passo a passo para migrar o projeto para um **novo Supabase próprio** (fora da Lovable Cloud), rodando localmente no VS Code.

Você vai:
1. Clonar o repositório do GitHub.
2. Criar um novo projeto no Supabase.
3. Aplicar o schema (migrations).
4. Recriar os usuários no Auth.
5. Importar os dados (com remapeamento automático de UUIDs de usuário via email).
6. Migrar os arquivos de Storage (opcional).
7. Reimplantar as Edge Functions.

Todos os arquivos prontos estão em `/mnt/documents/max-suporte-migration/` neste sandbox — baixe antes de sair.

---

## Arquivos gerados

| Arquivo | Uso |
|---|---|
| `backup.json` | Dump JSON das 16 tabelas de negócio mantidas (na ordem correta de dependência). |
| `users.json` | Lista dos usuários atuais (email, nome, role, filial). |
| `scripts/seed-users.sql` | SQL para recriar os usuários no `auth.users` com senha padrão `1234`. |
| `scripts/import.mjs` | Script Node que importa `backup.json` remapeando `user_id` antigo → novo por email. |

---

## Passo 1 — Clonar e instalar

```bash
git clone <seu-repo> max-suporte
cd max-suporte
npm install
```

## Passo 2 — Criar o novo projeto Supabase

1. Acesse https://supabase.com/dashboard → **New Project**.
2. Anote **Project ref**, **anon key**, **service_role key**.
3. Instale a CLI (uma vez): `npm i -g supabase`.

## Passo 3 — Aplicar o schema

**Opção A (recomendada) — CLI:**
```bash
supabase link --project-ref <NOVO_REF>
supabase db push          # aplica tudo em supabase/migrations/
```

**Opção B — SQL Editor:**
Cole o conteúdo de `supabase/migrations/20260726120000_schema_inicial.sql` no SQL Editor (é a única migration do projeto).

Isso cria: enums, 20 tabelas, functions, triggers, RLS, e o registro seed da filial **Matriz** (`00000000-0000-0000-0000-000000000001`).

### Storage buckets

Nenhum bucket de storage é necessário para os módulos mantidos (implantações,
comissões, multi-filial). Os buckets `avatars`, `crm-assets`, `crm-proposals`,
`crm-contracts` e `demand-evidences` pertenciam a módulos removidos (perfil
com foto, CRM/Vendas e Demandas/POP) e não fazem parte deste schema.

## Passo 4 — Recriar usuários no Auth

Abra `scripts/seed-users.sql` (gerado automaticamente para os 8 usuários atuais) no SQL Editor do **novo** projeto e execute. Todos ganham senha padrão **`1234`**.

⚠️ **Faça isso ANTES do import de dados** — o importador precisa dos novos UUIDs para remapear FKs.

Após o primeiro login, cada usuário deve trocar a senha em `/perfil`.

## Passo 5 — Importar os dados

```bash
cd scripts
export SUPABASE_URL="https://<NOVO_REF>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-do-novo>"
node import.mjs ../backup.json
```

O script:
- Lê `auth.users` do novo projeto (via service_role) e monta o mapa `email → new_user_id`.
- Para cada linha, reescreve **todas** as colunas listadas em `USER_FK` (implementer_id, analyst_id, created_by, edited_by, requested_by, reviewed_by, completed_by, user_id etc.).
- Faz `upsert` na ordem de dependência já definida em `backup.json`.
- Loga contagem por tabela e falhas linha-a-linha (sem abortar).

**Alternativa in-app:** o projeto tem a página `/admin/backup` (`src/pages/admin/BackupRestore.tsx`) que faz o mesmo processo pelo browser. Basta logar como admin no novo projeto, ir na tela e enviar o `backup.json`.

## Passo 6 — Storage files (opcional)

Nenhum bucket de storage é usado pelos módulos mantidos — este passo não se aplica.

## Passo 7 — Edge Functions

```bash
supabase functions deploy send-webhook
supabase functions deploy mcp --no-verify-jwt
supabase functions deploy process-email-queue
```

Configure os secrets:
```bash
supabase secrets set LOVABLE_API_KEY=<opcional>
# SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY já vêm por padrão
```

## Passo 8 — `.env` local

Crie `.env` na raiz:
```
VITE_SUPABASE_PROJECT_ID="<NOVO_REF>"
VITE_SUPABASE_URL="https://<NOVO_REF>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<ANON_KEY>"
```

## Passo 9 — Rodar

```bash
npm run dev
```
Login com qualquer email semeado + senha `1234`. Verifique:
- Sidebar mostra os módulos correspondentes ao role.
- `/admin/filiais` lista **Matriz**.
- `/admin/implantacoes` mostra as implantações importadas com o analista correto.
- `/admin/relatorio-comissoes` mostra as comissões calculadas.

---

## Troubleshooting

**"permission denied for table X"** → você esqueceu de aplicar as migrations completas ou algum `GRANT` falhou. Cheque `information_schema.role_table_grants` para o role `authenticated`.

**Dados com `user_id` nulo após import** → o email desse usuário não foi semeado no `auth.users` antes do import. Rode o seed e reimporte apenas a tabela afetada (o script é idempotente por PK).

**Emails de auth não chegam** → configure SMTP próprio em Supabase → Auth → SMTP settings (o projeto Lovable Cloud usa `notify.maxsuporte.lctecnologias.com.br` que não segue no remix).

**MCP server retorna 401** → confira que `VITE_SUPABASE_PROJECT_ID` no `.env` é o **novo** ref; o issuer OAuth é montado a partir dele.

---

## Ordem de dependência (referência)

O `backup.json` já está gravado nesta ordem — respeite se importar manualmente:

```
filiais → profiles → user_roles → user_filiais → user_module_permissions
clients, commission_types → commission_rules
implementations → implementation_analysts, implementation_commissions,
                  checklist_items, episodes, episode_audit_logs, conclusion_requests
webhook_logs
```
