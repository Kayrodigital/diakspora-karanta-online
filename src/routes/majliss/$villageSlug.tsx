import { createFileRoute } from "@tanstack/react-router";

import { VillagePage } from "@/features/majliss/MajlissUi";

export const Route = createFileRoute("/majliss/$villageSlug")({
  component: VillageRoute,
});

function VillageRoute() {
  const { villageSlug } = Route.useParams();
  return <VillagePage slug={villageSlug} />;
}
