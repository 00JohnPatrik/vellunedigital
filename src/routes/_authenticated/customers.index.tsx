import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, Plus, Search, UserRoundX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dbErrorMessage, EmptyState, fmtDate, LoadingState, PageHeader, StatusBadge, StatusTabs, StatusToggle, type StatusFilter } from "@/components/admin-ui";
import { CustomerDialog, emptyCustomer } from "@/components/customer-dialog";
import { customersKey, findDuplicate, listCustomers, toRow, type Customer } from "@/lib/customers-data";
import { setCustomerStatus } from "@/lib/customer-actions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/customers/")({
  head: () => ({ meta: [{ title: "Clientes — Vellune Digital" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const { appUser } = Route.useRouteContext();
  const companyId = appUser!.company?.id;
  const isSuper = appUser!.role === "super_admin";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: customersKey, queryFn: listCustomers });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const digits = s.replace(/\D/g, "");
    return (q.data ?? []).filter((c) => (filter === "all" || c.status === filter) &&
      (!s || c.name.toLowerCase().includes(s) || !!c.email?.toLowerCase().includes(s) || (!!digits && !!c.phone && c.phone.replace(/\D/g, "").includes(digits))));
  }, [q.data, search, filter]);

  const refresh = () => qc.invalidateQueries({ queryKey: customersKey });
  const toggle = (c: Customer) => async () => {
    try {
      const nextStatus = c.status === "active" ? "inactive" : "active";
      await setCustomerStatus(c.id, nextStatus);
      toast.success(nextStatus === "active" ? "Cliente ativado." : "Cliente inativado.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o status.");
    }
  };
  const actions = (c: Customer, variant: "ghost" | "outline") => (
    <>
      <Button variant={variant} size="sm" asChild><Link to="/customers/$id" params={{ id: c.id }}>Ver</Link></Button>
      <Button variant={variant} size="sm" asChild><Link to="/customers/$id" params={{ id: c.id }} search={{ edit: true }}>Editar</Link></Button>
      <StatusToggle status={c.status} name={c.name} onConfirm={toggle(c)} />
    </>
  );

  return (
    <div>
      <PageHeader title="Clientes" description={isSuper ? "Clientes de todas as empresas." : "Clientes da sua empresa."}
        action={companyId && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Novo cliente</Button>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {([
          ["all", "Clientes", q.data?.length ?? 0, CircleDashed],
          ["active", "Ativos", (q.data ?? []).filter((c) => c.status === "active").length, CheckCircle2],
          ["inactive", "Inativos", (q.data ?? []).filter((c) => c.status === "inactive").length, UserRoundX],
        ] as const).map(([key, label, count, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key as StatusFilter)}
            aria-pressed={filter === key}
            className={cn(
              "vellune-platform-card flex items-center gap-3 p-4 text-left",
              filter === key && "border-[#d4af37]/55",
            )}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#d4af37]/10 text-[#d4af37]">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-xl font-semibold tabular-nums text-[#F5F7FA]">{count}</span>
              <span className="text-[11px] text-[#A9B1BF]">{label}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, telefone ou e-mail" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <StatusTabs value={filter} onChange={setFilter} labels={["Todos", "Ativos", "Inativos"]} />
      </div>

      {q.isLoading ? <LoadingState /> : q.isError ? <EmptyState>Não foi possível carregar os clientes.</EmptyState>
        : rows.length === 0 ? <EmptyState>{q.data?.length ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}</EmptyState> : (
        <>
          <div className="vellune-data-surface hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Telefone</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">E-mail</th>
                  {isSuper && <th className="hidden px-4 py-3 font-medium xl:table-cell">Empresa</th>}
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Cadastro</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">{c.phone || "—"}</td>
                    <td className="hidden max-w-[220px] truncate px-4 py-3 lg:table-cell">{c.email || "—"}</td>
                    {isSuper && <td className="hidden px-4 py-3 xl:table-cell">{c.company?.name ?? "—"}</td>}
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="hidden px-4 py-3 lg:table-cell">{fmtDate(c.created_at)}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-2">{actions(c, "ghost")}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {rows.map((c) => (
              <div key={c.id} className="vellune-platform-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="truncate text-sm text-muted-foreground">{c.email || "Sem e-mail"}</div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-2 text-sm">{c.phone || "Sem telefone"} · {fmtDate(c.created_at)}</div>
                <div className="mt-3 flex flex-wrap gap-2">{actions(c, "outline")}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {companyId && (
        <CustomerDialog open={open} onOpenChange={setOpen} title="Novo cliente" initial={emptyCustomer}
          checkDuplicate={(v) => findDuplicate(v, companyId)}
          onUseExisting={(id) => navigate({ to: "/customers/$id", params: { id } })}
          onSubmit={async (v) => {
            const { error } = await supabase.from("customers").insert({ ...toRow(v), company_id: companyId });
            if (error) { toast.error(dbErrorMessage(error, "Cliente já cadastrado.")); return false; }
            toast.success("Cliente cadastrado.");
            await refresh();
            return true;
          }} />
      )}
    </div>
  );
}
