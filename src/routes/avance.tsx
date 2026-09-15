import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/avance")({
  head: () => ({
    meta: [
      { title: "Parcours Avancé — Diakspora Karanta" },
      {
        name: "description",
        content:
          "Fiqh malikite, nahw et ṣarf, textes classiques. Al-Akhdari, Ar-Risāla, Al-Burda — enseignements validés par nos professeurs.",
      },
    ],
  }),
  component: AvancePage,
});

type Module = {
  id: string;
  title: string;
  titleArabic: string;
  discipline: string;
  author?: string;
  teacher: string;
  description: string;
};

const modules: Module[] = [
  {
    id: "akhdari",
    title: "Al-Akhdari",
    titleArabic: "المختصر الأخضري",
    discipline: "Fiqh malikite",
    author: "ʿAbd al-Raḥmān al-Akhḍarī (m. 983 H)",
    teacher: "El Hadj Amadou Diaby",
    description:
      "Manuel condensé du fiqh malikite : purification, prière et jeûne. Texte fondateur pour l'étudiant débutant en sciences juridiques.",
  },
  {
    id: "risala",
    title: "Ar-Risāla",
    titleArabic: "الرسالة",
    discipline: "Fiqh malikite",
    author: "Ibn Abī Zayd al-Qayrawānī (m. 386 H)",
    teacher: "El Hadj Amadou Diaby",
    description:
      "Épître doctrinale et juridique de référence dans l'école mālikite. ʿAqīda, ʿibādāt et muʿāmalāt exposées avec clarté et concision.",
  },
  {
    id: "burda",
    title: "Al-Burda",
    titleArabic: "قصيدة البردة",
    discipline: "Poésie · Adab",
    author: "Al-Būṣīrī (m. 696 H)",
    teacher: "El Hadj Tiguidanke Sankoum Diaby",
    description:
      "Poème d'éloge prophétique parmi les plus célèbres de la tradition islamique. Étude prosodique, lexicale et spirituelle.",
  },
];

function AvancePage() {
  const [openId, setOpenId] = useState<string>("akhdari");
  const active = modules.find((m) => m.id === openId) ?? modules[0];

  return (
    <div className="min-h-screen bg-[color:var(--cream)] text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <Link
          to="/parcours"
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"
        >
          ← Retour aux parcours
        </Link>

        <header className="mt-10 border-b border-border pb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--terracotta)]">
            Parcours Avancé
          </p>
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl text-[color:var(--anthracite)]">
            Sciences islamiques & langue arabe
          </h1>
          <p className="mt-3 text-lg text-muted-foreground font-serif italic">
            Fiqh malikite · Nahw et ṣarf · Textes classiques
          </p>
        </header>

        {/* Modules */}
        <section className="mt-12">
          <h2 className="font-serif text-2xl text-[color:var(--anthracite)]">Modules d'étude</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {modules.map((m) => {
              const isOpen = m.id === openId;
              return (
                <button
                  key={m.id}
                  onClick={() => setOpenId(m.id)}
                  className={`group text-left rounded-xl border p-6 transition-all ${
                    isOpen
                      ? "border-[color:var(--terracotta)] bg-card shadow-[var(--shadow-card)]"
                      : "border-border bg-card/60 hover:border-[color:var(--terracotta-hi)]"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--terracotta)]">
                    {m.discipline}
                  </p>
                  <h3 className="mt-2 font-serif text-2xl text-[color:var(--anthracite)]">
                    {m.title}
                  </h3>
                  <p dir="rtl" className="mt-1 font-arabic text-xl text-[color:var(--deep-green)]">
                    {m.titleArabic}
                  </p>
                  {m.author && (
                    <p className="mt-3 text-xs text-muted-foreground italic">{m.author}</p>
                  )}
                  <p className="mt-3 text-sm text-foreground/80 leading-relaxed">{m.description}</p>
                  <p className="mt-4 border-t border-border pt-3 text-xs text-[color:var(--anthracite)]">
                    <span className="text-muted-foreground">Enseignant · </span>
                    {m.teacher}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Reading sample */}
        <section className="mt-16">
          <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--terracotta)]">
            Extrait de lecture
          </p>
          <h2 className="mt-2 font-serif text-3xl text-[color:var(--anthracite)]">
            {active.title}
            <span className="text-muted-foreground"> · </span>
            <span className="font-serif italic text-2xl text-muted-foreground">
              {active.discipline}
            </span>
          </h2>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_260px]">
            <article className="rounded-2xl border border-border bg-card p-8 sm:p-10 shadow-[var(--shadow-card)]">
              <div
                dir="rtl"
                className="font-arabic text-2xl sm:text-3xl leading-[2.4] text-[color:var(--anthracite)]"
              >
                {active.id === "akhdari" && (
                  <>
                    فَرَائِضُ الوُضُوءِ سَبْعَةٌ: النِّيَّةُ عِنْدَ غَسْلِ الوَجْهِ، وَغَسْلُ
                    الوَجْهِ، وَغَسْلُ اليَدَيْنِ إِلَى المِرْفَقَيْنِ، وَمَسْحُ الرَّأْسِ، وَغَسْلُ
                    الرِّجْلَيْنِ إِلَى الكَعْبَيْنِ، وَالدَّلْكُ، وَالفَوْرُ.
                  </>
                )}
                {active.id === "risala" && (
                  <>
                    بَابُ مَا تَجِبُ بِهِ عَقِيدَةُ القَلْبِ مِمَّا نَطَقَ بِهِ اللِّسَانُ مِنْ
                    وَاجِبِ أُمُورِ الدِّيَانَاتِ.
                  </>
                )}
                {active.id === "burda" && (
                  <>
                    مَوْلَايَ صَلِّ وَسَلِّمْ دَائِمًا أَبَدًا
                    <br />
                    عَلَى حَبِيبِكَ خَيْرِ الخَلْقِ كُلِّهِمِ
                  </>
                )}
              </div>

              <div className="mt-8 border-t border-border pt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Traduction
                </p>
                <p className="mt-2 font-serif text-lg leading-relaxed text-foreground/90 italic">
                  {active.id === "akhdari" &&
                    "Les obligations de l'ablution sont au nombre de sept : l'intention au moment de laver le visage, le lavage du visage, le lavage des mains jusqu'aux coudes, l'essuyage de la tête, le lavage des pieds jusqu'aux chevilles, le frottement (dalk) et la continuité (fawr)."}
                  {active.id === "risala" &&
                    "Chapitre de ce qui est requis dans la croyance du cœur, parmi ce que la langue exprime des obligations de la religion."}
                  {active.id === "burda" &&
                    "Ô mon Seigneur, prie et salue à jamais sur Ton bien-aimé, le meilleur de toute la création."}
                </p>
              </div>

              <div className="mt-8 flex items-center gap-3 border-t border-border pt-5">
                <span className="inline-block h-1.5 w-6 rounded-full bg-[color:var(--terracotta)]" />
                <p className="text-xs text-[color:var(--anthracite)]">
                  <span className="text-muted-foreground">Validé par </span>
                  <span className="font-medium">{active.teacher}</span>
                  <span className="text-muted-foreground">
                    {" · "}
                    {active.discipline}
                  </span>
                </p>
              </div>
            </article>

            {/* Marginalia */}
            <aside className="relative">
              <div className="sticky top-8 rounded-xl border-l-2 border-[color:var(--terracotta)] bg-[color:var(--cream-2)]/40 p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--terracotta)]">
                  Note marginale
                </p>
                <p className="mt-3 font-serif text-base leading-relaxed text-foreground/90 italic">
                  {active.id === "akhdari" &&
                    "Le terme dalk (الدَّلْك) désigne le frottement de l'eau sur les membres — condition propre à l'école mālikite, distinguant celle-ci du rite shāfiʿite. Fawr (الفَوْر) impose l'enchaînement continu des lavages."}
                  {active.id === "risala" &&
                    "Ibn Abī Zayd ouvre son traité par la ʿaqīda avant les ʿibādāt : ordre pédagogique classique du curriculum mālikite. Notez l'accord tajibu / ʿaqīdatu al-qalbi (verbe féminin, sujet indéterminé annexé)."}
                  {active.id === "burda" &&
                    "Mètre baṣīṭ. La formule ṣalli wa-sallim relève du duʿāʾ prophétique ; le vocatif mawlāya introduit un ton d'humilité soutenu tout au long du poème."}
                </p>
              </div>
            </aside>
          </div>
        </section>

        <footer className="mt-16 border-t border-border pt-8">
          <Link
            to="/parcours"
            className="text-sm font-medium text-primary hover:text-[color:var(--deep-green-hi)]"
          >
            ← Retour aux parcours
          </Link>
        </footer>
      </div>
    </div>
  );
}
