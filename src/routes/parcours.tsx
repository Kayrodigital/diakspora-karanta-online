import {
  type AccompanimentLanguage,
  type Audience,
  type Availability,
  type LearnerLevel,
  type Objective,
  type PreferredContact,
  loadPublicCohorts,
  submitEnrollmentApplication,
} from "@/features/enrollment/enrollment-data";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Clock3, Languages, UsersRound } from "lucide-react";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";

export const Route = createFileRoute("/parcours")({
  head: () => ({
    meta: [
      { title: "Trouver mon cours — Diakspora Karanta" },
      {
        name: "description",
        content:
          "Trouvez une classe adaptée à votre âge, votre objectif, votre niveau et vos disponibilités.",
      },
    ],
  }),
  component: ParcoursPage,
});

const audiences: Array<{ value: Audience; title: string; detail: string }> = [
  { value: "child", title: "Enfant · 6 à 13 ans", detail: "Classes mixtes, par âge et niveau" },
  { value: "teen_female", title: "Adolescente · 14 à 17 ans", detail: "Groupes filles" },
  { value: "teen_male", title: "Adolescent · 14 à 17 ans", detail: "Groupes garçons" },
  {
    value: "adult_female",
    title: "Femme · 18 ans et plus",
    detail: "Classes réservées aux femmes",
  },
  { value: "adult_male", title: "Homme · 18 ans et plus", detail: "Classes réservées aux hommes" },
];

const objectives: Array<{ value: Objective; title: string; detail: string }> = [
  {
    value: "arabic_literacy",
    title: "Lire et écrire l’arabe",
    detail: "Alphabet, sons et premiers mots",
  },
  {
    value: "arabic_language",
    title: "Progresser en langue arabe",
    detail: "Vocabulaire, grammaire et expression",
  },
  { value: "quran_tajwid", title: "Coran et tajwid", detail: "Lecture, mémorisation et règles" },
  {
    value: "islamic_studies",
    title: "Sciences islamiques",
    detail: "Fiqh, hadith, sira et histoire",
  },
  {
    value: "advanced_texts",
    title: "Textes avancés",
    detail: "Poésie, jurisprudence et textes classiques",
  },
];

const levels: Array<{ value: LearnerLevel; label: string }> = [
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced", label: "Avancé" },
  { value: "unsure", label: "Je ne sais pas encore" },
];
const availabilities: Array<{ value: Availability; label: string }> = [
  { value: "morning", label: "Matin" },
  { value: "daytime", label: "Journée" },
  { value: "evening", label: "Soir" },
  { value: "weekend", label: "Week-end" },
];
const languages: Array<{ value: AccompanimentLanguage; label: string }> = [
  { value: "fr", label: "Français" },
  { value: "ar", label: "Arabe" },
  { value: "diakhanke", label: "Diakhanké" },
];

const fieldClass =
  "min-h-12 w-full rounded-xl border border-[#CFC6B6] bg-white px-4 text-base outline-none transition focus:border-[#24613F] focus:ring-2 focus:ring-[#24613F]/20";

function ParcoursPage() {
  const [step, setStep] = useState(0);
  const [audience, setAudience] = useState<Audience | null>(null);
  const [objective, setObjective] = useState<Objective | null>(null);
  const [level, setLevel] = useState<LearnerLevel | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [language, setLanguage] = useState<AccompanimentLanguage | null>(null);
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [confirmationId, setConfirmationId] = useState<string | null>(null);
  const cohortsQuery = useQuery({
    queryKey: ["public-cohorts"],
    queryFn: loadPublicCohorts,
    staleTime: 300_000,
  });
  const matches = useMemo(
    () =>
      (cohortsQuery.data ?? []).filter(
        (cohort) =>
          cohort.audience === audience &&
          cohort.objective === objective &&
          (level === "unsure" || cohort.level === level) &&
          cohort.session_period === availability &&
          cohort.availability !== "closed" &&
          cohort.availability !== "full",
      ),
    [audience, availability, cohortsQuery.data, level, objective],
  );
  const application = useMutation({
    mutationFn: submitEnrollmentApplication,
    onSuccess: setConfirmationId,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!audience || !objective || !level || !availability || !language) return;
    const form = new FormData(event.currentTarget);
    application.mutate({
      cohortId,
      audience,
      objective,
      level,
      availability,
      accompanimentLanguage: language,
      applicantName: String(form.get("applicantName") ?? ""),
      learnerName:
        audience === "child" || audience.startsWith("teen_")
          ? String(form.get("learnerName") ?? "")
          : null,
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      preferredContact: String(form.get("preferredContact") ?? "whatsapp") as PreferredContact,
      notes: String(form.get("notes") ?? "") || null,
      privacyConsent: form.get("privacyConsent") === "on",
      website: String(form.get("website") ?? ""),
    });
  }

  if (confirmationId)
    return (
      <PageShell step={4}>
        <section className="mx-auto max-w-2xl rounded-3xl border border-[#C8D8CD] bg-white p-7 text-center shadow-sm sm:p-12">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#E7F2EA] text-[#24613F]">
            <Check className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-serif text-3xl font-semibold text-[#173F2B]">Demande reçue</h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-[#565A54]">
            Notre équipe vérifiera votre besoin et les places disponibles avant de vous proposer la
            classe adaptée. Aucun paiement ni compte n’est créé à cette étape.
          </p>
          <p className="mt-4 text-sm text-[#71766F]">Référence : {confirmationId.slice(0, 8)}</p>
          <Link
            to="/"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#173F2B] px-7 font-semibold text-white"
          >
            Retour à l’accueil
          </Link>
        </section>
      </PageShell>
    );

  return (
    <PageShell step={step}>
      {step > 0 && (
        <button
          type="button"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-semibold text-[#4F5A52] hover:text-[#173F2B]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Retour
        </button>
      )}
      {step === 0 && (
        <ChoiceStep
          eyebrow="Étape 1 sur 4"
          title="Pour qui cherchez-vous un cours ?"
          description="Ce choix détermine l’organisation de la classe."
          options={audiences}
          value={audience}
          onSelect={(value) => {
            setAudience(value);
            setCohortId(null);
            setStep(1);
          }}
        />
      )}
      {step === 1 && (
        <ChoiceStep
          eyebrow="Étape 2 sur 4"
          title="Quel est l’objectif principal ?"
          description="Choisissez le besoin le plus important aujourd’hui."
          options={objectives}
          value={objective}
          onSelect={(value) => {
            setObjective(value);
            setCohortId(null);
            setStep(2);
          }}
        />
      )}
      {step === 2 && (
        <section className="mx-auto max-w-3xl">
          <StepHeading
            eyebrow="Étape 3 sur 4"
            title="Précisons votre besoin"
            description="Trois réponses suffisent pour rechercher les classes compatibles."
          />
          <div className="mt-8 space-y-8 rounded-3xl border border-[#DDD4C3] bg-white p-6 shadow-sm sm:p-9">
            <ChoiceGroup
              label="Votre niveau actuel"
              options={levels}
              value={level}
              onChange={setLevel}
            />
            <ChoiceGroup
              label="Votre disponibilité habituelle"
              options={availabilities}
              value={availability}
              onChange={setAvailability}
            />
            <ChoiceGroup
              label="Langue d’accompagnement souhaitée"
              options={languages}
              value={language}
              onChange={setLanguage}
            />
            <button
              type="button"
              disabled={!level || !availability || !language}
              onClick={() => setStep(3)}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#173F2B] px-7 font-bold text-white hover:bg-[#24613F] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Voir les classes <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}
      {step === 3 && (
        <section className="mx-auto max-w-4xl">
          <StepHeading
            eyebrow="Étape 4 sur 4"
            title="Choisissez une classe ou demandez conseil"
            description="Seules les classes réellement ouvertes et compatibles sont affichées."
          />
          {cohortsQuery.isPending ? (
            <p className="mt-8 rounded-2xl border border-[#DDD4C3] bg-white p-6 text-center">
              Recherche des classes…
            </p>
          ) : cohortsQuery.isError ? (
            <p
              role="alert"
              className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"
            >
              Les classes ne peuvent pas être chargées pour le moment. Vous pouvez tout de même
              envoyer une demande générale ci-dessous.
            </p>
          ) : matches.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-[#E4D5B7] bg-[#FFF9EC] p-6 text-center">
              <h2 className="font-serif text-2xl font-semibold text-[#173F2B]">
                Aucune classe ouverte ne correspond exactement à vos critères
              </h2>
              <p className="mt-2 text-base leading-7 text-[#565A54]">
                Envoyez votre demande : l’équipe vérifiera les prochaines ouvertures et pourra vous
                proposer une alternative.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {matches.map((cohort) => (
                <button
                  type="button"
                  key={cohort.id}
                  onClick={() => setCohortId(cohort.id)}
                  className={`rounded-2xl border p-6 text-left transition ${cohortId === cohort.id ? "border-[#24613F] bg-[#EFF7F1] ring-2 ring-[#24613F]/20" : "border-[#DDD4C3] bg-white hover:border-[#8AA694]"}`}
                >
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#A35F25]">
                    {cohort.availability === "waitlist"
                      ? "Liste d’attente"
                      : "Inscriptions ouvertes"}
                  </span>
                  <strong className="mt-2 block font-serif text-2xl text-[#173F2B]">
                    {cohort.name}
                  </strong>
                  {cohort.public_summary && (
                    <span className="mt-2 block text-sm leading-6 text-[#565A54]">
                      {cohort.public_summary}
                    </span>
                  )}
                  <span className="mt-4 flex items-center gap-2 text-sm text-[#4F5A52]">
                    <Clock3 className="size-4" aria-hidden="true" /> {cohort.schedule_label}
                  </span>
                  <span className="mt-2 flex items-center gap-2 text-sm text-[#4F5A52]">
                    <Languages className="size-4" aria-hidden="true" />{" "}
                    {cohort.teaching_languages.join(", ")}
                  </span>
                  {cohort.remaining_places !== null && cohort.availability === "open" && (
                    <span className="mt-2 flex items-center gap-2 text-sm text-[#4F5A52]">
                      <UsersRound className="size-4" aria-hidden="true" /> {cohort.remaining_places}{" "}
                      place(s)
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          <ApplicationForm
            showLearnerName={audience === "child" || audience?.startsWith("teen_") === true}
            selectedCohort={Boolean(cohortId)}
            pending={application.isPending}
            error={Boolean(application.error)}
            onSubmit={submit}
          />
        </section>
      )}
    </PageShell>
  );
}

function PageShell({ step, children }: { step: number; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F4EA] text-[#242923]">
      <header className="border-b border-[#DDD4C3] bg-white/85 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="font-serif text-xl font-semibold text-[#173F2B]">
            Diakspora <span className="text-[#B7792B]">Karanta</span>
          </Link>
          <Link
            to="/auth"
            search={{ portal: "family" }}
            className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-[#173F2B]"
          >
            Se connecter
          </Link>
        </div>
      </header>
      <div className="h-1 bg-[#E6DED0]" aria-hidden="true">
        <div
          className="h-full bg-[#B7792B] transition-all"
          style={{ width: `${Math.min((step + 1) * 25, 100)}%` }}
        />
      </div>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">{children}</main>
    </div>
  );
}

function StepHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="text-center">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A35F25]">{eyebrow}</p>
      <h1 className="mt-3 font-serif text-3xl font-semibold text-[#173F2B] sm:text-5xl">{title}</h1>
      <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-[#62675F]">{description}</p>
    </header>
  );
}

function ChoiceStep<T extends string>({
  eyebrow,
  title,
  description,
  options,
  value,
  onSelect,
}: {
  eyebrow: string;
  title: string;
  description: string;
  options: Array<{ value: T; title: string; detail: string }>;
  value: T | null;
  onSelect: (value: T) => void;
}) {
  return (
    <section className="mx-auto max-w-4xl">
      <StepHeading eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`min-h-28 rounded-2xl border bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-[#8AA694] hover:shadow-md ${value === option.value ? "border-[#24613F] ring-2 ring-[#24613F]/20" : "border-[#DDD4C3]"}`}
          >
            <strong className="block font-serif text-xl text-[#173F2B]">{option.title}</strong>
            <span className="mt-2 block text-sm leading-6 text-[#62675F]">{option.detail}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-base font-bold text-[#28312B]">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 text-sm font-semibold ${value === option.value ? "border-[#24613F] bg-[#EFF7F1]" : "border-[#D8D0C1]"}`}
          >
            <input
              type="radio"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="size-4 accent-[#24613F]"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ApplicationForm({
  showLearnerName,
  selectedCohort,
  pending,
  error,
  onSubmit,
}: {
  showLearnerName: boolean;
  selectedCohort: boolean;
  pending: boolean;
  error: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 rounded-3xl border border-[#DDD4C3] bg-white p-6 shadow-sm sm:p-9"
    >
      <h2 className="font-serif text-2xl font-semibold text-[#173F2B]">
        {selectedCohort ? "Demander cette classe" : "Recevoir une proposition adaptée"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#62675F]">
        Un membre de l’équipe vérifiera votre demande avant toute inscription.
      </p>
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <FormField label="Votre nom complet" name="applicantName" autoComplete="name" />
        {showLearnerName && (
          <FormField label="Nom de l’élève" name="learnerName" autoComplete="off" />
        )}
        <FormField label="Adresse e-mail" name="email" type="email" autoComplete="email" />
        <FormField label="Téléphone / WhatsApp" name="phone" type="tel" autoComplete="tel" />
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Contact préféré</span>
          <select name="preferredContact" className={fieldClass} defaultValue="whatsapp">
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Téléphone</option>
            <option value="email">E-mail</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-semibold">Précision utile (facultatif)</span>
          <textarea name="notes" maxLength={1000} rows={4} className={`${fieldClass} py-3`} />
        </label>
        <label className="hidden" aria-hidden="true">
          Site web
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#565A54]">
        <input
          required
          name="privacyConsent"
          type="checkbox"
          className="mt-1 size-5 accent-[#24613F]"
        />
        <span>
          J’accepte que mes informations soient utilisées pour traiter cette demande d’inscription.
        </span>
      </label>
      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          La demande n’a pas pu être envoyée. Vérifiez les informations puis réessayez.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#173F2B] px-7 font-bold text-white hover:bg-[#24613F] disabled:opacity-50"
      >
        {pending ? "Envoi en cours…" : "Envoyer ma demande"}
      </button>
      <p className="mt-3 text-center text-xs leading-5 text-[#777B75]">
        Cette demande ne garantit pas une place et ne déclenche aucun paiement.
      </p>
    </form>
  );
}

function FormField({
  label,
  name,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      <input required name={name} type={type} autoComplete={autoComplete} className={fieldClass} />
    </label>
  );
}
