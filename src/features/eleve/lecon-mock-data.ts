// Mock data for the child lesson (video + quiz) screen.
// Structure ready to be replaced later by real queries
// (lessons, quizzes, quiz_results).

export type QuizQuestion = {
  id: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
};

export type LeconMock = {
  lessonTitle: string;
  durationSec: number;
  summary: string;
  videoEmoji: string;
  questions: QuizQuestion[];
  badgeEmoji: string;
  badgeName: string;
};

export const mockLecon: LeconMock = {
  lessonTitle: "Le pronom أنا",
  durationSec: 240,
  summary: "Aujourd'hui : le pronom أنا (« moi, je »).",
  videoEmoji: "🎥",
  badgeEmoji: "🏅",
  badgeName: "Petit explorateur des pronoms",
  questions: [
    {
      id: "q1",
      question: "Que veut dire أنا ?",
      choices: ["Toi (garçon)", "Moi / Je", "Nous"],
      correctIndex: 1,
      explanation: "أنا veut dire « moi » ou « je ».",
    },
    {
      id: "q2",
      question: "Que veut dire أنتَ ?",
      choices: ["Moi", "Toi (garçon)", "Elle"],
      correctIndex: 1,
      explanation: "أنتَ veut dire « toi » quand on parle à un garçon.",
    },
    {
      id: "q3",
      question: "Comment dit-on « Je suis un élève » ?",
      choices: ["أنتَ طالب", "أنا طالب", "هو طالب"],
      correctIndex: 1,
      explanation: "On dit أنا طالب : « Je suis un élève ».",
    },
    {
      id: "q4",
      question: "أنا commence par quelle lettre ?",
      choices: ["ب", "أ (alif)", "ن"],
      correctIndex: 1,
      explanation: "أنا commence par la lettre أ (alif).",
    },
    {
      id: "q5",
      question: "Quel pronom utilises-tu pour parler de toi ?",
      choices: ["أنا", "أنتَ", "هو"],
      correctIndex: 0,
      explanation: "Pour parler de toi-même, tu dis أنا.",
    },
  ],
};
