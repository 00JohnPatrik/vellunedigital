import { BarChart3, Building2, FileText, LayoutDashboard, LayoutTemplate, Mail, Settings, Users, type LucideIcon } from "lucide-react";

export type NavItem = { slug: string; label: string; icon: LucideIcon };

export const adminNav: NavItem[] = [
  { slug: "", label: "Dashboard", icon: LayoutDashboard },
  { slug: "empresas", label: "Empresas", icon: Building2 },
  { slug: "usuarios", label: "Usuários", icon: Users },
  { slug: "modelos-oficiais", label: "Modelos Oficiais", icon: LayoutTemplate },
  { slug: "relatorios", label: "Relatórios", icon: BarChart3 },
  { slug: "configuracoes", label: "Configurações", icon: Settings },
];

export const companyNav: NavItem[] = [
  { slug: "", label: "Dashboard", icon: LayoutDashboard },
  { slug: "convites", label: "Convites", icon: Mail },
  { slug: "clientes", label: "Clientes", icon: Users },
  { slug: "modelos", label: "Modelos", icon: FileText },
  { slug: "relatorios", label: "Relatórios", icon: BarChart3 },
  { slug: "configuracoes", label: "Configurações", icon: Settings },
];
