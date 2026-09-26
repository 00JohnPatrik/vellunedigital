import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type HostDashboardResponse = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  people_count: number;
  status: "confirmed" | "declined";
  created_at: string;
  updated_at: string;
};

export type HostDashboard = {
  invitation: {
    name: string;
    slug: string;
    status: "published" | "closed";
    event_date: string;
    event_time: string;
    venue_name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    message: string | null;
    customer_name: string | null;
  };
  metrics: {
    views: number;
    responses: number;
    confirmed: number;
    declined: number;
    people: number;
  };
  responses: HostDashboardResponse[];
};

export type HostDashboardResult =
  | { state: "ok"; dashboard: HostDashboard }
  | { state: "not_found" | "unavailable" };

/**
 * Public host dashboard lookup. The access token is the only public identifier.
 * All reads happen with the server-only service-role client and only safe fields
 * are returned to the browser.
 */
export const getHostDashboard = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: z.string().trim().min(32).max(200) }).parse(d))
  .handler(async ({ data }): Promise<HostDashboardResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from("invitations")
      .select("name, slug, status, event_date, event_time, venue_name, address, city, state, message, customer:customers(name)")
      .eq("access_token", data.token)
      .is("deleted_at", null)
      .in("status", ["published", "closed"])
      .maybeSingle();

    if (invitationError) {
      console.error("getHostDashboard invitation", invitationError.message);
      throw new Error("Falha ao carregar o painel do anfitrião.");
    }

    if (!invitation) return { state: "not_found" };

    const invitationIdResult = await supabaseAdmin
      .from("invitations")
      .select("id")
      .eq("access_token", data.token)
      .is("deleted_at", null)
      .in("status", ["published", "closed"])
      .maybeSingle();

    if (invitationIdResult.error || !invitationIdResult.data) {
      if (invitationIdResult.error) console.error("getHostDashboard invitation id", invitationIdResult.error.message);
      return { state: "unavailable" };
    }

    const invitationId = invitationIdResult.data.id;
    const [viewsResult, responsesResult] = await Promise.all([
      supabaseAdmin
        .from("invitation_views")
        .select("id", { count: "exact", head: true })
        .eq("invitation_id", invitationId),
      supabaseAdmin
        .from("rsvp_responses")
        .select("id, name, phone, email, people_count, status, created_at, updated_at")
        .eq("invitation_id", invitationId)
        .order("updated_at", { ascending: false }),
    ]);

    if (viewsResult.error || responsesResult.error) {
      console.error("getHostDashboard metrics", viewsResult.error?.message ?? responsesResult.error?.message);
      throw new Error("Falha ao carregar os dados do painel.");
    }

    const responses = (responsesResult.data ?? []) as HostDashboardResponse[];
    const confirmed = responses.filter((response) => response.status === "confirmed");
    const customer = Array.isArray(invitation.customer) ? invitation.customer[0] : invitation.customer;

    return {
      state: "ok",
      dashboard: {
        invitation: {
          name: invitation.name,
          slug: invitation.slug,
          status: invitation.status as "published" | "closed",
          event_date: invitation.event_date,
          event_time: invitation.event_time,
          venue_name: invitation.venue_name,
          address: invitation.address,
          city: invitation.city,
          state: invitation.state,
          message: invitation.message,
          customer_name: customer?.name ?? null,
        },
        metrics: {
          views: viewsResult.count ?? 0,
          responses: responses.length,
          confirmed: confirmed.length,
          declined: responses.length - confirmed.length,
          people: confirmed.reduce((total, response) => total + response.people_count, 0),
        },
        responses,
      },
    };
  });
