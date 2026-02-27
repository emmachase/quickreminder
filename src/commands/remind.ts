import { SlashCommandBuilder, MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { parseReminder } from "../llm.ts";
import { createReminder } from "../db.ts";

export const data = new SlashCommandBuilder()
  .setName("remind")
  .setDescription("Set a reminder — just describe what and when in plain English")
  .addStringOption((opt) =>
    opt
      .setName("text")
      .setDescription(
        'e.g. "call mom in 30 minutes" or "standup tomorrow at 9am"'
      )
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const text = interaction.options.getString("text", true);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let parsed: Awaited<ReturnType<typeof parseReminder>>;
  try {
    parsed = await parseReminder(text);
  } catch (err) {
    await interaction.editReply(
      `❌ I couldn't understand **"${text}"**.\n> ${(err as Error).message}`
    );
    return;
  }

  const reminder = createReminder({
    userId: interaction.user.id,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    message: parsed.message,
    remindAt: parsed.remindAt.getTime(),
  });

  const ts = Math.floor(parsed.remindAt.getTime() / 1000);
  await interaction.editReply(
    `✅ Reminder **#${reminder.id}** set for <t:${ts}:F> (<t:${ts}:R>).\n> ${parsed.message}`
  );
}
