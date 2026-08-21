import { brl } from "../data";

export interface MaodeObraStats {
  xptsNoEscopo: number;
  estruturaCltTotal: number;
  novasContratacoes: number;
  custoUnitarioClt: number;
  custoTotalClt: number;
  custoNovasContratacoes: number;
  economiaMotoristasAmigos: number;
  impactoLiquido: number;
  percentualCompensado: number;
}

export const MO_CONFIG = {
  PREMISSAS: [
    "Mês simplificado: 30 dias",
    "Motorista Amigo: R$ 60/dia",
    "Faixa observada: R$ 50 a R$ 70/dia",
    "2 CLTs por XPT",
    "8 CLTs no total",
    "1 CLT já contratado em Embu",
    "7 novas contratações",
    "Custo estimado por CLT: R$ 4.458/mês",
  ],
  AVISO_CLT: "Custo CLT preliminar, sujeito à validação da folha JM.",
  VALORES: {
    custoUnitarioClt: 4458,
    qtdTotalClt: 8,
    qtdJaContratado: 1,
    qtdNovasContratacoes: 7,
    motoristaAmigoDia: 60,
    motoristasPorXptDia: 3,
    diasMes: 30,
    diasEscalaProposta: 17,
  }
};

export const MO_STATS: MaodeObraStats = {
  xptsNoEscopo: 4,
  estruturaCltTotal: MO_CONFIG.VALORES.qtdTotalClt,
  novasContratacoes: MO_CONFIG.VALORES.qtdNovasContratacoes,
  custoUnitarioClt: MO_CONFIG.VALORES.custoUnitarioClt,
  custoTotalClt: MO_CONFIG.VALORES.qtdTotalClt * MO_CONFIG.VALORES.custoUnitarioClt,
  custoNovasContratacoes: MO_CONFIG.VALORES.qtdNovasContratacoes * MO_CONFIG.VALORES.custoUnitarioClt,
  economiaMotoristasAmigos: 13440, // Baseado em (3*60*30 - 2*60*17) * 4 = (5400 - 2040) * 4 = 13440
  impactoLiquido: 22224, // 35664 - 13440
  percentualCompensado: 38,
};

export const ESCALA_SEMANAL = [
  { dia: "Segunda", atual: 3, proposto: 0 },
  { dia: "Terça", atual: 3, proposto: 0 },
  { dia: "Quarta", atual: 3, proposto: 0 },
  { dia: "Quinta", atual: 3, proposto: 2 },
  { dia: "Sexta", atual: 3, proposto: 2 },
  { dia: "Sábado", atual: 3, proposto: 2 },
  { dia: "Domingo", atual: 3, proposto: 2 },
];

export const COMPARATIVO_MOTORISTAS = [
  { cenario: "Atual: 3 × R$ 60 × 30 dias", porXpt: 5400, total4Xpts: 21600 },
  { cenario: "Proposto: 2 × R$ 60 × 17 dias", porXpt: 2040, total4Xpts: 8160 },
  { cenario: "Economia", porXpt: 3360, total4Xpts: 13440, isSaving: true },
];

export const VISAO_POR_XPT = [
  { xpt: "Embu", clts: 2, contratado: 1, novos: 1, custo: 8916 },
  { xpt: "Franco da Rocha", clts: 2, contratado: 0, novos: 2, custo: 8916 },
  { xpt: "Ibiúna", clts: 2, contratado: 0, novos: 2, custo: 8916 },
  { xpt: "Guarujá", clts: 2, contratado: 0, novos: 2, custo: 8916 },
];

export const getConsolidado = (savingSemanal: number) => {
  const savingMensal = (savingSemanal * 52) / 12;
  const impactoMaoDeObra = MO_STATS.impactoLiquido;
  const resultadoLiquido = savingMensal - impactoMaoDeObra;
  const percentualConsumido = (impactoMaoDeObra / savingMensal) * 100;

  return {
    savingMensal,
    impactoMaoDeObra,
    resultadoLiquido,
    percentualConsumido,
  };
};
