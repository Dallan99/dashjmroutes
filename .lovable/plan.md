# Plano de Evolução: JMRoutes Dashboard

Implementação das novas áreas de "Mão de Obra" e "Visão Consolidada", mantendo a identidade visual da JM Transportes e expandindo a análise de savings.

## Alterações Propostas

### 1. Navegação e Estrutura Principal
- Adição de abas no topo da página principal:
  - **Savings Operacionais**: Dashboard atual (SSP15, SSP20, etc.).
  - **Mão de Obra**: Nova área focada em estrutura CLT e Motoristas Amigos.
  - **Visão Consolidada**: Resumo financeiro total.
- Refatoração de `src/routes/index.tsx` para gerenciar o estado da aba ativa.

### 2. Nova Área: Mão de Obra
- **KPI Cards**: 6 indicadores (XPTs, Estrutura CLT, Novas Contratações, Custo Total, Economia Motoristas, Impacto Líquido).
- **Bloco de Premissas**: Accordion/recolhível detalhando os valores base do estudo.
- **Gráfico Waterfall**: Representação visual do impacto (Custo CLT vs. Economia Motoristas).
- **Tabelas Detalhadas**:
  - Escala Semanal (Atual vs. Proposto).
  - Comparativo financeiro de Motoristas Amigos.
  - Detalhamento de custo CLT por colaborador e estrutura.
  - Visão por base XPT (Embu, Franco, Ibiúna, Guarujá).

### 3. Visão Consolidada
- Tabela resumida integrando o Saving Operacional anual projetado com o Impacto Líquido da Mão de Obra.

### 4. Componentes e Estilização
- Uso de `Accordion` do Shadcn UI para as premissas.
- Criação de componente Waterfall customizado com `Recharts`.
- Manutenção rigorosa das cores: Navy Blue e Yellow.

## Detalhes Técnicos
- Persistência da aba ativa na URL (opcional, mas recomendado para navegação).
- Atualização das projeções para 52 semanas conforme diretriz anterior.
- Inclusão do aviso sobre custo CLT preliminar.
