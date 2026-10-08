import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  FolderOpen,
  Image as ImageIcon,
  Layers3,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { VelluneTopBar } from "@/components/vellune-top-bar";
import { VelluneCreativeDock } from "@/components/vellune-creative-dock";
import { InvitationRender, InvitationStatusBadge } from "@/components/invitation-ui";
import { NotificationCenter } from "@/components/phase7-ui";
import { LoadingState } from "@/components/admin-ui";
import { listInvitations, fmtEventDate, invitationsKey, type Invitation } from "@/lib/invitations";
import { type ReportRow, type RecentResponse } from "@/lib/reports";
import type { AppUser } from "@/lib/app-user";
import { cn } from "@/lib/utils";

type Props = {
  appUser: AppUser;
  reportRows: ReportRow[];
  recentResponses: RecentResponse[];
};

const CREATION_ACTIONS = [
  {
    id: "invitation",
    title: "Novo convite",
    description: "Comece um convite digital completo.",
    icon: Mail,
    to: "/invitations/new",
  },
  {
    id: "template",
    title: "Explorar modelos",
    description: "Escolha uma composição pronta para personalizar.",
    icon: Layers3,
    to: "/templates",
  },
  {
    id: "media",
    title: "Fotos e elementos",
    description: "Abra a biblioteca e continue uma criação.",
    icon: ImageIcon,
    to: "/invitations",
  },
  {
    id: "results",
    title: "Resultados",
    description: "Acompanhe confirmações e desempenho.",
    icon: BarChart3,
    to: "/reports",
  },
] as const;

function initials(name: string) {
  const words = name.trim().split(/\\s+/).filter(Boolean);
  return (words.slice(0, 2).map((word) => word[0]).join("") || "VD").toUpperCase();
}

function ProjectThumbnail({ invitation }: { invitation: Invitation }) {
  const background = invitation.content?.settings?.background;
  const blocks = invitation.content?.blocks ?? [];
  return (
    <div className="relative h-44 overflow-hidden rounded-2xl border border-[#292F3A] bg-[#0B0D12]">
      <div className="absolute inset-0 flex items-start justify-center overflow-hidden bg-[#171B23]">
        <div className="h-[640px] w-[390px] origin-top scale-[0.46]">
          <InvitationRender
            background={background}
            blocks={blocks}
            ctx={{
              event_date: invitation.event_date,
              event_time: invitation.event_time,
              venue_name: invitation.venue_name,
              address: invitation.address,
              city: invitation.city,
              state: invitation.state,
              publicUrl: `/convite/${invitation.slug}`,
            }}
          />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0B0D12]/90 to-transparent" />
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-[#292F3A] bg-[#171B23]/88 px-2.5 py-1 text-[9px] font-semibold text-[#F5F7FA] backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
        {invitation.status === "published" ? "Publicado" : "Rascunho"}
      </div>
      <span className="absolute bottom-3 right-3 rounded-full border border-[#292F3A] bg-[#171B23]/88 p-1.5 text-[#F5F7FA] backdrop-blur-md">
        <ArrowUpRight className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

export function ExperimentalCompanyDashboard({ appUser, reportRows, recentResponses }: Props) {
  const [search, setSearch] = useState("");
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [openProjectMenu, setOpenProjectMenu] = useState<string | null>(null);
  const navigate = useNavigate();
  const invitations = useQuery({ queryKey: [...invitationsKey, "dashboard-experimental"], queryFn: listInvitations, staleTime: 30_000 });
  const rows = invitations.data ?? [];
  const totals = useMemo(
    () => reportRows.reduce(
      (acc, row) => ({
        invitations: acc.invitations + 1,
        views: acc.views + row.views,
        confirmed: acc.confirmed + row.confirmed,
        people: acc.people + row.people,
      }),
      { invitations: 0, views: 0, confirmed: 0, people: 0 },
    ),
    [reportRows],
  );

  const filteredInvitations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...rows]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .filter((invitation) => {
        if (!term) return true;
        return invitation.name.toLowerCase().includes(term) || String(invitation.customer?.name ?? "").toLowerCase().includes(term);
      })
      .slice(0, 6);
  }, [rows, search]);

  const nextEvent = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [...reportRows]
      .filter((row) => row.event_date >= today)
      .sort((a, b) => (a.event_date + a.event_time).localeCompare(b.event_date + b.event_time))[0] ?? null;
  }, [reportRows]);

  return (
    <div className="dark min-h-[100dvh] bg-[#0B0D12] text-[#F5F7FA]">
      <VelluneTopBar
        avatarFallback={initials(appUser.name)}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar convite ou cliente"
        showNotifications={false}
        onAvatarClick={() => navigate({ to: "/settings" })}
        trailingActions={<NotificationCenter appUser={appUser} />}
      />

      <main className="mx-auto w-full max-w-[1540px] px-4 pb-32 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        <section className="relative overflow-hidden rounded-[28px] border border-[#292F3A] bg-[#171B23] px-5 py-6 shadow-[0_30px_100px_-55px_rgba(139,92,246,0.6)] sm:px-7 sm:py-8 lg:px-10 lg:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_0%,rgba(139,92,246,0.14),transparent_34%),radial-gradient(circle_at_8%_100%,rgba(59,130,246,0.05),transparent_32%)]" />
          <div className="relative grid gap-8 xl:grid-cols-[1.35fr_0.65fr] xl:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#292F3A] bg-[#0B0D12]/65 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A9B1BF] backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-[#8B5CF6]" />
                Hub de criação
              </div>
              <h1 className="mt-5 max-w-3xl font-display text-3xl font-semibold tracking-[-0.04em] text-[#F5F7FA] sm:text-4xl lg:text-5xl">
                O que vamos criar hoje?
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#A9B1BF] sm:text-base">
                Entre em uma criação, escolha um modelo ou refine um convite existente sem sair do seu fluxo.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Link to="/invitations/new" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#8B5CF6] px-5 text-sm font-semibold text-[#F5F7FA] shadow-[0_16px_40px_-18px_rgba(139,92,246,0.9)] transition hover:bg-[#9D74F8] active:scale-[0.98]">
                  <Plus className="h-4 w-4" />
                  Criar convite
                </Link>
                <Link to="/invitations" className="inline-flex h-11 items-center gap-2 rounded-full border border-[#292F3A] bg-[#0B0D12]/45 px-5 text-sm font-medium text-[#F5F7FA] transition hover:border-[#8B5CF6]/50 hover:bg-[#171B23]">
                  Ver meus convites
                  <ChevronRight className="h-4 w-4 text-[#A9B1BF]" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
              {([
                ["Convites", totals.invitations, Mail],
                ["Visualizações", totals.views, Eye],
                ["Confirmações", totals.confirmed, CheckCircle2],
                ["Pessoas", totals.people, Users],
              ] as const).map(([label, value, Icon]) => (
                <div key={label as string} className="rounded-2xl border border-[#292F3A] bg-[#0B0D12]/45 p-3.5 backdrop-blur-md">
                  <Icon className="h-4 w-4 text-[#8B5CF6]" />
                  <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-[#A9B1BF]">{label as string}</p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[#F5F7FA]">{Number(value).toLocaleString("pt-BR")}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {filteredInvitations[0] && (
          <section className="mt-6">
            <div className="rounded-[24px] border border-[#292F3A] bg-[#171B23] p-4 shadow-[0_20px_70px_-52px_rgba(139,92,246,0.55)] sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="w-full shrink-0 sm:w-[180px]"><ProjectThumbnail invitation={filteredInvitations[0]} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#A9B1BF]">Continuar trabalhando</p>
                  <h2 className="mt-1 truncate font-display text-xl font-semibold tracking-[-0.03em] text-[#F5F7FA]">{filteredInvitations[0].name}</h2>
                  <p className="mt-1 truncate text-xs text-[#A9B1BF]">{filteredInvitations[0].customer?.name ?? "Sem cliente"} · atualizado em {new Date(filteredInvitations[0].updated_at).toLocaleDateString("pt-BR")}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link to="/invitations/$id/editor" params={{ id: filteredInvitations[0].id }} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#8B5CF6] px-4 text-xs font-semibold text-[#F5F7FA] shadow-[0_14px_32px_-18px_rgba(139,92,246,0.85)] transition hover:bg-[#9D74F8] active:scale-[0.98]">Continuar edição<ArrowUpRight className="h-3.5 w-3.5" /></Link>
                    <Link to="/invitations/$id/preview" params={{ id: filteredInvitations[0].id }} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#292F3A] bg-[#0B0D12] px-4 text-xs font-semibold text-[#F5F7FA] transition hover:border-[#8B5CF6]/45"><Eye className="h-3.5 w-3.5" />Prévia</Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A9B1BF]">Começar agora</p>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.02em] text-[#F5F7FA]">Atalhos de criação</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CREATION_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.id} to={action.to} className="group min-h-[150px] rounded-2xl border border-[#292F3A] bg-[#171B23] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#8B5CF6]/55 hover:bg-[#171B23] hover:shadow-[0_20px_45px_-30px_rgba(139,92,246,0.7)] sm:p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#292F3A] bg-[#0B0D12] text-[#8B5CF6] transition group-hover:bg-[#8B5CF6]/10">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-5 text-sm font-semibold text-[#F5F7FA]">{action.title}</p>
                  <p className="mt-1 text-[11px] leading-5 text-[#A9B1BF]">{action.description}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A9B1BF]">Seu espaço de trabalho</p>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.02em] text-[#F5F7FA]">Seus designs recentes</h2>
            </div>
            <Link to="/invitations" className="hidden items-center gap-1 text-xs font-medium text-[#8B5CF6] transition hover:text-[#9D74F8] sm:inline-flex">
              Ver todos
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {invitations.isLoading ? (
            <div className="rounded-2xl border border-[#292F3A] bg-[#171B23] p-10"><LoadingState /></div>
          ) : invitations.isError ? (
            <div className="rounded-2xl border border-[#292F3A] bg-[#171B23] p-8 text-center">
              <p className="text-sm font-medium text-[#F5F7FA]">Não foi possível carregar seus designs.</p>
              <p className="mt-1 text-xs text-[#A9B1BF]">Você ainda pode criar um novo convite normalmente.</p>
              <Link to="/invitations/new" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[#8B5CF6] px-4 text-xs font-semibold text-[#F5F7FA] hover:bg-[#9D74F8]">
                <Plus className="h-4 w-4" />Criar convite
              </Link>
            </div>
          ) : filteredInvitations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#292F3A] bg-[#171B23] p-10 text-center">
              <FolderOpen className="mx-auto h-7 w-7 text-[#A9B1BF]" />
              <p className="mt-3 text-sm font-semibold text-[#F5F7FA]">{search ? "Nenhum design encontrado" : "Seu espaço começa aqui"}</p>
              <p className="mt-1 text-xs text-[#A9B1BF]">{search ? "Tente outro termo de busca." : "Crie o primeiro convite da sua empresa e ele aparecerá aqui."}</p>
              {!search && <Link to="/invitations/new" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[#8B5CF6] px-4 text-xs font-semibold text-[#F5F7FA] hover:bg-[#9D74F8]"><Plus className="h-4 w-4" />Criar primeiro convite</Link>}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredInvitations.map((invitation) => (
                <article key={invitation.id} className="group relative overflow-visible rounded-2xl border border-[#292F3A] bg-[#171B23] transition duration-200 hover:-translate-y-0.5 hover:border-[#8B5CF6]/45 hover:shadow-[0_24px_55px_-38px_rgba(139,92,246,0.75)]">
                  <Link to="/invitations/$id/editor" params={{ id: invitation.id }} className="block overflow-hidden rounded-2xl">
                    <ProjectThumbnail invitation={invitation} />
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#F5F7FA]">{invitation.name}</p>
                          <p className="mt-1 truncate text-xs text-[#A9B1BF]">{invitation.customer?.name ?? "Sem cliente"}</p>
                        </div>
                        <InvitationStatusBadge status={invitation.status} />
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3 text-[10px] text-[#A9B1BF]">
                        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{fmtEventDate(invitation.event_date)}</span>
                        <span>{new Date(invitation.updated_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                  </Link>
                  <div className="absolute right-3 top-[135px] z-20 flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                    <Link to="/invitations/$id/editor" params={{ id: invitation.id }} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#292F3A] bg-[#171B23]/92 px-2.5 text-[10px] font-semibold text-[#F5F7FA] backdrop-blur-md hover:border-[#8B5CF6]/45" aria-label="Editar convite" title="Editar" onClick={(event) => event.stopPropagation()}>
                      <Pencil className="h-3.5 w-3.5" />Editar
                    </Link>
                    <Link to="/invitations/$id/preview" params={{ id: invitation.id }} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#292F3A] bg-[#171B23]/92 text-[#A9B1BF] backdrop-blur-md hover:text-[#F5F7FA]" aria-label="Prévia" title="Prévia" onClick={(event) => event.stopPropagation()}>
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#292F3A] bg-[#171B23]/92 text-[#A9B1BF] backdrop-blur-md hover:text-[#F5F7FA]" aria-label="Mais ações" title="Mais ações" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpenProjectMenu((current) => current === invitation.id ? null : invitation.id); }}>
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                    {openProjectMenu === invitation.id && (
                      <div className="absolute right-0 top-10 grid min-w-[170px] gap-1 rounded-2xl border border-[#292F3A] bg-[#171B23]/98 p-1.5 shadow-[0_24px_60px_-24px_rgba(11,13,18,0.95)] backdrop-blur-xl">
                        <Link to="/invitations/$id/report" params={{ id: invitation.id }} onClick={() => setOpenProjectMenu(null)} className="rounded-xl px-3 py-2 text-left text-[11px] text-[#A9B1BF] hover:bg-[#0B0D12] hover:text-[#F5F7FA]">Resultados do convite</Link>
                        <Link to="/invitations/$id/guests" params={{ id: invitation.id }} onClick={() => setOpenProjectMenu(null)} className="rounded-xl px-3 py-2 text-left text-[11px] text-[#A9B1BF] hover:bg-[#0B0D12] hover:text-[#F5F7FA]">Convidados</Link>
                        <Link to="/invitations/$id/preview" params={{ id: invitation.id }} onClick={() => setOpenProjectMenu(null)} className="rounded-xl px-3 py-2 text-left text-[11px] text-[#A9B1BF] hover:bg-[#0B0D12] hover:text-[#F5F7FA]">Abrir prévia</Link>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-[#292F3A] bg-[#171B23] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A9B1BF]">Próximo momento</p>
                <h2 className="mt-1 font-display text-lg font-semibold text-[#F5F7FA]">Agenda do convite</h2>
              </div>
              <Clock3 className="h-5 w-5 text-[#8B5CF6]" />
            </div>
            {nextEvent ? (
              <div className="mt-5 rounded-2xl border border-[#292F3A] bg-[#0B0D12] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <InvitationStatusBadge status={nextEvent.status} />
                  <span className="text-xs text-[#A9B1BF]">{nextEvent.customer_name ?? "Sem cliente"}</span>
                </div>
                <p className="mt-3 text-base font-semibold text-[#F5F7FA]">{nextEvent.name}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#A9B1BF]">
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{fmtEventDate(nextEvent.event_date)}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{nextEvent.event_time.slice(0, 5)}</span>
                </div>
                <Link to="/invitations/$id/editor" params={{ id: nextEvent.id }} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B5CF6] hover:text-[#9D74F8]">
                  Abrir convite
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#292F3A] bg-[#0B0D12] p-5">
                <p className="text-sm font-medium text-[#F5F7FA]">Nenhum evento futuro.</p>
                <p className="mt-1 text-xs leading-5 text-[#A9B1BF]">Quando houver um próximo evento, ele aparecerá nesta área.</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#292F3A] bg-[#171B23] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A9B1BF]">Últimas respostas</p>
                <h2 className="mt-1 font-display text-lg font-semibold text-[#F5F7FA]">RSVP em destaque</h2>
              </div>
              <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />
            </div>
            <div className="mt-5 space-y-2">
              {recentResponses.length ? recentResponses.slice(0, 4).map((response) => (
                <div key={response.id} className="flex items-center gap-3 rounded-2xl border border-[#292F3A] bg-[#0B0D12] p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6]"><CheckCircle2 className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[#F5F7FA]">{response.name}</p>
                    <p className="truncate text-[10px] text-[#A9B1BF]">{response.invitation?.name ?? "Convite"} · {response.people_count} pessoa(s)</p>
                  </div>
                  <span className="text-[9px] text-[#A9B1BF]">{new Date(response.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-[#292F3A] bg-[#0B0D12] p-5 text-center text-xs text-[#A9B1BF]">
                  Nenhuma confirmação recente.
                </div>
              )}
            </div>
            <Link to="/reports" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B5CF6] hover:text-[#9D74F8]">
              Ver resultados
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        <section className="mt-10 flex flex-col gap-4 rounded-2xl border border-[#292F3A] bg-[#171B23] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#8B5CF6]/10 text-[#8B5CF6]"><MapPin className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-semibold text-[#F5F7FA]">Tudo pronto para a próxima etapa</p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[#A9B1BF]">Abra seus convites, ajuste o design no editor e acompanhe as respostas quando o evento estiver no ar.</p>
            </div>
          </div>
          <Link to="/invitations" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#292F3A] bg-[#0B0D12] px-4 text-xs font-semibold text-[#F5F7FA] hover:border-[#8B5CF6]/45">
            Ir para convites
            <ArrowUpRight className="h-4 w-4 text-[#8B5CF6]" />
          </Link>
        </section>
      </main>

      <VelluneCreativeDock
        activeItem="home"
        onCreate={() => setCreateSheetOpen(true)}
        onNavigate={(item) => {
          if (item === "home") return;
          if (item === "projects") navigate({ to: "/invitations" });
          if (item === "templates") navigate({ to: "/templates" });
          if (item === "settings") navigate({ to: "/settings" });
        }}
      />
      {createSheetOpen && (
        <div className="fixed inset-0 z-[240] flex items-end justify-center bg-[#0B0D12]/72 p-3 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={() => setCreateSheetOpen(false)}>
          <section className="w-full max-w-lg rounded-[28px] border border-[#292F3A] bg-[#171B23] p-4 shadow-[0_30px_90px_-28px_rgba(11,13,18,0.98)] sm:p-5" role="dialog" aria-modal="true" aria-label="Criar novo" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#292F3A]" aria-hidden="true" />
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A9B1BF]">Criação rápida</p><h2 className="mt-1 font-display text-xl font-semibold text-[#F5F7FA]">O que vamos criar?</h2></div>
              <button type="button" onClick={() => setCreateSheetOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#292F3A] bg-[#0B0D12] text-[#A9B1BF] hover:text-[#F5F7FA]" aria-label="Fechar">×</button>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {[
                ["Novo convite", "Começar do zero", "/invitations/new"],
                ["Usar modelo", "Escolher composição pronta", "/templates"],
                ["Ver projetos", "Abrir seus convites", "/invitations"],
              ].map(([title, description, to]) => (
                <Link key={to} to={to as any} onClick={() => setCreateSheetOpen(false)} className="rounded-2xl border border-[#292F3A] bg-[#0B0D12]/55 p-4 transition hover:-translate-y-0.5 hover:border-[#8B5CF6]/45">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8B5CF6]/10 text-[#8B5CF6]"><Plus className="h-4 w-4" /></span>
                  <p className="mt-3 text-sm font-semibold text-[#F5F7FA]">{title}</p>
                  <p className="mt-1 text-[10px] leading-4 text-[#A9B1BF]">{description}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

    </div>
  );
}
