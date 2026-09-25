import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listFiles, STORAGE_PREFIX, uploadImage, useAssetUrl, validateImage, type AssetScope, type FileRow } from "@/lib/assets";
import { cn } from "@/lib/utils";

/** Upload + simple picker of images already sent for this invitation/template. */
export function ImageUpload({ scope, value, onChange }: { scope: AssetScope | undefined; value: string; onChange: (v: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const key = ["files", scope?.kind, scope?.id];
  const files = useQuery({ queryKey: key, queryFn: () => listFiles(scope!), enabled: !!scope });

  if (!scope) return <p className="text-xs text-muted-foreground">Salve o modelo para poder enviar imagens.</p>;

  async function onFile(f: File | undefined) {
    if (!f) return;
    const err = validateImage(f);
    if (err) { toast.error(err); return; }
    setBusy(true);
    try {
      onChange(await uploadImage(scope!, f));
      toast.success("Imagem enviada.");
      qc.invalidateQueries({ queryKey: key });
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }

  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <Button type="button" size="sm" variant="outline" className="w-full" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Enviar imagem
      </Button>
      <p className="text-[11px] text-muted-foreground">JPG, PNG ou WebP, até 10 MB.</p>
      {!!files.data?.length && (
        <div className="grid grid-cols-4 gap-1.5">
          {files.data.map((f) => <Thumb key={f.id} f={f} active={value === STORAGE_PREFIX + f.storage_path} onPick={() => onChange(STORAGE_PREFIX + f.storage_path)} />)}
        </div>
      )}
    </div>
  );
}

function Thumb({ f, active, onPick }: { f: FileRow; active: boolean; onPick: () => void }) {
  const url = useAssetUrl(STORAGE_PREFIX + f.storage_path);
  return (
    <button type="button" onClick={onPick} title={f.file_name}
      className={cn("aspect-square overflow-hidden rounded border bg-muted", active && "ring-2 ring-primary")}>
      {url && <img src={url} alt={f.file_name} className="h-full w-full object-cover" />}
    </button>
  );
}
