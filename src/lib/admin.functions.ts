import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Super admin: (re)sends the first-access e-mail to a company admin.
 * Creates the auth account if missing (random password, never stored) and
 * emails a link so the user sets their own password.
 * Future audit logging hooks in here.
 */
export const sendAccessInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), origin: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_super_admin");
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("users")
      .select("id, email, auth_user_id, status, role")
      .eq("id", data.userId)
      .maybeSingle();
    if (!row || row.role !== "company_admin") return { ok: false as const, error: "Usuário não encontrado." };
    if (row.status !== "active") return { ok: false as const, error: "Ative o usuário antes de enviar o acesso." };

    if (!row.auth_user_id) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: row.email,
        password: crypto.randomUUID() + crypto.randomUUID(),
        email_confirm: true,
      });
      if (error || !created.user) {
        console.error("invite createUser", error?.message);
        return { ok: false as const, error: "Não foi possível criar a conta de acesso." };
      }
      await supabaseAdmin.from("users").update({ auth_user_id: created.user.id }).eq("id", row.id);
    }

    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });
    const { error } = await client.auth.resetPasswordForEmail(row.email, {
      redirectTo: `${new URL(data.origin).origin}/reset-password`,
    });
    if (error) {
      console.error("invite email", error.message);
      return {
        ok: false as const,
        error: /rate|seconds/i.test(error.message)
          ? "Muitos envios seguidos. Aguarde alguns minutos e tente de novo."
          : "Não foi possível enviar o e-mail.",
      };
    }
    return { ok: true as const };
  });
