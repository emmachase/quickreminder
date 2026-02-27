const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { parseReminderTime } = require("../llm");
const { updateReminder, getReminder } = require("../db");

module.exports = {
  data: new SlashCommandBuilder()
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
      opt
        .setName("message")
        .setDescription("New reminder message")
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName("when")
        .setDescription('New time, e.g. "in 1 hour", "Friday at 3pm"')
        .setRequired(false)
    ),

  async execute(interaction) {
    const id = interaction.options.getInteger("id");
    const newMessage = interaction.options.getString("message");
    const newWhen = interaction.options.getString("when");

    if (!newMessage && !newWhen) {
      return interaction.reply({
        content: "❌ Please provide at least a new **message** or a new **when**.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Verify reminder exists and belongs to this user before deferring
    const existing = getReminder(id);
    if (!existing || existing.user_id !== interaction.user.id || existing.fired) {
      return interaction.reply({
        content: `❌ Reminder **#${id}** not found or already fired.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const updates = {};
    if (newMessage) updates.message = newMessage;

    if (newWhen) {
      try {
        const remindAt = await parseReminderTime(newWhen);
        updates.remindAt = remindAt.getTime();
      } catch (err) {
        return interaction.editReply(
          `❌ I couldn't understand the time **"${newWhen}"**.\n> ${err.message}`
        );
      }
    }

    const updated = updateReminder(id, interaction.user.id, updates);
    const ts = updated.remind_at;
    return interaction.editReply(
      `✅ Reminder **#${id}** updated — fires <t:${ts}:F> (<t:${ts}:R>).\n> ${updated.message}`
    );
  },
};
