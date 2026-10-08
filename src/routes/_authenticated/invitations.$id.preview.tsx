import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Eye, Monitor, Pencil, RefreshCw, Share2, Smartphone } from "lucide-react";
import { ShareDialog } from "@/components/share-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState, PageHeader } from "@/components/admin-ui";
import { InvitationRender, InvitationStatusBadge, invitationCtx } from "@/components/invitation-ui";
import { fmtEventDate, getInvitation, invitationsKey, type EventValues } from "@/lib/invitations";
import { normalizeBlocks } from "@/lib/blocks";
import type { Background, Block } from "@/lib/templates";

export const Route = createFileRoute("/_authenticated/invitations/$id/preview")({
  head: () => ({ meta: [{ title: "Visualizar convite — Vellune Digital" }] }),
  component: PreviewPage,
});

type EditorPreviewSnapshot = {
  savedAt: number;
  blocks: Block[];
  background: Background;
  event: EventValues;
  customerId: string;
};

const SNAPSHOT_MAX_AGE = 30 * 60 * 1000;

function readEditorSnapshot(id: string): EditorPreviewSnapshot | null {
  try {
    const raw = sessionStorage.getItem(`editor-preview-snapshot:${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EditorPreviewSnapshot>;
    if (!parsed || typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > SNAPSHOT_MAX_AGE) return null;
    if (!Array.isArray(parsed.blocks) || !parsed.event || typeof parsed.event !== "object") return null;
    return {
      savedAt: parsed.savedAt,
      blocks: normalizeBlocks({ version: 1, blocks: parsed.blocks }),
      background: parsed.background && typeof parsed.background === "object" ? parsed.background : {},
      event: parsed.event as EventValues,
      customerId: typeof parsed.customerId === "string" ? parsed.customerId : "",
    };
  } catch {
    return null;
  }
}

function PreviewPage() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: [...invitationsKey, id], queryFn: () => getInvitation(id) });
  const inv = q.data;
  const [share, setShare] = useState(false);
  const [snapshot, setSnapshot] = useState<EditorPreviewSnapshot | null>(null);

  // sessionStorage only exists in the browser. Do not read it during SSR,
  // otherwise the server-rendered preview would permanently fall back to stale DB content.
  useEffect(() => {
    setSnapshot(readEditorSnapshot(id));
  }, [id]);

  const activeBlocks = snapshot?.blocks ?? inv?.content?.blocks ?? [];
  const activeBackground = snapshot?.background ?? inv?.content?.settings?.background;
  const activeEvent = snapshot?.event;

  const [viewport, setViewport] = useState<"mobile" | "desktop">("mobile");
  const [refreshing, setRefreshing] = useState(false);

  const refreshPreview = async () => {
    setRefreshing(true);
    try {
      const result = await q.refetch();
      setSnapshot(readEditorSnapshot(id));
      if (result.error) throw result.error;
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-2rem)] rounded-[1.5rem] border border-border/60 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/.08),transparent_28%),linear-gradient(145deg,hsl(var(--background)),hsl(var(--muted)/.35))] p-3 text-foreground shadow-2xl sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1500px]">
        {q.isLoading ? <LoadingState /> : !inv ? <EmptyState>Convite não encontrado.</EmptyState> : (
          <>
            <header className="rounded-2xl border border-primary/15 bg-card/90 p-3 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="ghost" size="icon" className="shrink-0" asChild>
                  <Link to="/invitations" aria-label="Voltar para convites"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <Eye className="hidden h-4 w-4 shrink-0 text-primary sm:block" />
                    <h1 className="min-w-0 truncate font-display text-base font-semibold tracking-tight sm:text-lg">{activeEvent?.name || inv.name}</h1>
                    <InvitationStatusBadge status={inv.status} />
                  </div>
                  <p className="mt-1 hidden truncate text-xs text-muted-foreground sm:block">
                    {inv.customer?.name ?? "Sem cliente"} · {fmtEventDate(activeEvent?.event_date || inv.event_date)} às {(activeEvent?.event_time || inv.event_time).slice(0, 5)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {(inv.status === "published" || inv.status === "closed") && <Button variant="outline" size="sm" onClick={() => setShare(true)}><Share2 className="h-4 w-4" /><span className="hidden sm:inline">Compartilhar</span></Button>}
                  <Button type="button" variant="outline" size="sm" onClick={() => void refreshPreview()} disabled={refreshing} title="Recarregar a prévia e conferir o estado mais recente"><RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} /><span className="hidden sm:inline">Atualizar prévia</span></Button>
                  {snapshot ? <Button size="sm" asChild><a href={`/invitations/${inv.id}/editor?experimental=1`}><Pencil className="h-4 w-4" />Editar</a></Button> : <Button size="sm" asChild><Link to="/invitations/$id/editor" params={{ id: inv.id }}><Pencil className="h-4 w-4" />Editar</Link></Button>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-background/70 p-1" role="group" aria-label="Modo de visualização">
                  <Button type="button" size="sm" variant={viewport === "mobile" ? "default" : "ghost"} className="h-8 px-3 text-xs" onClick={() => setViewport("mobile")}><Smartphone className="mr-1.5 h-3.5 w-3.5" />Celular</Button>
                  <Button type="button" size="sm" variant={viewport === "desktop" ? "default" : "ghost"} className="h-8 px-3 text-xs" onClick={() => setViewport("desktop")}><Monitor className="mr-1.5 h-3.5 w-3.5" />Desktop</Button>
                </div>
                <p className="text-[11px] leading-4 text-muted-foreground">
                  {snapshot ? <span className="inline-flex items-center gap-1.5 text-primary"><Check className="h-3.5 w-3.5" />Prévia das alterações atuais</span> : inv.status === "draft" ? "Pré-visualização interna — ainda não publicada." : "Pré-visualização interna — usa o conteúdo salvo."}
                </p>
              </div>
            </header>

            <section className="mt-4 overflow-hidden rounded-2xl border border-primary/10 bg-[#e9e7e4] p-3 shadow-inner dark:bg-[#11151c] sm:p-5" aria-label="Área de pré-visualização do convite">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{viewport === "mobile" ? "Visualização para celular" : "Visualização em tela ampla"}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{viewport === "mobile" ? "A experiência principal para seus convidados." : "Confira como o convite se comporta quando há mais espaço lateral."}</p>
                </div>
                <span className="hidden rounded-full border border-border/70 bg-background/75 px-2.5 py-1 text-[10px] text-muted-foreground sm:inline-flex">Somente visualização</span>
              </div>

              <div className={viewport === "mobile"
                ? "flex min-h-[70vh] items-start justify-center overflow-auto rounded-2xl border border-black/5 bg-gradient-to-b from-[#d9d5d0] to-[#c9c4be] p-4 sm:p-6"
                : "flex min-h-[70vh] items-start justify-center overflow-auto rounded-2xl border border-black/5 bg-gradient-to-b from-[#dedede] to-[#cfcfcf] p-4 sm:p-8"}>
                <div className={viewport === "mobile"
                  ? "w-full max-w-[460px] rounded-[2rem] border-[8px] border-[#17191d] bg-[#17191d] p-1 shadow-2xl"
                  : "w-full max-w-[980px] rounded-[1.5rem] border border-black/10 bg-background/80 p-3 shadow-2xl"}>
                  <div className={viewport === "mobile" ? "overflow-hidden rounded-[1.45rem]" : "overflow-hidden rounded-[1rem]"}>
                    <InvitationRender
                      key={`${inv.id}:${inv.updated_at}:${snapshot?.savedAt ?? "saved"}:${JSON.stringify(activeBlocks)}:${JSON.stringify(activeBackground)}`}
                      background={activeBackground}
                      blocks={activeBlocks}
                      ctx={invitationCtx(inv, activeEvent)}
                    />
                  </div>
                </div>
              </div>
            </section>
            <ShareDialog slug={inv.slug} open={share} onOpenChange={setShare} />
          </>
        )}
      </div>
    </main>
  )
}
