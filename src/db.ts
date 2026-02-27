import { Database } from "bun:sqlite";
import { join } from "path";

const DB_PATH = process.env["DB_PATH"] ?? join(import.meta.dir, "..", "reminders.db");

export interface Reminder {
  id: number;
  user_id: string;
  guild_id: string | null;
  channel_id: string;
  message: string;
  remind_at: number; // unix epoch seconds
  created_at: number;
  fired: number; // 0 | 1
}

let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.run("PRAGMA journal_mode = WAL");
    _db.run("PRAGMA foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS reminders (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    TEXT    NOT NULL,
      guild_id   TEXT,
      channel_id TEXT    NOT NULL,
      message    TEXT    NOT NULL,
      remind_at  INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      fired      INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at) WHERE fired = 0"
  );
}

export interface CreateReminderInput {
  userId: string;
  guildId: string | null;
  channelId: string;
  message: string;
  remindAt: number; // ms
}

export function createReminder(input: CreateReminderInput): Reminder {
  const db = getDb();
  const result = db.run(
    "INSERT INTO reminders (user_id, guild_id, channel_id, message, remind_at) VALUES (?, ?, ?, ?, ?)",
    [
      input.userId,
      input.guildId ?? null,
      input.channelId,
      input.message,
      Math.floor(input.remindAt / 1000),
    ]
  );
  return getReminder(result.lastInsertRowid as number)!;
}

export function getReminder(id: number): Reminder | null {
  return (
    getDb().query<Reminder, [number]>("SELECT * FROM reminders WHERE id = ?").get(id) ?? null
  );
}

export function getUserReminders(userId: string): Reminder[] {
  return getDb()
    .query<Reminder, [string]>(
      "SELECT * FROM reminders WHERE user_id = ? AND fired = 0 ORDER BY remind_at ASC"
    )
    .all(userId);
}

export interface UpdateReminderInput {
  message?: string;
  remindAt?: number; // ms
}

export function updateReminder(
  id: number,
  userId: string,
  updates: UpdateReminderInput
): Reminder | null {
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.message !== undefined) {
    fields.push("message = ?");
    values.push(updates.message);
  }
  if (updates.remindAt !== undefined) {
    fields.push("remind_at = ?");
    values.push(Math.floor(updates.remindAt / 1000));
  }

  if (fields.length > 0) {
    values.push(id, userId);
    getDb().run(
      `UPDATE reminders SET ${fields.join(", ")} WHERE id = ? AND user_id = ? AND fired = 0`,
      values
    );
  }

  return getReminder(id);
}

export function cancelReminder(id: number, userId: string): boolean {
  const result = getDb().run(
    "UPDATE reminders SET fired = 1 WHERE id = ? AND user_id = ? AND fired = 0",
    [id, userId]
  );
  return result.changes > 0;
}

export function getDueReminders(): Reminder[] {
  return getDb()
    .query<Reminder, []>(
      "SELECT * FROM reminders WHERE fired = 0 AND remind_at <= unixepoch()"
    )
    .all();
}

export function markFired(id: number): void {
  getDb().run("UPDATE reminders SET fired = 1 WHERE id = ?", [id]);
}

/** Reset the DB state for testing — truncates all rows. */
export function _resetDb(): void {
  if (_db) {
    _db.run("DELETE FROM reminders");
  }
}
