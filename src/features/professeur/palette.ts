import type { AttendanceLevel } from "./mock-data";

/**
 * Shared non-alarmist palette for teacher dashboard.
 * Matches the parent dashboard's warm terracotta for "risk" rather than a bright red.
 */
export function getAttendancePalette(level: AttendanceLevel) {
  switch (level) {
    case "regular":
      return {
        bg: "color-mix(in oklab, var(--deep-green) 12%, var(--cream))",
        border: "color-mix(in oklab, var(--deep-green) 30%, transparent)",
        fg: "var(--deep-green)",
        dot: "var(--deep-green)",
      };
    case "watch":
      return {
        bg: "color-mix(in oklab, var(--gold) 20%, var(--cream))",
        border: "color-mix(in oklab, var(--gold-dark) 40%, transparent)",
        fg: "var(--gold-dark)",
        dot: "var(--gold-dark)",
      };
    case "risk":
    default:
      return {
        bg: "color-mix(in oklab, #b4553a 14%, var(--cream))",
        border: "color-mix(in oklab, #b4553a 45%, transparent)",
        fg: "#8a3f2a",
        dot: "#b4553a",
      };
  }
}
