import { supabase } from "@/integrations/supabase/client";

export type CourseDraftQuiz = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type CourseDraftLesson = {
  title: string;
  summary: string;
  keyPoints: string[];
  homework: string;
  quiz: CourseDraftQuiz;
};

export type CourseDraft = {
  title: string;
  description: string;
  learningObjectives: string[];
  moduleTitle: string;
  lessons: CourseDraftLesson[];
  reviewWarning: string;
};

export type CourseAssistantInput = {
  organizationId: string;
  topic: string;
  level: string;
  audience: string;
  language: "fr" | "ar";
  lessonCount: number;
  sourceNotes: string;
  sourceUrl: string;
};

function humanSlug(value: string): string {
  const base = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 54);
  return `${base || "cours"}-${Date.now().toString(36)}`;
}

export async function generateCourseDraft(input: CourseAssistantInput): Promise<CourseDraft> {
  const { data, error } = await supabase.functions.invoke("generate-course-draft", {
    body: input,
  });
  if (error) {
    const context = error.context as Response | undefined;
    if (context) {
      const body = (await context.json().catch(() => null)) as { error?: string } | null;
      if (body?.error) throw new Error(body.error);
    }
    throw error;
  }
  if (!data?.draft) throw new Error("L'assistant n'a pas renvoyé de brouillon.");
  return data.draft as CourseDraft;
}

export async function saveTeacherCourseDraft(input: {
  organizationId: string;
  userId: string;
  cohortId: string;
  language: "fr" | "ar";
  level: string;
  sourceUrl: string;
  draft: CourseDraft;
}): Promise<string> {
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .insert({
      organization_id: input.organizationId,
      created_by: input.userId,
      title: input.draft.title,
      slug: humanSlug(input.draft.title),
      description: input.draft.description,
      learning_objectives: input.draft.learningObjectives,
      level: input.level || null,
      language: input.language,
      access_scope: "cohort",
      status: "draft",
    })
    .select("id")
    .single();
  if (courseError) throw courseError;

  try {
    const { error: assignmentError } = await supabase.from("course_cohorts").insert({
      organization_id: input.organizationId,
      course_id: course.id,
      cohort_id: input.cohortId,
      assigned_by: input.userId,
    });
    if (assignmentError) throw assignmentError;

    const { data: courseModule, error: moduleError } = await supabase
      .from("course_modules")
      .insert({
        organization_id: input.organizationId,
        course_id: course.id,
        title: input.draft.moduleTitle,
        description: input.draft.description,
        order_index: 0,
        status: "draft",
      })
      .select("id")
      .single();
    if (moduleError) throw moduleError;

    for (const [lessonIndex, lessonDraft] of input.draft.lessons.entries()) {
      const { data: lesson, error: lessonError } = await supabase
        .from("lessons")
        .insert({
          organization_id: input.organizationId,
          course_id: course.id,
          module_id: courseModule.id,
          created_by: input.userId,
          title: lessonDraft.title,
          summary: lessonDraft.summary,
          content: {
            key_points: lessonDraft.keyPoints,
            homework: lessonDraft.homework,
            generated_with_ai: true,
            requires_teacher_review: true,
          },
          duration_minutes: 30,
          lesson_type: "on_demand",
          order_index: lessonIndex,
          status: "draft",
        })
        .select("id")
        .single();
      if (lessonError) throw lessonError;

      const resources: Array<{
        organization_id: string;
        lesson_id: string;
        created_by: string;
        title: string;
        description: string;
        resource_type: string;
        external_url: string | null;
        transcript: string;
        order_index: number;
        status: string;
      }> = [
        {
          organization_id: input.organizationId,
          lesson_id: lesson.id,
          created_by: input.userId,
          title: input.language === "ar" ? "البطاقة التربوية" : "Fiche pédagogique",
          description: lessonDraft.homework,
          resource_type: "text",
          external_url: null,
          transcript: lessonDraft.keyPoints.map((point) => `• ${point}`).join("\n"),
          order_index: 0,
          status: "active",
        },
      ];
      if (input.sourceUrl && lessonIndex === 0) {
        resources.push({
          organization_id: input.organizationId,
          lesson_id: lesson.id,
          created_by: input.userId,
          title: input.language === "ar" ? "المرجع الذي أضافه المعلم" : "Référence du professeur",
          description: "",
          resource_type: "link",
          transcript: "",
          order_index: 1,
          status: "active",
          external_url: input.sourceUrl,
        });
      }
      const { error: resourceError } = await supabase.from("lesson_resources").insert(resources);
      if (resourceError) throw resourceError;

      const quizDraft = lessonDraft.quiz;
      if (quizDraft.options.length >= 2 && quizDraft.options[quizDraft.correctIndex]) {
        const { data: quiz, error: quizError } = await supabase
          .from("quizzes")
          .insert({
            organization_id: input.organizationId,
            lesson_id: lesson.id,
            created_by: input.userId,
            title:
              input.language === "ar"
                ? `أسئلة — ${lessonDraft.title}`
                : `Quiz — ${lessonDraft.title}`,
            description: input.language === "ar" ? "مسودة يجب مراجعتها" : "Brouillon à relire",
            passing_score: 70,
            status: "draft",
          })
          .select("id")
          .single();
        if (quizError) throw quizError;

        const { data: question, error: questionError } = await supabase
          .from("quiz_questions")
          .insert({
            organization_id: input.organizationId,
            quiz_id: quiz.id,
            prompt: quizDraft.prompt,
            explanation: quizDraft.explanation,
            question_type: "single_choice",
            order_index: 0,
          })
          .select("id")
          .single();
        if (questionError) throw questionError;

        const { data: options, error: optionsError } = await supabase
          .from("quiz_options")
          .insert(
            quizDraft.options.map((label, index) => ({
              organization_id: input.organizationId,
              question_id: question.id,
              label,
              order_index: index,
            })),
          )
          .select("id, order_index");
        if (optionsError) throw optionsError;

        const { error: keysError } = await supabase.from("quiz_option_keys").insert(
          options.map((option) => ({
            organization_id: input.organizationId,
            option_id: option.id,
            is_correct: option.order_index === quizDraft.correctIndex,
          })),
        );
        if (keysError) throw keysError;
      }
    }
    return course.id;
  } catch (error) {
    await supabase.from("courses").delete().eq("id", course.id);
    throw error;
  }
}
