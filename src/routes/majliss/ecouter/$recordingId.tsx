import { createFileRoute } from "@tanstack/react-router";

import { RecordingPage } from "@/features/majliss/MajlissUi";

export const Route = createFileRoute("/majliss/ecouter/$recordingId")({
  component: RecordingRoute,
});

function RecordingRoute() {
  const { recordingId } = Route.useParams();
  return <RecordingPage recordingId={recordingId} />;
}
