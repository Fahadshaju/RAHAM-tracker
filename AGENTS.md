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
- Keep calendar credentials encrypted in server-only storage and use the per-user connector; stable event IDs prevent duplicate recurring blocks on resync.
- Define visual roles in global OKLCH tokens and reusable view styles; numerical progress is the only runtime visual dimension.
- Generate downloadable roadmap PDFs from the full domain document through a browser-event helper, so collapsed concepts or inactive views never omit content.
