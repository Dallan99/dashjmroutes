import { brl } from "./data";

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
  VALORES_PADRAO: {
    quantidadeXpts: 4,
    cltsPorXpt: 2,
    cltsJaContratados: 1,
    custoMensalClt: 4458,
    motoristasAtuais: 3,
    valorDiario: 60,
    diasAtuais: 30,
    motoristasPropostos: 2,
    diasPropostos: 17,
  }
};

export interface LaborPremises {
  quantidadeXpts: number;
  cltsPorXpt: number;
  cltsJaContratados: number;
  custoMensalClt: number;
  motoristasAtuais: number;
  valorDiario: number;
  diasAtuais: number;
  motoristasPropostos: number;
  diasPropostos: number;
}

export const calculateLaborStats = (p: LaborPremises) => {
  const totalClts = p.quantidadeXpts * p.cltsPorXpt;
  const novasContratacoes = Math.max(totalClts - p.cltsJaContratados, 0);
  const custoCltTotal = totalClts * p.custoMensalClt;
  const custoNovasContratacoes = novasContratacoes * p.custoMensalClt;

  const custoMotoristasAtual = p.quantidadeXpts * p.motoristasAtuais * p.valorDiario * p.diasAtuais;
  const custoMotoristasProposto = p.quantidadeXpts * p.motoristasPropostos * p.valorDiario * p.diasPropostos;
  const economiaMotoristas = custoMotoristasAtual - custoMotoristasProposto;

  const impactoLiquido = custoCltTotal - economiaMotoristas;
  const percentualCompensacao = custoCltTotal > 0 ? (economiaMotoristas / custoCltTotal) * 100 : 0;

  return {
    totalClts,
    novasContratacoes,
    custoCltTotal,
    custoNovasContratacoes,
    custoMotoristasAtual,
    custoMotoristasProposto,
    economiaMotoristas,
    impactoLiquido,
    percentualCompensacao,
  };
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

export const getConsolidado = (savingSemanal: number, impactoMaoDeObra: number) => {
  const savingMensal = (savingSemanal * 52) / 12;
  const resultadoLiquido = savingMensal - impactoMaoDeObra;
  const percentualConsumido = (impactoMaoDeObra / savingMensal) * 100;

  return {
    savingMensal,
    impactoMaoDeObra,
    resultadoLiquido,
    percentualConsumido,
  };
};
