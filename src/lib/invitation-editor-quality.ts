// @ts-nocheck
import type { InvitationEditorDocument } from "@/lib/invitation-editor-foundation";

export type PreviewPreset = "desktop" | "tablet" | "mobile";
export type QualitySeverity = "error" | "warning" | "info";
export type QualityCategory = "document" | "layout" | "responsive" | "accessibility" | "animation";

export type QualityAlert = {
  id: string;
  severity: QualitySeverity;
  category: QualityCategory;
  title: string;
  message: string;
  elementId?: string;
};

export type PreviewPresetConfig = {
  label: string;
  width: number;
  height: number;
  frame: boolean;
};

export const PREVIEW_PRESETS: Record<PreviewPreset, PreviewPresetConfig> = {
  desktop: { label: "Desktop", width: 768, height: 720, frame: false },
  tablet: { label: "Tablet", width: 560, height: 760, frame: false },
  mobile: { label: "Mobile", width: 390, height: 760, frame: true },
};

export function getQualityScore(alerts: QualityAlert[]): number {
  const penalty = alerts.reduce((total, alert) => {
    if (alert.severity === "error") return total + 20;
    if (alert.severity === "warning") return total + 8;
    return total + 2;
  }, 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

export function validateInvitationEditorDocument(document: InvitationEditorDocument): QualityAlert[] {
  const alerts: QualityAlert[] = [];
  const ids = new Set<string>();

  if (!document || document.version !== 1) {
    alerts.push({ id: "document-version", severity: "error", category: "document", title: "Documento inválido", message: "A versão do documento experimental não é compatível." });
  }
  if (!document?.elements?.length) {
    alerts.push({ id: "empty-document", severity: "warning", category: "document", title: "Canvas vazio", message: "Adicione pelo menos um elemento antes de considerar o preview pronto." });
  }

  for (const element of document?.elements ?? []) {
    if (ids.has(element.id)) {
      alerts.push({ id: `duplicate-${element.id}`, severity: "error", category: "document", title: "IDs duplicados", message: "Existem elementos com o mesmo identificador.", elementId: element.id });
    }
    ids.add(element.id);
    if (element.width <= 0 || element.height <= 0) {
      alerts.push({ id: `size-${element.id}`, severity: "error", category: "layout", title: "Dimensão inválida", message: `O elemento ${element.type} possui largura ou altura inválida.`, elementId: element.id });
    }
    if (element.x < 0 || element.y < 0) {
      alerts.push({ id: `position-${element.id}`, severity: "warning", category: "layout", title: "Elemento fora da área segura", message: `O elemento ${element.type} começa antes do limite visível do canvas.`, elementId: element.id });
    }
    if (element.x + element.width > document.canvas.width) {
      alerts.push({ id: `overflow-${element.id}`, severity: "warning", category: "layout", title: "Conteúdo ultrapassa a largura", message: `O elemento ${element.type} pode sofrer corte em telas menores.`, elementId: element.id });
    }
    if (element.opacity < 0 || element.opacity > 1) {
      alerts.push({ id: `opacity-${element.id}`, severity: "error", category: "accessibility", title: "Opacidade inválida", message: `O elemento ${element.type} possui opacidade fora do intervalo permitido.`, elementId: element.id });
    }
  }

  if (!document?.sections?.length) {
    alerts.push({ id: "no-sections", severity: "warning", category: "document", title: "Sem seções", message: "O documento precisa de pelo menos uma seção para manter a estrutura visual." });
  }
  return alerts;
}

export function validateResponsivePreset(document: InvitationEditorDocument, preset: PreviewPreset): QualityAlert[] {
  const width = PREVIEW_PRESETS[preset].width;
  return (document?.elements ?? [])
    .filter((element) => element.visible && element.x + element.width > width)
    .slice(0, 12)
    .map((element) => ({
      id: `${preset}-overflow-${element.id}`,
      severity: "warning" as const,
      category: "responsive" as const,
      title: `Possível corte no ${PREVIEW_PRESETS[preset].label}`,
      message: `O elemento ${element.type} ultrapassa a largura do preset ${PREVIEW_PRESETS[preset].label}.`,
      elementId: element.id,
    }));
}

export function runInvitationEditorQualityRegressionTests(): { name: string; passed: boolean }[] {
  const base = {
    version: 1 as const,
    canvas: { width: 768, minHeight: 640 },
    sections: [{ id: "section", name: "Principal", height: 640, elementIds: ["text"] }],
    elements: [{ id: "text", type: "text" as const, x: 0, y: 0, width: 320, height: 64, rotation: 0, zIndex: 1, visible: true, locked: false, opacity: 1, styles: {}, content: { text: "Teste" } }],
  };
  return [
    { name: "documento válido não gera erro", passed: !validateInvitationEditorDocument(base).some((alert) => alert.severity === "error") },
    { name: "preset mobile detecta overflow", passed: validateResponsivePreset({ ...base, elements: [{ ...base.elements[0], x: 200, width: 300 }] }, "mobile").length === 1 },
    { name: "preset desktop preserva conteúdo dentro do canvas", passed: validateResponsivePreset(base, "desktop").length === 0 },
    { name: "score reduz conforme problemas reais", passed: getQualityScore([{ id: "warning", severity: "warning", category: "responsive", title: "Aviso", message: "Teste" }]) === 92 },
    { name: "alerta responsivo mantém contexto do elemento", passed: validateResponsivePreset({ ...base, elements: [{ ...base.elements[0], x: 200, width: 300 }] }, "mobile")[0]?.elementId === "text" },
  ];
}
