import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { Placeholder } from "@/components/app-shell";
import { companyNav } from "@/lib/nav";

export const Route = createFileRoute("/_authenticated/dashboard/$section")({
  loader: ({ params }) => {
    if (params.section === "configuracoes") throw redirect({ to: "/settings" });
    const item = companyNav.find((n) => n.slug && n.slug === params.section);
    if (!item) throw notFound();
    return { title: item.label };
  },
  component: () => <Placeholder title={Route.useLoaderData().title} />,
});
