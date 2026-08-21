import { brl } from "./data";

export interface MaodeObraStats {
  xptsNoEscopo: number;
  estruturaCltTotal: number;
  novasContratacoes: number;
  custoTotalClt: number;
  economiaMotoristasAmigos: number;
  impactoLiquido: number;
  percentualCompensado: number;
}

export const MO_STATS: MaodeObraStats = {
  xptsNoEscopo: 4,
  estruturaCltTotal: 8,
  novasContratacoes: 7,
  custoTotalClt: 35664,
  economiaMotoristasAmigos: 13440,
  impactoLiquido: 22224,
  percentualCompensado: 38,
};

export const MO_PREMISSAS = [
  "Mês simplificado: 30 dias",
  "Motorista Amigo: R$ 60/dia",
  "Faixa observada: R$ 50 a R$ 70/dia",
  "2 CLTs por XPT",
  "8 CLTs no total",
  "1 CLT já contratado em Embu",
  "7 novas contratações",
  "Custo estimado por CLT: R$ 4.458/mês",
];

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

export const CUSTO_CLT_DETALHE = [
  { ref: "Por colaborador", qtd: 1, custo: 4458 },
  { ref: "Estrutura total", qtd: 8, custo: 35664 },
  { ref: "Composição", qtd: "1 contratado + 7 novos", custo: 0, showDash: true },
];

export const VISAO_POR_XPT = [
  { xpt: "Embu", clts: 2, contratado: 1, novos: 1, custo: 8916 },
  { xpt: "Franco da Rocha", clts: 2, contratado: 0, novos: 2, custo: 8916 },
  { xpt: "Ibiúna", clts: 2, contratado: 0, novos: 2, custo: 8916 },
  { xpt: "Guarujá", clts: 2, contratado: 0, novos: 2, custo: 8916 },
];
