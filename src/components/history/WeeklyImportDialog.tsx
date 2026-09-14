import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Layers,
  Loader2,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brl } from "@/components/dashboard/data";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  CAMPOS_INTERNOS,
  diagnosticarPlanilha,
  lerArquivo,
  normalizarSemana,
  sugerirMapeamento,
  transformarLinhas,
  type CampoInterno,
  type Mapping,
  type ParsedFile,
} from "./parse";

const NENHUMA = "__nenhuma__";
const normalizarTexto = (valor: string | null | undefined) =>
  valor?.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR") ?? "";

function mensagemErroImportacao(error: unknown) {
  const pgError = error as { message?: string; details?: string; hint?: string; code?: string } | undefined;
  const mensagem = pgError?.message || (error instanceof Error ? error.message : "");
  if (!mensagem) {
    return "Não foi possível importar a planilha. Verifique os dados e tente novamente.";
  }
  if (mensagem.toLocaleLowerCase("pt-BR").includes("duplicate") || pgError?.code === "23505") {
    return "Esta semana ou arquivo já possui uma importação concluída.";
  }
  const complemento = pgError?.details ? ` (${pgError.details})` : "";
  return `${mensagem}${complemento}`;
}

export function WeeklyImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [arquivo, setArquivo] = useState<ParsedFile | null>(null);
  const [aba, setAba] = useState("");
  const [mapping, setMapping] = useState<Mapping>({});
  const [semana, setSemana] = useState("");
  const [ano, setAno] = useState(new Date().getFullYear());
  const [carregandoArquivo, setCarregandoArquivo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [duplicada, setDuplicada] = useState(false);
  const [exibirTodosCampos, setExibirTodosCampos] = useState(false);

  const planilha = arquivo?.sheets.find((item) => item.name === aba) ?? null;
  const diagnostico = useMemo(
    () => diagnosticarPlanilha(planilha, mapping),
    [planilha, mapping],
  );

  const resultado = useMemo(
    () => (planilha ? transformarLinhas(planilha.rows, mapping) : null),
    [mapping, planilha],
  );
  const totalValor = useMemo(
    () => (resultado?.validas ?? []).reduce((total, item) => total + (item.amount ?? 0), 0),
    [resultado],
  );

  const resetar = () => {
    setArquivo(null);
    setAba("");
    setMapping({});
    setSemana("");
    setDuplicada(false);
    setExibirTodosCampos(false);
  };

  const fechar = (proximoEstado: boolean) => {
    if (!proximoEstado) resetar();
    onOpenChange(proximoEstado);
  };

  const selecionarArquivo = async (file: File | undefined) => {
    if (!file) return;
    setCarregandoArquivo(true);
    setDuplicada(false);

    try {
      const parsed = await lerArquivo(file);
      if (parsed.sheets.length === 0) {
        toast.error("Arquivo vazio", { description: "Nenhuma linha foi encontrada na planilha." });
        return;
      }

      const primeiraAba = parsed.sheets[0]!;
      setArquivo(parsed);
      setAba(primeiraAba.name);
      setMapping(sugerirMapeamento(primeiraAba.headers));
      setSemana(normalizarSemana(file.name.match(/[wW]\s?\d{1,2}/)?.[0] ?? "") ?? "");
    } catch {
      toast.error("Não foi possível ler o arquivo", {
        description: "Verifique se o arquivo é uma planilha .xlsx, .xls ou .csv válida.",
      });
    } finally {
      setCarregandoArquivo(false);
    }
  };

  const trocarAba = (nome: string) => {
    const proximaAba = arquivo?.sheets.find((item) => item.name === nome);
    if (!proximaAba) return;
    setAba(nome);
    setMapping(sugerirMapeamento(proximaAba.headers));
  };

  const importar = async () => {
    const weekCode = normalizarSemana(semana);
    if (!arquivo || !planilha || !resultado || !weekCode) {
      toast.error("Informe uma semana válida", { description: "Use o formato W01 até W53." });
      return;
    }
    if (resultado.validas.length === 0) {
      toast.error("Nenhuma linha válida para importar.");
      return;
    }

    setSalvando(true);
    setDuplicada(false);
    let importId: string | null = null;

    try {
      const { data: existentes, error: erroDuplicidade } = await supabase
        .from("weekly_imports")
        .select("id, status")
        .eq("file_hash", arquivo.hash)
        .eq("status", "completed");
      if (erroDuplicidade) throw erroDuplicidade;
      if ((existentes ?? []).length > 0) {
        setDuplicada(true);
        toast.warning("Arquivo já importado", {
          description: "Este arquivo já possui uma importação concluída no histórico.",
        });
        return;
      }

      const numeroSemana = Number(weekCode.slice(1));
      const { data: importacao, error: erroImportacao } = await supabase
        .from("weekly_imports")
        .insert({
          file_hash: arquivo.hash,
          file_name: arquivo.fileName,
          mapping_json: mapping as Json,
          status: "processing",
          is_current: false,
          week_code: weekCode,
          week_number: numeroSemana,
          year: ano,
        })
        .select("id")
        .single();
      if (erroImportacao) throw erroImportacao;

      importId = importacao.id;
      const { data: mapeamentos, error: erroMapeamentos } = await supabase
        .from("service_base_mappings")
        .select("service, base")
        .eq("active", true);
      if (erroMapeamentos) throw erroMapeamentos;

      const basesPorServico = new Map(
        (mapeamentos ?? []).map((item) => [normalizarTexto(item.service), item.base.trim()]),
      );
      const itens = resultado.validas.map((linha) => ({
        import_id: importId,
        base: linha.base ?? basesPorServico.get(normalizarTexto(linha.service)) ?? null,
        service: linha.service,
        package_id: linha.package_id,
        route_id: linha.route_id,
        driver: linha.driver,
        description: linha.description,
        event_date: linha.event_date,
        amount: linha.amount,
        operational_status: linha.operational_status,
        classification: linha.classification,
        decision: linha.decision,
        evidence_url: linha.evidence_url,
        extra_data: linha.extra_data as Json,
      }));

      for (let indice = 0; indice < itens.length; indice += 400) {
        const { error: erroItens } = await supabase
          .from("weekly_items")
          .insert(itens.slice(indice, indice + 400));
        if (erroItens) throw erroItens;
      }

      let rpcSucesso = false;
      try {
        const { error: erroRpcP } = await supabase.rpc(
          "concluir_importacao_semanal" as any,
          { p_import_id: importId } as any,
        );
        if (!erroRpcP) {
          rpcSucesso = true;
        } else {
          console.warn("[WeeklyImportDialog] RPC com p_import_id retornou erro, tentando import_id:", erroRpcP);
        }
      } catch (err) {
        console.warn("[WeeklyImportDialog] Falha ao invocar RPC p_import_id:", err);
      }

      if (!rpcSucesso) {
        try {
          const { error: erroRpcSemP } = await supabase.rpc(
            "concluir_importacao_semanal" as any,
            { import_id: importId } as any,
          );
          if (!erroRpcSemP) {
            rpcSucesso = true;
          } else {
            console.warn("[WeeklyImportDialog] RPC com import_id retornou erro, aplicando fallback direto:", erroRpcSemP);
          }
        } catch (err) {
          console.warn("[WeeklyImportDialog] Falha ao invocar RPC import_id:", err);
        }
      }

      if (!rpcSucesso) {
        const agora = new Date().toISOString();
        await supabase
          .from("weekly_imports")
          .update({
            is_current: false,
            superseded_by: importId,
            superseded_at: agora,
          })
          .eq("week_code", weekCode)
          .eq("year", ano)
          .neq("id", importId);

        const { error: erroConcluirDireto } = await supabase
          .from("weekly_imports")
          .update({
            status: "completed",
            is_current: true,
            imported_at: agora,
          })
          .eq("id", importId);

        if (erroConcluirDireto) throw erroConcluirDireto;
      }

      await queryClient.invalidateQueries({ queryKey: ["weekly_imports"] });
      await queryClient.invalidateQueries({ queryKey: ["weekly_items"] });
      toast.success("Semana importada", {
        description: `${itens.length} registros foram salvos no histórico semanal.`,
      });
      fechar(false);
    } catch (error) {
      console.error("[WeeklyImportDialog] Falha na importação semanal:", error);
      if (importId) {
        await supabase
          .from("weekly_imports")
          .update({ status: "failed", is_current: false })
          .eq("id", importId);
      }
      toast.error("Falha ao importar a semana", { description: mensagemErroImportacao(error) });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Importar semana</DialogTitle>
          <DialogDescription className="font-medium">
            Importação oficial do histórico semanal. Os registros são salvos exclusivamente no histórico semanal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Arquivo</Label>
            <Input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => void selecionarArquivo(event.target.files?.[0])} />
            {carregandoArquivo ? <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Lendo planilha…</p> : null}
          </div>

          {arquivo && planilha ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Aba</Label>
                  <Select value={aba} onValueChange={trocarAba}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{arquivo.sheets.map((item) => <SelectItem key={item.name} value={item.name}>{item.name} ({item.rows.length})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Semana</Label>
                  <Input value={semana} placeholder="W37" onChange={(event) => setSemana(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Ano</Label>
                  <Input type="number" value={ano} onChange={(event) => setAno(Number(event.target.value))} />
                </div>
              </div>

              {/* Resumo da Planilha */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileSpreadsheet className="size-4 text-primary" /> Resumo do arquivo
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {diagnostico.totalLinhas} linhas identificadas
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-3 text-xs">
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                    <span className="text-muted-foreground block font-medium">Colunas reconhecidas</span>
                    <span className="font-bold text-sm text-foreground">
                      {diagnostico.colunasReconhecidas.length} de {planilha.headers.length}
                    </span>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                    <span className="text-muted-foreground block font-medium">Colunas extras (preservadas)</span>
                    <span className="font-bold text-sm text-foreground">
                      {diagnostico.colunasExtras.length}
                    </span>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                    <span className="text-muted-foreground block font-medium">Bases identificadas</span>
                    <span className="font-bold text-sm text-foreground truncate block">
                      {diagnostico.basesIdentificadas.length > 0
                        ? diagnostico.basesIdentificadas.join(", ")
                        : "Via DSP/Serviço"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Diagnóstico & Exceções */}
              {diagnostico.estruturaCorrompida ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-destructive">
                    <AlertCircle className="size-4" /> Estrutura da planilha corrompida ou vazia
                  </p>
                  <p className="mt-1 text-xs font-medium text-destructive-foreground">
                    {diagnostico.motivoEstrutura}
                  </p>
                </div>
              ) : diagnostico.precisaIntervencao ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="size-4 text-destructive shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-destructive">
                          Intervenção manual necessária ({diagnostico.camposProblema.length} campo(s))
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Apenas os campos problemáticos requerem seleção manual para prosseguir.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 pt-1">
                    {diagnostico.camposProblema.map((campo) => (
                      <div key={campo.key} className="rounded-lg border border-destructive/20 bg-background p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-destructive">
                            {campo.label} {campo.required ? "*" : ""}
                          </Label>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                            {campo.status === "ambiguo"
                              ? "Múltiplas opções"
                              : "Não encontrada"}
                          </span>
                        </div>
                        <Select
                          value={mapping[campo.key] ?? NENHUMA}
                          onValueChange={(valor) =>
                            setMapping((atual) => ({
                              ...atual,
                              [campo.key]: valor === NENHUMA ? undefined : valor,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs border-destructive/40">
                            <SelectValue placeholder="Selecione a coluna correta" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NENHUMA}>Não mapeado</SelectItem>
                            {planilha.headers.map((cabecalho) => (
                              <SelectItem key={cabecalho} value={cabecalho}>
                                {cabecalho}
                                {campo.candidatos.includes(cabecalho) ? " (sugerido)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 px-3.5 py-2.5 text-xs text-success font-medium">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0" />
                    Todas as colunas essenciais foram reconhecidas automaticamente.
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-foreground font-semibold hover:bg-success/20"
                    onClick={() => setExibirTodosCampos((prev) => !prev)}
                  >
                    <SlidersHorizontal className="size-3 mr-1" />
                    {exibirTodosCampos ? "Ocultar colunas" : "Ajustar colunas"}
                    {exibirTodosCampos ? <ChevronUp className="size-3 ml-1" /> : <ChevronDown className="size-3 ml-1" />}
                  </Button>
                </div>
              )}

              {/* Mapeamento completo opcional */}
              {exibirTodosCampos ? (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Todas as colunas do sistema
                    </h3>
                    <span className="text-xs text-muted-foreground">Campos opcionais e extras</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {CAMPOS_INTERNOS.map((campo) => (
                      <div key={campo.key} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">{campo.label}</Label>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {campo.required ? "Essencial" : "Opcional"}
                          </span>
                        </div>
                        <Select
                          value={mapping[campo.key as CampoInterno] ?? NENHUMA}
                          onValueChange={(valor) =>
                            setMapping((atual) => ({
                              ...atual,
                              [campo.key]: valor === NENHUMA ? undefined : valor,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Não mapeado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NENHUMA}>Não mapeado</SelectItem>
                            {planilha.headers.map((cabecalho) => (
                              <SelectItem key={cabecalho} value={cabecalho}>
                                {cabecalho}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Prévia das primeiras linhas */}
              {resultado && resultado.validas.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
                    <span>Prévia das primeiras linhas</span>
                    <span>Exibindo até 5 de {resultado.validas.length} registros válidos</span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border bg-card text-xs shadow-sm">
                    <table className="w-full min-w-[680px]">
                      <thead className="bg-muted/60 text-muted-foreground">
                        <tr className="text-left font-bold uppercase tracking-wider">
                          <th className="px-3 py-2">Data</th>
                          <th className="px-3 py-2">Base / Serv.</th>
                          <th className="px-3 py-2">Pacote</th>
                          <th className="px-3 py-2">Motorista</th>
                          <th className="px-3 py-2 text-right">Valor</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.validas.slice(0, 5).map((linha, idx) => (
                          <tr key={idx} className="border-t border-border hover:bg-muted/20">
                            <td className="px-3 py-2 whitespace-nowrap font-medium">{linha.event_date ?? "—"}</td>
                            <td className="px-3 py-2 whitespace-nowrap font-semibold">{linha.base ?? linha.service ?? "—"}</td>
                            <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px]">{linha.package_id ?? "—"}</td>
                            <td className="px-3 py-2 whitespace-nowrap truncate max-w-[120px]">{linha.driver ?? "—"}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums font-bold text-destructive">
                              {linha.amount !== null ? brl(linha.amount) : "—"}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{linha.operational_status ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="rounded-lg border border-border bg-muted/40 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm font-semibold">
                  <div className="flex items-center gap-4">
                    <span className="text-success">{resultado?.validas.length ?? 0} linhas válidas</span>
                    <span className="text-destructive">{resultado?.rejeitadas.length ?? 0} rejeitadas</span>
                  </div>
                  <span className="text-foreground font-bold">Total: {brl(totalValor)}</span>
                </div>
              </div>

              {duplicada ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-destructive">
                    <AlertTriangle className="size-4" /> Arquivo já importado
                  </p>
                  <p className="mt-1 text-xs font-medium">
                    Este arquivo já possui uma importação semanal concluída.
                  </p>
                </div>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => fechar(false)}>
                  Cancelar
                </Button>
                <Button
                  disabled={salvando || diagnostico.precisaIntervencao || (resultado?.validas.length ?? 0) === 0}
                  onClick={() => void importar()}
                >
                  {salvando ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                  Validar e importar
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function WeeklyImportButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return <><Button onClick={() => setOpen(true)} className={className} size="lg"><Upload className="mr-2 size-4" /> Importar semana</Button><WeeklyImportDialog open={open} onOpenChange={setOpen} /></>;
}
