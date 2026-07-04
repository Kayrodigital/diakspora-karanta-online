import { defineTool } from "@lovable.dev/mcp-js";
import {
  mockParent,
  mockChildren,
  mockWeekly,
  mockAttendance,
  mockJuz,
  mockRecommendations,
  mockNextStep,
} from "../../../features/parent/mock-data";

export default defineTool({
  name: "get_parent_weekly_summary",
  title: "Get parent's weekly summary",
  description:
    "Return the parent's overview: children, attendance status, weekly stats (lessons, minutes, memorized surahs, homework), and next scheduled step.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [
      {
        type: "text",
        text: `Weekly summary for ${mockParent.firstName}: ${mockChildren.length} child(ren), attendance "${mockAttendance.level}".`,
      },
    ],
    structuredContent: {
      parent: mockParent,
      children: mockChildren,
      attendance: mockAttendance,
      weeklySummary: mockWeekly,
      juzAmma: mockJuz,
      recommendations: mockRecommendations,
      nextStep: mockNextStep,
    },
  }),
});
