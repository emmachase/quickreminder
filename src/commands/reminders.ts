import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getUserReminders } from "../db.ts";

export const data = new SlashCommandBuilder()
  .setName("reminders")
  .setDescription("List your active reminders");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const reminders = getUserReminders(interaction.user.id);

  if (reminders.length === 0) {
    await interaction.reply({
      content: "📭 You have no active reminders.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("⏰ Your Reminders")
    .setColor(0x5865f2)
    .setDescription(
      reminders
        .map(
          (r) =>
            `**#${r.id}** — <t:${r.remind_at}:F> (<t:${r.remind_at}:R>)\n> ${r.message}`
        )
        .join("\n\n")
    )
    .setFooter({ text: `${reminders.length} active reminder(s)` });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
