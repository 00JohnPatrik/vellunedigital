import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Share2 } from "lucide-react";
import { ShareDialog } from "@/components/share-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState, PageHeader } from "@/components/admin-ui";
import { InvitationRender, InvitationStatusBadge, invitationCtx } from "@/components/invitation-ui";
import { fmtEventDate, getInvitation, invitationsKey } from "@/lib/invitations";

export const Route = createFileRoute("/_authenticated/invitations/$id/preview")({
  head: () => ({ meta: [{ title: "Visualizar convite — Vellune Digital" }] }),
  component: PreviewPage,
});

function PreviewPage() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: [...invitationsKey, id], queryFn: () => getInvitation(id) });
  const inv = q.data;
  const [share, setShare] = useState(false);
  return (
    <div>
      <Link to="/invitations" className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">← Convites</Link>
      {q.isLoading ? <LoadingState /> : !inv ? <EmptyState>Convite não encontrado.</EmptyState> : (
        <>
          <PageHeader title={inv.name}
            description={`${inv.customer?.name ?? ""} · ${fmtEventDate(inv.event_date)} às ${inv.event_time.slice(0, 5)}${inv.venue_name ? ` · ${inv.venue_name}` : ""}`}
            action={<div className="flex items-center gap-2"><InvitationStatusBadge status={inv.status} />
              {(inv.status === "published" || inv.status === "closed") && <Button variant="outline" onClick={() => setShare(true)}><Share2 className="h-4 w-4" />Compartilhar</Button>}
              <Button asChild><Link to="/invitations/$id/editor" params={{ id: inv.id }}><Pencil className="h-4 w-4" />Editar</Link></Button></div>} />
          <p className="mb-4 text-center text-xs text-muted-foreground">{inv.status === "draft" ? "Pré-visualização interna — ainda não publicada." : "Pré-visualização interna — a página pública usa este mesmo conteúdo."}</p>
          <ShareDialog slug={inv.slug} open={share} onOpenChange={setShare} />
          <InvitationRender background={inv.content?.settings?.background} blocks={inv.content?.blocks ?? []} ctx={invitationCtx(inv)} />
        </>
      )}
    </div>
  );
}
