import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/intermediaire")({
  beforeLoad: () => {
    throw redirect({ to: "/parcours" });
  },
});
