import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isPortal, resolvePostAuthDestination, type Portal } from "@/lib/auth/portal-access";

const portalContent: Record<Portal, { eyebrow: string; title: string; description: string }> = {
  family: {
    eyebrow: "Familles & élèves",
    title: "Bienvenue dans votre espace",
    description: "Retrouvez les cours, les directs, les devoirs et le suivi familial.",
  },
  teacher: {
    eyebrow: "Professeurs",
    title: "Accéder à votre espace professeur",
    description: "Gérez vos classes, vos séances, vos contenus et vos corrections.",
  },
  admin: {
    eyebrow: "Administration",
    title: "Piloter votre organisation",
    description: "Accès réservé aux propriétaires, administrateurs et techniciens autorisés.",
  },
  planning: {
    eyebrow: "Classes et planning",
    title: "Accéder au planning",
    description: "Accès réservé aux responsables et professeurs autorisés.",
  },
  admissions: {
    eyebrow: "Équipe inscriptions",
    title: "Retrouvez les demandes à traiter",
    description:
      "Qualifiez les besoins, proposez une classe et suivez chaque admission simplement.",
  },
};

const googleOAuthEnabled = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === "true";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    portal: isPortal(search.portal) ? search.portal : ("family" as Portal),
  }),
  head: () => ({
    meta: [
      { title: "Connexion — Diakspora Karanta" },
      { name: "description", content: "Connectez-vous à votre espace élève." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { portal } = Route.useSearch();
  const content = portalContent[portal];
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [hydrated, setHydrated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (portal !== "family" && mode === "signup") setMode("signin");
  }, [portal, mode]);

  useEffect(() => {
    let active = true;

    async function redirectAuthenticatedUser() {
      // Previously issued Auth links may still point to /auth. Preserve their
      // one-time fragment and complete password setup before entering a portal.
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const flow = hash.get("type");
      if (flow === "recovery" || flow === "invite") {
        window.location.replace(
          `/auth/complete?flow=${flow}&portal=${portal}${window.location.hash}`,
        );
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setAuthenticated(Boolean(data.session));
      if (!data.session) return;
      const destination = await resolvePostAuthDestination(portal);
      if (destination && active) await navigate({ to: destination, replace: true });
      else if (active && portal !== "family") {
        setError("Ce compte ne dispose pas de l’accès à cet espace. Vérifiez le rôle attribué par votre administrateur ou changez de compte.");
      }
    }

    void redirectAuthenticatedUser();
    return () => {
      active = false;
    };
  }, [navigate, portal]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setPendingConfirmationEmail(null);
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/auth/complete?flow=recovery&portal=${portal}`,
        });
        if (error) throw error;
        setNotice(
          "Si ce compte existe, un lien de réinitialisation vient d’être envoyé. Vérifiez aussi les courriers indésirables.",
        );
      } else if (mode === "signup") {
        const normalizedEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?portal=family`,
            data: { full_name: fullName || normalizedEmail.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.session) {
          setNotice(
            "Compte créé. L'organisation doit maintenant valider ton inscription avant l'accès aux cours.",
          );
        } else {
          setPendingConfirmationEmail(normalizedEmail);
          setNotice(
            "Si cette adresse est nouvelle, un email de confirmation vient d’être envoyé. Si tu as déjà un compte, utilise « J’ai déjà un compte ».",
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setAuthenticated(true);
        const destination = await resolvePostAuthDestination(portal);
        if (destination) await navigate({ to: destination, replace: true });
        else {
          setError(
            portal === "family"
              ? "Connexion réussie, mais votre compte ne dispose pas encore d’un accès famille ou élève actif."
              : "Connexion réussie, mais ce compte n’est pas autorisé à accéder à ce portail. Contactez votre administrateur.",
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmation() {
    if (!pendingConfirmationEmail) return;
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingConfirmationEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?portal=family`,
        },
      });
      if (error) throw error;
      setNotice(
        "Demande envoyée. Vérifie la boîte de réception et les courriers indésirables. L’envoi peut prendre quelques minutes.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de renvoyer l’email.");
    } finally {
      setResending(false);
    }
  }

  async function signInWithGoogle() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth?portal=${portal}` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div
      data-qa-ready={hydrated ? "true" : "false"}
      className="min-h-screen bg-[color:var(--cream)] px-5 py-10 text-foreground"
    >
      <div className="mx-auto w-full max-w-md md:max-w-2xl">
        <Link to="/" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          ← Diakspora Karanta
        </Link>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--gold-dark)]">
          {content.eyebrow}
        </p>
        <h1 className="mt-6 font-[family-name:var(--font-display-kid)] text-3xl font-bold text-[color:var(--deep-green)]">
          {mode === "signin"
            ? content.title
            : mode === "forgot"
              ? "Mot de passe oublié"
              : "Créer un compte famille"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? content.description
            : mode === "forgot"
              ? "Indiquez votre adresse e-mail pour recevoir un lien de réinitialisation."
              : "L'inscription sera ensuite validée par votre organisation."}
        </p>

        <form
          onSubmit={submit}
          className="mt-6 flex flex-col gap-4 rounded-3xl bg-card p-6 shadow-[var(--shadow-elegant)]"
        >
          {mode === "signup" && (
            <label className="flex flex-col gap-1 text-sm font-semibold text-[color:var(--anthracite)]">
              Prénom
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-xl border-2 border-[color:var(--cream-2)] bg-white px-4 py-3 text-base"
                placeholder="Yacoub"
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm font-semibold text-[color:var(--anthracite)]">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border-2 border-[color:var(--cream-2)] bg-white px-4 py-3 text-base"
              autoComplete="email"
            />
          </label>
          {mode !== "forgot" && (
            <label className="flex flex-col gap-1 text-sm font-semibold text-[color:var(--anthracite)]">
              Mot de passe
              <input
                type="password"
                required
                minLength={mode === "signup" ? 8 : 6}
                title={mode === "signup" ? "8 caractères minimum." : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border-2 border-[color:var(--cream-2)] bg-white px-4 py-3 text-base"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
              {mode === "signup" && (
                <span className="text-xs font-normal leading-5 text-muted-foreground">
                  8 caractères minimum. Choisis une phrase facile à retenir et difficile à deviner.
                </span>
              )}
            </label>
          )}

          {error && (
            <p className="rounded-xl bg-[color:var(--gold)]/20 px-3 py-2 text-sm text-[color:var(--anthracite)]">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-xl bg-[color:var(--deep-green)]/10 px-3 py-2 text-sm text-[color:var(--deep-green)]">
              {notice}
            </p>
          )}

          {mode === "signup" && pendingConfirmationEmail && (
            <button
              type="button"
              onClick={() => void resendConfirmation()}
              disabled={resending}
              className="min-h-11 rounded-xl border border-[color:var(--deep-green)]/30 px-4 text-sm font-semibold text-[color:var(--deep-green)] disabled:opacity-60"
            >
              {resending ? "Envoi en cours…" : "Renvoyer l’email de confirmation"}
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex min-h-[52px] items-center justify-center rounded-2xl bg-[color:var(--deep-green)] px-6 font-[family-name:var(--font-display-kid)] text-lg font-bold text-[color:var(--cream)] shadow-[var(--shadow-elegant)] disabled:opacity-60"
          >
            {loading
              ? "…"
              : mode === "signin"
                ? "Se connecter"
                : mode === "forgot"
                  ? "Recevoir le lien"
                  : "Créer mon compte"}
          </button>

          {mode === "signin" && googleOAuthEnabled ? (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              disabled={loading}
              className="min-h-12 rounded-xl border border-[color:var(--deep-green)]/30 px-4 text-sm font-semibold text-[color:var(--deep-green)] disabled:opacity-60"
            >
              Continuer avec Google
            </button>
          ) : null}

          {mode === "signin" ? (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(null);
                setNotice(null);
              }}
              className="text-center text-sm font-semibold text-[color:var(--deep-green)] underline underline-offset-4"
            >
              Mot de passe oublié ?
            </button>
          ) : mode === "forgot" ? (
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                setNotice(null);
              }}
              className="text-center text-sm font-semibold text-[color:var(--deep-green)] underline underline-offset-4"
            >
              Retour à la connexion
            </button>
          ) : null}

          {authenticated && mode === "signin" ? (
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                setAuthenticated(false);
                setError(null);
                setNotice("Vous pouvez maintenant vous connecter avec un autre compte.");
              }}
              className="min-h-11 text-center text-sm font-semibold text-[color:var(--deep-green)] underline underline-offset-4"
            >
              Se déconnecter et changer de compte
            </button>
          ) : null}

          {portal === "family" && mode !== "forgot" ? (
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setNotice(null);
                setPendingConfirmationEmail(null);
              }}
              className="text-center text-sm font-semibold text-[color:var(--deep-green)] underline underline-offset-4"
            >
              {mode === "signin" ? "Créer un compte famille" : "J'ai déjà un compte"}
            </button>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Les accès professeur et administration sont créés uniquement sur invitation.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
