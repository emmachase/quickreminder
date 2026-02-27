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
  reminder: { id: number; user_id: string; channel_id: string; message: string }
): Promise<void> {
  const channel = await client.channels.fetch(reminder.channel_id);
  // isTextBased() is the semantic guard; the "send" check handles the rare
  // PartialGroupDMChannel edge case where TS doesn't narrow fully.
  if (!channel?.isTextBased() || !("send" in channel)) return;
  await (channel as { send(msg: string): Promise<unknown> }).send(
    `⏰ <@${reminder.user_id}> Reminder:\n> ${reminder.message}`
  );
}
