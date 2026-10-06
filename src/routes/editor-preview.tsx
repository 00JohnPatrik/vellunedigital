import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, ShieldCheck } from "lucide-react";
import { VisualEditor, useBlocksHistory } from "@/components/visual-editor";
import { invitationCtx } from "@/components/invitation-ui";
import { normalizeBlocks } from "@/lib/blocks";
import type { Background } from "@/lib/templates";

export const Route = createFileRoute("/editor-preview")({
  head: () => ({
    meta: [
      { title: "Preview do Editor Visual — Vellune Digital" },
      {
        name: "description",
        content: "Demonstração local e isolada do Editor Visual.",
      },
    ],
  }),
  component: EditorPreviewPage,
});

const demoInvitation = {
  id: "editor-preview-demo",
  company_id: "editor-preview-company",
  customer_id: "editor-preview-customer",
  name: "Celebração de Ana e Lucas",
  slug: "editor-preview-demo",
  status: "draft",
  event_date: "2026-10-15",
  event_time: "19:30",
  venue_name: "Casa das Palmeiras",
  address: "Rua das Flores, 120",
  city: "São Paulo",
  state: "SP",
  message: "Uma noite especial para celebrar o amor.",
  customer: {
    id: "editor-preview-customer",
    company_id: "editor-preview-company",
    name: "Ana e Lucas",
    phone: null,
    email: null,
    observation: null,
    status: "active",
  },
} as any;

const demoEvent = {
  name: demoInvitation.name,
  event_date: demoInvitation.event_date,
  event_time: demoInvitation.event_time,
  venue_name: demoInvitation.venue_name,
  address: demoInvitation.address,
  city: demoInvitation.city,
  state: demoInvitation.state,
  message: demoInvitation.message,
} as any;

const demoContent = {
  version: 1,
  settings: {
    background: {
      color: "#fffaf5",
      gradient: "linear-gradient(145deg, #fffaf5 0%, #f2e8dc 100%)",
    },
  },
  blocks: [
    {
      id: "preview-title",
      type: "text",
      props: {
        text: "Ana & Lucas",
        size: "2xl",
        font: "Sora",
        bold: "1",
        align: "center",
        width: "full",
        color: "#4a3028",
      },
      x: 48,
      y: 72,
      width: 672,
      height: 76,
    },
    {
      id: "preview-message",
      type: "text",
      props: {
        text: "Uma noite especial para celebrar o amor",
        size: "lg",
        font: "Manrope",
        align: "center",
        width: "full",
        color: "#765c52",
      },
      x: 48,
      y: 170,
      width: 672,
      height: 64,
    },
    {
      id: "preview-date",
      type: "date",
      props: {
        source: "event",
        format: "long",
        label: "Reserve esta data",
        align: "center",
      },
      x: 104,
      y: 290,
      width: 560,
      height: 86,
    },
    {
      id: "preview-location",
      type: "location",
      props: {
        source: "event",
        show_name: "1",
        show_address: "1",
        show_city: "1",
        show_directions: "1",
        align: "center",
      },
      x: 104,
      y: 410,
      width: 560,
      height: 126,
    },
    {
      id: "preview-button",
      type: "button",
      props: {
        label: "Confirmar presença",
        url: "#",
        style: "solid",
        width: "partial",
        align: "center",
      },
      x: 184,
      y: 574,
      width: 400,
      height: 72,
    },
  ],
};

const PUBLISHED_PREVIEW_HOST = "vellunedigital.lovable.app";

function isLovablePreviewHost() {
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname.toLowerCase();
  return hostname === PUBLISHED_PREVIEW_HOST || hostname.endsWith(".lovable.app");
}

function EditorPreviewPage() {
  const isPreviewEnvironment = import.meta.env.DEV || isLovablePreviewHost();

  if (!isPreviewEnvironment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
        <section className="w-full max-w-lg rounded-3xl border bg-card p-8 text-center shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold">Preview indisponível</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Esta demonstração do editor está disponível somente em desenvolvimento ou em um ambiente de Preview autorizado.
          </p>
        </section>
      </main>
    );
  }

  return <LocalEditorDemo />;
}

function LocalEditorDemo() {
  const history = useBlocksHistory(normalizeBlocks(demoContent));
  const [background, setBackground] = useState<Background>(() =>
    structuredClone(demoContent.settings.background as Background),
  );
  const context = useMemo(() => invitationCtx(demoInvitation, demoEvent), []);

  return (
    <main className="min-h-screen bg-background px-2 py-3 text-foreground sm:px-4 sm:py-5 lg:px-6">
      <div className="mx-auto max-w-[1900px] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card/90 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Eye className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-semibold sm:text-lg">Preview do Editor Visual</h1>
              <p className="text-xs text-muted-foreground">Demonstração local · nenhum dado real será lido ou salvo</p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Modo isolado
          </span>
        </div>

        <VisualEditor
          h={history}
          bg={background}
          onBg={setBackground}
          ctx={context}
          toolbarExtra={
            <span className="hidden items-center rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-xs text-primary sm:inline-flex">
              Convite fictício
            </span>
          }
        />
      </div>
    </main>
  );
}
