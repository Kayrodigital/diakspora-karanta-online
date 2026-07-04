// Mock data for the teacher dashboard.
// Structure mirrors what will later come from the DB
// (teachers, cohorts, users, attendance, regularity_score,
// homework_submissions, zoom_sessions, alerts).

export type Teacher = {
  firstName: string;
  lastName: string;
};

export type Cohort = {
  id: string;
  name: string;
  groupLabel: string;
};

export type AttendanceLevel = "regular" | "watch" | "risk";

export type CohortOverview = {
  totalStudents: number;
  regular: number;
  watch: number;
  risk: number;
};

export type TeacherAction = {
  id: string;
  titleKey: "action_inactive" | "action_pending_grading" | "action_low_attendance";
  count: number;
  ctaKey: "cta_view" | "cta_grade" | "cta_contact";
};

export type StudentSummary = {
  id: string;
  firstName: string;
  attendance: AttendanceLevel;
  lastActivityDaysAgo: number; // 0 = today
  pendingHomework: number;
};

export type HomeworkItem = {
  id: string;
  studentFirstName: string;
  lessonTitle: string;
  submittedDaysAgo: number;
};

export type NextSession = {
  dateLabel: string; // localized human date
  timeLabel: string;
  topicKey: "session_recitation" | "session_tajwid";
  zoomUrl?: string;
};

export const mockTeacher: Teacher = {
  firstName: "Ahmad",
  lastName: "Benali",
};

export const mockCohorts: Cohort[] = [
  { id: "co1", name: "Promotion Étoile", groupLabel: "Groupe 2" },
];

export const mockOverview: CohortOverview = {
  totalStudents: 24,
  regular: 18,
  watch: 4,
  risk: 2,
};

export const mockActions: TeacherAction[] = [
  { id: "a1", titleKey: "action_inactive", count: 3, ctaKey: "cta_contact" },
  { id: "a2", titleKey: "action_pending_grading", count: 5, ctaKey: "cta_grade" },
  { id: "a3", titleKey: "action_low_attendance", count: 2, ctaKey: "cta_view" },
];

export const mockStudents: StudentSummary[] = [
  { id: "s1", firstName: "Yacoub",  attendance: "watch",   lastActivityDaysAgo: 2, pendingHomework: 1 },
  { id: "s2", firstName: "Amina",   attendance: "regular", lastActivityDaysAgo: 0, pendingHomework: 0 },
  { id: "s3", firstName: "Ibrahim", attendance: "risk",    lastActivityDaysAgo: 5, pendingHomework: 3 },
  { id: "s4", firstName: "Khadija", attendance: "regular", lastActivityDaysAgo: 1, pendingHomework: 0 },
  { id: "s5", firstName: "Souleymane", attendance: "watch", lastActivityDaysAgo: 3, pendingHomework: 2 },
];

export const mockHomework: HomeworkItem[] = [
  { id: "h1", studentFirstName: "Yacoub",  lessonTitle: "Sourate An-Nasr",   submittedDaysAgo: 4 },
  { id: "h2", studentFirstName: "Ibrahim", lessonTitle: "Lettres ص ض ط ظ",  submittedDaysAgo: 3 },
  { id: "h3", studentFirstName: "Souleymane", lessonTitle: "Al-Fatiha récitation", submittedDaysAgo: 2 },
];

export const mockNextSession: NextSession = {
  dateLabel: "Samedi 11 juillet",
  timeLabel: "10h00",
  topicKey: "session_recitation",
  zoomUrl: "#",
};
