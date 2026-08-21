# Plano de Evolução: JMRoutes Dashboard (V3 - Final)

Implementação das áreas de "Mão de Obra" e "Visão Consolidada", mantendo a identidade visual JM Transportes e centralizando regras de cálculo.

## 1. Navegação
- **Estrutura**: Abas no topo (`Savings Operacionais`, `Mão de Obra`, `Visão Consolidada`).
- **Persistência**: Query parameter `?view=` (`savings`, `mao-de-obra`, `consolidado`).
- **Padrão**: Abertura em `savings`.

## 2. Savings Operacionais
- Manutenção do dashboard atual.
- Atualização das projeções para 52 semanas.
- Saving anual mantido como indicador secundário.

## 3. Mão de Obra (Base Mensal)
- **KPIs**:
  - XPTs no escopo: 4.
  - Estrutura CLT: 8 colaboradores (1 em Embu + 7 novos).
  - Custo total (8 CLTs): R$ 35.664/mês.
  - Economia Motoristas Amigos: R$ 13.440/mês.
  - Impacto líquido: R$ 22.224/mês (Destaque visual).
- **Conteúdo**: Tabela de escala, waterfall de impacto e detalhamento por XPT.
- **Aviso**: "Custo CLT preliminar, sujeito à validação da folha JM."

## 4. Visão Consolidada (Base Mensal)
- **Cálculos Dinâmicos**:
  - `savingOperacionalMensal = savingSemanal * 52 / 12` (Com tooltip explicativo).
  - `resultadoLiquidoConsolidado = savingOperacionalMensal - impactoLiquidoMaoDeObra`.
  - `percentualSavingConsumido = impactoLiquidoMaoDeObra / savingOperacionalMensal * 100`.
- **Cards**: Resumo financeiro unificado integrando sistema e mão de obra.

## 5. Componentes e Regras de Cálculo
- **Modularização**: Criação de subcomponentes (`SavingsView`, `LaborView`, `ConsolidatedView`, etc.).
- **Single Source of Truth**: Centralização de fórmulas e constantes em `src/components/dashboard/labor-data.ts`.
- **Identidade Visual**: Preservação do Navy Blue e Yellow.
