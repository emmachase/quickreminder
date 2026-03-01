import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"] });
  }
  return _client;
}

export interface ParsedReminder {
  /** ISO 8601 UTC timestamp string */
  remindAt: Date;
  /** The cleaned-up reminder message */
  message: string;
}

/**
 * Returns the local hour (0–23) for the given date in America/Los_Angeles.
 * Exported for testing.
 */
export function getLocalHourLA(now: Date): number {
  return parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "2-digit",
      hour12: false,
    }).format(now),
    10
  );
}

/**
 * Returns a prompt note reminding the LLM to treat "tomorrow" as "today"
 * when the local time is between midnight and 3 AM (exclusive).
 * Exported for testing.
 */
export function lateNightTomorrowNote(now: Date): string {
  const hour = getLocalHourLA(now);
  if (hour >= 0 && hour < 3) {
    return '\nNote: Since it is currently between midnight and 3 AM local time, treat "tomorrow" as meaning "today" (the current calendar date).';
  }
  return "";
}

/**
 * Use Claude Haiku 4.5 to split a single freeform reminder string into a
 * scheduled time and a message. The user can type anything, e.g.:
 *   "remind me to call mom in 30 minutes"
 *   "buy milk tomorrow at 9am"
 *   "standup meeting every day at 10am — well, just the next one"
 */
export async function parseReminder(
  text: string,
  now: Date = new Date()
): Promise<ParsedReminder> {
  const nowIso = now.toISOString();
  const nowLocal = now.toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "short" });

  const response = await getClient().messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 128,
    messages: [
      {
        role: "user",
        content: `Current time: ${nowLocal} (America/Los_Angeles) / ${nowIso} UTC

You are a reminder parser. Given the user's freeform reminder text, extract:
1. The ISO 8601 UTC timestamp for when the reminder should fire. Interpret any times without an explicit timezone as America/Los_Angeles.
2. A concise reminder message (strip time words, keep the action/topic)
${lateNightTomorrowNote(now)}
Reply with ONLY a JSON object in this exact format (no markdown, no extra text):
{"remindAt":"<ISO timestamp>","message":"<reminder text>"}

User input: ${JSON.stringify(text)}`,
      },
    ],
  });

  const raw = (response.content[0] as { text: string } | undefined)?.text?.trim() ?? "";

  // Extract JSON from the response (handles cases where model adds stray chars)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Could not parse a reminder from: "${text}"`);
  }

  let parsed: { remindAt: string; message: string };
  try {
    parsed = JSON.parse(jsonMatch[0]) as { remindAt: string; message: string };
  } catch {
    throw new Error(`Invalid JSON returned for: "${text}"`);
  }

  if (!parsed.remindAt || !parsed.message) {
    throw new Error(`Incomplete reminder data returned for: "${text}"`);
  }

  const remindAt = new Date(parsed.remindAt);
  if (isNaN(remindAt.getTime())) {
    throw new Error(`Invalid date "${parsed.remindAt}" returned for: "${text}"`);
  }
  if (remindAt <= now) {
    throw new Error(`The parsed time (${remindAt.toISOString()}) is in the past.`);
  }

  return { remindAt, message: parsed.message };
}

/**
 * Use Claude Haiku 4.5 to parse a time-only expression into a Date.
 * Used by /remind-edit when the user only provides a new time.
 */
export async function parseReminderTime(
  timeExpression: string,
  now: Date = new Date()
): Promise<Date> {
  const nowIso = now.toISOString();
  const nowLocal = now.toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "short" });

  const response = await getClient().messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 64,
    messages: [
      {
        role: "user",
        content: `Current time: ${nowLocal} (America/Los_Angeles) / ${nowIso} UTC

Parse the following time expression and return ONLY an ISO 8601 UTC timestamp with nothing else. Interpret any times without an explicit timezone as America/Los_Angeles.${lateNightTomorrowNote(now)}

Time expression: ${JSON.stringify(timeExpression)}`,
      },
    ],
  });

  const raw = (response.content[0] as { text: string } | undefined)?.text?.trim() ?? "";

  const match = raw.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/);
  if (!match) {
    throw new Error(`Could not parse a valid time from: "${timeExpression}"`);
  }

  const parsed = new Date(match[0]);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date returned for: "${timeExpression}"`);
  }
  if (parsed <= now) {
    throw new Error(`The parsed time (${parsed.toISOString()}) is in the past.`);
  }

  return parsed;
}
