import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/eleve", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/eleve",
            data: { full_name: fullName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        // If session exists (auto-confirm), navigate; else ask to check email
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session) navigate({ to: "/eleve", replace: true });
        else setNotice("Compte créé. Vérifie ton email pour confirmer.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/eleve", replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[color:var(--cream)] px-5 py-10 text-foreground">
      <div className="mx-auto max-w-md">
        <Link to="/" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          ← Diakspora Karanta
        </Link>
        <h1 className="mt-6 font-[family-name:var(--font-display-kid)] text-3xl font-bold text-[color:var(--deep-green)]">
          {mode === "signin" ? "Bon retour !" : "Créer ton compte"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Accède à ton espace élève.
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4 rounded-3xl bg-card p-6 shadow-[var(--shadow-elegant)]">
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
          <label className="flex flex-col gap-1 text-sm font-semibold text-[color:var(--anthracite)]">
            Mot de passe
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border-2 border-[color:var(--cream-2)] bg-white px-4 py-3 text-base"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </label>

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

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex min-h-[52px] items-center justify-center rounded-2xl bg-[color:var(--deep-green)] px-6 font-[family-name:var(--font-display-kid)] text-lg font-bold text-[color:var(--cream)] shadow-[var(--shadow-elegant)] disabled:opacity-60"
          >
            {loading ? "…" : mode === "signin" ? "Se connecter" : "Créer mon compte"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setNotice(null);
            }}
            className="text-center text-sm font-semibold text-[color:var(--deep-green)] underline underline-offset-4"
          >
            {mode === "signin" ? "Créer un compte" : "J'ai déjà un compte"}
          </button>
        </form>
      </div>
    </div>
  );
}
