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

## Project rules
- Installer stamp uploads are stored as embedded PNG data via storage.ts and read after hydration by the active diagram; this preserves standalone SVG portability without server storage.
- The diagram (src/components/panel) is plain SVG with inline presentation attributes and Arial, never Tailwind classes or CSS variables: the exported .svg must open standalone in CAD/Illustrator.
- Panel options, defaults and design checks live in src/lib/panel.ts with tests in src/lib/panel.test.ts; UI components only render them.
- Panel state is client-only (no backend); default circuit ids are fixed strings so SSR and hydration match.
- PDF export uses window.print() with print styles in src/styles.css; everything except #print-area is print:hidden.
- Hager catalogue references and BOM quantities live in src/lib/hager.ts (tested in src/lib/hager.test.ts); the diagram and BOM tab both read codes from there so they never disagree.
- Browser storage (current panel, saved projects, price list per code) goes through src/lib/storage.ts and every read passes normalizeConfig, because stored or imported JSON is untrusted.
- The active tab lives in the URL search param `tab` (diagram | bom) so it survives reloads and links.
- CSV export uses semicolons, decimal commas and a UTF-8 BOM so Greek Excel opens it correctly.
- Photo/sketch scan: the user's own Gemini key is typed in the app (kept on-device via storage.ts) and sent to the server function in src/lib/scan.functions.ts, which calls Gemini from src/lib/scan.server.ts; the user chose this over the built-in AI gateway.
- Scan answers are untrusted: src/lib/scan.ts snaps every value to the options in panel.ts and passes the result through normalizeConfig (tested in src/lib/scan.test.ts); unread fields keep current values.
