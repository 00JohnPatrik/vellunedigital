import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
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
  Instagram,
  Clapperboard,
  Monitor,
  FileText,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { InvitationRender, InvitationStatusBadge } from "@/components/invitation-ui";
import { Button } from "@/components/ui/button";
import { VelluneCard } from "@/components/vellune-card";
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
  { id: "post", title: "Post Instagram", description: "Uma composição para compartilhar", icon: Instagram, to: "/templates" },
  { id: "reel", title: "Vídeo Reel", description: "Organize a arte do seu convite", icon: Clapperboard, to: "/invitations" },
  { id: "banner", title: "Banner Web", description: "Comece uma nova composição", icon: Monitor, to: "/invitations/new" },
  { id: "document", title: "Documentos", description: "Revisite seus projetos", icon: FileText, to: "/invitations" },
] as const;

function ProjectThumbnail({ invitation }: { invitation: Invitation }) {
  const background = invitation.content?.settings?.background;
  const blocks = invitation.content?.blocks ?? [];
  return (
    <div className="relative h-44 overflow-hidden rounded-2xl border border-border bg-background">
      <div className="absolute inset-0 flex items-start justify-center overflow-hidden bg-card">
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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background/90 to-transparent" />
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-border bg-card/88 px-2.5 py-1 text-[9px] font-semibold text-foreground backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        {invitation.status === "published" ? "Publicado" : invitation.status === "closed" ? "Encerrado" : "Rascunho"}
      </div>
      <span className="absolute bottom-3 right-3 rounded-full border border-border bg-card/88 p-1.5 text-foreground backdrop-blur-md">
        <ArrowUpRight className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

export function ExperimentalCompanyDashboard({ appUser, reportRows, recentResponses }: Props) {
  const [openProjectMenu, setOpenProjectMenu] = useState<string | null>(null);

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

  const recentInvitations = useMemo(
    () => [...rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6),
    [rows],
  );

  const nextEvent = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [...reportRows]
      .filter((row) => row.event_date >= today)
      .sort((a, b) => (a.event_date + a.event_time).localeCompare(b.event_date + b.event_time))[0] ?? null;
  }, [reportRows]);
  const continueInvitation = useMemo(
    () => [...rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).find((item) => item.status === "draft") ?? recentInvitations[0] ?? null,
    [rows, recentInvitations],
  );

  const nextAction = useMemo(() => {
    if (!continueInvitation) {
      return { eyebrow: "Primeiro passo", title: "Crie seu primeiro convite", description: "Comece com um modelo pronto ou monte uma criação do zero.", label: "Criar convite", to: "/invitations/new" as const };
    }
    if (continueInvitation.status === "draft") {
      return { eyebrow: "Próximo passo", title: "Finalize seu rascunho", description: `“${continueInvitation.name}” está pronto para você continuar a edição.`, label: "Continuar edição", to: "/invitations/$id/editor" as const, params: { id: continueInvitation.id } };
    }
    if (nextEvent) {
      return { eyebrow: "Próximo passo", title: "Acompanhe o convite que está no ar", description: `“${nextEvent.name}” é seu próximo evento. Confira respostas e desempenho.`, label: "Ver resultados", to: "/invitations/$id/report" as const, params: { id: nextEvent.id } };
    }
    return { eyebrow: "Próximo passo", title: "Crie a próxima experiência", description: "Seu último convite já está encaminhado. Comece uma nova criação quando estiver pronto.", label: "Novo convite", to: "/invitations/new" as const };
  }, [continueInvitation, nextEvent]);

  const activity = useMemo(() => [
    ...recentInvitations.slice(0, 4).map((item) => ({
      id: `inv-${item.id}`,
      date: item.updated_at,
      title: item.status === "published" ? "Convite publicado ou atualizado" : "Rascunho atualizado",
      description: item.name,
    })),
    ...recentResponses.slice(0, 4).map((item) => ({
      id: `rsvp-${item.id}`,
      date: item.created_at,
      title: "Nova confirmação de presença",
      description: `${item.name} · ${item.invitation?.name ?? "Convite"}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6), [recentInvitations, recentResponses]);


  return (
    <div className="vellune-content-enter w-full">
      <div className="w-full">
        <section className="pb-8 pt-3 sm:pt-6" aria-label="Hub de criação">
          <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <div className="min-w-0">
              <p className="mb-3 text-xs font-medium text-muted-foreground">SEU ESTÚDIO CRIATIVO</p>
              <h1 className="font-display text-2xl font-semibold sm:text-4xl">✦ O que vamos criar hoje?</h1>
            </div>
            <Button asChild variant="ghost" size="icon" className="rounded-full text-primary" aria-label="Criar convite"><Link to="/invitations/new"><Plus /></Link></Button>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="creation-grid">
            {CREATION_ACTIONS.map((action) => (
              <Button asChild key={action.id} variant="creative" className="vellune-creation-card group h-auto min-h-40 flex-col items-start justify-between whitespace-normal rounded-2xl p-4 text-left sm:min-h-44 sm:p-5">
                <Link to={action.to}>
                  <span className="flex w-full items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><action.icon className="size-5" /></span><ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-foreground" /></span>
                  <span className="mt-5 block min-w-0"><span className="block text-sm font-semibold sm:text-base">{action.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{action.description}</span></span>
                </Link>
              </Button>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">Seu espaço de trabalho</p>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-normal text-foreground">📊 Seus designs recentes</h2>
            </div>
            <Link to="/invitations" className="hidden items-center gap-1 text-xs font-medium text-primary transition hover:text-primary-hover sm:inline-flex">
              Ver todos
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {invitations.isLoading ? (
            <div className="rounded-2xl border border-border bg-card p-10"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Carregando designs">{[0,1,2].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />)}</div></div>
          ) : invitations.isError ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-sm font-medium text-foreground">Não foi possível carregar seus designs.</p>
              <p className="mt-1 text-xs text-muted-foreground">Você ainda pode criar um novo convite normalmente.</p>
              <Link to="/invitations/new" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-xs font-semibold text-foreground hover:bg-primary-hover">
                <Plus className="h-4 w-4" />Criar convite
              </Link>
            </div>
          ) : recentInvitations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <FolderOpen className="mx-auto h-7 w-7 text-muted-foreground" />
              <p className="mt-3 text-sm font-semibold text-foreground">Seu espaço começa aqui</p>
              <p className="mt-1 text-xs text-muted-foreground">Crie o primeiro convite da sua empresa e ele aparecerá aqui.</p>
              <Link to="/invitations/new" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-xs font-semibold text-foreground hover:bg-primary-hover"><Plus className="h-4 w-4" />Criar primeiro convite</Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {recentInvitations.map((invitation) => (
                <article key={invitation.id} className="group relative overflow-visible rounded-2xl border border-border bg-card transition duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-vellune">
                  <Link to="/invitations/$id/editor" params={{ id: invitation.id }} className="block overflow-hidden rounded-2xl">
                    <ProjectThumbnail invitation={invitation} />
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{invitation.name}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{invitation.customer?.name ?? "Sem cliente"}</p>
                        </div>
                        <InvitationStatusBadge status={invitation.status} />
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{fmtEventDate(invitation.event_date)}</span>
                        <span>{new Date(invitation.updated_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                  </Link>
                  <div className="absolute right-3 top-[135px] z-20 flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                    <Link to="/invitations/$id/editor" params={{ id: invitation.id }} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card/92 px-2.5 text-[10px] font-semibold text-foreground backdrop-blur-md hover:border-primary/45" aria-label="Editar convite" title="Editar" onClick={(event) => event.stopPropagation()}>
                      <Pencil className="h-3.5 w-3.5" />Editar
                    </Link>
                    <Link to="/invitations/$id/preview" params={{ id: invitation.id }} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/92 text-muted-foreground backdrop-blur-md hover:text-foreground" aria-label="Prévia" title="Prévia" onClick={(event) => event.stopPropagation()}>
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    <Button variant="ghost" type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/92 text-muted-foreground backdrop-blur-md hover:text-foreground" aria-label="Mais ações" title="Mais ações" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpenProjectMenu((current) => current === invitation.id ? null : invitation.id); }}>
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                    {openProjectMenu === invitation.id && (
                      <div className="absolute right-0 top-10 grid min-w-[170px] gap-1 rounded-2xl border border-border bg-card/98 p-1.5 shadow-vellune backdrop-blur-xl">
                        <Link to="/invitations/$id/report" params={{ id: invitation.id }} onClick={() => setOpenProjectMenu(null)} className="rounded-xl px-3 py-2 text-left text-[11px] text-muted-foreground hover:bg-background hover:text-foreground">Resultados do convite</Link>
                        <Link to="/invitations/$id/guests" params={{ id: invitation.id }} onClick={() => setOpenProjectMenu(null)} className="rounded-xl px-3 py-2 text-left text-[11px] text-muted-foreground hover:bg-background hover:text-foreground">Convidados</Link>
                        <Link to="/invitations/$id/preview" params={{ id: invitation.id }} onClick={() => setOpenProjectMenu(null)} className="rounded-xl px-3 py-2 text-left text-[11px] text-muted-foreground hover:bg-background hover:text-foreground">Abrir prévia</Link>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo da empresa">
          {([["Convites", totals.invitations, Mail], ["Visualizações", totals.views, Eye], ["Confirmações", totals.confirmed, CheckCircle2], ["Pessoas", totals.people, Users]] as const).map(([label, value, Icon]) => <VelluneCard key={label} className="p-4"><div className="flex items-center gap-2 text-muted-foreground"><Icon className="size-4 text-primary" /><span className="text-xs">{label}</span></div><p className="mt-3 font-display text-2xl font-semibold tabular-nums">{value.toLocaleString("pt-BR")}</p></VelluneCard>)}
        </section>
        <section className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[24px] border border-primary/28 bg-card p-5 shadow-vellune sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-normal text-primary">{nextAction.eyebrow}</p>
                <h2 className="mt-2 font-display text-xl font-semibold tracking-normal text-foreground">{nextAction.title}</h2>
                <p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">{nextAction.description}</p>
              </div>
              <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:flex"><Sparkles className="h-5 w-5" /></span>
            </div>
            <div className="mt-5">
              {"params" in nextAction ? (
                <Link to={nextAction.to} params={nextAction.params} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:bg-primary-hover">{nextAction.label}<ArrowUpRight className="h-3.5 w-3.5" /></Link>
              ) : (
                <Link to={nextAction.to} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:bg-primary-hover">{nextAction.label}<ArrowUpRight className="h-3.5 w-3.5" /></Link>
              )}
            </div>
          </div>
          <div className="rounded-[24px] border border-border bg-card p-5 shadow-vellune sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">Agora</p><h2 className="mt-1 font-display text-lg font-semibold text-foreground">Atividade recente</h2></div>
              <Clock3 className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-4 space-y-2.5">
              {activity.length ? activity.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><CheckCircle2 className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-foreground">{item.title}</p><p className="truncate text-[10px] text-muted-foreground">{item.description}</p></div>
                  <span className="shrink-0 text-[9px] text-muted-foreground">{new Date(item.date).toLocaleDateString("pt-BR")}</span>
                </div>
              )) : <div className="rounded-2xl border border-dashed border-border bg-background p-5 text-center text-[10px] text-muted-foreground">Sua atividade aparecerá aqui conforme você criar e publicar.</div>}
            </div>
          </div>
        </section>

        {continueInvitation && (
          <section className="mt-6">
            <div className="rounded-[24px] border border-border bg-card p-4 shadow-vellune sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="w-full shrink-0 sm:w-[180px]"><ProjectThumbnail invitation={continueInvitation} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">{continueInvitation.status === "draft" ? "Continuar trabalhando" : "Revisar criação"}</p>
                  <h2 className="mt-1 truncate font-display text-xl font-semibold tracking-normal text-foreground">{continueInvitation.name}</h2>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{continueInvitation.customer?.name ?? "Sem cliente"} · atualizado em {new Date(continueInvitation.updated_at).toLocaleDateString("pt-BR")}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link to="/invitations/$id/editor" params={{ id: continueInvitation.id }} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-vellune transition hover:bg-primary-hover active:scale-[0.98]">{continueInvitation.status === "draft" ? "Continuar edição" : "Editar criação"}<ArrowUpRight className="h-3.5 w-3.5" /></Link>
                    <Link to="/invitations/$id/preview" params={{ id: continueInvitation.id }} className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-semibold text-foreground transition hover:border-primary/45"><Eye className="h-3.5 w-3.5" />Prévia</Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mt-10 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">Próximo momento</p>
                <h2 className="mt-1 font-display text-lg font-semibold text-foreground">Agenda do convite</h2>
              </div>
              <Clock3 className="h-5 w-5 text-primary" />
            </div>
            {nextEvent ? (
              <div className="mt-5 rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <InvitationStatusBadge status={nextEvent.status} />
                  <span className="text-xs text-muted-foreground">{nextEvent.customer_name ?? "Sem cliente"}</span>
                </div>
                <p className="mt-3 text-base font-semibold text-foreground">{nextEvent.name}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{fmtEventDate(nextEvent.event_date)}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{nextEvent.event_time.slice(0, 5)}</span>
                </div>
                <Link to="/invitations/$id/editor" params={{ id: nextEvent.id }} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover">
                  Abrir convite
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-border bg-background p-5">
                <p className="text-sm font-medium text-foreground">Nenhum evento futuro.</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Quando houver um próximo evento, ele aparecerá nesta área.</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">Últimas respostas</p>
                <h2 className="mt-1 font-display text-lg font-semibold text-foreground">RSVP em destaque</h2>
              </div>
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div className="mt-5 space-y-2">
              {recentResponses.length ? recentResponses.slice(0, 4).map((response) => (
                <div key={response.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><CheckCircle2 className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{response.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{response.invitation?.name ?? "Convite"} · {response.people_count} pessoa(s)</p>
                  </div>
                  <span className="text-[9px] text-muted-foreground">{new Date(response.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-border bg-background p-5 text-center text-xs text-muted-foreground">
                  Nenhuma confirmação recente.
                </div>
              )}
            </div>
            <Link to="/reports" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover">
              Ver resultados
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        <section className="mt-10 flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><MapPin className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-semibold text-foreground">Tudo pronto para a próxima etapa</p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Abra seus convites, ajuste o design no editor e acompanhe as respostas quando o evento estiver no ar.</p>
            </div>
          </div>
          <Link to="/invitations" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-semibold text-foreground hover:border-primary/45">
            Ir para convites
            <ArrowUpRight className="h-4 w-4 text-primary" />
          </Link>
        </section>
      </div>

    </div>
  );
}
