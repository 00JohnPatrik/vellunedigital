import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Clock, ImageIcon, LayoutTemplate, Loader2, MapPin, MessageCircle, QrCode, Timer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, type Status } from "@/components/admin-ui";
import { BLOCKS, CATEGORIES, categoryLabel, newBlock, STARTERS, type Block, type BlockType, type Template, type TemplateValues } from "@/lib/templates";

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

const icons: Partial<Record<BlockType, typeof Clock>> = { image: ImageIcon, date: CalendarDays, time: Clock, location: MapPin, countdown: Timer, whatsapp: MessageCircle, qr_code: QrCode };

/** Read-only structural preview of blocks (not the editor). */
export function BlocksPreview({ blocks }: { blocks: Block[] }) {
  if (!blocks.length) return <p className="text-sm text-muted-foreground">Nenhum bloco neste modelo.</p>;
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-3 rounded-2xl border bg-card p-5 text-center">
      {blocks.map((b) => {
        const p = b.props ?? {};
        const Icon = icons[b.type];
        switch (b.type) {
          case "text": return <p key={b.id} className="whitespace-pre-line font-display text-lg">{p["text"]}</p>;
          case "image": return <PreviewImage key={b.id} src={p["url"] || null} name={p["alt"] ?? ""} className="aspect-video rounded-lg" />;
          case "divider": return <hr key={b.id} />;
          case "rsvp": case "button": return <div key={b.id} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">{p["label"] || BLOCKS[b.type].label}</div>;
          default: {
            const text = Object.values(p).filter(Boolean).join(" · ");
            return (
              <div key={b.id} className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                {Icon && <Icon className="h-4 w-4" />}{text || BLOCKS[b.type].label}
              </div>
            );
          }
        }
      })}
    </div>
  );
}

export function TemplateForm({ initial, isNew, submitLabel, onSubmit, onCancel }: {
  initial: TemplateValues; isNew: boolean; submitLabel: string;
  onSubmit: (v: TemplateValues) => Promise<void>; onCancel?: () => void;
}) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [addType, setAddType] = useState<BlockType>("text");
  const blocks = v.content.blocks;
  const setBlocks = (b: Block[]) => setV({ ...v, content: { version: 1, blocks: b } });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!v.name.trim()) errs["name"] = "Informe o nome.";
    else if (v.name.trim().length > 150) errs["name"] = "Máximo de 150 caracteres.";
    if (!v.category) errs["category"] = "Escolha a categoria.";
    if (v.preview_image.trim() && !/^https?:\/\/\S+$/i.test(v.preview_image.trim())) errs["preview_image"] = "Use um endereço começando com http:// ou https://";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { await onSubmit(v); } finally { setBusy(false); }
  }

  const move = (i: number, d: number) => { const b = [...blocks]; const j = i + d; if (j < 0 || j >= b.length) return; [b[i], b[j]] = [b[j]!, b[i]!]; setBlocks(b); };

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="t-img">Imagem de preview (URL)</Label>
            <Input id="t-img" type="url" placeholder="https://..." value={v.preview_image} onChange={(e) => setV({ ...v, preview_image: e.target.value })} />
            {errors["preview_image"] && <p className="text-xs text-destructive">{errors["preview_image"]}</p>}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">Estrutura do modelo</h2>
            {isNew && (
              <Select onValueChange={(k) => setBlocks(STARTERS[k]!.build().blocks)}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Estrutura inicial" /></SelectTrigger>
                <SelectContent>{Object.entries(STARTERS).map(([k, s]) => <SelectItem key={k} value={k}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>
          {blocks.length === 0 && <p className="text-sm text-muted-foreground">Nenhum bloco. Adicione abaixo ou escolha uma estrutura inicial.</p>}
          {blocks.map((b, i) => (
            <div key={b.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{i + 1}. {BLOCKS[b.type].label}</span>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Subir" onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Descer" onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Remover" onClick={() => setBlocks(blocks.filter((x) => x.id !== b.id))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              {BLOCKS[b.type].fields.map((f) => {
                const val = b.props[f.key] ?? "";
                const set = (x: string) => setBlocks(blocks.map((y) => y.id === b.id ? { ...y, props: { ...y.props, [f.key]: x } } : y));
                return (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{f.label}</Label>
                    {f.input === "textarea"
                      ? <Textarea rows={2} value={val} maxLength={2000} onChange={(e) => set(e.target.value)} />
                      : <Input type={f.input} value={val} maxLength={500} onChange={(e) => set(e.target.value)} />}
                  </div>
                );
              })}
            </div>
          ))}
          <div className="flex gap-2">
            <Select value={addType} onValueChange={(t) => setAddType(t as BlockType)}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(BLOCKS) as BlockType[]).map((t) => <SelectItem key={t} value={t}>{BLOCKS[t].label}</SelectItem>)}</SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={() => setBlocks([...blocks, newBlock(addType)])}>Adicionar bloco</Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{submitLabel}</Button>
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
        </div>
      </div>
      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <div className="overflow-hidden rounded-xl border"><PreviewImage src={v.preview_image.trim() || null} name={v.name} /></div>
        <BlocksPreview blocks={blocks} />
      </aside>
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
