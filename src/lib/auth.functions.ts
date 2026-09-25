import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Opaque sb_ keys must not be sent as bearer tokens.
function publicAuthClient() {
  return import("@supabase/supabase-js").then(({ createClient }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
    return createClient(process.env["SUPABASE_URL"]!, key, {
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
  });
}

export const normalizePhone = (v: string) => v.replace(/\D/g, "");

/** Phone + password sign-in: resolves the account server-side (email never returned). */
export const signInWithPhone = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ phone: z.string().min(8).max(20), password: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const generic = { ok: false as const, error: "Telefone ou senha inválidos." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("phone", normalizePhone(data.phone))
      .maybeSingle();
    if (!row) return generic;
    const client = await publicAuthClient();
    const { data: s, error } = await client.auth.signInWithPassword({
      email: row.email,
      password: data.password,
    });
    if (error || !s.session) return generic;
    return {
      ok: true as const,
      access_token: s.session.access_token,
      refresh_token: s.session.refresh_token,
    };
  });

/** First access: activates a pre-registered user and emails a link to set the password. */
export const requestFirstAccess = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ email: z.string().trim().toLowerCase().email().max(255), origin: z.string().url() }).parse(d),
  )
  .handler(async ({ data }) => {
    const done = { ok: true as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("users")
      .select("id, auth_user_id, status")
      .eq("email", data.email)
      .maybeSingle();
    if (!row || row.status !== "active") return done;

    if (!row.auth_user_id) {
      const tmp = crypto.randomUUID() + crypto.randomUUID();
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: tmp,
        email_confirm: true,
      });
      if (error || !created.user) {
        console.error("first-access createUser", error?.message);
        return done;
      }
      await supabaseAdmin.from("users").update({ auth_user_id: created.user.id }).eq("id", row.id);
    }

    const client = await publicAuthClient();
    const { error } = await client.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${new URL(data.origin).origin}/reset-password`,
    });
    if (error) console.error("first-access reset email", error.message);
    return done;
  });

/** Password recovery: only for already-activated, provisioned accounts. Never creates users. */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ email: z.string().trim().toLowerCase().email().max(255), origin: z.string().url() }).parse(d),
  )
  .handler(async ({ data }) => {
    const done = { ok: true as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("users")
      .select("auth_user_id, status")
      .eq("email", data.email)
      .maybeSingle();
    if (!row || row.status !== "active" || !row.auth_user_id) return done;
    const client = await publicAuthClient();
    const { error } = await client.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${new URL(data.origin).origin}/reset-password`,
    });
    if (error) console.error("password reset email", error.message);
    return done;
  });
