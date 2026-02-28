import { type Client } from "discord.js";
import { getDueReminders, markFired } from "./db.ts";

const POLL_INTERVAL_MS = 15_000;

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startScheduler(client: Client): () => void {
  intervalId = setInterval(() => void tick(client), POLL_INTERVAL_MS);
  void tick(client);
  return stopScheduler;
}

export function stopScheduler(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

async function tick(client: Client): Promise<void> {
  const due = getDueReminders();
  for (const reminder of due) {
    try {
      await fireReminder(client, reminder);
    } catch (err) {
      console.error(`[scheduler] Failed to fire reminder #${reminder.id}:`, err);
    } finally {
      markFired(reminder.id);
    }
  }
}

async function fireReminder(
  client: Client,
  reminder: { id: number; user_id: string; channel_id: string | null; message: string }
): Promise<void> {
  const content = `⏰ <@${reminder.user_id}> Reminder:\n> ${reminder.message}`;

  // If a channel was recorded (guild install or DM channel), try sending there first.
  if (reminder.channel_id) {
    try {
      const channel = await client.channels.fetch(reminder.channel_id);
      if (channel?.isTextBased() && "send" in channel) {
        await (channel as { send(msg: string): Promise<unknown> }).send(content);
        return;
      }
    } catch {
      // Channel may no longer be accessible; fall through to DM.
    }
  }

  // Fall back to DMing the user (covers user-install in guilds without the bot,
  // and cases where the original channel is gone).
  const user = await client.users.fetch(reminder.user_id);
  await user.send(content);
}
