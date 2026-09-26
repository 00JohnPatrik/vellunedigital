import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, fmtDate, LoadingState, PageHeader, StatusBadge, StatusTabs, StatusToggle, type StatusFilter } from "@/components/admin-ui";
import { listCompanyAdmins, setUserStatus, usersKey, type CompanyAdmin } from "@/lib/admin-data";
import { AdminPresence } from "@/components/phase7-ui";

export const Route = createFileRoute("/_authenticated/admin/users/")({
  head: () => ({ meta: [{ title: "Usuários — Vellune Digital" }] }),
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: usersKey, queryFn: () => listCompanyAdmins() });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const digits = s.replace(/\D/g, "");
    return (q.data ?? []).filter((u) => (filter === "all" || u.status === filter) &&
      (!s || u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || (!!digits && !!u.phone?.includes(digits))));
  }, [q.data, search, filter]);

  const toggle = (u: CompanyAdmin) => async () => {
    await setUserStatus(u.id, u.status === "active" ? "inactive" : "active");
    qc.invalidateQueries({ queryKey: ["admin"] });
  };
  const actions = (u: CompanyAdmin, variant: "ghost" | "outline") => (
    <>
      <Button variant={variant} size="sm" asChild><Link to="/admin/users/$id" params={{ id: u.id }}>Ver</Link></Button>
      <Button variant={variant} size="sm" asChild><Link to="/admin/users/$id" params={{ id: u.id }} search={{ edit: true }}>Editar</Link></Button>
      <StatusToggle status={u.status} name={u.name} onConfirm={toggle(u)} />
    </>
  );

  return (
    <div>
      <PageHeader title="Usuários" description="Administradores das empresas."
        action={<Button asChild><Link to="/admin/users/new"><Plus className="h-4 w-4" />Novo administrador</Link></Button>} />
      <div className="mb-4"><AdminPresence /></div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, e-mail ou telefone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <StatusTabs value={filter} onChange={setFilter} labels={["Todos", "Ativos", "Inativos"]} />
      </div>

      {q.isLoading ? <LoadingState /> : q.isError ? <EmptyState>Não foi possível carregar os usuários.</EmptyState>
        : rows.length === 0 ? <EmptyState>{q.data?.length ? "Nenhum usuário encontrado." : "Nenhum administrador cadastrado ainda."}</EmptyState> : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="hidden px-4 py-3 font-medium xl:table-cell">Telefone</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="hidden px-4 py-3 font-medium xl:table-cell">Função</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Criado em</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="max-w-[200px] truncate px-4 py-3">{u.email}</td>
                    <td className="hidden px-4 py-3 xl:table-cell">{u.phone || "—"}</td>
                    <td className="px-4 py-3">{u.company?.name ?? "—"}</td>
                    <td className="hidden px-4 py-3 xl:table-cell">Admin da empresa</td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="hidden px-4 py-3 lg:table-cell">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-2">{actions(u, "ghost")}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {rows.map((u) => (
              <div key={u.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{u.name}</div>
                    <div className="truncate text-sm text-muted-foreground">{u.email}</div>
                  </div>
                  <StatusBadge status={u.status} />
                </div>
                <div className="mt-2 text-sm">{u.company?.name ?? "—"}{u.phone ? ` · ${u.phone}` : ""}</div>
                <div className="mt-3 flex flex-wrap gap-2">{actions(u, "outline")}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
