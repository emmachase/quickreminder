const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { parseReminderTime } = require("../llm");
const { createReminder } = require("../db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Set a reminder")
    .addStringOption((opt) =>
      opt
        .setName("when")
        .setDescription('When to remind you, e.g. "in 30 minutes", "tomorrow at 9am"')
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("message")
        .setDescription("What to remind you about")
        .setRequired(true)
    ),

  async execute(interaction) {
    const when = interaction.options.getString("when");
    const message = interaction.options.getString("message");

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let remindAt;
    try {
      remindAt = await parseReminderTime(when);
    } catch (err) {
      return interaction.editReply(
        `❌ I couldn't understand the time **"${when}"**.\n> ${err.message}`
      );
    }

    const reminder = createReminder({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      message,
      remindAt: remindAt.getTime(),
    });

    const ts = Math.floor(remindAt.getTime() / 1000);
    return interaction.editReply(
      `✅ Reminder **#${reminder.id}** set for <t:${ts}:F> (<t:${ts}:R>).\n> ${message}`
    );
  },
};
