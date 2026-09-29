import { createFileRoute, redirect } from "@tanstack/react-router";

// Rota legada: o ranking agora é uma aba interna do painel (/?view=motoristas).
export const Route = createFileRoute("/motoristas")({
  beforeLoad: () => {
    throw redirect({ to: "/", search: { view: "motoristas" } });
  },
});
