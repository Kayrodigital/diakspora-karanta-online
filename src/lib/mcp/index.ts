import { defineMcp } from "@lovable.dev/mcp-js";

import getStudentTodayLesson from "./tools/get-student-today-lesson";
import getStudentProgress from "./tools/get-student-progress";
import getParentWeeklySummary from "./tools/get-parent-weekly-summary";
import getTeacherCohortOverview from "./tools/get-teacher-cohort-overview";

export default defineMcp({
  name: "diakspora-karanta-mcp",
  title: "Diakspora Karanta MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools to inspect Diakspora Karanta dashboards: today's lesson and learning path for the child student, weekly summary for the parent, and cohort overview for the teacher. Data is currently mock; the schemas match the eventual database.",
  tools: [
    getStudentTodayLesson,
    getStudentProgress,
    getParentWeeklySummary,
    getTeacherCohortOverview,
  ],
});
