# AI LinkedIn Post Generator

Preview-first LinkedIn post automation built with Node.js, Express, Gemini/OpenAI, Cloudinary, and Composio LinkedIn tooling.

## What It Does

This app turns project updates, achievements, certificates, and events into polished LinkedIn post drafts. It supports optional image upload, shows a preview, and blocks publishing unless the user explicitly confirms the final draft.

The important design choice is safety: generation and publishing are separate steps.

## Features

- Generates LinkedIn-ready post copy and hashtags with Gemini or OpenAI.
- Uploads optional images through Cloudinary.
- Creates a preview draft before publishing.
- Requires `confirmed: true` before any LinkedIn publish attempt.
- Supports mock publish mode for local testing.
- Separates routes, controllers, services, upload middleware, and environment config.

## Architecture

```text
Browser UI
  -> Express routes
  -> Post controller
  -> AI generation service
  -> Optional Cloudinary upload
  -> In-memory draft store
  -> Explicit confirmation
  -> Composio LinkedIn publish service
```

## Tech Stack

- Node.js
- Express
- Gemini / OpenAI
- Cloudinary
- Composio LinkedIn toolkit
- Multer
- Vanilla HTML/CSS/JavaScript

## Local Setup

```bash
npm install
copy .env.example .env
npm start
```

Then open:

```text
http://localhost:3000
```

## Environment Variables

Use `.env.example` as the source of truth.

Required for AI generation:

- `AI_PROVIDER`
- `GEMINI_API_KEY` or `OPENAI_API_KEY`

Required for image upload:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Required for real LinkedIn publishing:

- `COMPOSIO_API_KEY`
- `COMPOSIO_USER_ID`
- `LINKEDIN_AUTHOR_URN` if automatic author discovery is unavailable

For local testing without publishing:

```env
MOCK_LINKEDIN_PUBLISH=true
```

## API

Base URL:

```text
http://localhost:3000/api
```

Endpoints:

- `GET /health`
- `GET /linkedin/status`
- `POST /generate-post`
- `POST /upload-image`
- `POST /preview-post`
- `POST /publish-post`

Publishing is blocked unless:

```json
{
  "confirmed": true
}
```

## Verification Status

Verified locally:

- JavaScript syntax check passed.
- `npm ci --ignore-scripts --no-audit --no-fund` passed after lockfile repair.
- Mock-mode server health check passed at `/api/health`.

## Planned Improvements

- Add screenshots.
- Add a smoke-test script.
- Persist drafts in Redis or a database.
- Add user authentication for multi-user use.
- Add scheduled posts.
- Add post analytics.

## Resume Angle

Built a preview-first LinkedIn automation service with Node.js, Express, Gemini/OpenAI, Cloudinary, and Composio tooling, blocking publication until explicit user confirmation and separating generation, preview, and publish workflows.
