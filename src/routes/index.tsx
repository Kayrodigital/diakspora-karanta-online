import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Check,
  ChevronDown,
  CirclePlay,
  FileCheck2,
  Flame,
  GraduationCap,
  Headphones,
  Menu,
  MessageCircleMore,
  Play,
  ShoppingBag,
  Sparkles,
  UsersRound,
  Video,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Diakspora Karanta — Apprendre, pratiquer et transmettre" },
      {
        name: "description",
        content:
          "Cours d’arabe et de sciences islamiques en direct et en vidéo, exercices, quiz et suivi pédagogique pour les enfants, les adultes et les familles.",
      },
    ],
  }),
});

const learningPaths = [
  {
    eyebrow: "Commencer",
    title: "Lire et écrire l’arabe",
    description:
      "Découvrir les lettres, les sons et les premiers mots grâce à une progression guidée.",
    color: "#387149",
    icon: BookOpen,
  },
  {
    eyebrow: "Approfondir",
    title: "Comprendre la langue",
    description: "Développer son vocabulaire et étudier les règles qui donnent accès aux textes.",
    color: "#B56E26",
    icon: BookMarked,
  },
  {
    eyebrow: "Étudier",
    title: "Sciences islamiques",
    description: "Avancer dans des enseignements structurés, accompagnés par un professeur.",
    color: "#355F72",
    icon: GraduationCap,
  },
] as const;

const features = [
  {
    icon: Video,
    title: "Directs et replays",
    text: "Suivre le cours au bon moment ou le revoir à son rythme.",
  },
  {
    icon: Headphones,
    title: "Vidéos, audios et PDF",
    text: "Retrouver toutes les ressources d’une leçon au même endroit.",
  },
  {
    icon: FileCheck2,
    title: "Quiz et évaluations",
    text: "Vérifier ce qui est acquis et identifier ce qui doit être retravaillé.",
  },
  {
    icon: MessageCircleMore,
    title: "Un vrai suivi",
    text: "Poser une question, envoyer un devoir vocal et recevoir une correction.",
  },
] as const;

const faqs = [
  {
    question: "À qui s’adressent les parcours Karanta ?",
    answer:
      "Les parcours sont conçus pour les enfants, les adultes et les familles. Chacun retrouve dans son espace les cours correspondant à sa classe et à son niveau.",
  },
  {
    question: "Comment se déroule un cours ?",
    answer:
      "Une leçon peut réunir une vidéo, un direct, un replay, des audios, des documents, des notes personnelles et une activité de validation. Le professeur choisit les éléments adaptés à son enseignement.",
  },
  {
    question: "Puis-je suivre les cours sur mon téléphone ?",
    answer:
      "Oui. L’espace a été pensé en priorité pour le mobile et reste accessible sur tablette et ordinateur.",
  },
  {
    question: "Les parents peuvent-ils suivre la progression ?",
    answer:
      "Oui. L’espace famille permet de suivre les cours, les résultats et la progression de chaque enfant rattaché au compte.",
  },
  {
    question: "Comment les classes sont-elles organisées ?",
    answer:
      "Les enfants de 6 à 13 ans suivent des classes mixtes. À partir de 14 ans, les classes sont organisées en groupes filles ou garçons, puis en groupes femmes ou hommes à partir de 18 ans.",
  },
] as const;

const featuredPaths = [
  { title: "Coran & Tajwid", to: "/apprendre", dark: true },
  { title: "Jurisprudence", to: "/apprendre", dark: false },
  { title: "Langue arabe", to: "/apprendre", dark: false },
  { title: "Croyance & Tawhid", to: "/apprendre", dark: true },
  { title: "Majliss", to: "/majliss", dark: true },
] as const;

function Home() {
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const callbackType = fragment.get("type");
    const hasCallback =
      callbackType === "recovery" ||
      callbackType === "invite" ||
      fragment.has("access_token") ||
      fragment.has("error_code") ||
      query.has("code");
    if (!hasCallback) return;
    const flow = callbackType === "invite" ? "invite" : "recovery";
    window.location.replace(
      `/auth/complete?flow=${flow}${query.has("code") ? `&code=${encodeURIComponent(query.get("code") ?? "")}` : ""}${window.location.hash}`,
    );
  }, []);

  return (
    <div className="min-h-screen overflow-hidden bg-[#F8F5ED] text-[#213D34]">
      <PublicHeader />

      <main>
        <section className="bg-[#103F30] text-white" aria-labelledby="karanta-hero-title">
          <div className="mx-auto grid max-w-[1440px] lg:h-[535px] lg:grid-cols-[52%_48%]">
            <div className="relative isolate px-[22px] pb-7 pt-9 sm:px-10 lg:px-[60px] lg:py-11">
              <div
                aria-hidden
                className="pointer-events-none absolute right-5 top-0 -z-10 flex flex-col gap-1 opacity-35 lg:right-auto lg:left-0 lg:grid lg:grid-cols-2"
              >
                {Array.from({ length: 12 }, (_, index) => (
                  <span key={index} className={index > 3 ? "hidden lg:block" : "block"}>
                    <img
                      src="/brands/diakspora/landing/karanta-ornament.svg"
                      alt=""
                      width="97"
                      height="113"
                      className="origin-top-left scale-[0.6]"
                    />
                  </span>
                ))}
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#C59A54]">
                L’héritage vivant
              </p>
              <h1
                id="karanta-hero-title"
                className="mt-8 max-w-[670px] text-[clamp(2rem,4vw,3.15rem)] font-bold leading-[1.14] tracking-tight"
              >
                Le savoir se reçoit,
                <br />
                se pratique et <span className="text-[#C59A54]">se transmet.</span>
              </h1>
              <p className="mt-6 max-w-[35rem] text-sm leading-7 text-white/90 sm:text-base">
                Une école numérique enracinée dans la tradition, pensée pour les familles
                d’aujourd’hui.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-5">
                <Link
                  to="/apprendre"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[9px] bg-[#C59A54] px-6 text-sm font-bold text-[#0A3026] transition hover:bg-[#E4C17F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
                >
                  Découvrir les cours <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link
                  to="/majliss"
                  className="hidden min-h-12 items-center text-sm font-semibold text-white underline-offset-4 hover:underline sm:inline-flex"
                >
                  Écouter Majliss →
                </Link>
              </div>
            </div>
            <div className="px-[22px] pb-6 sm:px-10 lg:relative lg:min-h-0 lg:p-0">
              <img
                src="/brands/diakspora/landing/karanta-hero.webp"
                alt="Un enseignant dans un cercle d’apprentissage avec des enfants"
                className="aspect-[346/175] w-full object-cover object-center lg:absolute lg:inset-0 lg:aspect-auto lg:h-full lg:object-top"
                fetchPriority="high"
              />
            </div>
          </div>
        </section>

        <section
          className="bg-[#F8F5ED] px-[22px] py-10 sm:px-10 lg:py-16"
          aria-labelledby="featured-paths-title"
        >
          <div className="mx-auto max-w-[1320px]">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9A7439]">
              Explorer Karanta
            </p>
            <h2
              id="featured-paths-title"
              className="mt-2 text-2xl font-bold text-[#103F30] sm:text-4xl"
            >
              Nos disciplines
            </h2>
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5 lg:gap-5">
              {featuredPaths.map(({ title, to, dark }) => (
                <Link
                  key={title}
                  to={to}
                  className={`group flex min-h-32 flex-col justify-between p-4 transition hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#103F30] lg:min-h-56 ${dark ? "bg-[#103F30] text-white" : "bg-[#EDE5D4] text-[#103F30]"}`}
                >
                  <span aria-hidden className="text-3xl font-light text-[#C59A54]">
                    ✧
                  </span>
                  <span className="flex items-end justify-between gap-2 text-sm font-bold sm:text-lg">
                    {title}
                    <ArrowRight
                      className="hidden size-4 shrink-0 transition group-hover:translate-x-1 lg:block"
                      aria-hidden
                    />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="methode" className="relative py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:px-12">
            <div className="relative mx-auto max-w-[540px]">
              <div className="absolute -inset-5 rounded-[40px] border border-[#D7B969]/55" />
              <img
                src="/brands/diakspora/landing/karanta-roots.webp"
                alt="Des enfants réunis dans un cercle d’apprentissage en Afrique de l’Ouest"
                className="relative aspect-square w-full rounded-[34px] bg-[#F0E3C5] object-cover shadow-[0_24px_60px_rgba(66,48,23,0.16)]"
                loading="lazy"
              />
            </div>
            <div className="lg:pl-10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B56E26]">
                Nos racines, notre vision
              </p>
              <h2 className="mt-4 max-w-xl font-serif text-4xl font-semibold leading-tight text-[#173F2B] sm:text-5xl">
                Retrouver l’esprit du cercle d’apprentissage.
              </h2>
              <p className="mt-6 text-base leading-8 text-[#565A54]">
                En Afrique de l’Ouest, <strong className="text-[#292D28]">Karanta</strong> désigne
                un cercle d’apprentissage : un temps où l’on écoute, répète, questionne et transmet.
                Diakspora fait vivre cet héritage dans un environnement numérique adapté aux
                familles d’aujourd’hui.
              </p>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  "Une progression claire",
                  "Un professeur accessible",
                  "Des savoirs mis en pratique",
                  "Un suivi visible par la famille",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-semibold">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#E4F0E6] text-[#387149]">
                      <Check className="size-4" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="parcours" className="bg-[#EFE5CF] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B56E26]">
                Chacun avance à son niveau
              </p>
              <h2 className="mt-4 font-serif text-4xl font-semibold text-[#173F2B] sm:text-5xl">
                Des parcours pour apprendre durablement
              </h2>
              <p className="mt-5 leading-7 text-[#5F625C]">
                Des premiers pas jusqu’à l’étude approfondie, les cours sont organisés pour rendre
                la prochaine étape toujours compréhensible.
              </p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {learningPaths.map(({ eyebrow, title, description, color, icon: Icon }) => (
                <article
                  key={title}
                  className="group rounded-[28px] border border-[#D8C8A8] bg-[#FFFDF7] p-7 shadow-[0_12px_35px_rgba(74,54,26,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(74,54,26,0.11)]"
                  style={{ borderTopColor: color, borderTopWidth: 4 }}
                >
                  <div
                    className="grid size-12 place-items-center rounded-2xl text-white"
                    style={{ backgroundColor: color }}
                  >
                    <Icon className="size-6" />
                  </div>
                  <p
                    className="mt-7 text-xs font-bold uppercase tracking-[0.16em]"
                    style={{ color }}
                  >
                    {eyebrow}
                  </p>
                  <h3 className="mt-2 font-serif text-2xl font-semibold text-[#252A25]">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#676B64]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B56E26]">
                  Aperçu des enseignements
                </p>
                <h2 className="mt-4 font-serif text-4xl font-semibold text-[#173F2B] sm:text-5xl">
                  Entrez dans une leçon
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-[#656961]">
                Chaque leçon rassemble l’essentiel : objectifs, vidéo, ressources, notes, questions
                et validation des acquis.
              </p>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <CoursePreview
                eyebrow="Langue arabe"
                title="Les lettres solaires et lunaires"
                description="Comprendre leur différence, les reconnaître et s’entraîner à les prononcer."
                image="/brands/diakspora/categories/alphabet-arabe.webp"
                color="#387149"
              />
              <CoursePreview
                eyebrow="Mukhtasar Al-Akhdari"
                title="L’eau pure et purifiante"
                description="Découvrir la notion de pureté à travers les deux premières leçons du parcours."
                image="/brands/diakspora/categories/fiqh.webp"
                color="#B56E26"
              />
            </div>
          </div>
        </section>

        <section id="fonctionnalites" className="bg-[#173F2B] py-20 text-[#FFF9EC] sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E5B95C]">
                  Une pédagogie mesurable
                </p>
                <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
                  Savoir où l’on en est pour mieux avancer.
                </h2>
                <p className="mt-6 leading-7 text-white/70">
                  L’élève ne se contente pas de regarder un cours. Il pratique, s’évalue, reçoit un
                  retour et voit les compétences qu’il maîtrise progressivement.
                </p>
                <div className="mt-8 rounded-3xl border border-white/15 bg-white/5 p-5">
                  <div className="flex items-center gap-3">
                    <Sparkles className="size-5 text-[#E5B95C]" />
                    <span className="font-semibold">Progression et bulletin</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/65">
                    Résultats, points maîtrisés et appréciations réunis dans un suivi lisible.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {features.map(({ icon: Icon, title, text }) => (
                  <article
                    key={title}
                    className="rounded-[26px] border border-white/12 bg-white/[0.07] p-6"
                  >
                    <div className="grid size-11 place-items-center rounded-2xl bg-[#E5B95C] text-[#173F2B]">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="mt-5 font-serif text-2xl font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/65">{text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B56E26]">
                La méthode Karanta
              </p>
              <h2 className="mt-4 font-serif text-4xl font-semibold text-[#173F2B] sm:text-5xl">
                Un chemin simple, du cours à la maîtrise
              </h2>
            </div>
            <div className="relative mt-14 grid gap-8 md:grid-cols-3">
              {[
                {
                  number: "01",
                  icon: CirclePlay,
                  title: "J’apprends",
                  text: "Je suis ma leçon, en direct ou en replay, avec toutes ses ressources.",
                },
                {
                  number: "02",
                  icon: FileCheck2,
                  title: "Je pratique",
                  text: "Je prends des notes, réponds au quiz et dépose mes exercices.",
                },
                {
                  number: "03",
                  icon: GraduationCap,
                  title: "Je progresse",
                  text: "Je reçois une correction et valide progressivement chaque compétence.",
                },
              ].map(({ number, icon: Icon, title, text }) => (
                <article key={number} className="relative text-center">
                  <span className="font-serif text-6xl font-semibold text-[#E7D8BA]">{number}</span>
                  <div className="mx-auto -mt-4 grid size-14 place-items-center rounded-full border-4 border-[#FBF7ED] bg-[#B56E26] text-white shadow-lg">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="mt-5 font-serif text-2xl font-semibold text-[#173F2B]">{title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#646861]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#D8C8A8] bg-[#F3E8D3] py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:px-8 md:grid-cols-2 lg:px-12">
            <AudienceCard
              icon={UsersRound}
              title="Pour les familles"
              text="Un seul compte pour suivre chaque enfant, retrouver ses cours, ses prochains directs, ses devoirs et ses résultats."
              portal="family"
              link="Espace familles et élèves"
              color="#387149"
            />
            <AudienceCard
              icon={GraduationCap}
              title="Pour les professeurs"
              text="Organiser ses classes, programmer ses directs, partager ses ressources et accompagner chaque élève dans un cadre clair."
              portal="teacher"
              link="Espace professeurs"
              color="#B56E26"
            />
          </div>
        </section>

        <section id="librairie" className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="relative overflow-hidden rounded-[36px] bg-[#B56E26] px-6 py-12 text-white shadow-[0_24px_60px_rgba(95,55,19,0.2)] sm:px-12 lg:px-16">
              <div
                aria-hidden
                className="absolute -right-16 -top-20 size-72 rounded-full border-[45px] border-white/10"
              />
              <div className="relative grid items-center gap-9 md:grid-cols-[1fr_auto]">
                <div className="flex gap-5">
                  <div className="hidden size-14 shrink-0 place-items-center rounded-2xl bg-white/15 sm:grid">
                    <ShoppingBag className="size-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FFE3AD]">
                      La librairie Diakspora
                    </p>
                    <h2 className="mt-3 max-w-2xl font-serif text-4xl font-semibold leading-tight sm:text-5xl">
                      Prolonger l’apprentissage avec les ouvrages des cours.
                    </h2>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-white/80">
                      Retrouvez les livres et supports pédagogiques recommandés par les professeurs.
                    </p>
                  </div>
                </div>
                <Link
                  to="/boutique"
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-white px-7 font-bold text-[#854814] transition hover:-translate-y-0.5"
                >
                  Visiter la librairie <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#FFFDF7] py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B56E26]">
                Questions fréquentes
              </p>
              <h2 className="mt-4 font-serif text-4xl font-semibold text-[#173F2B]">
                Avant de commencer
              </h2>
            </div>
            <div className="mt-10 divide-y divide-[#DCCFB5] border-y border-[#DCCFB5]">
              {faqs.map(({ question, answer }) => (
                <details key={question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-semibold text-[#2A302A]">
                    {question}
                    <ChevronDown className="size-5 shrink-0 text-[#B56E26] transition group-open:rotate-180" />
                  </summary>
                  <p className="max-w-2xl pt-4 text-sm leading-7 text-[#666A63]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#E8D9BB] px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <Flame className="mx-auto size-8 text-[#B56E26]" />
            <h2 className="mt-5 font-serif text-4xl font-semibold text-[#173F2B] sm:text-5xl">
              Prêt à rejoindre le cercle d’apprentissage ?
            </h2>
            <p className="mx-auto mt-5 max-w-xl leading-7 text-[#5D625B]">
              Découvrez les parcours Diakspora Karanta et avancez avec un enseignement structuré,
              accessible et suivi.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/parcours"
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#173F2B] px-7 font-bold text-white"
              >
                Trouver mon cours <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/auth"
                search={{ portal: "family" }}
                className="inline-flex min-h-13 items-center justify-center rounded-full border border-[#173F2B]/30 px-7 font-semibold text-[#173F2B]"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="relative z-50 border-b border-white/20 bg-[#0A3026] text-white">
      <div className="mx-auto flex min-h-[64px] max-w-[1440px] items-center justify-between gap-5 px-[22px] sm:px-10 lg:px-[60px]">
        <Link to="/" className="flex items-center gap-3" aria-label="Accueil Diakspora Karanta">
          <span
            aria-hidden
            className="grid size-9 place-items-center border border-[#C59A54] text-lg text-[#C59A54]"
          >
            ✧
          </span>
          <span className="font-serif text-lg font-bold tracking-wide text-[#F8F5ED]">
            DIAKSPORA
          </span>
        </Link>
        <nav
          className="hidden items-center gap-7 text-sm font-semibold text-[#F8F5ED]/85 lg:flex"
          aria-label="Navigation principale"
        >
          <Link to="/" className="transition hover:text-[#C59A54]">
            Accueil
          </Link>
          <Link to="/apprendre" className="transition hover:text-[#C59A54]">
            Apprendre
          </Link>
          <Link to="/majliss" className="transition hover:text-[#C59A54]">
            Majliss
          </Link>
          <Link to="/boutique" className="transition hover:text-[#C59A54]">
            Boutique
          </Link>
          <Link
            to="/auth"
            search={{ portal: "family" }}
            className="transition hover:text-[#C59A54]"
          >
            Mon espace
          </Link>
        </nav>
        <div className="hidden items-center gap-3 sm:flex">
          <Link
            to="/parcours"
            className="inline-flex min-h-11 items-center rounded-[8px] bg-[#C59A54] px-5 text-sm font-bold text-[#0A3026] transition hover:bg-[#E4C17F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Explorer
          </Link>
        </div>
        <details className="group relative sm:hidden">
          <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-[8px] border border-white/40 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <Menu className="size-5" />
            <span className="sr-only">Ouvrir le menu</span>
          </summary>
          <nav
            aria-label="Navigation mobile"
            className="absolute right-0 top-14 grid w-64 gap-1 rounded-xl border border-[#D8C8A8] bg-[#FFFCF6] p-3 text-sm font-semibold text-[#103F30] shadow-2xl"
          >
            <Link to="/" className="rounded-lg px-4 py-3 hover:bg-[#EFE7D6]">
              Accueil
            </Link>
            <Link to="/apprendre" className="rounded-lg px-4 py-3 hover:bg-[#EFE7D6]">
              Apprendre
            </Link>
            <Link to="/majliss" className="rounded-lg px-4 py-3 hover:bg-[#EFE7D6]">
              Majliss
            </Link>
            <Link to="/boutique" className="rounded-lg px-4 py-3 hover:bg-[#EFE7D6]">
              Boutique
            </Link>
            <Link
              to="/auth"
              search={{ portal: "family" }}
              className="mt-1 rounded-lg bg-[#103F30] px-4 py-3 text-center text-white"
            >
              Mon espace
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

function CoursePreview({
  eyebrow,
  title,
  description,
  image,
  color,
}: {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  color: string;
}) {
  return (
    <article className="group overflow-hidden rounded-[30px] border border-[#D8C8A8] bg-[#FFFDF7] shadow-[0_14px_40px_rgba(63,48,25,0.08)]">
      <div>
        <div className="relative aspect-video overflow-hidden bg-[#EADCC0]">
          <BookOpen
            aria-hidden
            className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 text-[#9B855E]"
          />
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            loading="lazy"
          />
          <span
            className="absolute left-4 top-4 grid size-11 place-items-center rounded-full bg-white/90 shadow-lg"
            style={{ color }}
          >
            <Play className="ml-0.5 size-5 fill-current" />
          </span>
        </div>
        <div className="flex flex-col justify-center p-7 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color }}>
            {eyebrow}
          </p>
          <h3 className="mt-3 font-serif text-3xl font-semibold leading-tight text-[#242923]">
            {title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-[#656961]">{description}</p>
          <Link
            to="/auth"
            search={{ portal: "family" }}
            className="mt-6 inline-flex items-center gap-2 self-start font-bold"
            style={{ color }}
          >
            Accéder au cours <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function AudienceCard({
  icon: Icon,
  title,
  text,
  portal,
  link,
  color,
}: {
  icon: typeof GraduationCap;
  title: string;
  text: string;
  portal: "family" | "teacher";
  link: string;
  color: string;
}) {
  return (
    <article className="rounded-[28px] bg-[#FFFDF7] p-7 sm:p-9">
      <Icon className="size-8" style={{ color }} />
      <h2 className="mt-5 font-serif text-3xl font-semibold text-[#173F2B]">{title}</h2>
      <p className="mt-3 max-w-md text-sm leading-7 text-[#666A63]">{text}</p>
      <Link
        to="/auth"
        search={{ portal }}
        className="mt-6 inline-flex items-center gap-2 font-bold"
        style={{ color }}
      >
        {link} <ArrowRight className="size-4" />
      </Link>
    </article>
  );
}

function PublicFooter() {
  return (
    <footer className="bg-[#102E20] text-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-12">
        <div>
          <div className="flex items-center gap-3 text-white">
            <img src="/brands/diakspora/logo.webp" alt="" className="size-11 object-contain" />
            <span className="font-serif text-2xl font-semibold">Diakspora Karanta</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-6">
            Une école numérique enracinée dans la transmission, pensée pour apprendre ensemble et
            progresser durablement.
          </p>
        </div>
        <div>
          <p className="font-bold text-white">Découvrir</p>
          <div className="mt-4 grid gap-3 text-sm">
            <a href="#methode">Notre vision</a>
            <a href="#parcours">Les parcours</a>
            <Link to="/boutique">La librairie</Link>
          </div>
        </div>
        <div>
          <p className="font-bold text-white">Vos espaces</p>
          <div className="mt-4 grid gap-3 text-sm">
            <Link to="/auth" search={{ portal: "family" }}>
              Familles & élèves
            </Link>
            <Link to="/auth" search={{ portal: "teacher" }}>
              Professeurs
            </Link>
            <Link to="/auth" search={{ portal: "admin" }}>
              Administration
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/45">
        © 2026 Diakspora Karanta · Apprendre, pratiquer et transmettre
      </div>
    </footer>
  );
}
