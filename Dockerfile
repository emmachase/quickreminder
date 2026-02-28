FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source
COPY src ./src
COPY tsconfig.json ./

# Persist reminders database in a volume
VOLUME ["/data"]
ENV DB_PATH=/data/reminders.db

CMD ["bun", "run", "src/index.ts"]
