# Decisions

Running log. Add a row when a choice is made that affects the schema, stack, hosting, or scope. Newest at the bottom.

| # | Date | Decision | Options considered | Reason |
|---|---|---|---|---|
| D1 | 2026-10-26 | Web app, installable as a PWA | Native phone app; desktop-only web app | One codebase; phone capture in the basement and laptop review at the desk; browser camera is enough |
| D2 | 2026-10-26 | Run on the Mac laptop first, then a Raspberry Pi home server | Cloud host; Pi from day one | Private, free, nothing to set up before the app exists; Pi is Phase 6 |
| D3 | 2026-10-26 | SQLite file plus a photos folder | Hosted Postgres (Supabase) | Zero infrastructure; backup is a folder copy; full data ownership |
| D4 | 2026-10-26 | Recipes: import Paprika `.paprikarecipes` export in v1; move to self-hosted Mealie (REST API) in Phase 6 | Keep Paprika link-only; AnyList via unofficial API; build recipes into the app | Paprika export format is stable and widely parsed. AnyList has no official API. Mealie is the only option with a documented API and runs on the same Pi |
| D5 | 2026-10-26 | AnyList is out of scope | Push shopping lists later | Grocery tool, not a lab tool; no official API |
| D6 | 2026-10-26 | Readings are manual entry in v1; sensor import designed for but built in Phase 6 | Sensors in Phase 1; manual only forever | Core model first; typed reading table accepts sensor rows later without a schema change |
| D7 | 2026-10-26 | Ferments are the first batch type | Mushrooms; preserves inventory | Tests the protocol snapshot and weekly-log loop with a Paprika recipe immediately. Mushrooms follow in Phase 3 |
| D8 | 2026-10-26 | Standalone app with a clean internal API | First module of a larger "Jarvis" assistant | Ship the thing that gets used in two weeks; a future assistant can read Cellar's data |
| D9 | 2026-10-26 | Name: Cellar. Repo and folder: `cellar` | Root Cellar; Labbook; Basement Lab | Short, covers grow, ferment, and preserves |
| A1 | 2026-10-26 | Single user, no login; home network only | Shared household login; multiple accounts | Nothing to build; revisit only if the Pi is exposed outside the home network |
| A2 | 2026-10-26 | Develop on a Mac laptop; target ARM64 Linux (Raspberry Pi) for the home server | Windows; Linux mini PC | Mac is in hand; Pi scoped in `cellar-brief.md` section 6 |

## Open items (not yet decided)

| # | Item | Needed by | Notes |
|---|---|---|---|
| O1 | Framework: Next.js or SvelteKit | Phase 0 | Claude Code picks and records here with one line of reasoning |
| O2 | Reading kinds and units for ferments | Phase 1 | Starting list in `cellar-brief.md` section 3.7; Seth confirms |
| O3 | Pi model and storage | Phase 6 | Pi 5 with an SSD is the default assumption; confirm when buying |
| O4 | Whether the MYCOntroller or hydroponic tower expose any data | Phase 6 | Assumed no; verify before buying a separate sensor |
