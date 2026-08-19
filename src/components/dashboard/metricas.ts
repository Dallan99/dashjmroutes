import { BASES, PISO_JMROUTES, perdaProjetada } from "./data";

export type MetricaId = "perda-atual" | "perda-projetada" | "saving" | "escopo";

export const METRICAS: Record<
  MetricaId,
  { titulo: string; resumo: string; explicacao: string[] }
> = {
  "perda-atual": {
    titulo: "Perda mensal atual",
    resumo: "Soma das perdas operacionais mensais das bases críticas em processo manual.",
    explicacao: [
      "Cada base crítica opera hoje com roteirização manual, gerando retrabalho, quilometragem excedente e falhas de entrega.",
      "O valor é a soma direta das perdas mensais medidas em SSP15, SSP20, SSP25 e SSP45.",
      "A base SSP34 (Embu) não entra nesta conta: ela já opera com JMRoutes e serve de referência.",
    ],
  },
  "perda-projetada": {
    titulo: "Perda mensal projetada",
    resumo: "Perda residual estimada após a implantação do JMRoutes nas bases selecionadas.",
    explicacao: [
      `Nenhuma base zera a perda: o piso de referência é ${PISO_JMROUTES.toFixed(2)} por base, valor real observado em SSP34 (Embu).`,
      "Para cada base no escopo: projetado = atual − (atual − piso) × eficácia.",
      "Bases fora do escopo permanecem com a perda atual integral.",
    ],
  },
  saving: {
    titulo: "Saving mensal",
    resumo: "Diferença entre a perda atual e a perda projetada nas bases críticas.",
    explicacao: [
      "Saving mensal = perda atual total − perda projetada total.",
      "O saving anual multiplica esse valor por 12 meses.",
      "O slider de eficácia escala linearmente a parcela redutível de cada base.",
    ],
  },
  escopo: {
    titulo: "Bases no escopo",
    resumo: "Quantidade de bases críticas marcadas para receber o JMRoutes na simulação.",
    explicacao: [
      "São 4 bases críticas responsáveis por 97% das perdas por falhas operacionais.",
      "Cada base ativada adiciona sua parcela redutível ao saving total.",
      "Ative ou desative bases no painel de simulação para comparar cenários de rollout.",
    ],
  },
};

export function decomporBase(baseId: string, eficacia: number) {
  const base = BASES.find((b) => b.id === baseId);
  if (!base) return null;
  const redutivel = Math.max(base.perdaAtual - PISO_JMROUTES, 0);
  const projetado = perdaProjetada(base.perdaAtual, eficacia);
  return {
    base,
    piso: PISO_JMROUTES,
    redutivel,
    reducao: redutivel * eficacia,
    projetado,
    economiaMensal: base.perdaAtual - projetado,
    economiaAnual: (base.perdaAtual - projetado) * 12,
  };
}
