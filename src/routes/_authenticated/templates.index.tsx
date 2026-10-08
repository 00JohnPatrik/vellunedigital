import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Heart, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState, PageHeader, StatusToggle } from "@/components/admin-ui";
import { TemplateCard, TemplateFilters, templateError } from "@/components/template-ui";
import { duplicateTemplate, listTemplates, setTemplateStatus, templatesKey, useOfficialTemplate, type Template } from "@/lib/templates";
import { listTemplateFavorites, setTemplateFavorite, templateFavoritesKey } from "@/lib/template-favorites";

export const Route = createFileRoute("/_authenticated/templates/")({
  head: () => ({ meta: [{ title: "Modelos — Vellune Digital" }] }),
  component: CompanyTemplates,
});

const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

function CompanyTemplates() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { appUser } = Route.useRouteContext();
  const q = useQuery({ queryKey: templatesKey, queryFn: listTemplates });
  const favoritesQ = useQuery({ queryKey: templateFavoritesKey(appUser!.id), queryFn: () => listTemplateFavorites(appUser!.id) });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<"recent" | "az">("recent");
  const sortTemplates = (items: Template[]) => [...items].sort((a, b) => sort === "az" ? a.name.localeCompare(b.name, "pt-BR") : String(b.created_at).localeCompare(String(a.created_at)));
  const favoriteIds = new Set(favoritesQ.data ?? []);
  const match = (t: Template) => (category === "all" || t.category === category)
    && t.name.toLowerCase().includes(search.trim().toLowerCase())
    && (!favoritesOnly || favoriteIds.has(t.id));
  const official = useMemo(() => sortTemplates((q.data ?? []).filter((t) => t.type === "official" && t.status === "active" && match(t))), [q.data, search, category, favoritesOnly, favoritesQ.data, sort]);
  const mine = useMemo(() => sortTemplates((q.data ?? []).filter((t) => t.type === "company" && match(t))), [q.data, search, category, favoritesOnly, favoritesQ.data, sort]);
  const refresh = () => qc.invalidateQueries({ queryKey: templatesKey });
  const toggleFavorite = async (t: Template) => {
    const favorite = favoriteIds.has(t.id);
    qc.setQueryData<string[]>(templateFavoritesKey(appUser!.id), (current) => {
      const ids = new Set(current ?? []);
      if (favorite) ids.delete(t.id); else ids.add(t.id);
      return [...ids];
    });
    try {
      await setTemplateFavorite(appUser!.id, t.id, !favorite);
      toast.success(favorite ? "Removido dos favoritos." : "Adicionado aos favoritos.");
    } catch {
      void qc.invalidateQueries({ queryKey: templateFavoritesKey(appUser!.id) });
      toast.error("Não foi possível atualizar o favorito.");
    }
  };
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
      <div className="rounded-[22px] border border-[#2a2b31] bg-[#111318] p-3 shadow-[0_18px_55px_-42px_rgba(0,0,0,0.95)] sm:p-4">
        <TemplateFilters search={search} setSearch={setSearch} category={category} setCategory={setCategory} />
      </div>
      {q.isLoading ? <LoadingState /> : q.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm font-medium text-destructive">Não foi possível carregar os modelos.</p>
          <p className="mt-1 text-sm text-muted-foreground">Tente novamente para atualizar a biblioteca.</p>
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => void q.refetch()}>Tentar novamente</Button>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 rounded-full border border-[#2a2b31] bg-[#111318] px-3 py-1.5 text-[10px] font-medium text-[#A9B1BF]">Ordenar
          <select value={sort} onChange={(event) => setSort(event.target.value as "recent" | "az")} className="bg-transparent text-[10px] font-semibold text-[#F5F7FA] outline-none"><option value="recent">Mais recentes</option><option value="az">A–Z</option></select>
        </label>
        <Button type="button" variant={favoritesOnly ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setFavoritesOnly((value) => !value)}>
          <Heart className="h-4 w-4" fill={favoritesOnly ? "currentColor" : "none"} />
          {favoritesOnly ? "Favoritos" : "Todos os modelos"}
          <span className="ml-1 text-[10px] opacity-70">{favoriteIds.size}</span>
        </Button>
      </div>
      <section aria-labelledby="official-templates-title">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#A9B1BF]">Biblioteca Vellune</p>
                <h2 id="official-templates-title" className="mt-1 font-display text-xl font-semibold tracking-[-0.02em] text-[#F5F7FA]">Modelos oficiais</h2>
              </div>
              <span className="rounded-full border border-[#2a2b31] bg-[#111318] px-2.5 py-1 text-[10px] font-semibold text-[#A9B1BF]">{official.length} {official.length === 1 ? "modelo" : "modelos"}</span>
            </div>
            {official.length === 0 ? <EmptyState>Nenhum modelo oficial encontrado.</EmptyState> : (
              <div className={grid}>{official.map((t) => (
                <TemplateCard key={t.id} t={t} actions={<>
                  <Button type="button" size="icon" variant="outline" className="h-9 w-9 rounded-xl" onClick={() => void toggleFavorite(t)} aria-label={favoriteIds.has(t.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"} title={favoriteIds.has(t.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}>
                    <Heart className="h-4 w-4" fill={favoriteIds.has(t.id) ? "currentColor" : "none"} />
                  </Button>
                  <Button size="sm" variant="outline" asChild><Link to="/templates/$id" params={{ id: t.id }}>Visualizar</Link></Button>
                  <Button size="sm" onClick={() => use(t)}>Usar modelo</Button>
                </>} />
              ))}</div>
            )}
          </section>
          <section aria-labelledby="company-templates-title">
            <div className="mb-4 mt-10 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#A9B1BF]">Sua coleção</p>
                <h2 id="company-templates-title" className="mt-1 font-display text-xl font-semibold tracking-[-0.02em] text-[#F5F7FA]">Meus modelos</h2>
              </div>
              <span className="rounded-full border border-[#2a2b31] bg-[#111318] px-2.5 py-1 text-[10px] font-semibold text-[#A9B1BF]">{mine.length} {mine.length === 1 ? "modelo" : "modelos"}</span>
            </div>
            {mine.length === 0 ? <EmptyState>Você ainda não tem modelos. Crie um ou use um modelo oficial.</EmptyState> : (
              <div className={grid}>{mine.map((t) => (
                <TemplateCard key={t.id} t={t} actions={<>
                  <Button type="button" size="icon" variant="outline" className="h-9 w-9 rounded-xl" onClick={() => void toggleFavorite(t)} aria-label={favoriteIds.has(t.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"} title={favoriteIds.has(t.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}>
                    <Heart className="h-4 w-4" fill={favoriteIds.has(t.id) ? "currentColor" : "none"} />
                  </Button>
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
