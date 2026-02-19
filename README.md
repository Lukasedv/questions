# Live Poll App

A simple real-time polling app for presentations, streams, and meetings.

## Features

- Single choice, multiple choice, and free text questions
- Real-time results with bar charts and word clouds
- Presentation mode (one question at a time)
- Dark theme designed for projection/streaming
- No database — in-memory, zero config

## Quick Start (Local)

```bash
npm install
npm start
```

The server starts on `http://localhost:3000`. The admin key is printed to the console — visit `/admin/<key>` to manage questions.

Set a custom admin key:

```bash
ADMIN_KEY=mysecret npm start
```

## Deploy to Azure (Free Tier)

Prerequisites: Azure CLI installed and logged in.

```bash
# Create and deploy in one command
az webapp up --name <your-app-name> --runtime "NODE:20-lts" --sku F1

# Enable WebSockets (required for Socket.IO)
az webapp config set --name <your-app-name> --resource-group <resource-group> --web-sockets-enabled true

# Set admin key
az webapp config appsettings set --name <your-app-name> --resource-group <resource-group> --settings ADMIN_KEY=your-secret-key
```

**Notes:**

- Free tier (F1) has limitations: 60 min/day CPU, 1 GB storage
- WebSockets must be enabled in the Azure portal or CLI
- The app auto-generates an admin key if not set (check logs)

## How to Use

1. Open `/admin/<your-key>` to access the admin panel
2. Create questions (single choice, multiple choice, or free text)
3. Share the site URL with your audience
4. Activate a question — it appears on all connected users' screens
5. Watch results update in real-time

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `ADMIN_KEY` | Admin access key | Random 8-char hex |
