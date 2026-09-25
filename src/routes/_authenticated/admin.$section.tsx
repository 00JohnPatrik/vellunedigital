import { createFileRoute, notFound } from "@tanstack/react-router";
import { Placeholder } from "@/components/app-shell";
import { adminNav } from "@/lib/nav";

export const Route = createFileRoute("/_authenticated/admin/$section")({
  loader: ({ params }) => {
    const item = adminNav.find((n) => n.slug && n.slug === params.section);
    if (!item) throw notFound();
    return { title: item.label };
  },
  component: () => <Placeholder title={Route.useLoaderData().title} />,
});
