const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "reminders.db");

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema();
  }
  return db;
}

function initSchema() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id   TEXT    NOT NULL,
      guild_id  TEXT,
      channel_id TEXT   NOT NULL,
      message   TEXT    NOT NULL,
      remind_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      fired     INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at) WHERE fired = 0;
  `);
}

function createReminder({ userId, guildId, channelId, message, remindAt }) {
  const stmt = getDb().prepare(
    "INSERT INTO reminders (user_id, guild_id, channel_id, message, remind_at) VALUES (?, ?, ?, ?, ?)"
  );
  const result = stmt.run(userId, guildId ?? null, channelId, message, Math.floor(remindAt / 1000));
  return getReminder(result.lastInsertRowid);
}

function getReminder(id) {
  return getDb()
    .prepare("SELECT * FROM reminders WHERE id = ?")
    .get(id);
}

function getUserReminders(userId) {
  return getDb()
    .prepare("SELECT * FROM reminders WHERE user_id = ? AND fired = 0 ORDER BY remind_at ASC")
    .all(userId);
}

function updateReminder(id, userId, { message, remindAt }) {
  const fields = [];
  const values = [];

  if (message !== undefined) {
    fields.push("message = ?");
    values.push(message);
  }
  if (remindAt !== undefined) {
    fields.push("remind_at = ?");
    values.push(Math.floor(remindAt / 1000));
  }

  if (fields.length === 0) return getReminder(id);

  values.push(id, userId);
  getDb()
    .prepare(`UPDATE reminders SET ${fields.join(", ")} WHERE id = ? AND user_id = ? AND fired = 0`)
    .run(...values);

  return getReminder(id);
}

function cancelReminder(id, userId) {
  const result = getDb()
    .prepare("UPDATE reminders SET fired = 1 WHERE id = ? AND user_id = ? AND fired = 0")
    .run(id, userId);
  return result.changes > 0;
}

function getDueReminders() {
  return getDb()
    .prepare("SELECT * FROM reminders WHERE fired = 0 AND remind_at <= unixepoch()")
    .all();
}

function markFired(id) {
  getDb()
    .prepare("UPDATE reminders SET fired = 1 WHERE id = ?")
    .run(id);
}

module.exports = {
  getDb,
  createReminder,
  getReminder,
  getUserReminders,
  updateReminder,
  cancelReminder,
  getDueReminders,
  markFired,
};
