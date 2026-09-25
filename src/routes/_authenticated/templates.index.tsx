import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState, PageHeader, StatusToggle } from "@/components/admin-ui";
import { TemplateCard, TemplateFilters, templateError } from "@/components/template-ui";
import { duplicateTemplate, listTemplates, setTemplateStatus, templatesKey, useOfficialTemplate, type Template } from "@/lib/templates";

export const Route = createFileRoute("/_authenticated/templates/")({
  head: () => ({ meta: [{ title: "Modelos — Convitely" }] }),
  component: CompanyTemplates,
});

const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

function CompanyTemplates() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: templatesKey, queryFn: listTemplates });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const match = (t: Template) => (category === "all" || t.category === category) && t.name.toLowerCase().includes(search.trim().toLowerCase());
  const official = useMemo(() => (q.data ?? []).filter((t) => t.type === "official" && t.status === "active" && match(t)), [q.data, search, category]);
  const mine = useMemo(() => (q.data ?? []).filter((t) => t.type === "company" && match(t)), [q.data, search, category]);
  const refresh = () => qc.invalidateQueries({ queryKey: templatesKey });
  const open = (id: string) => navigate({ to: "/templates/$id", params: { id } });

  const use = async (t: Template) => {
    try { const id = await useOfficialTemplate(t.id); toast.success("Cópia criada em Meus modelos."); await refresh(); open(id); }
    catch (e) { toast.error(templateError(e)); }
  };
  const dup = async (t: Template) => {
    try { const id = await duplicateTemplate(t); toast.success("Modelo duplicado."); await refresh(); open(id); }
    catch (e) { toast.error(templateError(e)); }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Modelos" description="Use um modelo oficial como base ou crie os seus."
        action={<Button asChild><Link to="/templates/new"><Plus className="h-4 w-4" />Novo modelo</Link></Button>} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <TemplateFilters search={search} setSearch={setSearch} category={category} setCategory={setCategory} />
      </div>
      {q.isLoading ? <LoadingState /> : q.isError ? <EmptyState>Não foi possível carregar os modelos.</EmptyState> : (
        <>
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">Modelos oficiais</h2>
            {official.length === 0 ? <EmptyState>Nenhum modelo oficial encontrado.</EmptyState> : (
              <div className={grid}>{official.map((t) => (
                <TemplateCard key={t.id} t={t} actions={<>
                  <Button size="sm" variant="outline" asChild><Link to="/templates/$id" params={{ id: t.id }}>Visualizar</Link></Button>
                  <Button size="sm" onClick={() => use(t)}>Usar modelo</Button>
                </>} />
              ))}</div>
            )}
          </section>
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">Meus modelos</h2>
            {mine.length === 0 ? <EmptyState>Você ainda não tem modelos. Crie um ou use um modelo oficial.</EmptyState> : (
              <div className={grid}>{mine.map((t) => (
                <TemplateCard key={t.id} t={t} actions={<>
                  <Button size="sm" variant="outline" asChild><Link to="/templates/$id" params={{ id: t.id }}>Visualizar</Link></Button>
                  <Button size="sm" variant="outline" asChild><Link to="/templates/$id" params={{ id: t.id }} search={{ edit: true }}>Editar</Link></Button>
                  <Button size="sm" variant="outline" onClick={() => dup(t)}>Duplicar</Button>
                  <StatusToggle status={t.status} name={t.name} onConfirm={async () => {
                    try { await setTemplateStatus(t.id, t.status === "active" ? "inactive" : "active"); await refresh(); } catch (e) { toast.error(templateError(e)); }
                  }} />
                </>} />
              ))}</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
