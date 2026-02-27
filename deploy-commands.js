require("dotenv").config();

const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment.");
  process.exit(1);
}

const commandsPath = path.join(__dirname, "src", "commands");
const commandData = fs
  .readdirSync(commandsPath)
  .filter((f) => f.endsWith(".js"))
  .map((f) => require(path.join(commandsPath, f)).data.toJSON());

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
  console.log(`Deploying ${commandData.length} command(s)…`);
  try {
    let data;
    if (DISCORD_GUILD_ID) {
      // Guild-scoped deploy (instant, for testing)
      data = await rest.put(
        Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
        { body: commandData }
      );
    } else {
      // Global deploy (up to 1 hour to propagate)
      data = await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
        body: commandData,
      });
    }
    console.log(`✅ Successfully deployed ${data.length} command(s).`);
  } catch (err) {
    console.error("Failed to deploy commands:", err);
    process.exit(1);
  }
})();
