import { BarChart3, Building2, Contact, FileText, LayoutDashboard, LayoutTemplate, Mail, Settings, Trash2, Users, type LucideIcon } from "lucide-react";

/** `to` overrides the default `${base}/${slug}` link for modules living outside the area prefix. */
export type NavItem = { slug: string; label: string; icon: LucideIcon; to?: string };

export const adminNav: NavItem[] = [
  { slug: "", label: "Dashboard", icon: LayoutDashboard },
  { slug: "companies", label: "Empresas", icon: Building2 },
  { slug: "users", label: "Usuários", icon: Users },
  { slug: "customers", label: "Clientes", icon: Contact, to: "/customers" },
  { slug: "templates", label: "Modelos Oficiais", icon: LayoutTemplate },
  { slug: "reports", label: "Relatórios", icon: BarChart3 },
  { slug: "trash", label: "Lixeira", icon: Trash2 },
  { slug: "configuracoes", label: "Configurações", icon: Settings },
];

export const companyNav: NavItem[] = [
  { slug: "", label: "Dashboard", icon: LayoutDashboard },
  { slug: "convites", label: "Convites", icon: Mail, to: "/invitations" },
  { slug: "customers", label: "Clientes", icon: Users, to: "/customers" },
  { slug: "templates", label: "Modelos", icon: FileText, to: "/templates" },
  { slug: "reports", label: "Relatórios", icon: BarChart3, to: "/reports" },
  { slug: "configuracoes", label: "Configurações", icon: Settings },
];
