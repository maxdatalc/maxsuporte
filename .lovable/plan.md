- Quero aprovar o plano do Módulo CRM / Vendas — MAX SUPORTE, porém com ajustes pontuais apenas nas partes de formulário, proposta comercial e documento de assinatura/contrato digitalizado.
  IMPORTANTE:
  - Não alterar nada que não esteja relacionado a formulários, proposta comercial e documento de assinatura.
  - Não mexer no fluxo atual de Implantações.
  - Não alterar a regra de conversão “Fechado ganho” → Implantação.
  - Não criar obrigação de salvar tudo como uma negociação única para o pós-venda, pois a empresa já possui departamento de pós-venda para tratar essa etapa.
  - Manter o módulo CRM/Vendas isolado, conforme o plano original.
  - Apenas complementar e organizar melhor os dados que serão usados para emissão de contrato, geração de proposta comercial e envio/controle do documento de assinatura.
  Plano ajustado:
  Módulo CRM / Vendas — MAX SUPORTE
  Novo módulo isolado, sem mexer no fluxo atual de Implantações. Integração ocorre só no momento da conversão "Fechado ganho" → cria implantação na tabela existente sem analista, pois o admin atribui depois. Na tela da implantação aparece bloco "Origem Comercial".
  1. Banco de dados — migration
  Manter a estrutura original proposta, porém ajustar/complementar os campos relacionados ao formulário comercial, proposta e documento de assinatura.
  Novo enum e tabelas em public, todas com RLS.
  Enum app_role:
  - adicionar valor vendedor sem quebrar os existentes.
  Tabela leads:
  - nome
  - telefone
  - email
  - empresa
  - origem
  - observacoes
  - created_by
  - timestamps
  Índice em:
  - created_by
  - telefone
  Objetivo:
  - evitar duplicidade por vendedor.
  Tabela deals:
  - lead_id
  - vendedor_id
  - nome_negocio
  - valor_estimado
  - status: ativo | ganho | perdido
  - etapa: lead | contato | diagnostico | proposta | negociacao | ganho | perdido
  - probabilidade
  - formulario_preenchido
  - form_token uuid único
  - implementation_id FK opcional, preenchida ao converter
  - suggested_type: basic | manager | web
  - complexidade
  - horas_estimadas
  Manter os campos acima conforme o plano original.
  Tabela form_responses:
  Substituir/complementar o modelo simples anterior por um formulário mais completo, dividido em blocos.
  A tabela deve armazenar os dados do formulário inicial enviado ao cliente/vendedor, com os seguintes grupos:
  1. Dados da Empresa
  Campos:
  - deal_id unique
  - razao_social
  - nome_fantasia
  - cnpj
  - email_empresa
  - telefone_fixo
  - telefone_celular
  - regime_tributario
  - quantidade_computadores
  2. Dados do Responsável pela Assinatura do Contrato
  Campos:
  - responsavel_nome
  - responsavel_cpf
  - responsavel_rg
  - responsavel_email
  - responsavel_telefone_celular
  Objetivo:
  Esses dados serão usados no documento de assinatura/contrato digitalizado, que será enviado separadamente.
  3. Informações Financeiras da Negociação
  Campos:
  - nome_vendedor
    - Deve ser preenchido automaticamente com o nome do usuário logado.
    - O vendedor não deve precisar digitar esse campo manualmente.
  - valor_implantacao
    - Campo monetário em reais.
  - valor_mensalidade
    - Campo monetário em reais.
  - sistema_contratado
    - Tipo text[] ou jsonb.
    - Multiseleção com as opções:
      - MaxWeb
      - MaxBasic
      - MaxManager SLIM
      - MaxManager PRO
  - qtd_licencas_maquinas
    - Campo numérico.
  - licencas_automax_mobile
    - Campo numérico.
  - licencas_maxbip
    - Campo numérico.
  - modulos_adicionais
    - Tipo text[] ou jsonb.
    - Multiseleção com as opções:
      - AutoMax
      - MaxVet
      - MaxFood
      - MaxPDV
      - MaxPDV Web
  4. Informações para Implantação
  Campos:
  - sistema_atual
  - migrar_banco_dados
    - Seleção com opções:
      - Sim
      - Não
      - A definir
  - particularidades_identificadas
    - Campo texto longo.
    - Deve permitir observações sobre necessidades específicas do cliente, operação, migração, regras internas, dificuldades, integrações, particularidades comerciais ou qualquer ponto relevante para o time de implantação/pós-venda.
  Campos técnicos adicionais:
  - created_at
  - updated_at
  - submitted_by
  - submission_origin: publico | vendedor | admin
  Observação:
  Essas informações alimentam o CRM, a proposta comercial e o documento de assinatura, mas não devem alterar diretamente o fluxo de pós-venda/implantação existente.
  Tabela deal_proposals:
  Manter a tabela original, porém complementar para a proposta comercial ficar mais robusta.
  Campos:
  - deal_id
  - valor
  - valor_implantacao
  - valor_mensalidade
  - sistema_contratado
  - qtd_licencas_maquinas
  - licencas_automax_mobile
  - licencas_maxbip
  - modulos_adicionais
  - escopo
  - prazo_dias
  - condicoes_comerciais
  - observacoes_comerciais
  - validade_proposta_dias
  - pdf_path
  - gerado_por
  - version
  - created_at
  A proposta deve puxar automaticamente os dados de:
  - deals
  - leads
  - form_responses
  - crm_settings
  Mas todos os campos principais devem continuar editáveis antes da geração do PDF.
  Tabela deal_signature_documents:
  Criar uma tabela específica para controle do documento de assinatura/contrato digitalizado enviado separadamente.
  Campos:
  - id
  - deal_id
  - form_response_id opcional
  - document_type: contrato_digitalizado | termo_assinatura | outro
  - title
  - file_path
  - uploaded_by
  - sent_to_client boolean
  - sent_at
  - signed boolean
  - signed_at
  - notes
  - created_at
  - updated_at
  Objetivo:
  Permitir anexar, armazenar e controlar o contrato digitalizado ou documento de assinatura relacionado ao cliente, sem misturar isso com a proposta comercial.
  Storage:
  Manter:
  - Bucket crm-proposals privado
  - Bucket crm-assets público para logo
  Adicionar:
  - Bucket crm-contracts privado
  Uso:
  - crm-proposals: PDFs de proposta comercial
  - crm-assets: logo e imagens públicas usadas no template
  - crm-contracts: contratos digitalizados, termos de assinatura e documentos enviados separadamente
  Tabela deal_activity_logs:
  Manter:
  - deal_id
  - tipo
  - descricao
  - payload jsonb
  - user_id
  - created_at
  Adicionar logs também para:
  - formulario_preenchido
  - proposta_gerada
  - proposta_regerada
  - contrato_anexado
  - contrato_enviado
  - contrato_assinado
  - documento_assinatura_atualizado
  Tabela crm_settings:
  Manter:
  - header_html
  - footer_html
  - logo_url
  - cor_primaria
  - textos padrão da proposta
  Complementar com:
  - proposta_template_html
  - contrato_instrucoes_padrao
  - texto_validade_proposta
  - texto_condicoes_comerciais_padrao
  - texto_observacoes_padrao
  Objetivo:
  Permitir que o admin configure textos padrão usados na proposta comercial e nas instruções do documento de assinatura.
  RLS:
  Manter a regra original:
  Vendedor:
  - SELECT/INSERT/UPDATE em leads/deals/form_responses/proposals/logs apenas onde vendedor_id = auth.uid() ou created_by = auth.uid().
  Admin:
  - acesso total.
  Analista:
  - apenas SELECT em deals/form_responses ligados a uma implementation_id que ele participa, para o bloco “Origem Comercial”.
  Adicionar regras para deal_signature_documents:
  - Admin: acesso total.
  - Vendedor: pode visualizar, inserir e atualizar documentos apenas dos deals próprios.
  - Analista: somente leitura quando o documento estiver ligado a um deal que já virou implantação relacionada a ele.
  - Cliente público não acessa diretamente o storage privado.
  Form público:
  - edge function submit-form valida deal_id + token e grava sem auth usando service role.
  Triggers:
  Manter:
  - Antes do INSERT em deals → gera form_token uuid.
  - AFTER UPDATE em deals quando etapa muda → log automático em deal_activity_logs.
  - Validação de transição de etapa: bloquear pular para ganho sem proposta gerada.
  Complementar:
  - Ao inserir/atualizar form_responses, registrar log de formulário preenchido/atualizado.
  - Ao inserir deal_proposals, registrar log de proposta gerada.
  - Ao inserir deal_signature_documents, registrar log de contrato/documento anexado.
  2. Roles & permissões — frontend
  Manter conforme plano original:
  - roleLabels.ts: adicionar vendedor → "Vendedor".
  - ProtectedRoute aceita vendedor.
  - useAuth AppRole inclui vendedor.
  - Sidebar ganha grupo "CRM / Vendas" visível para admin e vendedor:
    - Dashboard Vendas
    - Leads
    - Pipeline Kanban
    - Propostas
    - Configurações CRM, somente admin
  Login do vendedor:
  - redireciona para /vendas.
  3. Telas
  Manter as telas originais, com os seguintes detalhamentos nas áreas de formulário, proposta e documento de assinatura.
  /vendas
  Dashboard:
  - deals ativos
  - valor em negociação
  - taxa de conversão
  - ganhos/perdidos
  - tempo médio de fechamento
  - filtros por vendedor, se admin
  - filtros por período
  Vendedor vê apenas os próprios dados.
  /vendas/leads
  Lista + formulário:
  - nome
  - telefone obrigatório
  - email
  - empresa
  - origem
  - observações
  Alerta de duplicata por telefone + vendedor.
  /vendas/pipeline
  Kanban 7 colunas com @dnd-kit:
  - lead
  - contato
  - diagnostico
  - proposta
  - negociacao
  - ganho
  - perdido
  Cada card deve ter botões:
  - abrir
  - copiar link do formulário
  - gerar proposta
  - anexar contrato/documento de assinatura, se aplicável
  Bloqueio visual de transições inválidas com toast.
  /vendas/deals/:id
  Tela de detalhes com abas:
  1. Resumo
  2. Formulário
  3. Sugestão de Pré-Implantação
  4. Proposta
  5. Documento de Assinatura
  6. Histórico
  Detalhamento das abas:
  Aba Resumo:
  - Nome fantasia
  - Razão social
  - CNPJ
  - Vendedor responsável
  - Etapa atual
  - Status
  - Sistema contratado
  - Valor da implantação
  - Valor da mensalidade
  - Quantidade de licenças
  - Módulos adicionais
  - Status do formulário
  - Status da proposta
  - Status do documento de assinatura
  Aba Formulário:
  Organizar em cards:
  Card 1 — Dados da Empresa:
  - Razão Social
  - Nome Fantasia
  - CNPJ
  - E-mail
  - Telefone Fixo
  - Telefone Celular
  - Regime Tributário
  - Quantidade de computadores
  Card 2 — Responsável pela Assinatura:
  - Nome
  - CPF
  - RG
  - E-mail
  - Telefone Celular
  Card 3 — Informações Financeiras:
  - Nome do Vendedor preenchido automaticamente
  - Valor da Implantação
  - Valor da Mensalidade
  - Sistema Contratado com multiseleção:
    - MaxWeb
    - MaxBasic
    - MaxManager SLIM
    - MaxManager PRO
  - Qtd. de Licenças Máquinas
  - Licenças AutoMax Mobile
  - Licenças MaxBip
  - Módulos adicionais com multiseleção:
    - AutoMax
    - MaxVet
    - MaxFood
    - MaxPDV
    - MaxPDV Web
  Card 4 — Informações para Implantação:
  - Sistema atual
  - Migrar banco de dados: Sim / Não / A definir
  - Particularidades identificadas
  Requisitos:
  - Usar máscara para CNPJ, CPF, telefone fixo e celular.
  - Usar máscara de moeda brasileira para valores.
  - Usar campos obrigatórios destacados.
  - Usar botão “Salvar Formulário”.
  - Permitir edição pelo vendedor dono e pelo admin.
  - Registrar alterações no histórico.
  Aba Sugestão de Pré-Implantação:
  Manter o plano original:
  - suggested_type
  - complexidade
  - horas_estimadas
  Esses dados são informativos e editáveis antes da proposta.
  Aba Proposta:
  Tela para criação, edição, prévia e geração de PDF da proposta comercial.
  Campos da proposta:
  - Cliente/Razão Social
  - Nome Fantasia
  - CNPJ
  - Sistema contratado
  - Valor da implantação
  - Valor da mensalidade
  - Quantidade de licenças máquinas
  - Licenças AutoMax Mobile
  - Licenças MaxBip
  - Módulos adicionais
  - Escopo da proposta
  - Prazo de implantação em dias
  - Condições comerciais
  - Observações comerciais
  - Validade da proposta em dias
  Funcionalidades:
  - Carregar automaticamente os dados do formulário.
  - Permitir edição manual antes de gerar PDF.
  - Gerar PDF com layout profissional usando logo, header, footer, cor primária e textos padrão de crm_settings.
  - Salvar versão da proposta.
  - Permitir múltiplas versões.
  - Exibir histórico de propostas geradas.
  - Permitir download da proposta.
  - Salvar PDF no bucket privado crm-proposals.
  Botões:
  - “Gerar Proposta”
  - “Pré-visualizar PDF”
  - “Baixar Proposta”
  - “Gerar Nova Versão”
  Aba Documento de Assinatura:
  Nova aba para controle do contrato digitalizado/documento enviado separadamente.
  Objetivo:
  Separar claramente a proposta comercial do documento de assinatura/contrato.
  Campos:
  - Tipo do documento:
    - Contrato digitalizado
    - Termo de assinatura
    - Outro
  - Título do documento
  - Upload do arquivo
  - Observações
  - Status:
    - Anexado
    - Enviado ao cliente
    - Assinado
    - Pendente
  Funcionalidades:
  - Upload de contrato/documento no bucket privado crm-contracts.
  - Visualização do documento anexado.
  - Download do documento.
  - Marcar como “Enviado ao cliente”.
  - Marcar como “Assinado”.
  - Registrar data de envio.
  - Registrar data de assinatura.
  - Registrar responsável pelo upload.
  - Registrar logs no histórico do deal.
  Botões:
  - “Anexar Documento”
  - “Baixar Documento”
  - “Marcar como Enviado”
  - “Marcar como Assinado”
  Aba Histórico:
  Manter logs originais e incluir:
  - criação do lead
  - criação do deal
  - formulário enviado
  - formulário preenchido
  - formulário atualizado
  - proposta gerada
  - proposta baixada
  - nova versão de proposta
  - contrato anexado
  - contrato enviado
  - contrato assinado
  - mudança de etapa
  - conversão em implantação
  /vendas/configuracoes
  Admin edita:
  - header da proposta
  - footer da proposta
  - logo
  - cor primária
  - textos padrão da proposta
  - condições comerciais padrão
  - observações padrão
  - validade padrão da proposta
  - instruções padrão para documento de assinatura/contrato
  4. Motor de regras — client-side em src/lib/crmRules.ts
  Manter a regra original:
  qtd_computadores <= 5  → BASIC, complexidade baixa, 5h
  qtd_computadores <= 15 → MANAGER, complexidade média, 10h
  qtd_computadores > 15  → WEB, complexidade alta, 20h
  Resultado salvo em:
  - deals.suggested_type
  - deals.complexidade
  - deals.horas_estimadas
  Continuar editável antes da proposta.
  Importante:
  A regra é apenas informativa e não altera enum implementation_type.
  5. Fluxo do formulário público
  Edge function submit-crm-form com verify_jwt=false.
  Fluxo:
  - validar payload com zod
  - checar deal_id + token
  - salvar ou atualizar form_responses
  - atualizar deal:
    - formulario_preenchido=true
    - etapa='diagnostico'
    - recalcular sugestão
  - inserir log
  Formulário público deve ter layout limpo, sem layout autenticado.
  Rota:
  - /formulario/:dealId/:token
  Após envio:
  - redirecionar para uma tela de obrigado.
  Campos do formulário público:
  Seção 1 — Dados da Empresa:
  - Razão Social
  - Nome Fantasia
  - CNPJ
  - E-mail
  - Telefone Fixo
  - Telefone Celular
  - Regime Tributário
  - Quantidade de computadores
  Seção 2 — Dados do Responsável pela Assinatura:
  - Nome
  - CPF
  - RG
  - E-mail
  - Telefone Celular
  Seção 3 — Informações Financeiras da Negociação:
  - Nome do Vendedor preenchido automaticamente, quando disponível
  - Valor da Implantação
  - Valor da Mensalidade
  - Sistema Contratado com multiseleção
  - Qtd. de Licenças Máquinas
  - Licenças AutoMax Mobile
  - Licenças MaxBip
  - Módulos adicionais com multiseleção
  Observação:
  Caso essa seção seja preenchida somente internamente pelo vendedor/admin, permitir que o formulário público oculte esses campos conforme configuração.
  Seção 4 — Informações para Implantação:
  - Sistema atual
  - Migrar banco de dados
  - Particularidades identificadas
  6. Geração de proposta — PDF
  Manter o plano original:
  - PDF gerado client-side com jspdf + jspdf-autotable usando template de crm_settings.
  - Upload em crm-proposals/{deal_id}/{version}.pdf.
  - Registrar em deal_proposals.
  - Registrar log de atividade.
  Complementar:
  A proposta deve conter, de forma organizada:
  Cabeçalho:
  - Logo MAXDATA
  - Nome da proposta
  - Dados da empresa
  - Data de emissão
  - Versão da proposta
  Dados do cliente:
  - Razão Social
  - Nome Fantasia
  - CNPJ
  - E-mail
  - Telefones
  Resumo comercial:
  - Sistema contratado
  - Módulos adicionais
  - Quantidade de licenças máquinas
  - Licenças AutoMax Mobile
  - Licenças MaxBip
  Valores:
  - Valor da implantação
  - Valor da mensalidade
  Escopo:
  - descrição editável do que está incluso
  Implantação:
  - sistema atual
  - migração de banco de dados
  - particularidades identificadas
  - prazo em dias
  Condições comerciais:
  - texto padrão editável
  - validade da proposta
  - observações comerciais
  Rodapé:
  - informações da MAXDATA
  - texto institucional ou observação padrão configurável
  7. Documento de assinatura / contrato digitalizado
  Criar fluxo separado da proposta.
  Esse fluxo não gera contrato automaticamente neste momento.
  Objetivo atual:
  - permitir anexar, armazenar e controlar o documento de assinatura/contrato digitalizado que será enviado separadamente.
  Funcionalidades:
  - Upload do contrato/documento.
  - Associação ao deal.
  - Armazenamento no bucket privado crm-contracts.
  - Controle de status.
  - Logs no histórico.
  - Permissão por role.
  Status sugeridos:
  - pendente
  - anexado
  - enviado
  - assinado
  Não misturar PDF de proposta com contrato digitalizado.
  A proposta comercial fica em crm-proposals.
  O contrato/documento de assinatura fica em crm-contracts.
  8. Conversão "Fechado ganho" → Implantação
  Manter exatamente como no plano original.
  Ao mover para coluna ganho:
  - abrir modal de confirmação
  - criar registro em clients se não existir, usando match por nome + telefone
  - inserir em implementations com:
    - client_id
    - implementer_id=null
    - status='agendada'
    - observations = resumo do form + sugestão + link do deal
  - atualizar deals.implementation_id
  - atualizar status='ganho'
  - log "convertido em implantação"
  Nada no fluxo atual de implantações deve ser alterado.
  Apenas INSERT padrão.
  9. Integração na tela de Implantação existente
  Manter como no plano original.
  Em ImplantacaoDetalhe.tsx, adicionar componente OrigemComercialCard, renderizado só se existir deal com implementation_id = id.
  O card deve exibir:
  - vendedor responsável
  - respostas do formulário
  - sistema contratado
  - valores negociados
  - módulos adicionais
  - particularidades identificadas
  - link “Abrir deal original” para admin/vendedor dono
  Sem mudanças em queries existentes.
  O componente deve fazer fetch próprio.
  10. Logs / Rastreabilidade
  Helper logDealActivity(dealId, tipo, descricao, payload) chamado em:
  - criação
  - mudança de etapa
  - envio de link
  - submissão de formulário
  - atualização de formulário
  - geração de proposta
  - nova versão de proposta
  - upload de documento de assinatura
  - marcação de documento como enviado
  - marcação de documento como assinado
  - conversão em implantação
  11. Qualidade
  Manter:
  - validação zod em todos os forms
  - detecção de duplicata de lead por telefone normalizado
  - paginação no Kanban
  - loading states + skeletons
  - webhooks [Make.com](http://Make.com):
    - deal_ganho
    - deal_perdido
    - proposta_gerada
    - contrato_anexado
    - contrato_assinado
  Memória:
  - salvar nova memória mem://features/crm-vendas
  - adicionar role Vendedor em mem://auth/roles-and-permissions
  12. Etapas de implementação
  Manter as etapas originais, com os complementos:
  1. Migration:
  - enum vendedor
  - tabelas originais
  - RLS
  - triggers
  - buckets crm-proposals, crm-assets e crm-contracts
  - campos completos de form_responses
  - deal_signature_documents
  2. Atualizar tipos de role no frontend:
  - auth.tsx
  - ProtectedRoute
  - roleLabels
  - Sidebar
  3. CRUD Leads + página.
  4. CRUD Deals + Kanban com dnd-kit + regras de transição.
  5. Formulário público + edge function submit-crm-form.
  6. Motor de regras + tela de sugestão editável.
  7. Configurações CRM.
  8. Geração de PDF da proposta + upload Storage.
  9. Aba Documento de Assinatura:
  - upload
  - status
  - logs
  - download
  - marcação como enviado/assinado
  10. Conversão para implantação + bloco Origem Comercial na tela existente.
  11. Dashboard de vendas.
  12. Logs, webhooks e memória.
  13. Garantias de não-regressão
  Manter exatamente:
  - Zero alteração em tabelas implementations, clients, episodes, checklist_items, exceto INSERTs normais já previstos.
  - Zero alteração nas queries/components de Implantações, exceto componente novo isolado OrigemComercialCard.
  - Novo enum value não afeta usuários existentes.
  - RLS aditivo, não modifica políticas atuais.
  - Formulário, proposta e documento de assinatura ficam dentro do CRM/Vendas.
  - Proposta comercial e contrato/documento de assinatura são fluxos separados.
  - Documento de assinatura/contrato digitalizado não altera a geração de proposta.
  - Conversão para implantação continua do mesmo jeito previsto no plano original.  
    
