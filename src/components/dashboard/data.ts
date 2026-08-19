export type Base = {
  id: string;
  nome: string;
  perdaAtual: number;
  comJMRoutes: boolean;
};

/** Piso de perda observado na base de referência SSP34 (Embu) operando com JMRoutes. */
export const PISO_JMROUTES = 237.18;

export const BASES: Base[] = [
  { id: "SSP15", nome: "SSP15", perdaAtual: 25346.7, comJMRoutes: false },
  { id: "SSP20", nome: "SSP20", perdaAtual: 19764.28, comJMRoutes: false },
  { id: "SSP25", nome: "SSP25", perdaAtual: 13757.57, comJMRoutes: false },
  { id: "SSP45", nome: "SSP45", perdaAtual: 2973.06, comJMRoutes: false },
  { id: "SSP34", nome: "SSP34 (Embu)", perdaAtual: 237.18, comJMRoutes: true },
];

export const brl = (valor: number) =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const brlCurto = (valor: number) =>
  `R$ ${(valor / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;

/** Perda projetada após implantação, considerando a eficácia informada (0-1). */
export function perdaProjetada(perdaAtual: number, eficacia: number) {
  const reducao = Math.max(perdaAtual - PISO_JMROUTES, 0) * eficacia;
  return perdaAtual - reducao;
}
