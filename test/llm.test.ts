import { describe, test, expect } from "bun:test";
import { getLocalHourLA, lateNightTomorrowNote } from "../src/llm.ts";

// Helper: create a Date that corresponds to a given America/Los_Angeles local time.
// All test dates are in January (PST = UTC-8), so we use a fixed -08:00 offset.
function laTime(year: number, month: number, day: number, hour: number, minute = 0): Date {
  const pad = (n: number) => String(n).padStart(2, "0");
  return new Date(`${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00-08:00`);
}

describe("getLocalHourLA", () => {
  test("midnight local time returns 0", () => {
    const d = laTime(2025, 1, 15, 0, 0); // 00:00 LA = 08:00 UTC
    expect(getLocalHourLA(d)).toBe(0);
  });

  test("1 AM local time returns 1", () => {
    const d = laTime(2025, 1, 15, 1, 30); // 01:30 LA
    expect(getLocalHourLA(d)).toBe(1);
  });

  test("2 AM local time returns 2", () => {
    const d = laTime(2025, 1, 15, 2, 59); // 02:59 LA
    expect(getLocalHourLA(d)).toBe(2);
  });

  test("3 AM local time returns 3", () => {
    const d = laTime(2025, 1, 15, 3, 0); // 03:00 LA
    expect(getLocalHourLA(d)).toBe(3);
  });

  test("noon local time returns 12", () => {
    const d = laTime(2025, 1, 15, 12, 0);
    expect(getLocalHourLA(d)).toBe(12);
  });

  test("11 PM local time returns 23", () => {
    const d = laTime(2025, 1, 15, 23, 0);
    expect(getLocalHourLA(d)).toBe(23);
  });
});

describe("lateNightTomorrowNote", () => {
  test("returns note at midnight (00:00)", () => {
    const d = laTime(2025, 1, 15, 0, 0);
    expect(lateNightTomorrowNote(d)).toContain("tomorrow");
    expect(lateNightTomorrowNote(d)).toContain("today");
  });

  test("returns note at 1 AM", () => {
    const d = laTime(2025, 1, 15, 1, 0);
    expect(lateNightTomorrowNote(d)).not.toBe("");
  });

  test("returns note at 2:59 AM", () => {
    const d = laTime(2025, 1, 15, 2, 59);
    expect(lateNightTomorrowNote(d)).not.toBe("");
  });

  test("returns empty string at exactly 3 AM", () => {
    const d = laTime(2025, 1, 15, 3, 0);
    expect(lateNightTomorrowNote(d)).toBe("");
  });

  test("returns empty string at 9 AM", () => {
    const d = laTime(2025, 1, 15, 9, 0);
    expect(lateNightTomorrowNote(d)).toBe("");
  });

  test("returns empty string at 11 PM", () => {
    const d = laTime(2025, 1, 15, 23, 0);
    expect(lateNightTomorrowNote(d)).toBe("");
  });
});
