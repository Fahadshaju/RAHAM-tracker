<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Application architecture
- Keep MIZAN's workspace views as tabs on the public index; signed-out users see labelled sample data and private actions require a verified Cloud session.
- Store each date's journal as validated JSON scoped by user and date, and roadmaps as validated user-owned documents, so journal changes and course progress remain private.
- Keep scoring, exports, and schemas in the browser-safe domain module; protect concrete point values and pillar weights with unit tests.
- Read YouTube metadata and all available transcripts in staged authenticated server functions, then merge every source in a single dependency-ordered synthesis; never invent missing captions or timestamps.
- Accounts are email/password plus phone SMS code (Twilio set in Cloud phone settings); calendar sharing is .ics export only; Google sign-in and Google Calendar were removed because Google OAuth could not be made to work on the Vercel deployment.
- Define visual roles, readable text scales, and workspace spacing in global tokens and reusable view styles; numerical progress is the only runtime visual dimension, and shared compact-label mappings keep existing tabs consistent.
- Generate downloadable roadmap PDFs from the full domain document through a browser-event helper, so collapsed concepts or inactive views never omit content.
- Materialize finite repeating month plans as independent tasks in user-owned daily JSON through an authenticated batch save; stable series IDs prevent duplicate insertion and keep completion date-specific.
- Keep the desktop navigation rail compact by default and expand it on pointer proximity or keyboard focus without shifting page content; keep mobile navigation visible.
- Server entry falls back to VITE_ backend URL/publishable key so external hosts (Vercel) work without duplicate env vars.
- YouTube metadata uses the Lovable connector when present, else YOUTUBE_API_KEY directly against Google, so non-Lovable hosts like Vercel work.
- Quran tab: 30 juz PDFs and first-page JPGs stored as Lovable assets under src/assets/quran, loaded via import.meta.glob.
- Habit milestones are unbounded: named badges then one every 1000 points (habitBadge).
- Quran read progress syncs per account in public.quran_progress (merged with device copy on sign-in); local copy kept for signed-out use.
- Calendar tab removed at user request; do not reintroduce without a new request.
- Quran PDFs render in-page with pdfjs canvases, never iframes or new tabs; hosted asset framing is blocked by the browser.
- Main-page Istighfar card sets a fixed daily target over a month range (series istighfar-daily) via journal.repeat; heavy tabs load lazily and the 3D garden lowers quality on phones for speed.
- On non-Lovable hosts the Quran tab loads files from /quran/<original_filename>; those copies exist only in the GitHub repo (pushed from the asset CDN), not in the Lovable project.
- On phones: garden starts minimized, prayer tracker first in Today, Deep work portals into the Progress tab (#mobile-deepwork); desktop unchanged except idle-deferred 3D.
