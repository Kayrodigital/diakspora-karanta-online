import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isPortal, resolvePostAuthDestination, type Portal } from "@/lib/auth/portal-access";

type Flow = "invite" | "recovery";

export const Route = createFileRoute("/auth/complete")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    flow: search.flow === "invite" ? ("invite" as Flow) : ("recovery" as Flow),
    portal: isPortal(search.portal) ? search.portal : ("family" as Portal),
  }),
  head: () => ({ meta: [{ title: "Activer mon accès — Diakspora Karanta" }] }),
  component: CompleteAuthPage,
});

function CompleteAuthPage() {
  const { flow, portal } = Route.useSearch();
  const navigate = useNavigate();
  const [linkPresent] = useState(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    return fragment.get("type") === flow || query.has("code");
  });
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!linkPresent) {
      setChecking(false);
      return;
    }
    let active = true;
    const check = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      setReady(Boolean(data.session) && !sessionError);
      setChecking(false);
    };
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(Boolean(session));
        setChecking(false);
      }
    });
    void check();
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [linkPresent]);

  async function complete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmation) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    try {
      const { data: account, error: accountError } = await supabase.auth.getUser();
      if (accountError || !account.user)
        throw new Error("Ce lien n’est plus valide. Demandez un nouveau lien.");
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      const destination = await resolvePostAuthDestination(portal);
      if (!destination) {
        throw new Error(
          "Mot de passe enregistré, mais aucun accès actif n’est rattaché à ce compte. Contactez l’administration.",
        );
      }
      await navigate({ to: destination, replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d’activer le compte.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[color:var(--cream)] px-5 py-10 text-foreground">
      <div className="mx-auto w-full max-w-md">
        <Link to="/" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          ← Diakspora Karanta
        </Link>
        <h1 className="mt-10 font-serif text-3xl font-semibold text-[color:var(--deep-green)]">
          {flow === "invite" ? "Activer mon accès" : "Choisir un nouveau mot de passe"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {flow === "invite"
            ? "Définissez votre mot de passe pour accéder à votre espace Karanta."
            : "Choisissez un nouveau mot de passe pour votre compte Karanta."}
        </p>
        {checking ? (
          <p className="mt-8" role="status">
            Vérification du lien…
          </p>
        ) : !ready ? (
          <div className="mt-8 rounded-2xl bg-card p-6 shadow-sm">
            <p role="alert">
              Ce lien est expiré ou invalide.{" "}
              {flow === "invite"
                ? "Demandez à votre administrateur de renvoyer l’invitation."
                : "Demandez un nouveau lien de réinitialisation."}
            </p>
            <Link
              to="/auth"
              search={{ portal }}
              className="mt-4 inline-block font-semibold text-primary underline underline-offset-4"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form
            onSubmit={complete}
            className="mt-8 flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-sm"
          >
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Nouveau mot de passe
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-h-12 rounded-xl border border-input px-4 text-base"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Confirmer le mot de passe
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="min-h-12 rounded-xl border border-input px-4 text-base"
              />
            </label>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? "Enregistrement…" : "Enregistrer et continuer"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
