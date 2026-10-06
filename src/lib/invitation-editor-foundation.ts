// @ts-nocheck
import type { Block, TemplateContent } from "@/lib/templates";

export type SmartElementType = "rsvp" | "countdown" | "location" | "whatsapp" | "button" | "link" | "calendar" | "qr_code" | "gallery" | "gift_list" | "dress_code" | "timeline" | "hosts" | "social" | "special_text" | "custom_link";
export type EditorElementType = "text" | "image" | "gif" | "shape" | "decoration" | "block" | "group" | SmartElementType;
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
  hidden?: boolean;
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
  const sourceSettings = base.settings && typeof base.settings === "object" ? base.settings as Record<string, unknown> : {};
  const background = document.sections[0]?.background ?? document.canvas.background;
  return {
    ...base,
    version: 1,
    blocks,
    settings: {
      ...sourceSettings,
      ...(background ? { background: structuredClone(background) } : {}),
    },
  } as TemplateContent;
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

export type SmartElementDefinition = {
  type: SmartElementType;
  label: string;
  description: string;
  category: "Interação" | "Evento" | "Conteúdo" | "Informação";
  icon: string;
  defaults: Record<string, string>;
  width: number;
  height: number;
};

export const SMART_ELEMENT_DEFINITIONS: SmartElementDefinition[] = [
  { type: "rsvp", label: "RSVP", description: "Confirmação de presença", category: "Interação", icon: "check", defaults: { title: "Você poderá comparecer?", label: "Confirmar presença", style: "solid" }, width: 520, height: 170 },
  { type: "countdown", label: "Contagem regressiva", description: "Tempo até o evento", category: "Evento", icon: "clock", defaults: { title: "Está chegando", target: "event" }, width: 520, height: 120 },
  { type: "location", label: "Localização", description: "Local e como chegar", category: "Informação", icon: "map", defaults: { name: "Nome do local", address: "Endereço do evento", button: "Como chegar" }, width: 520, height: 150 },
  { type: "whatsapp", label: "WhatsApp", description: "Contato direto pelo WhatsApp", category: "Interação", icon: "whatsapp", defaults: { label: "Falar pelo WhatsApp", phone: "", message: "Olá! Gostaria de saber mais sobre o evento." }, width: 440, height: 72 },
  { type: "button", label: "Botão", description: "Ação com texto e link", category: "Interação", icon: "button", defaults: { label: "Saiba mais", url: "https://", style: "solid" }, width: 320, height: 64 },
  { type: "link", label: "Link", description: "Link de texto personalizado", category: "Interação", icon: "link", defaults: { label: "Acessar link", url: "https://" }, width: 360, height: 48 },
  { type: "calendar", label: "Adicionar ao calendário", description: "Lembrete do evento", category: "Evento", icon: "calendar", defaults: { label: "Adicionar ao calendário", provider: "google" }, width: 440, height: 64 },
  { type: "qr_code", label: "QR Code", description: "Código para link ou acesso", category: "Interação", icon: "qr", defaults: { value: "invite", label: "Escaneie para acessar" }, width: 220, height: 260 },
  { type: "gallery", label: "Galeria", description: "Fotos em grade ou carrossel", category: "Conteúdo", icon: "gallery", defaults: { title: "Momentos especiais", columns: "3", mode: "grid" }, width: 560, height: 260 },
  { type: "gift_list", label: "Lista de presentes", description: "Links para presentes", category: "Interação", icon: "gift", defaults: { title: "Lista de presentes", label: "Ver lista", url: "https://" }, width: 480, height: 130 },
  { type: "dress_code", label: "Dress code", description: "Orientação de traje", category: "Informação", icon: "shirt", defaults: { title: "Dress code", value: "Passeio completo" }, width: 420, height: 110 },
  { type: "timeline", label: "Timeline", description: "Programação do evento", category: "Evento", icon: "timeline", defaults: { title: "Programação", items: "Cerimônia|Recepção|Festa" }, width: 520, height: 220 },
  { type: "hosts", label: "Anfitriões", description: "Nomes dos anfitriões", category: "Informação", icon: "hosts", defaults: { title: "Com carinho", names: "Nome 1|Nome 2" }, width: 460, height: 130 },
  { type: "social", label: "Redes sociais", description: "Links sociais do evento", category: "Interação", icon: "social", defaults: { title: "Siga nossos momentos", instagram: "", facebook: "", tiktok: "" }, width: 480, height: 100 },
  { type: "special_text", label: "Texto especial", description: "Mensagem com destaque visual", category: "Conteúdo", icon: "sparkles", defaults: { text: "Uma celebração para guardar no coração", style: "quote" }, width: 560, height: 120 },
  { type: "custom_link", label: "Link personalizado", description: "Atalho configurável", category: "Interação", icon: "external", defaults: { label: "Acessar página", url: "https://", description: "Configure um destino personalizado" }, width: 460, height: 100 },
];

export function createSmartElement(type: SmartElementType, x = 48, y = 48): EditorElement {
  const definition = SMART_ELEMENT_DEFINITIONS.find((item) => item.type === type) ?? SMART_ELEMENT_DEFINITIONS[0];
  const block = {
    id: id("smart"), type, props: { ...definition.defaults },
  } as Block;
  return {
    id: id("element"), type, x, y, width: definition.width, height: definition.height, rotation: 0, zIndex: 1,
    visible: true, locked: false, opacity: 1,
    styles: { color: "#172033", background: "#ffffff", borderColor: "#e5e7eb", borderWidth: 1, borderRadius: 16, accentColor: "#7c3aed" },
    content: { block }, groupId: null,
  };
}

export function updateElement(document: InvitationEditorDocument, elementId: string, patch: Partial<EditorElement>): InvitationEditorDocument {
  return { ...document, elements: document.elements.map((element) => element.id === elementId ? { ...element, ...patch } : element) };
}

export function localRecoveryKey(invitationId: string) {
  return `vellune:invitation-editor-foundation:${invitationId}`;
}
