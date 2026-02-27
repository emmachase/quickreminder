import { Client, GatewayIntentBits, Collection, MessageFlags } from "discord.js";
import { startScheduler } from "./scheduler.ts";
import type { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

// ── Types ────────────────────────────────────────────────────────────────────
interface Command {
  data: SlashCommandBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

// ── Load Commands ────────────────────────────────────────────────────────────
const commandFiles = [
  "./commands/remind.ts",
  "./commands/reminders.ts",
  "./commands/remind-edit.ts",
  "./commands/remind-cancel.ts",
];

const commands = new Collection<string, Command>();

for (const file of commandFiles) {
  const mod = (await import(file)) as Command;
  commands.set(mod.data.name, mod);
}

// ── Discord Client ───────────────────────────────────────────────────────────
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user!.tag}`);
  startScheduler(client);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[bot] Error executing /${interaction.commandName}:`, err);
    const content = "❌ An unexpected error occurred.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content }).catch(() => {});
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
});

await client.login(process.env["DISCORD_TOKEN"]);
