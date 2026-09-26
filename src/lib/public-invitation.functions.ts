import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { TemplateContent } from "@/lib/templates";

export type PublicRsvp =
  | { enabled: false }
  | { enabled: true; open: boolean; deadline: string | null; max_people: number | null; allow_phone: boolean; allow_email: boolean };

export type PublicInvitationBranding = {
  brand_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  show_vellune_branding: boolean;
  whatsapp_number: string | null;
  contact_email: string | null;
  website_url: string | null;
};

export type PublicInvitation = {
  slug: string; name: string; status: "published" | "closed"; event_date: string; event_time: string;
  venue_name: string | null; address: string | null; city: string | null; state: string | null; message: string | null;
  content: TemplateContent; rsvp?: PublicRsvp; company_id?: string; branding?: PublicInvitationBranding | null;
};
export type PublicInvitationResult = { state: "ok"; invitation: PublicInvitation } | { state: "not_found" | "unavailable" };

/**
 * Public lookup by slug. The DB function `get_public_invitation` is only executable by the server
 * and returns safe fields only when status is published/closed — no company/customer/internal ids.
 */
export const getPublicInvitation = createServerFn({ method: "GET" })
  .validator((d) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }): Promise<PublicInvitationResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: res, error } = await supabaseAdmin.rpc("get_public_invitation" as never, { _slug: data.slug } as never);
    if (error) { console.error("get_public_invitation", error.message); throw new Error("Falha ao carregar o convite."); }
    const out = res as unknown as PublicInvitationResult;
    if (out.state === "ok" && out.invitation.company_id) {
      const { data: branding } = await supabaseAdmin.from("company_branding").select("brand_name, logo_url, favicon_url, primary_color, secondary_color, accent_color, show_vellune_branding, whatsapp_number, contact_email, website_url").eq("company_id", out.invitation.company_id).maybeSingle();
      out.invitation.branding = branding as PublicInvitation["branding"];
    }
    // Sign only the storage images referenced by this published invitation's content (private bucket).
    if (out.state === "ok") {
      const blocks = out.invitation.content?.blocks ?? [];
      const refs = blocks.filter((b) => b.type === "image" && typeof b.props?.["url"] === "string" && b.props["url"].startsWith("storage:"));
      const bg = out.invitation.content?.settings?.background;
      const bgPath = bg?.image?.startsWith("storage:") ? bg.image.slice(8) : null;
      const paths = [...new Set([...refs.map((b) => b.props!["url"]!.slice(8)), ...(bgPath ? [bgPath] : [])])].filter((p) => /^(companies|official)\/[\w\-/.]+$/.test(p) && !p.includes(".."));
      if (paths.length) {
        const { data: signed } = await supabaseAdmin.storage.from("invitation-assets").createSignedUrls(paths, 60 * 60 * 24);
        const map = new Map((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]));
        for (const b of refs) b.props!["url"] = map.get(b.props!["url"]!.slice(8)) ?? "";
        if (bg && bgPath) bg.image = map.get(bgPath) ?? "";
      }
    }
    return out;
  });

/** Counts one public view. The DB function only inserts for published/closed invitations; no visitor data stored. */
export const recordInvitationView = createServerFn({ method: "POST" })
  .validator((d) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("record_invitation_view" as never, { _slug: data.slug } as never);
    if (error) console.error("record_invitation_view", error.message);
    return { ok: !error };
  });

export type SubmitRsvpResult =
  | { state: "ok"; status: "confirmed" | "declined"; name: string; people: number; updated: boolean }
  | { state: "duplicate" | "closed" | "unavailable" }
  | { state: "invalid"; field: "name" | "people" | "phone" | "email" | "status" };

/**
 * Public RSVP submission. All rules (published, enabled, deadline, closed, max_people, duplicates)
 * are enforced inside the DB function `submit_rsvp`, executable only by the server. Never returns other guests.
 */
export const submitRsvp = createServerFn({ method: "POST" })
  .validator((d) => z.object({
    slug: z.string().min(1).max(120),
    status: z.enum(["confirmed", "declined"]),
    name: z.string().max(120),
    people: z.number().int().min(0).max(1000).nullable(),
    phone: z.string().max(30).optional().default(""),
    email: z.string().max(200).optional().default(""),
    update: z.boolean().optional().default(false),
  }).parse(d))
  .handler(async ({ data }): Promise<SubmitRsvpResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: res, error } = await supabaseAdmin.rpc("submit_rsvp" as never, {
      _slug: data.slug, _status: data.status, _name: data.name, _people: data.people, _phone: data.phone, _email: data.email, _update: data.update,
    } as never);
    if (error) { console.error("submit_rsvp", error.message); throw new Error("Não foi possível enviar sua resposta."); }
    return res as unknown as SubmitRsvpResult;
  });
