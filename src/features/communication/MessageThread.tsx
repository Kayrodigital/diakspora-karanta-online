import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Message = {
  id: string;
  body: string;
  created_at: string;
  sender_user_id: string;
};

export function MessageThread({
  messages,
  currentUserId,
  emptyLabel = "Aucun message pour le moment.",
  onSend,
}: {
  messages: Message[];
  currentUserId: string;
  emptyLabel?: string;
  onSend: (body: string) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await onSend(body.trim());
      setBody("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le message n’a pas pu être envoyé.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-[28rem] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl bg-muted/40 p-3 sm:p-4">
        {messages.length ? (
          messages.map((message) => {
            const mine = message.sender_user_id === currentUserId;
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card shadow-sm"}`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/65" : "text-muted-foreground"}`}
                  >
                    {new Date(message.created_at).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        )}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={4000}
          rows={2}
          placeholder="Écrire un message…"
          aria-label="Votre message"
          className="min-h-14 resize-none rounded-2xl"
        />
        <Button
          type="button"
          size="icon"
          onClick={submit}
          disabled={sending || !body.trim()}
          aria-label="Envoyer le message"
          className="size-12 shrink-0 rounded-2xl"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
