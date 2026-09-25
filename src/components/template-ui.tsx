import { useState, type ReactNode } from "react";
import { LayoutTemplate, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, type Status } from "@/components/admin-ui";
import { InvitationCanvas } from "@/components/block-render";
import { useBlocksHistory, VisualEditor } from "@/components/visual-editor";
import { CATEGORIES, categoryLabel, STARTERS, type Block, type Template, type TemplateValues } from "@/lib/templates";
import { normalizeBlocks, validateContent } from "@/lib/blocks";

export function PreviewImage({ src, name, className = "aspect-[4/5]" }: { src: string | null; name: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className={`${className} flex w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground`}>
        <LayoutTemplate className="h-8 w-8" />
        <span className="px-4 text-center text-xs">Sem preview</span>
      </div>
    );
  }
  return <img src={src} alt={name} loading="lazy" onError={() => setBroken(true)} className={`${className} w-full object-cover`} />;
}

export function TemplateCard({ t, actions }: { t: Template; actions: ReactNode }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <PreviewImage src={t.preview_image} name={t.name} />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium">{t.name}</div>
            <div className="text-xs text-muted-foreground">{categoryLabel(t.category)}</div>
          </div>
          <StatusBadge status={t.status} />
        </div>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">{actions}</div>
      </div>
    </div>
  );
}

/** Read-only preview of blocks, using the same renderer as the editor. */
export function BlocksPreview({ blocks }: { blocks: Block[] }) {
  if (!blocks.length) return <p className="text-sm text-muted-foreground">Nenhum bloco neste modelo.</p>;
  return <InvitationCanvas blocks={blocks} className="max-w-sm" />;
}

export function TemplateForm({ initial, isNew, submitLabel, onSubmit, onCancel }: {
  initial: TemplateValues; isNew: boolean; submitLabel: string;
  onSubmit: (v: TemplateValues) => Promise<void>; onCancel?: () => void;
}) {
  const [v, setV] = useState(initial);
  const h = useBlocksHistory(normalizeBlocks(initial.content));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!v.name.trim()) errs["name"] = "Informe o nome.";
    else if (v.name.trim().length > 150) errs["name"] = "Máximo de 150 caracteres.";
    if (!v.category) errs["category"] = "Escolha a categoria.";
    if (v.preview_image.trim() && !/^https?:\/\/\S+$/i.test(v.preview_image.trim())) errs["preview_image"] = "Use um endereço começando com http:// ou https://";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const content = { version: 1 as const, blocks: h.blocks };
    const invalid = validateContent(content);
    if (invalid) { toast.error(invalid); return; }
    setBusy(true);
    try { await onSubmit({ ...v, content }); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="t-name">Nome *</Label>
          <Input id="t-name" value={v.name} maxLength={150} onChange={(e) => setV({ ...v, name: e.target.value })} />
          {errors["name"] && <p className="text-xs text-destructive">{errors["name"]}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Categoria *</Label>
          <Select value={v.category} onValueChange={(c) => setV({ ...v, category: c as TemplateValues["category"] })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
          {errors["category"] && <p className="text-xs text-destructive">{errors["category"]}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={v.status} onValueChange={(s) => setV({ ...v, status: s as Status })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="inactive">Inativo</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
          <Label htmlFor="t-img">Imagem de preview (URL)</Label>
          <Input id="t-img" type="url" placeholder="https://..." value={v.preview_image} onChange={(e) => setV({ ...v, preview_image: e.target.value })} />
          {errors["preview_image"] && <p className="text-xs text-destructive">{errors["preview_image"]}</p>}
        </div>
        {isNew && (
          <div className="space-y-1.5">
            <Label>Estrutura inicial</Label>
            <Select onValueChange={(k) => h.set(STARTERS[k]!.build().blocks)}>
              <SelectTrigger><SelectValue placeholder="Escolher" /></SelectTrigger>
              <SelectContent>{Object.entries(STARTERS).map(([k, s]) => <SelectItem key={k} value={k}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
      </div>

      <VisualEditor h={h} toolbarExtra={<>
        {onCancel && <Button type="button" size="sm" variant="outline" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" size="sm" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{submitLabel}</Button>
      </>} />
    </form>
  );
}

export function TemplateFilters({ search, setSearch, category, setCategory }: { search: string; setSearch: (s: string) => void; category: string; setCategory: (c: string) => void }) {
  return (
    <>
      <Input placeholder="Buscar por nome" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as categorias</SelectItem>
          {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </>
  );
}

export const emptyTemplate = (): TemplateValues => ({ name: "", category: "", preview_image: "", status: "active", content: STARTERS["basic"]!.build() });
export const toValues = (t: Template): TemplateValues => ({ name: t.name, category: t.category, preview_image: t.preview_image ?? "", status: t.status, content: structuredClone(t.content ?? { version: 1, blocks: [] }) });
export const templateError = (e: unknown) => {
  const c = (e as { code?: string })?.code;
  return c === "23514" ? "Dados inválidos. Verifique os campos." : c === "42501" ? "Você não tem permissão para esta ação." : "Não foi possível salvar. Tente novamente.";
};
