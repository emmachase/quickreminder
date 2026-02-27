# quickreminder

A Discord bot that lets you set, view, edit, and cancel reminders using natural language — powered by **Claude Haiku 4.5** for intelligent time parsing.

## Features

| Command | Description |
|---|---|
| `/remind when:<time> message:<text>` | Create a reminder |
| `/reminders` | List your active reminders |
| `/remind-edit id:<n> [when:…] [message:…]` | Edit an existing reminder |
| `/remind-cancel id:<n>` | Cancel a reminder |

Time expressions are processed by Claude Haiku 4.5, so you can write things like:
- `"in 30 minutes"`
- `"tomorrow at 9am"`
- `"next Monday at noon"`
- `"in 2 hours and 15 minutes"`

## Setup

### 1. Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Discord application](https://discord.com/developers/applications) with a Bot token
- An [Anthropic API key](https://console.anthropic.com)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env and fill in your tokens
```

Required variables:

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot token from the Discord developer portal |
| `DISCORD_CLIENT_ID` | Application (client) ID |
| `ANTHROPIC_API_KEY` | Anthropic API key |

Optional:

| Variable | Description |
|---|---|
| `DISCORD_GUILD_ID` | If set, commands deploy to this guild instantly (useful for testing) |
| `DB_PATH` | Path to the SQLite database file (default: `reminders.db` next to `src/`) |

### 4. Deploy slash commands

```bash
npm run deploy
```

For testing, add `DISCORD_GUILD_ID=<your server id>` to `.env` — guild-scoped commands register instantly.  
For production, remove `DISCORD_GUILD_ID` — global commands take up to 1 hour to propagate.

### 5. Start the bot

```bash
npm start
```

## Architecture

```
src/
  index.js        — Bot entry point, command dispatcher
  db.js           — SQLite database layer (better-sqlite3)
  llm.js          — Claude Haiku 4.5 time parser
  scheduler.js    — Background polling loop (fires due reminders every 15 s)
  commands/
    remind.js         — /remind command
    reminders.js      — /reminders command
    remind-edit.js    — /remind-edit command
    remind-cancel.js  — /remind-cancel command
deploy-commands.js  — One-time script to register slash commands with Discord
```

Reminders are stored in a local SQLite database (`reminders.db`).  
The scheduler polls every 15 seconds and delivers due reminders as channel messages that mention the user.
