const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { cancelReminder } = require("../db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remind-cancel")
    .setDescription("Cancel a reminder")
    .addIntegerOption((opt) =>
      opt
        .setName("id")
        .setDescription("Reminder ID (from /reminders)")
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const id = interaction.options.getInteger("id");
    const cancelled = cancelReminder(id, interaction.user.id);

    if (!cancelled) {
      return interaction.reply({
        content: `❌ Reminder **#${id}** not found or already cancelled/fired.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      content: `🗑️ Reminder **#${id}** has been cancelled.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
