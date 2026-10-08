import { Eye, Grid2X2, Layers3, Minus, Plus, Smartphone, Tablet, Monitor, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PreviewPreset } from "@/lib/invitation-editor-quality";

type SectionItem = {
  id: string;
  name: string;
  elementIds: string[];
};

type Props = {
  previewPreset: PreviewPreset;
  onPreviewPresetChange: (preset: PreviewPreset) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  viewMode: "edit" | "preview";
  onViewModeChange: (mode: "edit" | "preview") => void;
  panel: string | null;
  onPanelChange: (panel: "library" | "layers" | "properties") => void;
  sections: SectionItem[];
  selectedSectionId?: string;
  onSelectSection: (section: SectionItem) => void;
};

const presets: Array<{ value: PreviewPreset; label: string; shortLabel: string; icon: typeof Monitor }> = [
  { value: "mobile", label: "Mobile", shortLabel: "Celular", icon: Smartphone },
  { value: "tablet", label: "Tablet", shortLabel: "Tablet", icon: Tablet },
  { value: "desktop", label: "Desktop", shortLabel: "Desktop", icon: Monitor },
];

export function ExperimentalMobileBar({
  previewPreset,
  onPreviewPresetChange,
  zoom,
  onZoomChange,
  viewMode,
  onViewModeChange,
  panel,
  onPanelChange,
  sections,
  selectedSectionId,
  onSelectSection,
}: Props) {
  return (
    <div className="fixed inset-x-2 bottom-2 z-50 space-y-2 lg:hidden" role="toolbar" aria-label="Controles móveis do editor">
      <div className="flex items-center gap-1 overflow-x-auto rounded-xl border bg-card/95 p-1.5 shadow-lg backdrop-blur">
        {presets.map(({ value, label, shortLabel, icon: Icon }) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={previewPreset === value ? "secondary" : "ghost"}
            className="shrink-0 gap-1.5 px-2.5 text-[11px]"
            aria-label={`Visualização ${label}`}
            aria-pressed={previewPreset === value}
            onClick={() => onPreviewPresetChange(value)}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden min-[420px]:inline">{shortLabel}</span>
          </Button>
        ))}
        <div className="ml-auto flex shrink-0 items-center gap-0.5 rounded-lg border bg-background p-0.5" aria-label="Zoom do canvas">
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Diminuir zoom" disabled={zoom <= 50} onClick={() => onZoomChange(Math.max(50, zoom - 10))}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-10 text-center text-[11px] tabular-nums" aria-live="polite">{zoom}%</span>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Aumentar zoom" disabled={zoom >= 180} onClick={() => onZoomChange(Math.min(180, zoom + 10))}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {sections.length > 0 && (
        <div className="flex gap-1 overflow-x-auto rounded-xl border bg-card/95 p-1.5 shadow-lg backdrop-blur" aria-label="Navegação compacta de seções">
          {sections.map((section, index) => (
            <button
              key={section.id}
              type="button"
              className={cn(
                "max-w-40 shrink-0 rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-colors",
                selectedSectionId === section.id ? "border-primary bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-muted",
              )}
              aria-current={selectedSectionId === section.id ? "true" : undefined}
              onClick={() => onSelectSection(section)}
            >
              <span className="block truncate font-medium">{index + 1}. {section.name}</span>
              <span className="block text-[10px] opacity-70">{section.elementIds.length} elemento(s)</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-around gap-1 rounded-2xl border bg-card/95 p-1.5 shadow-xl backdrop-blur">
        <Button type="button" size="sm" variant={panel === "library" ? "secondary" : "ghost"} className="flex-1 flex-col gap-0.5 px-2 py-1.5 text-[10px]" aria-label="Abrir biblioteca" onClick={() => onPanelChange("library")}>
          <Grid2X2 className="h-4 w-4" />Criar
        </Button>
        <Button type="button" size="sm" variant={panel === "properties" ? "secondary" : "ghost"} className="flex-1 flex-col gap-0.5 px-2 py-1.5 text-[10px]" aria-label="Abrir propriedades" onClick={() => onPanelChange("properties")}>
          <MousePointer2 className="h-4 w-4" />Editar
        </Button>
        <Button type="button" size="sm" variant={viewMode === "preview" ? "secondary" : "ghost"} className="flex-1 flex-col gap-0.5 px-2 py-1.5 text-[10px]" aria-label={viewMode === "preview" ? "Voltar para edição" : "Abrir preview"} aria-pressed={viewMode === "preview"} onClick={() => onViewModeChange(viewMode === "preview" ? "edit" : "preview")}>
          <Eye className="h-4 w-4" />Preview
        </Button>
        <Button type="button" size="sm" variant={panel === "layers" ? "secondary" : "ghost"} className="flex-1 flex-col gap-0.5 px-2 py-1.5 text-[10px]" aria-label="Abrir camadas" onClick={() => onPanelChange("layers")}>
          <Layers3 className="h-4 w-4" />Camadas
        </Button>
      </div>
    </div>
  );
}
