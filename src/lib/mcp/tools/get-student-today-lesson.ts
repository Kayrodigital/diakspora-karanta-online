import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { mockStudent, mockTodaysLesson } from "../../../features/eleve/mock-data";

export default defineTool({
  name: "get_student_today_lesson",
  title: "Get today's lesson",
  description:
    "Return the current student's lesson of the day (title, subtitle, duration) along with their first name and cohort.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [
      {
        type: "text",
        text: `Today's lesson for ${mockStudent.firstName} (${mockStudent.cohortName}): ${mockTodaysLesson.title} — ${mockTodaysLesson.subtitle} (${mockTodaysLesson.durationMin} min).`,
      },
    ],
    structuredContent: {
      student: {
        firstName: mockStudent.firstName,
        cohortName: mockStudent.cohortName,
        groupLabel: mockStudent.groupLabel,
      },
      lesson: mockTodaysLesson,
    },
  }),
});
