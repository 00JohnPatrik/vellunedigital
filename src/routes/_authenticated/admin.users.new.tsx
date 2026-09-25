import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { dbErrorMessage, PageHeader } from "@/components/admin-ui";
import { UserForm } from "@/components/admin-forms";
import { sendAccessInvite } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/users/new")({
  validateSearch: z.object({ company: z.string().optional() }),
  head: () => ({ meta: [{ title: "Novo administrador — Convitely" }] }),
  component: NewUser,
});

function NewUser() {
  const { company } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const invite = useServerFn(sendAccessInvite);
  return (
    <div>
      <Link to="/admin/users" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Usuários
      </Link>
      <PageHeader title="Novo administrador de empresa" description="Ele receberá um e-mail para criar a própria senha." />
      <UserForm initial={{ name: "", email: "", phone: "", company_id: company ?? "", status: "active" }} submitLabel="Cadastrar e enviar acesso"
        onCancel={() => navigate({ to: "/admin/users" })}
        onSubmit={async (v) => {
          const { data, error } = await supabase.from("users")
            .insert({ ...v, phone: v.phone || null, role: "company_admin" }).select("id").single();
          if (error || !data) { toast.error(dbErrorMessage(error, "Já existe um usuário com esse e-mail.")); return; }
          toast.success("Administrador cadastrado.");
          qc.invalidateQueries({ queryKey: ["admin"] });
          if (v.status === "active") {
            const r = await invite({ data: { userId: data.id, origin: window.location.origin } }).catch(() => null);
            if (r?.ok) toast.success(`Acesso inicial enviado para ${v.email}.`);
            else toast.error(r?.error ?? "Não foi possível enviar o acesso. Tente reenviar na página do usuário.");
          }
          navigate({ to: "/admin/users/$id", params: { id: data.id } });
        }} />
    </div>
  );
}
