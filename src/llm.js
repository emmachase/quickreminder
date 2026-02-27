const Anthropic = require("@anthropic-ai/sdk");

let client;

function getClient() {
  if (!client) {
    client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * Use Claude Haiku to parse a natural-language time expression relative to `now`.
 * Returns a Date object representing when the reminder should fire.
 *
 * @param {string} timeExpression - e.g. "in 30 minutes", "tomorrow at 9am", "next Monday"
 * @param {Date} [now] - reference time (defaults to new Date())
 * @returns {Promise<Date>}
 */
async function parseReminderTime(timeExpression, now = new Date()) {
  const nowIso = now.toISOString();

  const message = await getClient().messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 64,
    messages: [
      {
        role: "user",
        content: `Current UTC time: ${nowIso}

Parse the following reminder time expression and return ONLY an ISO 8601 UTC timestamp (e.g. "2024-06-01T15:30:00.000Z") with nothing else.

Time expression: "${timeExpression}"`,
      },
    ],
  });

  const raw = message.content[0]?.text?.trim() ?? "";

  // Extract an ISO timestamp from the response
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

module.exports = { parseReminderTime };
