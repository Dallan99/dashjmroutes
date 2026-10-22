import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useWeeklyImportsHistory } from "./weekly-api";
import { deleteConfirmedWeeklyImport, deletionError, prepareWeeklyDeletion, type DeletionConfirmation } from "./weekly-deletion";

export function WeeklyImportHistory({ onDeleted }: { onDeleted?: (id: string) => void }) {
  const history = useWeeklyImportsHistory();
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = useState<DeletionConfirmation | null>(null);
  const [preparing, setPreparing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const busy = preparing !== null || deleting;

  async function prepare(id: string) {
    if (busy) return;
    setPreparing(id);
    setError("");
    try {
      setConfirmation(await prepareWeeklyDeletion(id));
    } catch (cause) {
      setError(deletionError(cause));
    } finally {
      setPreparing(null);
    }
  }

  async function remove() {
    if (!confirmation || busy) return;
    setDeleting(true);
    setError("");
    try {
      await deleteConfirmedWeeklyImport(confirmation);
    } catch (cause) {
      setError(deletionError(cause));
      setDeleting(false);
      return;
    }
    const deleted = confirmation;
    setConfirmation(null);
    onDeleted?.(deleted.id);
    try {
      await Promise.all(["weekly_imports", "weekly_items", "week_notes", "real_savings"].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key], refetchType: "all" }, { throwOnError: true }),
      ));
      toast.success("Importação excluída", { description: `${deleted.file_name} · ${deleted.week_code}/${deleted.year}. A planilha pode ser importada novamente.` });
    } catch {
      setError("A importação foi excluída, mas não foi possível atualizar todas as telas. Atualize o histórico.");
    } finally {
      setDeleting(false);
    }
  }

  return <>
    <Dialog onOpenChange={(open) => { if (open) { setError(""); void history.refetch(); } }}>
      <DialogTrigger asChild><Button variant="outline" className="w-full"><Clock /> Histórico de importações</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle>Histórico de importações semanais</DialogTitle><DialogDescription>Arquivos salvos e versões de cada semana.</DialogDescription></DialogHeader>
        {error && !confirmation && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
        {history.isLoading ? <p role="status">Carregando importações…</p> : history.isError ? <div role="alert"><p>Não foi possível carregar o histórico.</p><Button variant="outline" onClick={() => void history.refetch()}>Tentar novamente</Button></div> : <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground"><tr><th className="p-3 text-left">Semana/ano</th><th className="p-3 text-left">Arquivo</th><th className="p-3 text-left">Versão</th><th className="p-3 text-right">Registros</th><th className="p-3"><span className="sr-only">Ações</span></th></tr></thead>
            <tbody>{(history.data ?? []).map((entry) => <tr key={entry.id} className="border-b border-border">
              <td className="whitespace-nowrap p-3 font-bold">{entry.week_code}/{entry.year}</td>
              <td className="min-w-48 p-3"><p className="break-words font-semibold">{entry.file_name}</p><p className="text-muted-foreground">{entry.imported_at ? new Date(entry.imported_at).toLocaleString("pt-BR") : "Data não informada"}</p></td>
              <td className="p-3">{entry.status === "completed" ? entry.is_current ? "Atual" : "Substituída" : entry.status === "processing" ? "Em processamento" : "Não concluída"}</td>
              <td className="p-3 text-right tabular-nums">{entry.items_count}</td>
              <td className="p-3"><Button variant="ghost" size="icon" className="text-destructive" title={`Excluir ${entry.file_name}`} aria-label={`Excluir importação ${entry.file_name}`} disabled={busy || entry.status === "processing"} onClick={() => void prepare(entry.id)}>{preparing === entry.id ? <Loader2 className="animate-spin" /> : <Trash2 />}</Button></td>
            </tr>)}</tbody>
          </table>
          {!history.data?.length && <p className="p-4 text-center text-muted-foreground">Nenhuma importação salva.</p>}
        </div>}
    </DialogContent></Dialog>
    <AlertDialog open={confirmation !== null} onOpenChange={(open) => { if (!open && !deleting) { setConfirmation(null); setError(""); } }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Excluir esta importação permanentemente?</AlertDialogTitle><AlertDialogDescription asChild><div className="space-y-2 text-sm">
          <p className="break-words"><strong>Arquivo:</strong> {confirmation?.file_name}</p>
          <p><strong>Semana/ano:</strong> {confirmation?.week_code}/{confirmation?.year}</p>
          <p><strong>Registros afetados:</strong> {confirmation?.items_count} pedidos, {confirmation?.notes_count} observações e 1 importação.</p>
          <p>Esta ação não pode ser desfeita. Outras semanas não serão apagadas.</p>
          {confirmation?.is_current && <p>A versão concluída mais recente desta mesma semana voltará a ser atual, se existir.</p>}
        </div></AlertDialogDescription></AlertDialogHeader>
        {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); void remove(); }}>{deleting ? "Excluindo…" : "Confirmar exclusão"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}