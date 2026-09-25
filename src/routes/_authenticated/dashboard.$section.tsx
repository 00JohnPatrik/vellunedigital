import { createFileRoute, notFound } from "@tanstack/react-router";
import { Placeholder } from "@/components/app-shell";
import { companyNav } from "@/lib/nav";

export const Route = createFileRoute("/_authenticated/dashboard/$section")({
  loader: ({ params }) => {
    const item = companyNav.find((n) => n.slug && n.slug === params.section);
    if (!item) throw notFound();
    return { title: item.label };
  },
  component: () => <Placeholder title={Route.useLoaderData().title} />,
});
