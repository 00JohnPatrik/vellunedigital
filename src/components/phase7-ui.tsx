import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, CheckCircle2, Clock3, ExternalLink, Heart, History, Megaphone, UserPlus, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { SubscriptionOverviewCard } from "@/components/subscription-ui";
import { listInvitations, type Invitation } from "@/lib/invitations";
import type { AppUser } from "@/lib/app-user";
import { listNotificationReadMarkers, markNotificationGroupRead, notificationReadMarkersKey, type NotificationGroupType } from "@/lib/notification-read";

export function NotificationCenter({ appUser }: { appUser: AppUser }) {
  const companyId = appUser.company?.id ?? null;
  const isSuperAdmin = appUser.role === "super_admin";
  const qc = useQueryClient();
  const [markingGroup, setMarkingGroup] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["phase7", "notifications", companyId, appUser.role],
    queryFn: async () => {
      const invitationsQuery = supabase
        .from("invitations")
        .select("id, name, status, event_date, updated_at, company_id, customer_id, company:companies!invitations_company_id_fkey(name), customer:customers!invitations_customer_id_fkey(name)")
        .neq("status", "deleted")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(20);

      const responsesQuery = supabase
        .from("rsvp_responses")
        .select("id, invitation_id, name, people_count, created_at, invitation:invitations(id, name, company_id, customer_id, company:companies!invitations_company_id_fkey(name), customer:customers!invitations_customer_id_fkey(name))")
        .order("created_at", { ascending: false })
        .limit(20);

      const [{ data: invitations, error: invitationsError }, { data: responses, error: responsesError }] = await Promise.all([
        invitationsQuery,
        responsesQuery,
      ]);

      if (invitationsError) throw invitationsError;
      if (responsesError) throw responsesError;

      return {
        invitations: (invitations ?? []) as Array<{
          id: string;
          name: string;
          status: string;
          event_date: string;
          updated_at: string;
          company_id: string;
          customer_id: string;
          company: { name: string } | null;
          customer: { name: string } | null;
        }>,
        responses: (responses ?? []) as Array<{
          id: string;
          invitation_id: string;
          name: string;
          people_count: number;
          created_at: string;
          invitation: {
            id: string;
            name: string;
            company_id: string;
            customer_id: string;
            company: { name: string } | null;
            customer: { name: string } | null;
          } | null;
        }>,
      };
    },
    staleTime: 30_000,
  });

  const readMarkersQuery = useQuery({
    queryKey: notificationReadMarkersKey(appUser.id),
    queryFn: () => listNotificationReadMarkers(appUser.id),
    staleTime: 30_000,
  });

  const readAtByGroup = useMemo(() => {
    const map = new Map<string, string>();
    for (const marker of readMarkersQuery.data ?? []) {
      map.set(`${marker.group_type}:${marker.group_id}`, marker.last_read_at);
    }
    return map;
  }, [readMarkersQuery.data]);

  const notifications = useMemo(() => {
    if (!query.data) return [];

    const invitationItems = query.data.invitations.slice(0, 12).map((item) => ({
      id: `invitation-${item.id}`,
      icon: item.status === "published" ? CheckCircle2 : Clock3,
      title: item.status === "published" ? "Convite publicado" : "Convite atualizado",
      description: item.name,
      date: item.updated_at,
      href: isSuperAdmin ? "/admin/reports" : `/invitations/${item.id}/editor`,
      companyId: item.company_id,
      companyName: item.company?.name ?? "Empresa não identificada",
      customerId: item.customer_id,
      customerName: item.customer?.name ?? "Cliente sem cadastro",
    }));

    const responseItems = query.data.responses
      .filter((item) => Boolean(item.invitation))
      .slice(0, 12)
      .map((item) => {
        const invitation = item.invitation!;
        return {
          id: `response-${item.id}`,
          icon: UserPlus,
          title: "Nova confirmação de presença",
          description: `${item.name} confirmou presença`,
          date: item.created_at,
          href: isSuperAdmin ? "/admin/reports" : `/invitations/${item.invitation_id}/report`,
          companyId: invitation.company_id,
          companyName: invitation.company?.name ?? "Empresa não identificada",
          customerId: invitation.customer_id,
          customerName: invitation.customer?.name ?? "Cliente sem cadastro",
        };
      });

    return [...invitationItems, ...responseItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 16);
  }, [isSuperAdmin, query.data]);

  const groupedNotifications = useMemo(() => {
    const groups = new Map<string, {
      key: string;
      groupType: NotificationGroupType;
      groupId: string;
      label: string;
      secondary?: string;
      items: typeof notifications;
      unreadCount: number;
    }>();

    for (const item of notifications) {
      const groupType: NotificationGroupType = isSuperAdmin ? "company" : "customer";
      const groupId = isSuperAdmin ? item.companyId : item.customerId;
      const key = `${groupType}:${groupId}`;
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        const readAt = readAtByGroup.get(key);
        const unreadCount = readAt
          ? notifications.filter((candidate) => {
              const candidateKey = `${groupType}:${isSuperAdmin ? candidate.companyId : candidate.customerId}`;
              return candidateKey === key && new Date(candidate.date).getTime() > new Date(readAt).getTime();
            }).length
          : 1;
        groups.set(key, {
          key,
          groupType,
          groupId,
          label: isSuperAdmin ? item.companyName : item.customerName,
          secondary: isSuperAdmin ? undefined : item.companyName,
          items: [item],
          unreadCount,
        });
      }
    }

    return [...groups.values()].map((group) => {
      const readAt = readAtByGroup.get(group.key);
      const unreadCount = group.items.filter((item) => !readAt || new Date(item.date).getTime() > new Date(readAt).getTime()).length;
      return { ...group, unreadCount };
    });
  }, [isSuperAdmin, notifications, readAtByGroup]);

  const unreadCount = groupedNotifications.reduce((total, group) => total + group.unreadCount, 0);

  async function markGroupRead(group: typeof groupedNotifications[number]) {
    if (group.unreadCount === 0 || markingGroup) return;
    setMarkingGroup(group.key);
    try {
      const marker = await markNotificationGroupRead(appUser.id, group.groupType, group.groupId);
      qc.setQueryData(notificationReadMarkersKey(appUser.id), (current: Array<{
        id: string;
        user_id: string;
        group_type: NotificationGroupType;
        group_id: string;
        last_read_at: string;
      }> | undefined) => {
        const next = [...(current ?? [])];
        const index = next.findIndex((item) => item.group_type === marker.group_type && item.group_id === marker.group_id);
        if (index >= 0) next[index] = marker;
        else next.push(marker);
        return next;
      });
    } catch {
      // Falha persistente não deve fechar nem quebrar o centro de notificações.
    } finally {
      setMarkingGroup(null);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificações" title="Notificações" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-semibold">Notificações</p>
            <p className="text-xs text-muted-foreground">
              {isSuperAdmin ? "Organizadas por empresa" : "Organizadas por cliente"}
            </p>
          </div>
          <Badge variant="secondary">{unreadCount}</Badge>
        </div>
        <Separator />

        {query.isLoading || readMarkersQuery.isLoading ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Carregando notificações...</p>
        ) : query.isError || readMarkersQuery.isError ? (
          <p className="p-6 text-center text-sm text-destructive">Não foi possível carregar as notificações.</p>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">Tudo em dia</p>
            <p className="mt-1 text-xs text-muted-foreground">Nenhuma atividade recente encontrada.</p>
          </div>
        ) : (
          <div className="max-h-[min(70vh,34rem)] overflow-y-auto p-2">
            {groupedNotifications.map((group) => (
              <section key={group.key} className="mb-2 overflow-hidden rounded-2xl border bg-card last:mb-0">
                <div className="flex items-center justify-between gap-2 border-b bg-muted/35 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{group.label}</p>
                    {group.secondary && <p className="truncate text-[10px] text-muted-foreground">{group.secondary}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {group.unreadCount > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void markGroupRead(group)}
                        disabled={markingGroup === group.key}
                        className="h-8 rounded-full px-2 text-[10px] text-muted-foreground hover:text-foreground"
                        aria-label={`Marcar notificações de ${group.label} como lidas`}
                        title={`Marcar todos de ${group.label} como lidos`}
                      >
                        <CheckCheck className="mr-1 h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{markingGroup === group.key ? "Salvando..." : "Marcar lidos"}</span>
                      </Button>
                    )}
                    <Badge variant="secondary" className="text-[10px]">{group.unreadCount > 0 ? group.unreadCount : group.items.length}</Badge>
                  </div>
                </div>

                <div className="divide-y">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const readAt = readAtByGroup.get(group.key);
                    const isRead = Boolean(readAt && new Date(item.date).getTime() <= new Date(readAt).getTime());
                    return (
                      <Link
                        key={item.id}
                        to={item.href as never}
                        className={`flex gap-3 px-3 py-3 transition-colors hover:bg-muted/50 ${isRead ? "opacity-60" : ""}`}
                      >
                        <span className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                          {!isRead && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{item.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                          <span className="mt-1 block text-[10px] text-muted-foreground">{new Date(item.date).toLocaleString("pt-BR")}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function CompanyDashboardEnhancements({ companyId }: { companyId: string }) {
  const invitations = useQuery({ queryKey: ["phase7", "recent-invitations"], queryFn: listInvitations, staleTime: 30_000 });
  const storagePrefix = `vellune-company-${companyId}`;
  const [favorites, setFavorites] = useState<string[]>([]);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    try {
      setFavorites(JSON.parse(window.localStorage.getItem(`${storagePrefix}-favorite-invitations`) ?? "[]"));
      setOnboardingDone(window.localStorage.getItem(`${storagePrefix}-onboarding-complete`) === "true");
    } catch { /* armazenamento local indisponível não impede o dashboard */ }
  }, [storagePrefix]);

  const rows = (invitations.data ?? []).slice(0, 6);
  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter((value) => value !== id) : [...favorites, id];
    setFavorites(next);
    try { window.localStorage.setItem(`${storagePrefix}-favorite-invitations`, JSON.stringify(next)); } catch { /* preferências locais são opcionais */ }
  };
  const completeOnboarding = () => {
    setOnboardingDone(true);
    try { window.localStorage.setItem(`${storagePrefix}-onboarding-complete`, "true"); } catch { /* armazenamento local indisponível não impede o uso */ }
  };

  return <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
    <div className="space-y-6">
      {!onboardingDone && <Card className="border-primary/20 bg-primary/5"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4 text-primary" />Comece por aqui</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Crie um cliente, escolha um modelo e publique seu primeiro convite.</p><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" asChild><Link to="/invitations/new">Criar convite</Link></Button><Button size="sm" variant="ghost" onClick={completeOnboarding}>Dispensar</Button></div></CardContent></Card>}
      <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" />Convites recentes</CardTitle><Button variant="ghost" size="sm" asChild><Link to="/invitations">Ver todos<ExternalLink className="ml-1 h-3.5 w-3.5" /></Link></Button></CardHeader><CardContent>{invitations.isLoading ? <p className="text-sm text-muted-foreground">Carregando convites...</p> : rows.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center"><p className="text-sm font-medium">Nenhum convite criado ainda.</p><Button size="sm" className="mt-3" asChild><Link to="/invitations/new">Criar primeiro convite</Link></Button></div> : <div className="space-y-2">{rows.map((item: Invitation) => <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{new Date(`${item.event_date}T00:00:00`).toLocaleDateString("pt-BR")} · {item.status === "published" ? "Publicado" : "Rascunho"}</p></div><button type="button" aria-label={favorites.includes(item.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"} onClick={() => toggleFavorite(item.id)} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-primary"> <Heart className={`h-4 w-4 ${favorites.includes(item.id) ? "fill-current text-primary" : ""}`} /></button><Button size="sm" variant="outline" asChild><Link to="/invitations/$id/editor" params={{ id: item.id }}>Abrir</Link></Button></div>)}</div>}</CardContent></Card>
    </div>
    <SubscriptionOverviewCard companyId={companyId} />
  </div>;
}

export function AdminPresence({ channelName = "presence:super-admin" }: { channelName?: string }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const channel = supabase.channel(channelName);
    const update = () => setCount(Object.keys(channel.presenceState()).length);
    channel.on("presence", { event: "sync" }, update).on("presence", { event: "join" }, update).on("presence", { event: "leave" }, update).subscribe((status) => {
      if (status === "SUBSCRIBED") update();
    });
    return () => { void supabase.removeChannel(channel); };
  }, [channelName]);
  return <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground"><Wifi className="h-4 w-4 text-emerald-500" /><span>{count === null ? "Conectando à presença..." : `${count} usuário(s) online`}</span></div>;
}

export function ActivitySummary() {
  const query = useQuery({ queryKey: ["phase7", "admin-activity"], queryFn: async () => {
    const [{ data: companies, error: companiesError }, { data: users, error: usersError }, { data: invitations, error: invitationsError }] = await Promise.all([
      supabase.from("companies").select("id, name, created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(4),
      supabase.from("users").select("id, name, created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(4),
      supabase.from("invitations").select("id, name, created_at").neq("status", "deleted").order("created_at", { ascending: false }).limit(4),
    ]);
    if (companiesError) throw companiesError;
    if (usersError) throw usersError;
    if (invitationsError) throw invitationsError;
    return [...(companies ?? []).map((item) => ({ ...item, type: "Empresa" })), ...(users ?? []).map((item) => ({ ...item, type: "Usuário" })), ...(invitations ?? []).map((item) => ({ ...item, type: "Convite" }))].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);
  }, staleTime: 30_000 });
  return <Card className="mt-6"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" />Atividade recente</CardTitle></CardHeader><CardContent>{query.isLoading ? <p className="text-sm text-muted-foreground">Carregando atividade...</p> : query.isError ? <p className="text-sm text-destructive">Não foi possível carregar a atividade.</p> : query.data?.length ? <div className="space-y-3">{query.data.map((item) => <div key={`${item.type}-${item.id}`} className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">{item.type.slice(0, 1)}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.type} · {new Date(item.created_at).toLocaleString("pt-BR")}</p></div></div>)}</div> : <p className="text-sm text-muted-foreground">Nenhuma atividade recente.</p>}</CardContent></Card>;
}