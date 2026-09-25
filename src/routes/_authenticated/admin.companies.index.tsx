import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, fmtDate, LoadingState, PageHeader, StatusBadge, StatusTabs, StatusToggle, type Status, type StatusFilter } from "@/components/admin-ui";
import { companiesKey, listCompanies, setCompanyStatus, type CompanyRow } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/companies/")({
  head: () => ({ meta: [{ title: "Empresas — Vellune Digital" }] }),
  component: CompaniesPage,
});

const adminsOf = (c: CompanyRow) => c.users.filter((u) => u.role === "company_admin").map((u) => u.name).join(", ") || "—";

function CompaniesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: companiesKey, queryFn: listCompanies });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter((c) => (filter === "all" || c.status === filter) && (!s || c.name.toLowerCase().includes(s)));
  }, [q.data, search, filter]);

  const toggle = (c: CompanyRow) => async () => {
    await setCompanyStatus(c.id, c.status === "active" ? "inactive" : "active");
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  return (
    <div>
      <PageHeader title="Empresas" description="Cadastre e gerencie as empresas do sistema."
        action={<Button asChild><Link to="/admin/companies/new"><Plus className="h-4 w-4" />Nova empresa</Link></Button>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <StatusTabs value={filter} onChange={setFilter} labels={["Todas", "Ativas", "Inativas"]} />
      </div>

      {q.isLoading ? <LoadingState /> : q.isError ? <EmptyState>Não foi possível carregar as empresas.</EmptyState>
        : rows.length === 0 ? <EmptyState>{q.data?.length ? "Nenhuma empresa encontrada." : "Nenhuma empresa cadastrada ainda."}</EmptyState> : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Criada em</th>
                  <th className="px-4 py-3 font-medium">Administrador</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">{c.type ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="hidden px-4 py-3 lg:table-cell">{fmtDate(c.created_at)}</td>
                    <td className="max-w-[200px] truncate px-4 py-3">{adminsOf(c)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild><Link to="/admin/companies/$id" params={{ id: c.id }}>Ver</Link></Button>
                        <Button variant="ghost" size="sm" asChild><Link to="/admin/companies/$id" params={{ id: c.id }} search={{ edit: true }}>Editar</Link></Button>
                        <StatusToggle status={c.status} name={c.name} onConfirm={toggle(c)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {rows.map((c) => (
              <div key={c.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="text-sm text-muted-foreground">{c.type ?? "—"} · {fmtDate(c.created_at)}</div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-2 text-sm"><span className="text-muted-foreground">Admin: </span>{adminsOf(c)}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild><Link to="/admin/companies/$id" params={{ id: c.id }}>Ver</Link></Button>
                  <Button variant="outline" size="sm" asChild><Link to="/admin/companies/$id" params={{ id: c.id }} search={{ edit: true }}>Editar</Link></Button>
                  <StatusToggle status={c.status} name={c.name} onConfirm={toggle(c)} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
