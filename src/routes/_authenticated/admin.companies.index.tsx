import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, Eye, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState, fmtDate, LoadingState, PageHeader, StatusBadge, StatusTabs, StatusToggle, type StatusFilter } from "@/components/admin-ui";
import { companiesKey, listCompanies, setCompanyStatus, type CompanyRow } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/companies/")({
  head: () => ({ meta: [{ title: "Empresas — Vellune Digital" }] }),
  component: CompaniesPage,
});

const PAGE_SIZE = 8;
const adminsOf = (c: CompanyRow) => c.users.filter((u) => u.role === "company_admin").map((u) => u.name).join(", ") || "—";

type SortKey = "name" | "created_at" | "status";

function CompaniesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: companiesKey, queryFn: listCompanies });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("name");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CompanyRow | null>(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (q.data ?? []).filter((company) => (filter === "all" || company.status === filter) && (!term || company.name.toLowerCase().includes(term) || (company.type ?? "").toLowerCase().includes(term))).sort((a, b) => {
      if (sort === "created_at") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "status") return a.status.localeCompare(b.status) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [q.data, search, filter, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginated = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const refresh = async () => { await qc.invalidateQueries({ queryKey: ["admin"] }); };

  const toggle = (company: CompanyRow) => async () => {
    await setCompanyStatus(company.id, company.status === "active" ? "inactive" : "active");
    await refresh();
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Empresas" description="Pesquise, acompanhe e gerencie as organizações da plataforma." action={<Button asChild><Link to="/admin/companies/new"><Plus className="h-4 w-4" />Nova empresa</Link></Button>} />
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1 lg:max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar por nome ou tipo" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
          <div className="flex flex-wrap items-center gap-3"><StatusTabs value={filter} onChange={(value) => { setFilter(value); setPage(1); }} labels={["Todas", "Ativas", "Inativas"]} /><div className="flex items-center gap-2 text-sm text-muted-foreground"><SlidersHorizontal className="h-4 w-4" /><label htmlFor="company-sort" className="sr-only">Ordenar empresas</label><select id="company-sort" value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"><option value="name">Nome</option><option value="created_at">Mais recentes</option><option value="status">Status</option></select></div></div>
        </div>
      </div>

      {q.isLoading ? <LoadingState /> : q.isError ? <EmptyState>Não foi possível carregar as empresas.</EmptyState> : rows.length === 0 ? <EmptyState>{q.data?.length ? "Nenhuma empresa encontrada com esses filtros." : "Nenhuma empresa cadastrada ainda."}</EmptyState> : <>
        <div className="hidden overflow-x-auto rounded-2xl border bg-card shadow-sm md:block"><table className="w-full text-sm"><thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Empresa</th><th className="px-5 py-3 font-medium">Tipo</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Criada em</th><th className="px-5 py-3 font-medium">Administrador</th><th className="px-5 py-3 text-right font-medium">Ações</th></tr></thead><tbody>{paginated.map((company) => <tr key={company.id} className="border-t transition-colors hover:bg-muted/30"><td className="px-5 py-4 font-medium">{company.name}</td><td className="px-5 py-4 text-muted-foreground">{company.type ?? "—"}</td><td className="px-5 py-4"><StatusBadge status={company.status} /></td><td className="px-5 py-4 text-muted-foreground">{fmtDate(company.created_at)}</td><td className="max-w-[220px] truncate px-5 py-4">{adminsOf(company)}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setSelected(company)}><Eye className="h-4 w-4" />Detalhes</Button><Button variant="ghost" size="sm" asChild><Link to="/admin/companies/$id" params={{ id: company.id }} search={{ edit: true }}>Editar</Link></Button><StatusToggle status={company.status} name={company.name} onConfirm={toggle(company)} /></div></td></tr>)}</tbody></table></div>
        <div className="grid gap-3 md:hidden">{paginated.map((company) => <div key={company.id} className="rounded-2xl border bg-card p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate font-medium">{company.name}</div><div className="mt-1 text-sm text-muted-foreground">{company.type ?? "Sem tipo"} · {fmtDate(company.created_at)}</div></div><StatusBadge status={company.status} /></div><p className="mt-3 truncate text-sm"><span className="text-muted-foreground">Administrador: </span>{adminsOf(company)}</p><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => setSelected(company)}><Eye className="h-4 w-4" />Detalhes</Button><Button variant="outline" size="sm" asChild><Link to="/admin/companies/$id" params={{ id: company.id }} search={{ edit: true }}>Editar</Link></Button><StatusToggle status={company.status} name={company.name} onConfirm={toggle(company)} /></div></div>)}</div>
        <div className="flex flex-col items-center justify-between gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row"><span>Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, rows.length)} de {rows.length}</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></Button><span className="min-w-20 text-center">Página {currentPage} de {pageCount}</span><Button variant="outline" size="sm" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} aria-label="Próxima página"><ChevronRight className="h-4 w-4" /></Button></div></div>
      </>}

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent className="w-full overflow-y-auto sm:max-w-md"><SheetHeader><SheetTitle>{selected?.name ?? "Detalhes da empresa"}</SheetTitle><SheetDescription>Resumo dos dados disponíveis para esta empresa.</SheetDescription></SheetHeader>{selected && <div className="mt-8 space-y-6"><div className="grid gap-4 rounded-xl border p-4 text-sm"><div><p className="text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={selected.status} /></div></div><div><p className="text-muted-foreground">Tipo</p><p className="mt-1 font-medium">{selected.type ?? "—"}</p></div><div><p className="text-muted-foreground">Criada em</p><p className="mt-1 font-medium">{fmtDate(selected.created_at)}</p></div><div><p className="text-muted-foreground">Administradores</p><p className="mt-1 font-medium">{adminsOf(selected)}</p></div></div><div className="grid gap-2"><Button asChild><Link to="/admin/companies/$id" params={{ id: selected.id }}>Abrir página completa</Link></Button><Button variant="outline" asChild><Link to="/admin/companies/$id" params={{ id: selected.id }} search={{ edit: true }}>Editar empresa</Link></Button><StatusToggle status={selected.status} name={selected.name} onConfirm={toggle(selected)} /></div></div>}</SheetContent></Sheet>
    </div>
  );
}
