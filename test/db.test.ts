import { describe, test, expect, beforeEach } from "bun:test";

// Use in-memory SQLite for all tests
process.env["DB_PATH"] = ":memory:";

import * as db from "../src/db.ts";

describe("db", () => {
  beforeEach(() => {
    db._resetDb();
  });

  test("createReminder stores and retrieves a reminder", () => {
    const now = Date.now();
    const remindAt = now + 60_000;
    const r = db.createReminder({
      userId: "user1",
      guildId: "guild1",
      channelId: "chan1",
      message: "Buy milk",
      remindAt,
    });

    expect(r.id).toBeGreaterThan(0);
    expect(r.user_id).toBe("user1");
    expect(r.message).toBe("Buy milk");
    expect(r.remind_at).toBe(Math.floor(remindAt / 1000));
    expect(r.fired).toBe(0);
  });

  test("getUserReminders returns only unfired reminders for user", () => {
    const remindAt = Date.now() + 60_000;
    db.createReminder({ userId: "u1", guildId: null, channelId: "c", message: "A", remindAt });
    db.createReminder({ userId: "u1", guildId: null, channelId: "c", message: "B", remindAt });
    db.createReminder({ userId: "u2", guildId: null, channelId: "c", message: "C", remindAt });

    const u1 = db.getUserReminders("u1");
    expect(u1).toHaveLength(2);
    expect(u1.every((r) => r.user_id === "u1")).toBe(true);
  });

  test("cancelReminder marks fired and prevents listing", () => {
    const r = db.createReminder({
      userId: "u1",
      guildId: null,
      channelId: "c",
      message: "X",
      remindAt: Date.now() + 60_000,
    });
    expect(db.cancelReminder(r.id, "u1")).toBe(true);
    expect(db.getUserReminders("u1")).toHaveLength(0);
  });

  test("cancelReminder returns false for wrong user", () => {
    const r = db.createReminder({
      userId: "u1",
      guildId: null,
      channelId: "c",
      message: "X",
      remindAt: Date.now() + 60_000,
    });
    expect(db.cancelReminder(r.id, "u2")).toBe(false);
    expect(db.getUserReminders("u1")).toHaveLength(1);
  });

  test("updateReminder updates message and time", () => {
    const r = db.createReminder({
      userId: "u1",
      guildId: null,
      channelId: "c",
      message: "Old",
      remindAt: Date.now() + 60_000,
    });
    const newTime = Date.now() + 3_600_000;
    const updated = db.updateReminder(r.id, "u1", { message: "New", remindAt: newTime });
    expect(updated?.message).toBe("New");
    expect(updated?.remind_at).toBe(Math.floor(newTime / 1000));
  });

  test("getDueReminders returns reminders whose time has passed", () => {
    const past = Math.floor(Date.now() / 1000) - 5;
    db.getDb().run(
      "INSERT INTO reminders (user_id, channel_id, message, remind_at) VALUES (?, ?, ?, ?)",
      ["u1", "c", "Past", past]
    );
    const future = Math.floor(Date.now() / 1000) + 3600;
    db.getDb().run(
      "INSERT INTO reminders (user_id, channel_id, message, remind_at) VALUES (?, ?, ?, ?)",
      ["u1", "c", "Future", future]
    );

    const due = db.getDueReminders();
    expect(due).toHaveLength(1);
    expect(due[0]?.message).toBe("Past");
  });

  test("markFired prevents getDueReminders from returning reminder", () => {
    const past = Math.floor(Date.now() / 1000) - 5;
    const result = db.getDb().run(
      "INSERT INTO reminders (user_id, channel_id, message, remind_at) VALUES (?, ?, ?, ?)",
      ["u1", "c", "Past", past]
    );
    db.markFired(result.lastInsertRowid as number);
    expect(db.getDueReminders()).toHaveLength(0);
  });
});
