# quickreminder

A Discord bot that lets you set, view, edit, and cancel reminders using natural language — powered by **Claude Haiku 4.5** for intelligent parsing, built with **Bun** and **TypeScript**.

## Features

| Command | Description |
|---|---|
| `/remind text:<anything>` | Create a reminder — write what *and* when in one sentence |
| `/reminders` | List your active reminders |
| `/remind-edit id:<n> [when:…] [message:…]` | Edit an existing reminder |
| `/remind-cancel id:<n>` | Cancel a reminder |

The `/remind` command accepts a single freeform sentence. Claude Haiku 4.5 extracts both the time and the message for you:

| Input | Parsed time | Parsed message |
|---|---|---|
| `call mom in 30 minutes` | +30 min | "call mom" |
| `standup tomorrow at 9am` | next day 09:00 | "standup" |
| `buy milk on Friday` | next Friday | "buy milk" |

## Setup


### 1. Prerequisites

- [Bun](https://bun.sh) 1.0+
- A [Discord application](https://discord.com/developers/applications) with a Bot token
- An [Anthropic API key](https://console.anthropic.com)

### 2. Install dependencies

```bash
bun install
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
bun run deploy
```

For testing, add `DISCORD_GUILD_ID=<your server id>` to `.env` — guild-scoped commands register instantly.  
For production, remove `DISCORD_GUILD_ID` — global commands take up to 1 hour to propagate.

### 5. Start the bot

```bash
bun start
```

### Docker

```bash
docker build -t quickreminder .
docker run -d \
  -e DISCORD_TOKEN=... \
  -e DISCORD_CLIENT_ID=... \
  -e ANTHROPIC_API_KEY=... \
  -v quickreminder-data:/data \
  quickreminder
```

## Architecture

```
src/
  index.ts        — Bot entry point, command dispatcher
  db.ts           — SQLite database layer (bun:sqlite)
  llm.ts          — Claude Haiku 4.5 — parses time + message from freeform input
  scheduler.ts    — Background polling loop (fires due reminders every 15 s)
  commands/
    remind.ts         — /remind command (single freeform text field)
    reminders.ts      — /reminders command
    remind-edit.ts    — /remind-edit command
    remind-cancel.ts  — /remind-cancel command
deploy-commands.ts  — One-time script to register slash commands with Discord
Dockerfile          — Multi-stage Docker image using oven/bun
```

Reminders are stored in a local SQLite database (`reminders.db`).  
The scheduler polls every 15 seconds and delivers due reminders as channel messages that mention the user.
