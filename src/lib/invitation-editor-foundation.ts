// @ts-nocheck
import type { Block, TemplateContent } from "@/lib/templates";

export type EditorElementType = "text" | "image" | "gif" | "shape" | "decoration" | "block" | "group";
export type EditorPoint = { x: number; y: number };
export type EditorSize = { width: number; height: number };

export type EditorElement = {
  id: string;
  type: EditorElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  opacity: number;
  styles: Record<string, string | number | boolean | null>;
  content: {
    text?: string;
    block?: Block;
    src?: string;
    alt?: string;
    shape?: "rectangle" | "circle" | "line" | "star" | "heart";
  };
  animation?: { name?: string; duration?: number; delay?: number };
  groupId?: string | null;
};

export type EditorSection = {
  id: string;
  name: string;
  height: number;
  background?: Record<string, unknown>;
  elementIds: string[];
  locked?: boolean;
};

export type InvitationEditorDocument = {
  version: 1;
  canvas: { width: number; minHeight: number; background?: Record<string, unknown> };
  sections: EditorSection[];
  elements: EditorElement[];
};

export type EditorSaveState = "saved" | "dirty" | "saving" | "error";

const DEFAULT_CANVAS = { width: 768, minHeight: 640 };

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function blockElement(block: Block, index: number): EditorElement {
  const source = block as Block & Record<string, unknown>;
  const props = (block.props ?? {}) as Record<string, string>;
  return {
    id: typeof block.id === "string" && block.id ? block.id : id("element"),
    type: "block",
    x: numberValue(source.x, 24),
    y: numberValue(source.y, 24 + index * 96),
    width: numberValue(source.width, 720),
    height: numberValue(source.height, 72),
    rotation: numberValue(source.rotation, 0),
    zIndex: numberValue(source.zIndex, index + 1),
    visible: source.hidden !== true && source.visibility !== false,
    locked: source.locked === true,
    opacity: Math.min(1, Math.max(0, numberValue(source.opacity, 1))),
    styles: {},
    content: { block: structuredClone(block), text: props.text },
    groupId: null,
  };
}

export function normalizeInvitationContent(content: unknown): InvitationEditorDocument {
  const source = (content && typeof content === "object" ? content : {}) as Record<string, unknown>;
  const blocks = Array.isArray(source.blocks) ? source.blocks : [];
  const elements = blocks.filter((block): block is Block => !!block && typeof block === "object").map(blockElement);
  const settings = source.settings && typeof source.settings === "object" ? source.settings as Record<string, unknown> : {};
  const background = settings.background && typeof settings.background === "object" ? settings.background as Record<string, unknown> : undefined;
  const section: EditorSection = {
    id: "section-main",
    name: "Seção principal",
    height: Math.max(DEFAULT_CANVAS.minHeight, ...elements.map((element) => element.y + element.height + 32)),
    background,
    elementIds: elements.map((element) => element.id),
  };
  return {
    version: 1,
    canvas: {
      width: numberValue((source.canvas as Record<string, unknown> | undefined)?.width, DEFAULT_CANVAS.width),
      minHeight: numberValue((source.canvas as Record<string, unknown> | undefined)?.minHeight, DEFAULT_CANVAS.minHeight),
      background,
    },
    sections: [section],
    elements,
  };
}

export function toPersistedInvitationContent(document: InvitationEditorDocument, original: unknown): TemplateContent {
  const base = original && typeof original === "object" ? structuredClone(original) as Record<string, unknown> : {};
  const blocks = document.elements.filter((element) => element.type === "block" && element.content.block).sort((a, b) => a.zIndex - b.zIndex).map((element) => {
    const block = structuredClone(element.content.block!) as Block & Record<string, unknown>;
    block.id = element.id;
    block.x = element.x;
    block.y = element.y;
    block.width = element.width;
    block.height = element.height;
    block.rotation = element.rotation;
    block.zIndex = element.zIndex;
    block.opacity = element.opacity;
    block.locked = element.locked;
    block.hidden = !element.visible;
    block.visibility = element.visible;
    return block;
  });
  return { ...base, version: 1, blocks } as TemplateContent;
}

export function createTextElement(x = 48, y = 48): EditorElement {
  return {
    id: id("element"), type: "text", x, y, width: 672, height: 64, rotation: 0, zIndex: 1,
    visible: true, locked: false, opacity: 1,
    styles: { color: "#172033", fontSize: 28, fontFamily: "Manrope", fontWeight: 600, textAlign: "center", background: "transparent" },
    content: { text: "Novo texto" }, groupId: null,
  };
}

export function createMediaElement(src: string, type: "image" | "gif" = "image", x = 48, y = 48): EditorElement {
  return {
    id: id("element"), type, x, y, width: 300, height: 220, rotation: 0, zIndex: 1,
    visible: true, locked: false, opacity: 1,
    styles: { objectFit: "cover", objectPosition: "center", borderRadius: 16, borderColor: "transparent", borderWidth: 0 },
    content: { src, alt: type === "gif" ? "GIF decorativo" : "Imagem do convite" }, groupId: null,
  };
}

export function createShapeElement(shape: EditorElement["content"]["shape"] = "rectangle", x = 80, y = 80): EditorElement {
  return {
    id: id("element"), type: shape === "line" ? "decoration" : "shape", x, y, width: shape === "line" ? 280 : 180, height: shape === "line" ? 4 : 120,
    rotation: 0, zIndex: 1, visible: true, locked: false, opacity: 1,
    styles: { background: "#7c3aed", color: "#7c3aed", borderRadius: shape === "circle" ? 999 : 12, borderWidth: 0, borderColor: "#7c3aed" },
    content: { shape }, groupId: null,
  };
}

export function updateElement(document: InvitationEditorDocument, elementId: string, patch: Partial<EditorElement>): InvitationEditorDocument {
  return { ...document, elements: document.elements.map((element) => element.id === elementId ? { ...element, ...patch } : element) };
}

export function localRecoveryKey(invitationId: string) {
  return `vellune:invitation-editor-foundation:${invitationId}`;
}
