import { useMemo } from "react";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Lock, Plus, Trash2, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EditorSection, InvitationEditorDocument } from "@/lib/invitation-editor-foundation";
import { cn } from "@/lib/utils";

type Props = {
  document: InvitationEditorDocument;
  onChange: (next: InvitationEditorDocument) => void;
  selectedSectionId?: string;
  onSelectSection?: (section: EditorSection) => void;
};

const clone = <T,>(value: T): T => structuredClone(value);

function createLocalId(prefix: string) {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {
    // Usa o fallback quando a API de criptografia não estiver disponível.
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createSectionId() {
  return createLocalId("section");
}

function createElementId() {
  return createLocalId("element");
}

export function ExperimentalSectionsPanel({ document, onChange, selectedSectionId, onSelectSection }: Props) {
  const sections = document.sections ?? [];
  const selectedId = selectedSectionId ?? sections[0]?.id;
  const selected = useMemo(() => sections.find((section) => section.id === selectedId) ?? sections[0], [sections, selectedId]);

  const updateDocument = (updater: (current: InvitationEditorDocument) => InvitationEditorDocument) => {
    onChange(updater(clone(document)));
  };

  const select = (section: EditorSection) => onSelectSection?.(section);

  const addSection = () => {
    const section: EditorSection = {
      id: createSectionId(),
      name: `Nova seção ${sections.length + 1}`,
      height: 640,
      background: {},
      elementIds: [],
      locked: false,
      hidden: false,
    };
    updateDocument((current) => ({ ...current, sections: [...current.sections, section] }));
    onSelectSection?.(section);
  };

  const removeSection = (sectionId: string) => {
    if (sections.length <= 1) return;
    const remaining = sections.filter((section) => section.id !== sectionId);
    const removedIds = new Set(sections.find((section) => section.id === sectionId)?.elementIds ?? []);
    updateDocument((current) => ({
      ...current,
      sections: remaining,
      elements: current.elements.filter((element) => !removedIds.has(element.id)),
    }));
    if (selectedId === sectionId) onSelectSection?.(remaining[0]);
  };

  const duplicateSection = (sectionId: string) => {
    const source = sections.find((section) => section.id === sectionId);
    if (!source) return;
    const sourceIds = new Set(source.elementIds);
    const sourceElements = document.elements.filter((element) => sourceIds.has(element.id));
    const idMap = new Map(sourceElements.map((element) => [element.id, createElementId()]));
    const copiedElements = sourceElements.map((element) => ({ ...clone(element), id: idMap.get(element.id) ?? createElementId() }));
    const copy: EditorSection = {
      ...clone(source),
      id: createSectionId(),
      name: `${source.name} cópia`,
      elementIds: copiedElements.map((element) => element.id),
    };
    updateDocument((current) => {
      const index = current.sections.findIndex((section) => section.id === sectionId);
      const nextSections = [...current.sections];
      nextSections.splice(index + 1, 0, copy);
      return { ...current, sections: nextSections, elements: [...current.elements, ...copiedElements] };
    });
    onSelectSection?.(copy);
  };

  const moveSection = (sectionId: string, direction: -1 | 1) => {
    updateDocument((current) => {
      const index = current.sections.findIndex((section) => section.id === sectionId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.sections.length) return current;
      const nextSections = [...current.sections];
      [nextSections[index], nextSections[nextIndex]] = [nextSections[nextIndex], nextSections[index]];
      return { ...current, sections: nextSections };
    });
  };

  const updateSection = (sectionId: string, patch: Partial<EditorSection>) => {
    updateDocument((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id === sectionId ? { ...section, ...patch } : section),
    }));
  };

  if (!selected) return null;

  return (
    <section className="space-y-3 rounded-xl border bg-card/80 p-3 shadow-sm" aria-label="Gerenciador de seções experimentais">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Navegação do documento</p>
          <p className="text-xs text-muted-foreground">Selecione uma seção para editar seu fundo e propriedades no painel contextual.</p>
        </div>
        <Button type="button" size="sm" onClick={addSection}><Plus className="mr-1 h-4 w-4" />Adicionar seção</Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map((section, index) => {
          const active = section.id === selected.id;
          return (
            <div key={section.id} className={cn("min-w-44 shrink-0 rounded-lg border bg-background p-2", active && "border-primary bg-primary/5 ring-1 ring-primary/20", section.hidden && "opacity-60")}>
              <button type="button" onClick={() => select(section)} className="flex w-full items-start gap-2 text-left">
                {section.locked ? <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{index + 1}. {section.name}</span>
                  <span className="text-[11px] text-muted-foreground">{section.elementIds.length} elemento(s){section.hidden ? " · oculta" : ""}</span>
                </span>
              </button>
              <div className="mt-2 flex items-center gap-1 border-t pt-2">
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Mover seção para cima" disabled={index === 0} onClick={() => moveSection(section.id, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Mover seção para baixo" disabled={index === sections.length - 1} onClick={() => moveSection(section.id, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Duplicar seção" onClick={() => duplicateSection(section.id)}><Copy className="h-3.5 w-3.5" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={section.locked ? "Desbloquear seção" : "Bloquear seção"} onClick={() => updateSection(section.id, { locked: !section.locked })}>{section.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}</Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={section.hidden ? "Mostrar seção" : "Ocultar seção"} onClick={() => updateSection(section.id, { hidden: !section.hidden })}>{section.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="Excluir seção" disabled={sections.length <= 1} onClick={() => removeSection(section.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">Nome da seção
          <Input value={selected.name} onChange={(event) => updateSection(selected.id, { name: event.target.value })} className="h-8 text-foreground" />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">Altura
          <Input type="number" min={240} value={selected.height} onChange={(event) => updateSection(selected.id, { height: Math.max(240, Number(event.target.value) || 240) })} className="h-8 text-foreground" />
        </label>
        <div className="flex items-end rounded-md border border-dashed bg-background/60 px-3 py-2 text-xs text-muted-foreground sm:col-span-1">
          O fundo é editado no painel contextual ao selecionar esta seção.
        </div>
      </div>
    </section>
  );
}
