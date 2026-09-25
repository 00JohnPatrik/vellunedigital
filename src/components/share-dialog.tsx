import { Copy, ExternalLink, MessageCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { publicUrl, whatsappShareUrl } from "@/lib/invitations";

/** Share area for a published/closed invitation: copy link, WhatsApp, QR Code pointing to /convite/:slug. */
export function ShareDialog({ slug, open, onOpenChange }: { slug: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const url = publicUrl(slug);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copiado."); }
    catch { toast.error("Não foi possível copiar. Selecione e copie o link manualmente."); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar convite</DialogTitle>
          <DialogDescription>Envie o link público para os convidados.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2"><Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} /><Button type="button" onClick={copy}><Copy className="h-4 w-4" />Copiar</Button></div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><a href={whatsappShareUrl(slug)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a></Button>
            <Button asChild variant="outline"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />Abrir página</a></Button>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 text-foreground">
            <QRCodeSVG value={url} size={176} bgColor="transparent" fgColor="currentColor" />
            <p className="text-xs text-muted-foreground">QR Code do link público</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
