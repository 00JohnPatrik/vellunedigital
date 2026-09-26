import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Image, Lock, Pencil, Plus, Save, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { dbErrorMessage, EmptyState, fmtDate, LoadingState, PageHeader, StatusBadge, StatusToggle, DeleteButton } from "@/components/admin-ui";
import { CompanyForm } from "@/components/admin-forms";
import { getCompany, isUuid, listCompanyAdmins, setCompanyStatus, setDeleted } from "@/lib/admin-data";
import { SubscriptionOverviewCard } from "@/components/subscription-ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { getBrandIdentity, saveBrandIdentity, listCompanyDomains, saveCompanyDomain, setCompanyDomainStatus, hasCustomBranding, isHexColor, brandKey, domainsKey, uploadBrandAsset, type BrandIdentityInput, type CompanyDomain } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/admin/companies/$id")({
  validateSearch: z.object({ edit: z.boolean().optional() }),
  head: () => ({ meta: [{ title: "Empresa — Vellune Digital" }] }),
  component: CompanyDetail,
});

function CompanyDetail() {
  const { id } = Route.useParams();
  const { edit } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const valid = isUuid(id);
  const company = useQuery({ queryKey: ["admin", "company", id], queryFn: () => getCompany(id), enabled: valid });
  const admins = useQuery({ queryKey: ["admin", "company-admins", id], queryFn: () => listCompanyAdmins(id), enabled: valid });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const setEdit = (e: boolean) => navigate({ search: e ? { edit: true } : {}, replace: true });
  const back = <Link to="/admin/companies" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Empresas</Link>;

  if (valid && company.isLoading) return <div>{back}<LoadingState /></div>;
  const c = company.data;
  if (!valid || !c || (c as { deleted_at?: string | null }).deleted_at) return <div>{back}<EmptyState>Empresa não encontrada.</EmptyState></div>;

  return <div>
    {back}
    <PageHeader title={c.name} description={c.type ?? undefined} action={!edit && <div className="flex gap-2"><Button variant="outline" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" />Editar</Button><StatusToggle size="default" status={c.status} name={c.name} onConfirm={async () => { await setCompanyStatus(c.id, c.status === "active" ? "inactive" : "active"); refresh(); }} /><DeleteButton name={c.name} description="A empresa vai para a Lixeira. Clientes, modelos, convites, respostas, visualizações e arquivos são preservados e tudo pode ser restaurado." onConfirm={async () => { try { await setDeleted("companies", c.id, true); toast.success("Empresa enviada para a Lixeira."); await qc.invalidateQueries(); await navigate({ to: "/admin/companies" }); } catch { toast.error("Não foi possível excluir."); } }} /></div>} />
    {edit ? <CompanyForm key={c.updated_at} initial={{ name: c.name, type: c.type ?? "", status: c.status }} submitLabel="Salvar alterações" onCancel={() => setEdit(false)} onSubmit={async (v) => { const { error } = await supabase.from("companies").update(v).eq("id", c.id); if (error) { toast.error(dbErrorMessage(error, "Já existe uma empresa com esse nome.")); return; } toast.success("Empresa atualizada."); await refresh(); setEdit(false); }} /> : <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]"><dl className="grid gap-3 rounded-xl border p-5 text-sm"><div><dt className="text-muted-foreground">Status</dt><dd className="mt-1"><StatusBadge status={c.status} /></dd></div><div><dt className="text-muted-foreground">Tipo</dt><dd>{c.type ?? "—"}</dd></div><div><dt className="text-muted-foreground">Criada em</dt><dd>{fmtDate(c.created_at)}</dd></div><div><dt className="text-muted-foreground">Atualizada em</dt><dd>{fmtDate(c.updated_at)}</dd></div></dl><div className="rounded-xl border p-5"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-medium">Administradores</h2><Button size="sm" variant="outline" asChild><Link to="/admin/users/new" search={{ company: c.id }}><Plus className="h-4 w-4" />Adicionar</Link></Button></div>{admins.isLoading ? <LoadingState /> : !admins.data?.length ? <p className="text-sm text-muted-foreground">Nenhum administrador cadastrado.</p> : <ul className="divide-y">{admins.data.map((u) => <li key={u.id} className="flex items-center justify-between gap-2 py-2 text-sm"><Link to="/admin/users/$id" params={{ id: u.id }} className="min-w-0 hover:underline"><div className="truncate font-medium">{u.name}</div><div className="truncate text-muted-foreground">{u.email}</div></Link><StatusBadge status={u.status} /></li>)}</ul>}</div></div>
      <section className="mt-6"><SubscriptionOverviewCard companyId={c.id} /></section><CompanyBrandingPanel companyId={c.id} /><CompanyDomainsPanel companyId={c.id} />
    </>}
  </div>;
}

function CompanyBrandingPanel({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const brand = useQuery({ queryKey: brandKey(companyId), queryFn: () => getBrandIdentity(companyId) });
  const custom = useQuery({ queryKey: ["custom-branding", companyId], queryFn: () => hasCustomBranding(companyId) });
  const [form, setForm] = useState<BrandIdentityInput | null>(null);
  const [saving, setSaving] = useState(false);
  const logo = useRef<HTMLInputElement>(null);
  const favicon = useRef<HTMLInputElement>(null);
  if (brand.isLoading) return <Card className="mt-6"><CardContent className="p-6"><LoadingState /></CardContent></Card>;
  if (!brand.data) return null;
  const values = form ?? { ...brand.data, show_vellune_branding: custom.data === false ? true : brand.data.show_vellune_branding };
  const update = (patch: Partial<BrandIdentityInput>) => setForm((current) => ({ ...(current ?? values), ...patch }));
  const upload = async (file: File | undefined, kind: "logo" | "favicon") => { if (!file) return; try { const url = await uploadBrandAsset(companyId, file, kind); update(kind === "logo" ? { logo_url: url } : { favicon_url: url }); toast.success("Imagem enviada."); } catch (e) { toast.error((e as Error).message); } };
  const save = async () => { if (![values.primary_color, values.secondary_color, values.accent_color].every((color) => !color || isHexColor(color))) { toast.error("Use cores hexadecimais no formato #RRGGBB."); return; } setSaving(true); try { await saveBrandIdentity(companyId, { ...values, show_vellune_branding: custom.data ? values.show_vellune_branding : true }); await qc.invalidateQueries({ queryKey: brandKey(companyId) }); setForm(null); toast.success("Marca e identidade atualizadas."); } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); } };
  return <Card className="mt-6"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Image className="h-5 w-5" />Marca e identidade</CardTitle><CardDescription>Configure a identidade exibida nos convites públicos.</CardDescription></div><Button onClick={() => void save()} disabled={saving}><Save className="h-4 w-4" />{saving ? "Salvando..." : "Salvar"}</Button></div></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label>Nome da marca</Label><Input value={values.brand_name ?? ""} onChange={(e) => update({ brand_name: e.target.value })} /></div>{(["primary_color", "secondary_color", "accent_color"] as const).map((field) => <div className="space-y-2" key={field}><Label>{field === "primary_color" ? "Cor primária" : field === "secondary_color" ? "Cor secundária" : "Cor de destaque"}</Label><Input placeholder="#RRGGBB" value={values[field] ?? ""} onChange={(e) => update({ [field]: e.target.value } as Partial<BrandIdentityInput>)} /></div>)}<div className="space-y-2"><Label>WhatsApp</Label><Input value={values.whatsapp_number ?? ""} onChange={(e) => update({ whatsapp_number: e.target.value })} /></div><div className="space-y-2"><Label>E-mail de contato</Label><Input value={values.contact_email ?? ""} onChange={(e) => update({ contact_email: e.target.value })} /></div><div className="space-y-2 sm:col-span-2"><Label>Website</Label><Input value={values.website_url ?? ""} onChange={(e) => update({ website_url: e.target.value })} /></div></div><div className="grid gap-4 sm:grid-cols-2"><AssetInput label="Logo" value={values.logo_url} input={logo} onChange={(file) => void upload(file, "logo")} /><AssetInput label="Favicon" value={values.favicon_url} input={favicon} onChange={(file) => void upload(file, "favicon")} /></div><div className="flex items-center justify-between gap-4 rounded-lg border p-4"><div><p className="font-medium">Exibir marca Vellune</p><p className="text-sm text-muted-foreground">O plano atual {custom.data ? "permite controlar" : "não permite remover"} a marca da plataforma.</p></div><Switch checked={values.show_vellune_branding} disabled={!custom.data} onCheckedChange={(checked) => update({ show_vellune_branding: checked })} /></div></CardContent></Card>;
}

function AssetInput({ label, value, input, onChange }: { label: string; value: string | null; input: React.RefObject<HTMLInputElement | null>; onChange: (file?: File) => void }) { return <div className="space-y-2"><Label>{label}</Label><div className="flex h-24 items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/30 p-2">{value ? <img src={value} alt={`${label} atual`} className="max-h-full max-w-full object-contain" /> : <Image className="h-7 w-7 text-muted-foreground" />}</div><input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => onChange(e.target.files?.[0])} /><Button type="button" variant="outline" className="w-full" onClick={() => input.current?.click()}><Upload className="h-4 w-4" />Enviar {label.toLowerCase()}</Button></div>; }

function CompanyDomainsPanel({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const domains = useQuery({ queryKey: domainsKey(companyId), queryFn: () => listCompanyDomains(companyId) });
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const add = async () => { if (!domain.trim()) return; setSaving(true); try { await saveCompanyDomain(companyId, { domain, status: "pending" }); setDomain(""); await qc.invalidateQueries({ queryKey: domainsKey(companyId) }); toast.success("Domínio adicionado como pendente."); } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); } };
  const changeStatus = async (item: CompanyDomain, status: "active" | "disabled") => { try { await setCompanyDomainStatus(item.id, companyId, status); await qc.invalidateQueries({ queryKey: domainsKey(companyId) }); toast.success(status === "active" ? "Domínio ativado." : "Domínio desativado."); } catch (e) { toast.error((e as Error).message); } };
  const makePrimary = async (item: CompanyDomain) => { try { await saveCompanyDomain(companyId, { domain: item.domain, domain_type: item.domain_type, status: item.status, is_primary: true, notes: item.notes }, item.id); await qc.invalidateQueries({ queryKey: domainsKey(companyId) }); toast.success("Domínio principal definido."); } catch (e) { toast.error((e as Error).message); } };
  return <Card className="mt-6"><CardHeader><CardTitle>Domínios</CardTitle><CardDescription>DNS e SSL devem ser configurados na infraestrutura do domínio. A aplicação só ativa domínios previamente verificados.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex flex-col gap-2 sm:flex-row"><Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="exemplo.com.br" /><Button onClick={() => void add()} disabled={saving}><Plus className="h-4 w-4" />Adicionar</Button></div>{domains.isLoading ? <LoadingState /> : !domains.data?.length ? <p className="text-sm text-muted-foreground">Nenhum domínio cadastrado.</p> : <ul className="divide-y rounded-lg border">{domains.data.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"><div><div className="font-medium">{item.domain} {item.is_primary && <span className="text-primary">· principal</span>}</div><div className="text-muted-foreground">{item.status}{item.verified_at ? " · verificado" : " · aguardando verificação"}</div></div><div className="flex flex-wrap gap-2">{item.status === "pending" && item.verified_at && <Button size="sm" onClick={() => void changeStatus(item, "active")}>Ativar</Button>}{item.status === "active" && <><Button size="sm" variant="outline" onClick={() => void makePrimary(item)} disabled={item.is_primary}>Definir principal</Button><Button size="sm" variant="outline" onClick={() => void changeStatus(item, "disabled")}>Desativar</Button></>}{item.status === "disabled" && item.verified_at && <Button size="sm" variant="outline" onClick={() => void changeStatus(item, "active")}>Reativar</Button>}</div></li>)}</ul>}</CardContent></Card>;
}
