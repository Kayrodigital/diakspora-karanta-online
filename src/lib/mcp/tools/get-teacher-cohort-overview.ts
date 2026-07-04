import { defineTool } from "@lovable.dev/mcp-js";
import {
  mockTeacher,
  mockCohorts,
  mockOverview,
  mockStudents,
  mockHomework,
  mockNextSession,
} from "../../../features/professeur/mock-data";

export default defineTool({
  name: "get_teacher_cohort_overview",
  title: "Get teacher's cohort overview",
  description:
    "Return the teacher's cohort snapshot: student attendance breakdown, per-student summaries, homework awaiting grading, and next Zoom session.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [
      {
        type: "text",
        text: `${mockCohorts[0].name} — ${mockOverview.totalStudents} students (${mockOverview.regular} regular, ${mockOverview.watch} to watch, ${mockOverview.risk} at risk). ${mockHomework.length} homework(s) to grade.`,
      },
    ],
    structuredContent: {
      teacher: mockTeacher,
      cohorts: mockCohorts,
      overview: mockOverview,
      students: mockStudents,
      homeworkQueue: mockHomework,
      nextSession: mockNextSession,
    },
  }),
});
