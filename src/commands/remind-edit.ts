import {
  SlashCommandBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import { parseReminderTime } from "../llm.ts";
import { updateReminder, getReminder, type UpdateReminderInput } from "../db.ts";

export const data = new SlashCommandBuilder()
  .setName("remind-edit")
  .setDescription("Edit an existing reminder")
  .addIntegerOption((opt) =>
    opt
      .setName("id")
      .setDescription("Reminder ID (from /reminders)")
      .setRequired(true)
      .setMinValue(1)
  )
  .addStringOption((opt) =>
    opt.setName("message").setDescription("New reminder message").setRequired(false)
  )
  .addStringOption((opt) =>
    opt
      .setName("when")
      .setDescription('New time, e.g. "in 1 hour", "Friday at 3pm"')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const id = interaction.options.getInteger("id", true);
  const newMessage = interaction.options.getString("message");
  const newWhen = interaction.options.getString("when");

  if (!newMessage && !newWhen) {
    await interaction.reply({
      content: "❌ Please provide at least a new **message** or a new **when**.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const existing = getReminder(id);
  if (!existing || existing.user_id !== interaction.user.id || existing.fired) {
    await interaction.reply({
      content: `❌ Reminder **#${id}** not found or already fired.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const updates: UpdateReminderInput = {};
  if (newMessage) updates.message = newMessage;

  if (newWhen) {
    try {
      const remindAt = await parseReminderTime(newWhen);
      updates.remindAt = remindAt.getTime();
    } catch (err) {
      await interaction.editReply(
        `❌ I couldn't understand the time **"${newWhen}"**.\n> ${(err as Error).message}`
      );
      return;
    }
  }

  const updated = updateReminder(id, interaction.user.id, updates);
  if (!updated) {
    await interaction.editReply(`❌ Reminder **#${id}** could not be updated.`);
    return;
  }

  const ts = updated.remind_at;
  await interaction.editReply(
    `✅ Reminder **#${id}** updated — fires <t:${ts}:F> (<t:${ts}:R>).\n> ${updated.message}`
  );
}
