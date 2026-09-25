import { BarChart3, Building2, Contact, FileText, LayoutDashboard, LayoutTemplate, Mail, Settings, Users, type LucideIcon } from "lucide-react";

/** `to` overrides the default `${base}/${slug}` link for modules living outside the area prefix. */
export type NavItem = { slug: string; label: string; icon: LucideIcon; to?: string };

export const adminNav: NavItem[] = [
  { slug: "", label: "Dashboard", icon: LayoutDashboard },
  { slug: "companies", label: "Empresas", icon: Building2 },
  { slug: "users", label: "Usuários", icon: Users },
  { slug: "customers", label: "Clientes", icon: Contact, to: "/customers" },
  { slug: "modelos-oficiais", label: "Modelos Oficiais", icon: LayoutTemplate },
  { slug: "relatorios", label: "Relatórios", icon: BarChart3 },
  { slug: "configuracoes", label: "Configurações", icon: Settings },
];

export const companyNav: NavItem[] = [
  { slug: "", label: "Dashboard", icon: LayoutDashboard },
  { slug: "convites", label: "Convites", icon: Mail },
  { slug: "customers", label: "Clientes", icon: Users, to: "/customers" },
  { slug: "modelos", label: "Modelos", icon: FileText },
  { slug: "relatorios", label: "Relatórios", icon: BarChart3 },
  { slug: "configuracoes", label: "Configurações", icon: Settings },
];
