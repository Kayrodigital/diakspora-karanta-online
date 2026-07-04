// Mock data for the child catch-up (rattrapage) screen.
// Structure ready to be replaced later by real queries
// (catchup_plans, lessons, quizzes, homework_submissions).

export type RattrapageStepKind = "video" | "pdf" | "quiz" | "homework";

export type RattrapageStep = {
  id: string;
  kind: RattrapageStepKind;
  title: string;
  subtitle?: string;
  durationMin?: number;
  thumbnailEmoji?: string;
};

export type QuizQuestion = {
  id: string;
  question: string;
  choices: string[];
  correctIndex: number;
};

export type RattrapageLesson = {
  lessonTitle: string; // shown in header, warm phrasing
  steps: RattrapageStep[];
  quiz: QuizQuestion[];
  encouragement: string;
};

export const mockRattrapage: RattrapageLesson = {
  lessonTitle: "Rattrapage — Sourate Al-Ikhlas",
  encouragement:
    "Termine ces étapes pour reprendre ton parcours avec le groupe 💛",
  steps: [
    {
      id: "step-video",
      kind: "video",
      title: "Regarder le résumé vidéo",
      subtitle: "Un petit récap' de la leçon",
      durationMin: 4,
      thumbnailEmoji: "🎬",
    },
    {
      id: "step-pdf",
      kind: "pdf",
      title: "Lire la fiche",
      subtitle: "Fiche PDF à télécharger",
      thumbnailEmoji: "📄",
    },
    {
      id: "step-quiz",
      kind: "quiz",
      title: "Quiz de rattrapage",
      subtitle: "3 questions courtes",
      thumbnailEmoji: "✨",
    },
    {
      id: "step-homework",
      kind: "homework",
      title: "Petit devoir",
      subtitle: "Écris une phrase ou envoie une photo",
      thumbnailEmoji: "📝",
    },
  ],
  quiz: [
    {
      id: "q1",
      question: "Combien de versets contient la sourate Al-Ikhlas ?",
      choices: ["3 versets", "4 versets", "5 versets"],
      correctIndex: 1,
    },
    {
      id: "q2",
      question: "Que signifie « Al-Ikhlas » ?",
      choices: ["La lumière", "La sincérité", "L'ouverture"],
      correctIndex: 1,
    },
    {
      id: "q3",
      question: "Comment commence la sourate ?",
      choices: [
        "Qul huwa Allāhu aḥad",
        "Bismillāh ir-Raḥmān",
        "Al-ḥamdu lillāh",
      ],
      correctIndex: 0,
    },
  ],
};
