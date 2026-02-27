import {
  SlashCommandBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import { cancelReminder } from "../db.ts";

export const data = new SlashCommandBuilder()
  .setName("remind-cancel")
  .setDescription("Cancel a reminder")
  .addIntegerOption((opt) =>
    opt
      .setName("id")
      .setDescription("Reminder ID (from /reminders)")
      .setRequired(true)
      .setMinValue(1)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const id = interaction.options.getInteger("id", true);
  const cancelled = cancelReminder(id, interaction.user.id);

  if (!cancelled) {
    await interaction.reply({
      content: `❌ Reminder **#${id}** not found or already cancelled/fired.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    content: `🗑️ Reminder **#${id}** has been cancelled.`,
    flags: MessageFlags.Ephemeral,
  });
}
