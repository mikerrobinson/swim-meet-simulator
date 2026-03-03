# Swim Meet Simulator

A tool for parsing swim meet psych sheet PDFs and visualizing entries by event, team, and swimmer.

## Features

- Upload psych sheet PDFs via drag-and-drop
- Client-side PDF parsing (no data sent to servers)
- Browse events, teams, and swimmers
- View seed times and entry counts

## Tech Stack

- React Router 7 (Remix)
- Cloudflare Workers
- Tailwind CSS
- pdf.js for client-side PDF parsing

## Development

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Deployment

```bash
npm run deploy
```

## Project Structure

```
app/
  context/     # React context for meet data
  lib/         # PDF extraction and parsing
  types/       # TypeScript types for meet data
  routes/      # Page components
```
