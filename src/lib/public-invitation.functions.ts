import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { TemplateContent } from "@/lib/templates";

export type PublicInvitation = {
  slug: string; name: string; status: "published" | "closed"; event_date: string; event_time: string;
  venue_name: string | null; address: string | null; city: string | null; state: string | null; message: string | null;
  content: TemplateContent;
};
export type PublicInvitationResult = { state: "ok"; invitation: PublicInvitation } | { state: "not_found" | "unavailable" };

/**
 * Public lookup by slug. The DB function `get_public_invitation` is only executable by the server
 * and returns safe fields only when status is published/closed — no company/customer/internal ids.
 */
export const getPublicInvitation = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }): Promise<PublicInvitationResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: res, error } = await supabaseAdmin.rpc("get_public_invitation" as never, { _slug: data.slug } as never);
    if (error) { console.error("get_public_invitation", error.message); throw new Error("Falha ao carregar o convite."); }
    return res as unknown as PublicInvitationResult;
  });
