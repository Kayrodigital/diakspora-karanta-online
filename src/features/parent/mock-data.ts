// Mock data for the parent dashboard.
// Structure mirrors what will later come from the database
// (users, cohorts, attendance, regularity_score, alerts, catchup_plans,
// progress, homework_submissions, zoom_sessions, certificates).

export type Parent = {
  firstName: string;
  lastName: string;
};

export type Child = {
  id: string;
  firstName: string;
  cohortName: string;
  groupLabel: string;
};

export type AttendanceLevel = "regular" | "watch" | "risk";

export type AttendanceStatus = {
  level: AttendanceLevel;
  label: string; // "Régulier" / "À surveiller" / "Risque de décrochage"
  reason?: string; // shown only when watch or risk
};

export type WeeklySummary = {
  lessonsCompleted: string; // "4/5"
  learningTime: string; // "42 min"
  surahsMemorized: number;
  homeworkSubmitted: string; // "3/3"
};

export type JuzProgress = {
  done: number;
  total: number;
};

export type Recommendation = {
  id: string;
  emoji: string;
  message: string;
};

export type NextStep = {
  zoomDate: string; // human-friendly
  zoomTime: string;
  zoomTopic: string;
  zoomUrl?: string;
  nextModuleTitle: string;
};

export const mockParent: Parent = {
  firstName: "Fatoumata",
  lastName: "Diallo",
};

export const mockChildren: Child[] = [
  {
    id: "c1",
    firstName: "Yacoub",
    cohortName: "Promotion Étoile",
    groupLabel: "Groupe 2",
  },
];

export const mockAttendance: AttendanceStatus = {
  level: "watch",
  label: "À surveiller",
  reason: "2 séances manquées cette semaine.",
};

export const mockWeekly: WeeklySummary = {
  lessonsCompleted: "4/5",
  learningTime: "42 min",
  surahsMemorized: 2,
  homeworkSubmitted: "3/3",
};

export const mockJuz: JuzProgress = { done: 4, total: 8 };

export const mockRecommendations: Recommendation[] = [
  {
    id: "r1",
    emoji: "💛",
    message:
      "Yacoub a manqué la révision de mardi — un petit rappel ce soir l'aiderait beaucoup.",
  },
  {
    id: "r2",
    emoji: "🌱",
    message:
      "Encouragez-le à réciter Sourate An-Nasr à voix haute avant le prochain cours.",
  },
];

export const mockNextStep: NextStep = {
  zoomDate: "Samedi 11 juillet",
  zoomTime: "10h00",
  zoomTopic: "Séance de récitation collective",
  zoomUrl: "#",
  nextModuleTitle: "Module 3 · Les règles du Tajwid (introduction)",
};
