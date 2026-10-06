import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pencil, Share2 } from "lucide-react";
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

  return (
    <div>
      <Link to="/invitations" className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">← Convites</Link>
      {q.isLoading ? <LoadingState /> : !inv ? <EmptyState>Convite não encontrado.</EmptyState> : (
        <>
          <PageHeader title={activeEvent?.name || inv.name}
            description={`${inv.customer?.name ?? ""} · ${fmtEventDate(activeEvent?.event_date || inv.event_date)} às ${(activeEvent?.event_time || inv.event_time).slice(0, 5)}${(activeEvent?.venue_name || inv.venue_name) ? ` · ${activeEvent?.venue_name || inv.venue_name}` : ""}`}
            action={<div className="flex items-center gap-2"><InvitationStatusBadge status={inv.status} />
              {(inv.status === "published" || inv.status === "closed") && <Button variant="outline" onClick={() => setShare(true)}><Share2 className="h-4 w-4" />Compartilhar</Button>}
              <Button asChild><Link to="/invitations/$id/editor" params={{ id: inv.id }}><Pencil className="h-4 w-4" />Editar</Link></Button></div>} />
          <p className="mb-4 text-center text-xs text-muted-foreground">{inv.status === "draft" ? "Pré-visualização interna — ainda não publicada." : "Pré-visualização interna — a página pública usa este mesmo conteúdo."}</p>
          <ShareDialog slug={inv.slug} open={share} onOpenChange={setShare} />
          <InvitationRender key={`${inv.id}:${inv.updated_at}:${snapshot?.savedAt ?? "saved"}:${JSON.stringify(activeBlocks)}:${JSON.stringify(activeBackground)}`} background={activeBackground} blocks={activeBlocks} ctx={invitationCtx(inv, activeEvent)} />
        </>
      )}
    </div>
  );
}
