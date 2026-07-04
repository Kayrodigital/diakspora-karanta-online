import { defineTool } from "@lovable.dev/mcp-js";
import { mockJuzAmmaPath, mockReviews } from "../../../features/eleve/mock-data";

export default defineTool({
  name: "get_student_progress",
  title: "Get student progress",
  description:
    "Return the child student's Juzʾ ʿAmma learning path (each surah with its status) and the reviews scheduled for today.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const done = mockJuzAmmaPath.filter((n) => n.status === "done").length;
    const total = mockJuzAmmaPath.length;
    return {
      content: [
        {
          type: "text",
          text: `Juzʾ ʿAmma progress: ${done}/${total} surahs done. Reviews today: ${mockReviews.length}.`,
        },
      ],
      structuredContent: {
        juzAmma: {
          done,
          total,
          nodes: mockJuzAmmaPath,
        },
        reviewsToday: mockReviews,
      },
    };
  },
});
