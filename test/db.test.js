const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

// Use an in-memory database for tests
process.env.DB_PATH = ":memory:";

const db = require("../src/db");

describe("db", () => {
  beforeEach(() => {
    // Reset in-memory DB between tests by closing and reopening
    try {
      db.getDb().close();
    } catch (err) {
      // Ignore "database already closed" on first run
      if (!err.message.includes("SQLITE_MISUSE")) throw err;
    }
    // Force re-init by clearing the module cache
    delete require.cache[require.resolve("../src/db")];
    Object.assign(db, require("../src/db"));
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

    assert.ok(r.id > 0);
    assert.equal(r.user_id, "user1");
    assert.equal(r.message, "Buy milk");
    assert.equal(r.remind_at, Math.floor(remindAt / 1000));
    assert.equal(r.fired, 0);
  });

  test("getUserReminders returns only unfired reminders for user", () => {
    const remindAt = Date.now() + 60_000;
    db.createReminder({ userId: "u1", guildId: null, channelId: "c", message: "A", remindAt });
    db.createReminder({ userId: "u1", guildId: null, channelId: "c", message: "B", remindAt });
    db.createReminder({ userId: "u2", guildId: null, channelId: "c", message: "C", remindAt });

    const u1 = db.getUserReminders("u1");
    assert.equal(u1.length, 2);
    assert.ok(u1.every((r) => r.user_id === "u1"));
  });

  test("cancelReminder marks fired and prevents listing", () => {
    const r = db.createReminder({
      userId: "u1", guildId: null, channelId: "c", message: "X",
      remindAt: Date.now() + 60_000,
    });
    const ok = db.cancelReminder(r.id, "u1");
    assert.equal(ok, true);
    assert.equal(db.getUserReminders("u1").length, 0);
  });

  test("cancelReminder returns false for wrong user", () => {
    const r = db.createReminder({
      userId: "u1", guildId: null, channelId: "c", message: "X",
      remindAt: Date.now() + 60_000,
    });
    const ok = db.cancelReminder(r.id, "u2");
    assert.equal(ok, false);
    assert.equal(db.getUserReminders("u1").length, 1);
  });

  test("updateReminder updates message and time", () => {
    const r = db.createReminder({
      userId: "u1", guildId: null, channelId: "c", message: "Old",
      remindAt: Date.now() + 60_000,
    });
    const newTime = Date.now() + 3_600_000;
    const updated = db.updateReminder(r.id, "u1", { message: "New", remindAt: newTime });
    assert.equal(updated.message, "New");
    assert.equal(updated.remind_at, Math.floor(newTime / 1000));
  });

  test("getDueReminders returns reminders whose time has passed", () => {
    // past reminder (1 second in the past, stored as unix epoch)
    const past = Math.floor(Date.now() / 1000) - 5;
    db.getDb()
      .prepare(
        "INSERT INTO reminders (user_id, channel_id, message, remind_at) VALUES (?, ?, ?, ?)"
      )
      .run("u1", "c", "Past", past);

    const future = Math.floor(Date.now() / 1000) + 3600;
    db.getDb()
      .prepare(
        "INSERT INTO reminders (user_id, channel_id, message, remind_at) VALUES (?, ?, ?, ?)"
      )
      .run("u1", "c", "Future", future);

    const due = db.getDueReminders();
    assert.equal(due.length, 1);
    assert.equal(due[0].message, "Past");
  });

  test("markFired prevents getDueReminders from returning reminder", () => {
    const past = Math.floor(Date.now() / 1000) - 5;
    const res = db.getDb()
      .prepare(
        "INSERT INTO reminders (user_id, channel_id, message, remind_at) VALUES (?, ?, ?, ?)"
      )
      .run("u1", "c", "Past", past);
    db.markFired(res.lastInsertRowid);
    assert.equal(db.getDueReminders().length, 0);
  });
});
