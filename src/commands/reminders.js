const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { getUserReminders } = require("../db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reminders")
    .setDescription("List your active reminders"),

  async execute(interaction) {
    const reminders = getUserReminders(interaction.user.id);

    if (reminders.length === 0) {
      return interaction.reply({
        content: "📭 You have no active reminders.",
        flags: MessageFlags.Ephemeral,
      });
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

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
