# RAHAM

A dark-only daily accountability workspace for faith, discipline, and engineering mastery: daily targets you set and complete, timed tasks, one consolidated YouTube learning roadmap per video or playlist, a sacred calendar, and a private progress view.

## Tabs

- **Today** — your daily targets with points: keep a target to earn points, break it and its points return to zero. Milestone badges unlock at point goals and never come back off.
- **My plan** — fill in tasks and timings; they become the day's checklist.
- **Learning** — paste a YouTube video or playlist link and RAHAM builds one dependency-ordered course from every video, with timestamps. Videos without captions are transcribed automatically, and audio upload works as a backup.
- **Progress** — habit streaks, the year grid, and exports.
- **Calendar** — sacred time blocks, Google Calendar sync, or `.ics` export.

## Run locally

`bun install`, then `bun run dev`. Domain tests: `bunx vitest run`.
Built with React 19, TanStack Start, Tailwind 4, and Lovable Cloud. Server functions target the Worker runtime, not a standalone Node server.

## Data and accounts

The public index shows clearly labelled sample data. Sign in with Google or email/password to start a fresh private journal. Email signups require confirmation. Journals, targets and roadmaps use owner-scoped policies. Fajr proof is stored in a private 10 MB image bucket. Photos are manually logged evidence, not automatically verified.

The migrations include a literal sample-journal seed. JSON export is available from the toolbar and consistency view. Markdown and complete downloadable PDF exports are available on a roadmap, including all phases, source links, practice, checkpoints, schedule, glossary, and capstone.

## Environment variables

Client-side (already in `.env`, publishable values only): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.

Server-only, read inside server functions and server routes:

| Variable | Needed for |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Server-side database access |
| `LOVABLE_API_KEY` | AI features: roadmap synthesis, transcript summaries, automatic transcription |
| `UDC_YOUTUBE_DATA_API_API_KEY` | Reading YouTube video and playlist metadata |
| `GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY`, `APP_USER_CONNECTION_KEY_SECRET` | Google Calendar sync |

Without the server-only variables the app still runs: the pages render, journals and targets save, and `.ics` export works. AI transcription, playlist import and Calendar sync report that the service is not connected.

## Deploy to Vercel

1. Push this repository to GitHub (it is already there) and in Vercel choose **Add New → Project → Import** the `Fahadshaju/RAHAM-tracker` repository.
2. Framework preset **Vite**, install command `bun install`, build command `NITRO_PRESET=vercel bun run build`, output directory `.vercel/output`.
3. Add the environment variables above under **Settings → Environment Variables**. `LOVABLE_API_KEY` and the YouTube key come from Lovable: in the Lovable project, connect the YouTube Data API connector and copy the connection key; the AI key is issued per project.
4. Deploy.

Two things to expect on a non-Lovable host:

- **Google sign-in** needs the Vercel URL registered as an allowed redirect in the auth provider, otherwise email/password sign-in is the path that works.
- **AI and YouTube features** only work once `LOVABLE_API_KEY` and `UDC_YOUTUBE_DATA_API_API_KEY` are set in Vercel; they are not part of this repository.

## YouTube pipeline

The app paginates the full playlist, batches metadata, reads captions per video, summarizes long transcript chunks, and performs one final consolidated synthesis with Lovable AI. YouTube often blocks automated captions or provides none, so RAHAM falls back to transcribing the video from its link, and finally to an audio upload you provide. It reports the affected video, preserves the URL, and accepts timestamped transcript lines such as `[0–120s] ...` for every missing source. It never silently substitutes descriptions for transcripts. Source IDs and timestamp bounds are validated before a generated roadmap is saved. Private/deleted videos, access/quota failures, and incomplete synthesis are reported instead of generating partial playlist courses.

## Google Calendar

Each signed-in app user grants their own Calendar access through an App User Connector client. Register `https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback` in the Google OAuth client, and publish the OAuth consent app under Google Auth Platform → Audience, otherwise Google testing grants expire after seven days. Connection handles are encrypted with AES-256-GCM and accessible only to verified server functions. Sacred blocks can be edited, synchronized as recurring events, or exported as `.ics` without connecting Google. Resync updates stable event IDs instead of duplicating them. Disconnecting revokes app access but does not delete existing calendar events.

## Prayer times

Location permission is requested only when choosing the location control. Times come from Aladhan's Muslim World League calculation; verify local mosque guidance. Until permission is granted, the timetable is explicitly marked sample. Hijri dates use the browser's Umm al-Qura calendar and may differ from local moonsighting.
