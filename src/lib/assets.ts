import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionLimitErrorMessage } from "@/lib/subscriptions";

// Images live in the private "invitation-assets" bucket. Blocks store `storage:<path>`; the editor
// resolves it to a short-lived signed URL (RLS-scoped) and the public page receives server-signed URLs.
export const BUCKET = "invitation-assets";
export const STORAGE_PREFIX = "storage:";
export const MAX_BYTES = 10 * 1024 * 1024;
const TYPES: Record<string, string[]> = { "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/webp": ["webp"], "image/gif": ["gif"] };

export type AssetScope =
  | { kind: "invitation"; id: string; companyId: string }
  | { kind: "template"; id: string; companyId: string | null };

export type FileRow = { id: string; storage_path: string; file_name: string; mime_type: string; size: number; created_at: string };

export function validateImage(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowed = TYPES[file.type];
  if (!allowed || !allowed.includes(ext)) return "Formato não permitido. Envie JPG, PNG, WebP ou GIF.";
  if (file.size > MAX_BYTES) return "Arquivo muito grande. O limite é 10 MB.";
  if (file.size === 0) return "Arquivo vazio.";
  return null;
}

function folder(s: AssetScope) {
  if (s.kind === "invitation") return `companies/${s.companyId}/invitations/${s.id}`;
  return s.companyId ? `companies/${s.companyId}/templates/${s.id}` : `official/templates/${s.id}`;
}

/** Uploads to Storage and registers it in `files`. Company/path consistency is re-checked by DB trigger + storage policies. */
export async function uploadImage(scope: AssetScope, file: File): Promise<string> {
  const err = validateImage(file);
  if (err) throw new Error(err);
  const ext = file.name.split(".").pop()!.toLowerCase();
  const path = `${folder(scope)}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw new Error("Não foi possível enviar a imagem.");
  const { error } = await supabase.from("files" as never).insert({
    storage_path: path, file_name: file.name.slice(0, 200), mime_type: file.type, size: file.size,
    invitation_id: scope.kind === "invitation" ? scope.id : null, template_id: scope.kind === "template" ? scope.id : null,
  } as never);
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    const limitMessage = subscriptionLimitErrorMessage(error);
    if (limitMessage) throw new Error(limitMessage);
    throw new Error("Não foi possível registrar a imagem.");
  }
  return STORAGE_PREFIX + path;
}

export async function listFiles(scope: AssetScope): Promise<FileRow[]> {
  const col = scope.kind === "invitation" ? "invitation_id" : "template_id";
  const { data, error } = await supabase.from("files" as never).select("id, storage_path, file_name, mime_type, size, created_at")
    .eq(col, scope.id).order("created_at", { ascending: false }).limit(60);
  if (error) throw error;
  return (data ?? []) as unknown as FileRow[];
}

const cache = new Map<string, { url: string; exp: number }>();

/** Resolves a block image value: external URLs pass through; `storage:` refs become signed URLs. */
export function useAssetUrl(value: string | undefined | null): string | null {
  const normalizedValue = typeof value === "string" && value.length > 0 ? value : null;
  const isRef = !!normalizedValue && normalizedValue.startsWith(STORAGE_PREFIX);
  const [url, setUrl] = useState<string | null>(() => {
    if (!normalizedValue) return null;
    if (!isRef) return normalizedValue;
    const c = cache.get(normalizedValue);
    return c && c.exp > Date.now() ? c.url : null;
  });
  useEffect(() => {
    if (!normalizedValue) { setUrl(null); return; }
    if (!isRef) { setUrl(normalizedValue); return; }
    const c = cache.get(normalizedValue);
    if (c && c.exp > Date.now()) { setUrl(c.url); return; }
    let alive = true;
    supabase.storage.from(BUCKET).createSignedUrl(normalizedValue.slice(STORAGE_PREFIX.length), 3600).then(({ data }) => {
      if (!data?.signedUrl) return;
      cache.set(normalizedValue, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
      if (alive) setUrl(data.signedUrl);
    });
    return () => { alive = false; };
  }, [normalizedValue, isRef]);
  return url;
}
