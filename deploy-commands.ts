import { REST, Routes } from "discord.js";
import type { SlashCommandBuilder } from "discord.js";

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment.");
  process.exit(1);
}

const commandFiles = [
  "./src/commands/remind.ts",
  "./src/commands/reminders.ts",
  "./src/commands/remind-edit.ts",
  "./src/commands/remind-cancel.ts",
];

const commandData: ReturnType<SlashCommandBuilder["toJSON"]>[] = [];
for (const file of commandFiles) {
  const mod = (await import(file)) as { data: SlashCommandBuilder };
  commandData.push(mod.data.toJSON());
}

const rest = new REST().setToken(DISCORD_TOKEN);

console.log(`Deploying ${commandData.length} command(s)…`);
try {
  let data: unknown[];
  if (DISCORD_GUILD_ID) {
    data = (await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
      { body: commandData }
    )) as unknown[];
  } else {
    data = (await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
      body: commandData,
    })) as unknown[];
  }
  console.log(`✅ Successfully deployed ${data.length} command(s).`);
} catch (err) {
  console.error("Failed to deploy commands:", err);
  process.exit(1);
}
