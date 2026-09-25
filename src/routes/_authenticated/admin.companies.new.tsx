import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { dbErrorMessage, PageHeader } from "@/components/admin-ui";
import { CompanyForm } from "@/components/admin-forms";

export const Route = createFileRoute("/_authenticated/admin/companies/new")({
  head: () => ({ meta: [{ title: "Nova empresa — Vellune Digital" }] }),
  component: NewCompany,
});

function NewCompany() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <div>
      <Link to="/admin/companies" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Empresas
      </Link>
      <PageHeader title="Nova empresa" />
      <CompanyForm initial={{ name: "", type: "", status: "active" }} submitLabel="Cadastrar empresa"
        onCancel={() => navigate({ to: "/admin/companies" })}
        onSubmit={async (v) => {
          const { data, error } = await supabase.from("companies").insert(v).select("id").single();
          if (error || !data) { toast.error(dbErrorMessage(error, "Já existe uma empresa com esse nome.")); return; }
          toast.success("Empresa cadastrada.");
          qc.invalidateQueries({ queryKey: ["admin"] });
          navigate({ to: "/admin/companies/$id", params: { id: data.id } });
        }} />
    </div>
  );
}
