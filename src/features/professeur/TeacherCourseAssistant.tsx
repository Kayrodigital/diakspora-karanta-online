import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  LoaderCircle,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TeacherCohort } from "./teacher-data";
import type { Lang } from "./i18n";
import {
  generateCourseDraft,
  saveTeacherCourseDraft,
  type CourseAssistantInput,
  type CourseDraft,
} from "./teacher-course-assistant-data";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  userId: string;
  cohorts: TeacherCohort[];
  lang: Lang;
  onCreated: (courseId: string) => void;
};

const copy = {
  fr: {
    title: "Créer un cours avec l’assistant",
    description: "Donnez l’essentiel. L’assistant prépare un brouillon que vous devrez relire.",
    step1: "Informations",
    step2: "Brouillon proposé",
    topic: "Sujet du cours",
    topicPlaceholder: "Ex. Les différentes catégories d’eau",
    level: "Niveau",
    levelPlaceholder: "Ex. Débutant",
    audience: "Public",
    audiencePlaceholder: "Ex. Adultes débutants",
    cohort: "Classe",
    language: "Langue du cours",
    lessons: "Nombre de leçons",
    sourceUrl: "Lien de référence (facultatif)",
    notes: "Notes ou contenu du professeur",
    notesPlaceholder: "Expliquez avec vos mots les éléments que le cours doit transmettre…",
    sourceHelp: "Ajoutez des notes ou un lien. L’IA ne doit pas inventer de contenu religieux.",
    generate: "Préparer avec l’IA",
    generating: "Préparation…",
    fallback: "Créer une trame sans IA",
    back: "Modifier",
    save: "Créer le brouillon",
    saving: "Création…",
    objectives: "Objectifs pédagogiques",
    module: "Module",
    lesson: "Leçon",
    homework: "Devoir proposé",
    quiz: "Question proposée",
    warning: "Validation du professeur obligatoire",
    emptyCohort: "Une classe doit vous être attribuée avant de créer un cours.",
    missing: "Renseignez le sujet, la classe et au moins une source ou des notes.",
  },
  ar: {
    title: "إنشاء دورة بمساعدة الذكاء الاصطناعي",
    description: "أدخل المعلومات الأساسية. سيُعِدّ المساعد مسودة يجب عليك مراجعتها.",
    step1: "المعلومات",
    step2: "المسودة المقترحة",
    topic: "موضوع الدورة",
    topicPlaceholder: "مثال: أقسام المياه وأحكامها",
    level: "المستوى",
    levelPlaceholder: "مثال: مبتدئ",
    audience: "الفئة المستهدفة",
    audiencePlaceholder: "مثال: الكبار المبتدئون",
    cohort: "الفوج",
    language: "لغة الدورة",
    lessons: "عدد الدروس",
    sourceUrl: "رابط المرجع (اختياري)",
    notes: "ملاحظات المعلم أو محتوى الدرس",
    notesPlaceholder: "اكتب بكلماتك العناصر التي تريد تعليمها للطلاب…",
    sourceHelp: "أضف ملاحظات أو رابطًا. لا يجوز للذكاء الاصطناعي اختراع محتوى ديني.",
    generate: "إعداد المسودة بالذكاء الاصطناعي",
    generating: "جارٍ الإعداد…",
    fallback: "إنشاء هيكل بدون الذكاء الاصطناعي",
    back: "تعديل",
    save: "إنشاء المسودة",
    saving: "جارٍ الإنشاء…",
    objectives: "الأهداف التعليمية",
    module: "الوحدة",
    lesson: "الدرس",
    homework: "الواجب المقترح",
    quiz: "السؤال المقترح",
    warning: "يجب على المعلم مراجعة المحتوى قبل النشر",
    emptyCohort: "يجب إسناد فوج إليك قبل إنشاء دورة.",
    missing: "أدخل الموضوع والفوج وملاحظات أو رابطًا مرجعيًا.",
  },
} as const;

function guidedDraft(input: CourseAssistantInput): CourseDraft {
  const isArabic = input.language === "ar";
  const notes = input.sourceNotes
    .split(/\n|[.!?؟]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
  const points = notes.length ? notes : [input.topic];
  return {
    title: input.topic,
    description: isArabic
      ? `مسودة دورة في ${input.topic} للمستوى ${input.level || "المبتدئ"}.`
      : `Brouillon de cours sur ${input.topic} pour un niveau ${input.level || "débutant"}.`,
    learningObjectives: isArabic
      ? [`فهم موضوع ${input.topic}`, "شرح المفاهيم الأساسية بكلمات بسيطة"]
      : [`Comprendre ${input.topic}`, "Expliquer les notions essentielles avec des mots simples"],
    moduleTitle: isArabic ? `مدخل إلى ${input.topic}` : `Introduction à ${input.topic}`,
    lessons: Array.from({ length: input.lessonCount }, (_, index) => ({
      title: isArabic
        ? `الدرس ${index + 1}: ${input.topic}`
        : `Leçon ${index + 1} — ${input.topic}`,
      summary: points[index % points.length],
      keyPoints: points,
      homework: isArabic
        ? "اطلب من الطالب تلخيص الدرس بكلماته. يجب على المعلم إكمال التعليمات."
        : "Demander à l’élève de résumer la leçon avec ses mots. Consigne à compléter par le professeur.",
      quiz: {
        prompt: isArabic
          ? `ما الفكرة الأساسية في درس ${input.topic}؟`
          : `Quelle est l’idée essentielle de la leçon sur ${input.topic} ?`,
        options: isArabic ? [points[0], "إجابة يضيفها المعلم"] : [points[0], "Réponse à compléter"],
        correctIndex: 0,
        explanation: isArabic
          ? "يجب على المعلم مراجعة الإجابة."
          : "Réponse à vérifier par le professeur.",
      },
    })),
    reviewWarning: isArabic
      ? "هذه مسودة آلية. تحقّق من جميع الأحكام والمراجع قبل النشر."
      : "Cette trame est automatique. Vérifiez toutes les règles et références avant publication.",
  };
}

export function TeacherCourseAssistant({
  open,
  onOpenChange,
  organizationId,
  userId,
  cohorts,
  lang,
  onCreated,
}: Props) {
  const uiLang = lang === "ar" ? "ar" : "fr";
  const c = copy[uiLang];
  const isRtl = uiLang === "ar";
  const [draft, setDraft] = useState<CourseDraft | null>(null);
  const [form, setForm] = useState<CourseAssistantInput>({
    organizationId,
    topic: "",
    level: "",
    audience: "",
    language: uiLang,
    lessonCount: 1,
    sourceNotes: "",
    sourceUrl: "",
  });
  const [cohortId, setCohortId] = useState(cohorts[0]?.id ?? "");
  const ai = useMutation({
    mutationFn: generateCourseDraft,
    onSuccess: setDraft,
    onError: (error) => toast.error(error.message),
  });
  const save = useMutation({
    mutationFn: (courseDraft: CourseDraft) =>
      saveTeacherCourseDraft({
        organizationId,
        userId,
        cohortId,
        language: form.language,
        level: form.level,
        sourceUrl: form.sourceUrl,
        draft: courseDraft,
      }),
    onSuccess: (courseId) => {
      toast.success(uiLang === "ar" ? "تم إنشاء المسودة." : "Brouillon créé.");
      onOpenChange(false);
      onCreated(courseId);
    },
    onError: (error) => toast.error(error.message),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.topic.trim() || !cohortId || (!form.sourceNotes.trim() && !form.sourceUrl.trim())) {
      toast.error(c.missing);
      return;
    }
    ai.mutate(form);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setDraft(null);
      }}
    >
      <DialogContent
        dir={isRtl ? "rtl" : "ltr"}
        className="max-h-[94vh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-3xl sm:max-w-2xl"
      >
        <DialogHeader className={isRtl ? "text-right" : "text-left"}>
          <div className="mb-2 flex items-center gap-2">
            <div className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <WandSparkles className="size-5" />
            </div>
            <Badge variant="secondary">{draft ? c.step2 : c.step1}</Badge>
          </div>
          <DialogTitle className="font-serif text-2xl">{c.title}</DialogTitle>
          <DialogDescription>{c.description}</DialogDescription>
        </DialogHeader>

        {!draft ? (
          <form onSubmit={submit} className="grid gap-4">
            {cohorts.length === 0 ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {c.emptyCohort}
              </p>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="assistant-topic">{c.topic}</Label>
              <Input
                id="assistant-topic"
                required
                value={form.topic}
                onChange={(event) =>
                  setForm((current) => ({ ...current, topic: event.target.value }))
                }
                placeholder={c.topicPlaceholder}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="assistant-level">{c.level}</Label>
                <Input
                  id="assistant-level"
                  value={form.level}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, level: event.target.value }))
                  }
                  placeholder={c.levelPlaceholder}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assistant-audience">{c.audience}</Label>
                <Input
                  id="assistant-audience"
                  value={form.audience}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, audience: event.target.value }))
                  }
                  placeholder={c.audiencePlaceholder}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assistant-cohort">{c.cohort}</Label>
                <select
                  id="assistant-cohort"
                  required
                  value={cohortId}
                  onChange={(event) => setCohortId(event.target.value)}
                  className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">—</option>
                  {cohorts.map((cohort) => (
                    <option key={cohort.id} value={cohort.id}>
                      {cohort.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assistant-language">{c.language}</Label>
                <select
                  id="assistant-language"
                  value={form.language}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      language: event.target.value as "fr" | "ar",
                    }))
                  }
                  className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="fr">Français</option>
                  <option value="ar">العربية</option>
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assistant-lessons">{c.lessons}</Label>
              <select
                id="assistant-lessons"
                value={form.lessonCount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, lessonCount: Number(event.target.value) }))
                }
                className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
              >
                {[1, 2, 3, 4].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assistant-source-url">{c.sourceUrl}</Label>
              <Input
                id="assistant-source-url"
                type="url"
                value={form.sourceUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sourceUrl: event.target.value }))
                }
                placeholder="https://…"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assistant-notes">{c.notes}</Label>
              <Textarea
                id="assistant-notes"
                rows={6}
                value={form.sourceNotes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sourceNotes: event.target.value }))
                }
                placeholder={c.notesPlaceholder}
              />
              <p className="text-xs leading-5 text-muted-foreground">{c.sourceHelp}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="submit"
                className="min-h-12 rounded-xl"
                disabled={ai.isPending || !cohortId}
              >
                {ai.isPending ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
                {ai.isPending ? c.generating : c.generate}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-12 rounded-xl"
                disabled={!form.topic.trim() || !cohortId}
                onClick={() => setDraft(guidedDraft(form))}
              >
                <BookOpenCheck /> {c.fallback}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            <Card className="border-primary/20 bg-primary/[0.03]">
              <CardContent className="p-5">
                <h3 className="font-serif text-2xl font-semibold">{draft.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{draft.description}</p>
                <h4 className="mt-5 text-sm font-semibold">{c.objectives}</h4>
                <ul className="mt-2 space-y-2 text-sm">
                  {draft.learningObjectives.map((objective) => (
                    <li key={objective} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> {objective}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {c.module}
              </p>
              <h3 className="mt-1 font-semibold">{draft.moduleTitle}</h3>
            </div>
            <div className="space-y-3">
              {draft.lessons.map((lesson, index) => (
                <Card key={`${lesson.title}-${index}`}>
                  <CardContent className="p-5">
                    <Badge variant="outline">
                      {c.lesson} {index + 1}
                    </Badge>
                    <h4 className="mt-3 font-semibold">{lesson.title}</h4>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{lesson.summary}</p>
                    <ul className="mt-3 space-y-1 text-sm">
                      {lesson.keyPoints.map((point) => (
                        <li key={point}>• {point}</li>
                      ))}
                    </ul>
                    <div className="mt-4 rounded-xl bg-muted/60 p-3 text-sm">
                      <strong>{c.homework} :</strong> {lesson.homework}
                    </div>
                    <div className="mt-2 rounded-xl bg-muted/60 p-3 text-sm">
                      <strong>{c.quiz} :</strong> {lesson.quiz.prompt}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <strong>{c.warning}.</strong> {draft.reviewWarning}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-12"
                onClick={() => setDraft(null)}
              >
                {isRtl ? <ArrowRight /> : <ArrowLeft />} {c.back}
              </Button>
              <Button
                className="min-h-12"
                disabled={save.isPending}
                onClick={() => save.mutate(draft)}
              >
                {save.isPending ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}
                {save.isPending ? c.saving : c.save}
                {!isRtl ? <ArrowRight /> : <ArrowLeft />}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
