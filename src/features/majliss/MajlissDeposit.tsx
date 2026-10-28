import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MajlissAudioUploader } from "./MajlissAudioUploader";
import { loadAssistantAssignments } from "./assistant-ingestion";

export function MajlissDeposit() {
  const query = useQuery({
    queryKey: ["majliss-assistant-assignments"],
    queryFn: loadAssistantAssignments,
  });

  if (query.isPending)
    return (
      <main className="mx-auto max-w-xl p-4">
        <Loader2 className="size-6 animate-spin" />
      </main>
    );
  if (query.isError)
    return <main className="mx-auto max-w-xl p-4 text-destructive">{query.error.message}</main>;
  if (!query.data.enabled)
    return (
      <main className="mx-auto max-w-xl p-4">
        <Card>
          <CardContent className="p-6">
            Le dépôt Majliss n’est pas encore activé pour cette organisation.
          </CardContent>
        </Card>
      </main>
    );

  const options = query.data.assignments.map((assignment) => ({
    id: assignment.id,
    label: `${assignment.teacher.display_name} — ${assignment.village.name}, ${assignment.village.country}`,
    destination: {
      organizationId: assignment.organization_id,
      villageId: assignment.village_id,
      teacherId: assignment.teacher_id,
      assignmentId: assignment.id,
    },
  }));

  return (
    <main className="mx-auto min-h-dvh max-w-xl bg-background p-4 pb-12 sm:p-6">
      <header className="mb-5 space-y-2">
        <Badge variant="secondary">Majliss · dépôt contributeur</Badge>
        <h1 className="text-2xl font-semibold tracking-tight">Envoyer des vocaux WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Choisissez les fichiers depuis votre téléphone, préécoutez-les et envoyez-les en
          brouillon. Un administrateur validera la publication.
        </p>
      </header>
      <Card>
        <CardContent className="p-4 sm:p-6">
          <MajlissAudioUploader options={options} />
        </CardContent>
      </Card>
    </main>
  );
}
