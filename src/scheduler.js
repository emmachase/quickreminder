const { getDueReminders, markFired } = require("./db");

const POLL_INTERVAL_MS = 15_000; // check every 15 seconds

let intervalId = null;

/**
 * Start the background scheduler that fires due reminders.
 * @param {import('discord.js').Client} client
 * @returns {() => void} stop function
 */
function startScheduler(client) {
  intervalId = setInterval(() => tick(client), POLL_INTERVAL_MS);
  // Fire once immediately so we don't miss reminders on startup
  tick(client);
  return stopScheduler;
}

function stopScheduler() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

async function tick(client) {
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

async function fireReminder(client, reminder) {
  const channel = await client.channels.fetch(reminder.channel_id);
  if (!channel?.isTextBased()) return;

  await channel.send(
    `⏰ <@${reminder.user_id}> Reminder:\n> ${reminder.message}`
  );
}

module.exports = { startScheduler, stopScheduler };
