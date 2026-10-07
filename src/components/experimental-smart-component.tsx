import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { CalendarDays, CheckCircle2, ExternalLink, Gift, Link2, MapPin, MessageCircle, Shirt, UsersRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SmartComponentType =
  | "rsvp"
  | "countdown"
  | "location"
  | "whatsapp"
  | "button"
  | "link"
  | "calendar"
  | "qr_code"
  | "gallery"
  | "gift_list"
  | "dress_code"
  | "hosts"
  | "story"
  | "special_text"
  | "social"
  | "custom_link";

type SmartGalleryImage = { url: string; alt?: string; caption?: string };
type SmartSocialLink = { label: string; url: string };
type SmartGift = { name: string; url: string; claimed?: boolean };
type SmartHost = { name: string; role?: string; image?: string };

export type SmartFunctionalConfig = {
  target?: string;
  url?: string;
  phone?: string;
  message?: string;
  address?: string;
  mapUrl?: string;
  calendarUrl?: string;
  qrValue?: string;
  images?: SmartGalleryImage[];
  socialLinks?: SmartSocialLink[];
  gifts?: Array<{ name: string; url: string; claimed?: boolean }>;
  hosts?: Array<{ name: string; role?: string; image?: string }>;
  story?: string;
  rsvpTitle?: string;
  rsvpLabel?: string;
};

export type SmartVisualConfig = {
  accent?: string;
  background?: string;
  color?: string;
  align?: "left" | "center" | "right";
  radius?: "none" | "sm" | "lg";
  columns?: 1 | 2 | 3 | 4;
  compact?: boolean;
};

export type SmartComponentDefinition = {
  type: SmartComponentType;
  label: string;
  category: string;
  tags: string[];
  description: string;
  icon: string;
};

export const SMART_COMPONENT_CATALOG: SmartComponentDefinition[] = [
  { type: "rsvp", label: "RSVP", category: "Interação", tags: ["presença", "confirmação", "convidados"], description: "Confirmação de presença experimental", icon: "check" },
  { type: "countdown", label: "Contagem regressiva", category: "Evento", tags: ["tempo", "data", "relógio"], description: "Contagem em tempo real até o evento", icon: "clock" },
  { type: "location", label: "Localização", category: "Evento", tags: ["mapa", "endereço", "como chegar"], description: "Local do evento com link para mapa", icon: "map" },
  { type: "whatsapp", label: "WhatsApp", category: "Ações", tags: ["mensagem", "contato", "telefone"], description: "Atalho para conversa no WhatsApp", icon: "whatsapp" },
  { type: "button", label: "Botão", category: "Ações", tags: ["ação", "link", "cta"], description: "Botão com destino personalizado", icon: "button" },
  { type: "link", label: "Link", category: "Ações", tags: ["url", "externo", "navegação"], description: "Link textual acessível", icon: "link" },
  { type: "calendar", label: "Adicionar ao calendário", category: "Evento", tags: ["agenda", "calendário", "data"], description: "Link para salvar o evento", icon: "calendar" },
  { type: "qr_code", label: "QR Code", category: "Ações", tags: ["qr", "código", "acesso"], description: "Código QR para link ou conteúdo", icon: "qr" },
  { type: "gallery", label: "Galeria", category: "Conteúdo", tags: ["fotos", "imagens", "álbum"], description: "Galeria editável e responsiva", icon: "gallery" },
  { type: "gift_list", label: "Lista de presentes", category: "Conteúdo", tags: ["presentes", "lista", "loja"], description: "Itens com links de presente", icon: "gift" },
  { type: "dress_code", label: "Dress code", category: "Informação", tags: ["traje", "vestimenta", "estilo"], description: "Orientação de vestimenta", icon: "shirt" },
  { type: "hosts", label: "Anfitriões", category: "Pessoas", tags: ["família", "casal", "organizadores"], description: "Pessoas responsáveis pelo evento", icon: "hosts" },
  { type: "story", label: "Nossa história", category: "Conteúdo", tags: ["história", "texto", "memórias"], description: "Texto narrativo editável", icon: "sparkles" },
  { type: "special_text", label: "Texto especial", category: "Conteúdo", tags: ["destaque", "mensagem", "texto"], description: "Mensagem especial editável", icon: "sparkles" },
  { type: "social", label: "Redes sociais", category: "Ações", tags: ["instagram", "social", "perfil"], description: "Links para redes sociais", icon: "social" },
  { type: "custom_link", label: "Link personalizado", category: "Ações", tags: ["url", "personalizado", "externo"], description: "Destino externo configurável", icon: "external" },
];

export function supportsSmartComponentPreview(element: { type?: unknown } | null | undefined) {
  return SMART_COMPONENT_CATALOG.some((item) => item.type === element?.type);
}

function normalize(value: unknown): SmartFunctionalConfig {
  return value && typeof value === "object" ? value as SmartFunctionalConfig : {};
}

function visual(value: unknown): SmartVisualConfig {
  return value && typeof value === "object" ? value as SmartVisualConfig : {};
}

function getProps(element: any) {
  const block = element?.content?.block;
  const props = block?.props ?? element?.content?.props ?? {};
  return {
    functional: { ...props, ...normalize(element?.content?.functionalConfig) },
    visual: { ...visual(props), ...visual(element?.content?.visualConfig) },
  };
}

function cardClass(v: SmartVisualConfig) {
  return cn("h-full rounded-xl border p-4 shadow-sm", v.radius === "none" ? "rounded-none" : v.radius === "lg" && "rounded-2xl", v.compact && "p-2.5");
}

function ActionLink({ href, children, className }: { href?: string; children: ReactNode; className?: string }) {
  if (!href) return <Button type="button" className={className}>{children}</Button>;
  return <Button type="button" asChild className={className}><a href={href} target="_blank" rel="noreferrer">{children}</a></Button>;
}

function Countdown({ target }: { target?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const end = target ? new Date(target).getTime() : 0;
  const total = Math.max(0, end - now);
  const units = [Math.floor(total / 86400000), Math.floor(total / 3600000) % 24, Math.floor(total / 60000) % 60, Math.floor(total / 1000) % 60];
  return <div className="grid grid-cols-4 gap-2 text-center" aria-live="polite">{units.map((value, index) => <div key={index} className="rounded-lg bg-muted px-2 py-2"><strong className="block text-lg tabular-nums">{String(value).padStart(2, "0")}</strong><span className="text-[10px] text-muted-foreground">{["dias", "horas", "min", "seg"][index]}</span></div>)}</div>;
}

function LocalRsvp({ config }: { config: SmartFunctionalConfig }) {
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  if (done) return <div className="flex items-center gap-2 text-sm text-primary" role="status"><CheckCircle2 className="h-5 w-5" />Confirmação registrada apenas neste preview experimental.</div>;
  return <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); if (name.trim()) setDone(true); }}><p className="text-sm font-medium">{config.rsvpTitle || "Você poderá participar?"}</p><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" aria-label="Nome para confirmação" /><Button type="submit" className="w-full"><CheckCircle2 className="mr-2 h-4 w-4" />{config.rsvpLabel || "Confirmar presença"}</Button></form>;
}

export function SmartComponentPreview({ element }: { element: any }): React.ReactNode {
  const type = element?.type as SmartComponentType;
  if (!SMART_COMPONENT_CATALOG.some((item) => item.type === type)) return null;
  const { functional: f, visual: v } = getProps(element);
  const style = { background: v.background, color: v.color, textAlign: v.align || "center" } as CSSProperties;
  const title = SMART_COMPONENT_CATALOG.find((item) => item.type === type)?.label;
  const content = (() => {
    switch (type) {
      case "rsvp": return <LocalRsvp config={f} />;
      case "countdown": return <><p className="mb-3 font-medium">{f.rsvpTitle || "Falta pouco"}</p><Countdown target={f.target} /></>;
      case "location": return <><MapPin className="mx-auto mb-2 h-6 w-6 text-primary" /><p className="font-medium">{f.address || "Adicione o endereço do evento"}</p><ActionLink href={f.mapUrl || f.url} className="mt-3"><MapPin className="mr-2 h-4 w-4" />Como chegar</ActionLink></>;
      case "whatsapp": return <ActionLink href={f.phone ? `https://wa.me/${f.phone.replace(/\\D/g, "")}?text=${encodeURIComponent(f.message || "Olá!")}` : f.url}><MessageCircle className="mr-2 h-4 w-4" />{f.rsvpLabel || "Falar pelo WhatsApp"}</ActionLink>;
      case "button": case "custom_link": return <ActionLink href={f.url}>{f.rsvpLabel || title}</ActionLink>;
      case "link": return <a className="inline-flex items-center gap-2 font-medium text-primary underline-offset-4 hover:underline" href={f.url} target="_blank" rel="noreferrer"><Link2 className="h-4 w-4" />{f.rsvpLabel || f.url || title}</a>;
      case "calendar": return <ActionLink href={f.calendarUrl || f.url}><CalendarDays className="mr-2 h-4 w-4" />Adicionar ao calendário</ActionLink>;
      case "qr_code": return <div className="flex justify-center"><QRCodeSVG value={f.qrValue || f.url || "https://vellune.digital"} size={v.compact ? 120 : 160} includeMargin /></div>;
      case "gallery": return <div className={cn("grid gap-2", v.columns === 1 ? "grid-cols-1" : v.columns === 3 ? "grid-cols-3" : v.columns === 4 ? "grid-cols-4" : "grid-cols-2")}>{(f.images || []).map((image, index) => <figure key={`${image.url}-${index}`}><img src={image.url} alt={image.alt || `Imagem ${index + 1}`} className="aspect-square w-full rounded-lg object-cover" /><figcaption className="mt-1 text-xs text-muted-foreground">{image.caption}</figcaption></figure>)}</div>;
      case "gift_list": return <div className="space-y-2 text-left">{(f.gifts || []).map((gift) => <a key={gift.name} href={gift.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border p-2 hover:bg-muted"><Gift className="h-4 w-4 text-primary" />{gift.name}<ExternalLink className="ml-auto h-3.5 w-3.5" /></a>)}</div>;
      case "dress_code": return <><Shirt className="mx-auto mb-2 h-6 w-6 text-primary" /><p>{f.story || "Traje sugerido: esporte fino"}</p></>;
      case "hosts": return <div className="grid gap-3 sm:grid-cols-2">{(f.hosts || []).map((host) => <div key={host.name} className="flex items-center gap-2 text-left">{host.image ? <img src={host.image} alt="" className="h-10 w-10 rounded-full object-cover" /> : <UsersRound className="h-8 w-8 text-primary" />}<span><strong className="block text-sm">{host.name}</strong><small className="text-muted-foreground">{host.role}</small></span></div>)}</div>;
      case "special_text":
      case "story": return <p className="whitespace-pre-wrap text-left leading-relaxed">{f.story || "Escreva aqui a história do evento."}</p>;
      case "social": return <div className="flex flex-wrap justify-center gap-2">{(f.socialLinks || []).map((link) => <ActionLink key={link.label} href={link.url} className="variant-outline"><ExternalLink className="mr-2 h-4 w-4" />{link.label}</ActionLink>)}</div>;
      default: return null;
    }
  })();
  return <article className={cardClass(v)} style={style} aria-label={title}>{content}</article>;
}
