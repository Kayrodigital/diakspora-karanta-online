import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { loadValidationQueue, validateSessionProgress } from "@/features/learning/progress-data";

export function TeacherSessionValidation({ organizationId }: { organizationId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["session-validation-queue", organizationId] as const;
  const queue = useQuery({ queryKey, queryFn: () => loadValidationQueue(organizationId) });
  const mutation = useMutation({
    mutationFn: validateSessionProgress,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      toast.success("Séance validée.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Validation impossible."),
  });

  if (queue.isPending) return <div className="h-32 animate-pulse rounded-3xl bg-muted" />;
  if (queue.isError) return null;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <ClipboardCheck className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold">Séances à valider</h2>
            <p className="text-sm text-muted-foreground">
              Uniquement les élèves de vos classes affectées.
            </p>
          </div>
        </div>
        {queue.data?.length ? (
          <div className="mt-5 space-y-3">
            {queue.data.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">{item.learnerName}</p>
                  <p className="text-sm text-muted-foreground">{item.sessionTitle}</p>
                </div>
                <Button
                  className="min-h-11 rounded-xl"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(item.id)}
                >
                  <CheckCircle2 className="size-4" />
                  Valider
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
            Aucune séance n’attend votre validation.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
