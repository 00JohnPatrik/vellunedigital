import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: () => <Placeholder title="Dashboard" />,
});
