import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

type Notification = {
  delivery_id: string;
  recipient_email: string;
  recipient_name: string | null;
  kind: "invitation" | "updated" | "cancelled" | "reminder_24h" | "reminder_1h" | "replay";
  title: string;
  description: string | null;
  provider: string;
  join_url: string | null;
  replay_url: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  course_title: string | null;
  cohort_name: string | null;
  organization_name: string;
  attempt: number;
};

const providerLabels: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  other: "En ligne",
};

const subjects: Record<Notification["kind"], string> = {
  invitation: "Nouveau cours en direct",
  updated: "Cours en direct mis à jour",
  cancelled: "Cours en direct annulé",
  reminder_24h: "Rappel : votre cours a lieu demain",
  reminder_1h: "Rappel : votre cours commence dans 1 heure",
  replay: "Le replay de votre cours est disponible",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function required(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} n'est pas configuré.`);
  return value;
}

function secretKey() {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) {
    const parsed = JSON.parse(keys) as Record<string, string>;
    if (parsed.default) return parsed.default;
  }
  return required("SUPABASE_SERVICE_ROLE_KEY");
}

function escapeHtml(value: string | null | undefined) {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(notification: Notification) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: notification.timezone || "Europe/Paris",
  }).format(new Date(notification.starts_at));
}

function messageLead(kind: Notification["kind"]) {
  if (kind === "invitation") return "Un nouveau cours en direct a été programmé.";
  if (kind === "updated") return "Les informations de ce cours en direct ont été modifiées.";
  if (kind === "cancelled") return "Ce cours en direct a été annulé.";
  if (kind === "reminder_24h") return "Votre cours en direct aura lieu demain.";
  if (kind === "reminder_1h") return "Votre cours en direct commence dans environ une heure.";
  return "Le replay de votre cours est maintenant disponible.";
}

function emailContent(notification: Notification, appUrl: string) {
  const firstName = notification.recipient_name?.trim() || "cher élève";
  const date = formatDate(notification);
  const provider = providerLabels[notification.provider] ?? notification.provider;
  const targetUrl =
    notification.kind === "replay"
      ? (notification.replay_url ?? appUrl)
      : (notification.join_url ?? appUrl);
  const buttonLabel = notification.kind === "replay" ? "Voir le replay" : "Accéder au cours";
  const showButton = notification.kind !== "cancelled";
  const context = [notification.course_title, notification.cohort_name].filter(Boolean).join(" · ");

  const text = [
    `Bonjour ${firstName},`,
    "",
    messageLead(notification.kind),
    notification.title,
    date,
    context,
    `Plateforme : ${provider}`,
    showButton ? targetUrl : "",
    "",
    "L'équipe Diakspora Karanta",
  ]
    .filter((line) => line !== "")
    .join("\n");

  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f6f4ee;font-family:Arial,sans-serif;color:#17231d">
  <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(messageLead(notification.kind))}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4ee;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:20px;overflow:hidden;border:1px solid #e7e2d5">
        <tr><td style="background:#173f35;padding:26px 30px;color:#fff">
          <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.78">Diakspora Karanta</div>
          <div style="font-size:25px;font-weight:700;margin-top:8px">${escapeHtml(subjects[notification.kind])}</div>
        </td></tr>
        <tr><td style="padding:30px">
          <p style="margin:0 0 18px;font-size:16px">Bonjour ${escapeHtml(firstName)},</p>
          <p style="margin:0 0 22px;line-height:1.6;color:#53615b">${escapeHtml(messageLead(notification.kind))}</p>
          <div style="background:#f7f6f1;border-radius:14px;padding:20px">
            <div style="font-size:20px;font-weight:700">${escapeHtml(notification.title)}</div>
            <div style="margin-top:12px;color:#53615b;line-height:1.6">${escapeHtml(date)}</div>
            ${context ? `<div style="color:#53615b;line-height:1.6">${escapeHtml(context)}</div>` : ""}
            <div style="color:#53615b;line-height:1.6">Plateforme : ${escapeHtml(provider)}</div>
          </div>
          ${notification.description ? `<p style="margin:20px 0 0;line-height:1.6;color:#53615b">${escapeHtml(notification.description)}</p>` : ""}
          ${showButton ? `<p style="margin:26px 0 0"><a href="${escapeHtml(targetUrl)}" style="display:inline-block;background:#d49b3d;color:#17231d;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:12px">${buttonLabel}</a></p>` : ""}
          <p style="margin:28px 0 0;font-size:13px;color:#7a847f;line-height:1.5">Cet e-mail concerne votre inscription pédagogique à ${escapeHtml(notification.organization_name)}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { html, text };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  try {
    const suppliedCronSecret = request.headers.get("x-cron-secret")?.trim();
    if (!suppliedCronSecret) {
      return json({ error: "Accès refusé." }, 401);
    }

    const supabase = createClient(required("SUPABASE_URL"), secretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authorized, error: authorizationError } = await supabase.rpc(
      "verify_live_notification_cron_secret",
      { p_secret: suppliedCronSecret },
    );
    if (authorizationError || authorized !== true) {
      return json({ error: "Accès refusé." }, 401);
    }

    const brevoApiKey = required("BREVO_API_KEY");
    const senderEmail = required("BREVO_SENDER_EMAIL");
    const senderName = Deno.env.get("BREVO_SENDER_NAME")?.trim() || "Diakspora Karanta";
    const appUrl = Deno.env.get("APP_URL")?.trim() || "https://diakspora-karanta-online.vercel.app";
    const sandbox = Deno.env.get("BREVO_SANDBOX_MODE") === "true";
    const { data, error } = await supabase.rpc("claim_due_live_email_notifications", {
      p_limit: 50,
    });
    if (error) throw new Error(error.message);

    const deliveries = (data ?? []) as Notification[];
    let sent = 0;
    let failed = 0;

    for (const notification of deliveries) {
      try {
        const { html, text } = emailContent(notification, appUrl);
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            accept: "application/json",
            "api-key": brevoApiKey,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sender: { email: senderEmail, name: senderName },
            to: [
              {
                email: notification.recipient_email,
                name: notification.recipient_name ?? undefined,
              },
            ],
            subject: `${subjects[notification.kind]} · ${notification.title}`,
            htmlContent: html,
            textContent: text,
            ...(sandbox ? { headers: { "X-Sib-Sandbox": "drop" } } : {}),
            tags: ["karanta-live", notification.kind],
          }),
        });

        const result = (await response.json().catch(() => ({}))) as {
          messageId?: string;
          message?: string;
        };
        if (!response.ok) throw new Error(result.message || `Brevo HTTP ${response.status}`);

        const { error: updateError } = await supabase
          .from("live_session_email_deliveries")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            next_attempt_at: null,
            provider_message_id: result.messageId ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", notification.delivery_id);
        if (updateError) throw updateError;
        sent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur d'envoi inconnue.";
        const retryMinutes = Math.min(60, 2 ** Math.max(0, notification.attempt - 1) * 5);
        await supabase
          .from("live_session_email_deliveries")
          .update({
            status: "failed",
            last_error: message.slice(0, 1000),
            next_attempt_at: new Date(Date.now() + retryMinutes * 60_000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", notification.delivery_id);
        failed += 1;
      }
    }

    return json({ ok: true, claimed: deliveries.length, sent, failed, sandbox });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne.";
    return json({ error: message }, 500);
  }
});
