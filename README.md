# MIZAN

A dark-only daily accountability workspace for faith, discipline, and engineering mastery, with one consolidated YouTube learning roadmap per video or playlist input.

## Run locally
`bun install` then `bun run dev`. Run domain tests with `bunx vitest run src/test/mizan.test.ts`.
Built with React 19, TanStack Start, Tailwind 4, and Lovable Cloud. Server functions target the Worker runtime, not a standalone Node server.

## Data and accounts
The public index includes clearly labelled sample data. Sign in with Google, Lovable, or email/password to start a fresh private journal. Email signups require confirmation. Journals and roadmaps use owner-scoped policies. Fajr proof is stored in a private 10 MB image bucket. Photos are manually logged evidence, not automatically verified.

The migrations include a literal sample-journal seed. JSON export is available from the toolbar and consistency view. Markdown and complete downloadable PDF exports are available on a roadmap, including all phases, source links, practice, checkpoints, schedule, glossary, and capstone.

## Scoring
On-time prayers: +10; Fajr and Tahajjud: +15; late: +4; missed: −12; unlogged: 0. Tahajjud is correctly labelled voluntary rather than a compulsory sixth daily prayer.
Guardrails: +5 kept, −10 broken, 0 unlogged. Streaks break on relapse or missing days and retain a longest streak.
Pillar weights: prayers 35%, purity 30%, istighfar 10%, career 20%, exercise 5%. Points are normalized against 70 prayer points / 35 discipline points, with negative totals floored at zero. Career target is 360 minutes, exercise target 30 minutes, and dhikr target is configurable at 1,000 or above. A score is bounded to 0–10; future/unlogged prayers receive no credit.

## YouTube setup
Connect the YouTube Data API custom connector with a Google Cloud API key for a project with YouTube Data API v3 enabled. The connector provides `UDC_YOUTUBE_DATA_API_API_KEY` server-side. Calls go through the connector gateway; no credentials are sent to the browser.
The pipeline paginates the full playlist, batches metadata, reads captions per video, summarizes long transcript chunks, and performs one final consolidated synthesis with Lovable AI. `LOVABLE_API_KEY` is platform managed. Workspace AI contracts are generated using `bunx ai-gateway generate --model openai/gpt-6.1-sol`.
YouTube often blocks automated captions or provides no captions. The app reports the affected video, preserves the URL, and accepts user-supplied timestamped transcript lines such as `[0–120s] ...` for every missing source. It never silently substitutes descriptions for transcripts. Source IDs and timestamp bounds are validated before a generated roadmap is saved. Private/deleted videos, access/quota failures, and incomplete synthesis are reported instead of generating partial playlist courses.

## Google Calendar
Link an App User Connector client for `google_calendar`; each signed-in app user grants their own Calendar access. Register `https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback` in the Google OAuth client. Publish an external Google OAuth consent app under Google Auth Platform → Audience, otherwise Google testing grants expire after seven days.
The platform provisions `GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY` and `APP_USER_CONNECTION_KEY_SECRET`. Connection handles are encrypted with AES-256-GCM and accessible only to verified server functions. Sacred blocks can be edited, synchronized as recurring events, or exported as `.ics` without connecting Google. Resync updates stable event IDs instead of duplicating them. Calendar disconnection revokes app access but does not delete existing calendar events.

## Prayer times
Location permission is requested only when choosing the location control. Times come from Aladhan's Muslim World League calculation; verify local mosque guidance. Until permission is granted, the timetable is explicitly marked sample. Hijri dates use the browser's Umm al-Qura calendar and may differ from local moonsighting.
