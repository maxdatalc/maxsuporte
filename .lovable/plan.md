# Criar implantação a partir do calendário de disponibilidade

## Objetivo
No modal de detalhes do dia (em `/admin/disponibilidade`), permitir clicar no nome de um analista — tanto na lista de "Disponíveis" quanto na de "Ocupados" — e ser levado para a tela de Nova Implantação já com a **data de início** e o **analista responsável** pré-preenchidos.

## Fluxo do usuário
1. Admin abre Disponibilidade → clica em um dia do calendário.
2. Modal exibe analistas Ocupados e Disponíveis.
3. Cada nome de analista vira clicável (com tooltip "Criar implantação para este analista neste dia") e mostra um pequeno ícone "+".
4. Ao clicar, navega para `/admin/implantacoes/nova?analyst=<user_id>&date=YYYY-MM-DD`.
5. A tela de Nova Implantação abre com:
   - Campo "Data de Início" preenchido com a data escolhida.
   - Checkbox do analista correspondente já marcado na lista de "Implantadores Responsáveis".
   - Demais campos vazios para o admin completar (cliente, CNPJ, modo, tempo etc.).
6. Um banner discreto no topo do formulário indica: "Pré-preenchido a partir do calendário de disponibilidade".

## Arquivos alterados

### 1. `src/pages/admin/DisponibilidadeCalendario.tsx`
- Importar `useNavigate` do `react-router-dom` e `Plus` do `lucide-react`.
- Criar handler `handleCreateImplantacao(userId, date)` que fecha o dialog e navega para `/admin/implantacoes/nova?analyst=${userId}&date=${format(date,'yyyy-MM-dd')}`.
- Em **Ocupados**: transformar o `<h5>` do nome em um `<button>` com hover, ícone `Plus` ao lado, chamando o handler.
- Em **Disponíveis**: transformar o card do analista em um `<button>` clicável (mantendo o estilo verde), com `Plus` no canto, chamando o handler.
- Adicionar `Tooltip` (já disponível em `@/components/ui/tooltip`) com a mensagem explicativa.

### 2. `src/pages/admin/NovaImplantacao.tsx`
- Importar `useSearchParams` do `react-router-dom`.
- Em um `useEffect` que roda após `fetchImplementers()` resolver (quando `implementers.length > 0`):
  - Ler `analyst` e `date` da query string.
  - Se `date` válido (YYYY-MM-DD), setar `startDate` com esse valor.
  - Se `analyst` corresponder a um `implementers[i].user_id`, setar `selectedImplementerIds([analystId])`.
- Adicionar um `Alert`/banner azul no topo do `CardContent` quando ambos os parâmetros existirem, com texto: "Pré-preenchido a partir do calendário de disponibilidade — analista e data já selecionados."

## Detalhes técnicos
- Usar `format(date, 'yyyy-MM-dd')` (date-fns já está no projeto) para evitar problemas de timezone na URL.
- Na leitura em NovaImplantacao, NÃO converter a string para `Date` — o input `type="date"` aceita o formato `YYYY-MM-DD` direto (regra de memória sobre `T00:00:00` não se aplica aqui pois não criamos um `Date` JS).
- Garantir que o pré-preenchimento aconteça **depois** que `implementers` carrega, senão o checkbox correspondente ainda não existe na UI (o state `selectedImplementerIds` aceita o ID mesmo assim — é só uma garantia visual).
- Não alterar lógica de validação nem de submissão da NovaImplantacao.

## O que NÃO muda
- Schema do banco, RLS, edge functions, webhooks, regras de comissão, validações de tempo mínimo (30 min), criação de checklist padrão.
- Comportamento existente quando a tela de Nova Implantação é aberta sem query params (continua vazia).
