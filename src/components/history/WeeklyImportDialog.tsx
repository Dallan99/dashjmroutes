import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, Upload } from "lucide-react";
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
  const mensagem = error instanceof Error ? error.message : "";
  if (mensagem.toLocaleLowerCase("pt-BR").includes("duplicate")) {
    return "Esta semana ou arquivo já possui uma importação concluída.";
  }
  return "Não foi possível concluir a importação semanal. Tente novamente.";
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

  const planilha = arquivo?.sheets.find((item) => item.name === aba) ?? null;
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

      const { error: erroConclusao } = await supabase
        .from("weekly_imports")
        .update({ status: "completed" })
        .eq("id", importId);
      if (erroConclusao) throw erroConclusao;

      await queryClient.invalidateQueries({ queryKey: ["weekly_imports"] });
      await queryClient.invalidateQueries({ queryKey: ["weekly_items"] });
      toast.success("Semana importada", {
        description: `${itens.length} registros foram salvos no histórico semanal.`,
      });
      fechar(false);
    } catch (error) {
      if (importId) {
        await supabase.from("weekly_imports").update({ status: "failed" }).eq("id", importId);
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

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Mapeamento de colunas</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {CAMPOS_INTERNOS.filter((campo) => !["semana", "ano", "categoria", "valor"].includes(campo.key)).map((campo) => (
                    <div key={campo.key} className="space-y-1.5">
                      <Label className="text-sm font-semibold">{campo.label}</Label>
                      <Select value={mapping[campo.key as CampoInterno] ?? NENHUMA} onValueChange={(valor) => setMapping((atual) => ({ ...atual, [campo.key]: valor === NENHUMA ? undefined : valor }))}>
                        <SelectTrigger><SelectValue placeholder="Não mapeado" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NENHUMA}>Não mapeado</SelectItem>
                          {planilha.headers.map((cabecalho) => <SelectItem key={cabecalho} value={cabecalho}>{cabecalho}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-sm font-medium text-muted-foreground">Colunas não mapeadas são preservadas nos dados adicionais do registro.</p>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold">
                  <span className="text-success">{resultado?.validas.length ?? 0} linhas válidas</span>
                  <span className="text-destructive">{resultado?.rejeitadas.length ?? 0} rejeitadas</span>
                  <span>Total: {brl(totalValor)}</span>
                </div>
              </div>

              {duplicada ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4"><p className="flex items-center gap-2 text-sm font-bold text-destructive"><AlertTriangle className="size-4" /> Arquivo já importado</p><p className="mt-1 text-sm font-medium">Este arquivo já possui uma importação semanal concluída.</p></div> : null}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => fechar(false)}>Cancelar</Button>
                <Button disabled={salvando} onClick={() => void importar()}>{salvando ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}Validar e importar</Button>
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
