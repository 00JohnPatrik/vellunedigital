import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Opaque sb_ keys must not be sent as bearer tokens.

// Password-reset links must always return to the trusted application origin.
// The environment variable is optional; production falls back to the known Vellune URL.
function trustedAppOrigin(): string {
  const configured = process.env["APP_ORIGIN"] ?? "https://vellunedigital.lovable.app";
  const url = new URL(configured);
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("Invalid APP_ORIGIN configuration.");
  }
  if (url.protocol !== "https:" && process.env["NODE_ENV"] === "production") {
    throw new Error("APP_ORIGIN must use HTTPS in production.");
  }
  return url.origin;
}

function passwordResetRedirect(): string {
  return `${trustedAppOrigin()}/reset-password`;
}

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
  .validator((d) =>
    z.object({ phone: z.string().min(8).max(20), password: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const generic = { ok: false as const, error: "Telefone ou senha inválidos." };
    const phone = normalizePhone(data.phone);
    if (phone.length < 10 || phone.length > 15) return generic;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("phone", phone)
      .maybeSingle();
    if (!row) return generic;
    const client = await publicAuthClient();
    const { data: s, error } = await client.auth.signInWithPassword({
      email: row.email,
      password: data.password,
    });
    if (error || !s.session) return generic;
    await supabaseAdmin
      .from("users")
      .update({ last_login_at: new Date().toISOString(), last_seen_at: new Date().toISOString() })
      .eq("auth_user_id", s.session.user.id);
    return {
      ok: true as const,
      access_token: s.session.access_token,
      refresh_token: s.session.refresh_token,
    };
  });

/** First access: activates a pre-registered user and emails a link to set the password. */
export const requestFirstAccess = createServerFn({ method: "POST" })
  .validator((d) =>
    z.object({ email: z.string().trim().toLowerCase().email().max(255) }).parse(d),
  )
  .handler(async ({ data }) => {
    const done = { ok: true as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("users")
      .select("id, auth_user_id, status, deleted_at")
      .eq("email", data.email)
      .maybeSingle();
    if (!row || row.status !== "active" || row.deleted_at) return done;

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
      const { error: linkError } = await supabaseAdmin
        .from("users")
        .update({ auth_user_id: created.user.id })
        .eq("id", row.id);

      if (linkError) {
        console.error("first-access linkUser", linkError.message);
        await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch((cleanupError) => {
          console.error("first-access cleanupUser", cleanupError?.message);
        });
        return done;
      }
    }

    const client = await publicAuthClient();
    const { error } = await client.auth.resetPasswordForEmail(data.email, {
      redirectTo: passwordResetRedirect(),
    });
    if (error) console.error("first-access reset email", error.message);
    return done;
  });

/** Password recovery: only for already-activated, provisioned accounts. Never creates users. */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator((d) =>
    z.object({ email: z.string().trim().toLowerCase().email().max(255) }).parse(d),
  )
  .handler(async ({ data }) => {
    const done = { ok: true as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("users")
      .select("auth_user_id, status, deleted_at")
      .eq("email", data.email)
      .maybeSingle();
    if (!row || row.status !== "active" || row.deleted_at || !row.auth_user_id) return done;
    const client = await publicAuthClient();
    const { error } = await client.auth.resetPasswordForEmail(data.email, {
      redirectTo: passwordResetRedirect(),
    });
    if (error) console.error("password reset email", error.message);
    return done;
  });
