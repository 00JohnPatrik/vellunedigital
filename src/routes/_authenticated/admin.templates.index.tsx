import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState, PageHeader, StatusTabs, StatusToggle, type StatusFilter } from "@/components/admin-ui";
import { TemplateCard, TemplateFilters, templateError } from "@/components/template-ui";
import { duplicateTemplate, listTemplates, setTemplateStatus, templatesKey, type Template } from "@/lib/templates";

export const Route = createFileRoute("/_authenticated/admin/templates/")({
  head: () => ({ meta: [{ title: "Modelos oficiais — Convitely" }] }),
  component: AdminTemplates,
});

function AdminTemplates() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: templatesKey, queryFn: listTemplates });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const rows = useMemo(() => (q.data ?? []).filter((t) => t.type === "official"
    && (status === "all" || t.status === status) && (category === "all" || t.category === category)
    && t.name.toLowerCase().includes(search.trim().toLowerCase())), [q.data, search, category, status]);
  const refresh = () => qc.invalidateQueries({ queryKey: templatesKey });
  const dup = async (t: Template) => {
    try { const id = await duplicateTemplate(t); toast.success("Modelo duplicado."); await refresh(); navigate({ to: "/admin/templates/$id", params: { id } }); }
    catch (e) { toast.error(templateError(e)); }
  };

  return (
    <div>
      <PageHeader title="Modelos oficiais" description="Modelos disponíveis para todas as empresas."
        action={<Button asChild><Link to="/admin/templates/new"><Plus className="h-4 w-4" />Novo modelo</Link></Button>} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <TemplateFilters search={search} setSearch={setSearch} category={category} setCategory={setCategory} />
        <StatusTabs value={status} onChange={setStatus} labels={["Todas", "Ativas", "Inativas"]} />
      </div>
      {q.isLoading ? <LoadingState /> : q.isError ? <EmptyState>Não foi possível carregar os modelos.</EmptyState> : rows.length === 0 ? <EmptyState>Nenhum modelo encontrado.</EmptyState> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((t) => (
            <TemplateCard key={t.id} t={t} actions={<>
              <Button size="sm" variant="outline" asChild><Link to="/admin/templates/$id" params={{ id: t.id }}>Visualizar</Link></Button>
              <Button size="sm" variant="outline" asChild><Link to="/admin/templates/$id" params={{ id: t.id }} search={{ edit: true }}>Editar</Link></Button>
              <Button size="sm" variant="outline" onClick={() => dup(t)}>Duplicar</Button>
              <StatusToggle status={t.status} name={t.name} onConfirm={async () => {
                try { await setTemplateStatus(t.id, t.status === "active" ? "inactive" : "active"); await refresh(); } catch (e) { toast.error(templateError(e)); }
              }} />
            </>} />
          ))}
        </div>
      )}
    </div>
  );
}
