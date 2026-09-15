import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { LockKeyhole, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export function useSavingsSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error("[SavingsAccess] Não foi possível verificar a sessão:", error);
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

export function SavingsAccess() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);

    if (error) {
      toast.error("Não foi possível entrar", { description: "Confira o e-mail e a senha." });
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-border bg-card p-7 shadow-sm">
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <LockKeyhole className="size-5" />
      </div>
      <h2 className="mt-4 text-xl font-bold">Acesso ao Savings</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Entre com uma conta autorizada para consultar, importar ou excluir semanas.
      </p>
      <form className="mt-6 space-y-4" onSubmit={signIn}>
        <div className="space-y-1.5">
          <Label htmlFor="savings-email">E-mail</Label>
          <Input id="savings-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="savings-password">Senha</Label>
          <Input id="savings-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>
        <Button className="w-full" type="submit" disabled={submitting}>
          <LogIn className="mr-2 size-4" />
          {submitting ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </section>
  );
}
