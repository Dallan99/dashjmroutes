# Plano de Evolução: JMRoutes Dashboard (V2 - Ajustado)

Implementação das novas áreas de "Mão de Obra" e "Visão Consolidada", mantendo a identidade visual da JM Transportes e expandindo a análise de savings.

## Alterações Propostas

### 1. Navegação e Estrutura Principal
- **Navegação**: Abas no topo controladas pelo query parameter `?view=`:
  - `savings`: Savings Operacionais (Default).
  - `mao-de-obra`: Gestão de mão de obra CLT.
  - `consolidado`: Resumo mensal financeiro completo.
- **Componentização**: Divisão em `SavingsView`, `LaborView` e `ConsolidatedView` para melhor manutenção.

### 2. Módulo de Mão de Obra (Base Mensal)
- **Foco Mensal**: Não haverá anualização nesta seção.
- **KPIs**: 6 cards destacando o Impacto Líquido de R$ 22.224/mês (Compensação de ~38%).
- **Detalhamento**:
  - Tabela de Escala Semanal (Heatmap).
  - Tabela de Custos CLT (Total 8 CLTs: R$ 35.664).
  - Waterfall de Impacto Líquido (Custo total vs Economia Motoristas).
- **Aviso**: Exibição obrigatória sobre custo CLT preliminar.

### 3. Visão Consolidada (Base Mensal)
- Conversão do Saving Semanal Operacional para base mensal: `savingSemanal × 52 / 12`.
- Tooltip explicativo sobre a conversão mensal equivalente.
- Resultado líquido final unificando ganhos de sistema e custos de estrutura fixa.

### 4. Componentes e Estilização
- Manutenção da identidade JM (Navy/Yellow).
- Uso de Accordion para premissas e tooltips para fórmulas.

## Detalhes Técnicos
- Persistência de estado na URL via TanStack Router.
- Módulo `src/components/dashboard/labor-data.ts` como fonte única de verdade para premissas.
