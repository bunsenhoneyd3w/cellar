# Cellar

Single-user lab notebook for a basement grow and preservation room: ferments, mushroom grows, hydroponic tower, pepper and flower seedlings, and canned or preserved goods. Owner: Seth, Stevens Point, WI. First app he has built. Explain choices in plain English when asked.

## Core idea

Everything grown, fermented, or preserved is a **batch**. A batch runs in a **space**, uses **equipment**, follows a versioned **protocol**, and collects dated **observations** with typed **readings** and photos. A batch ends with an **outcome**. Preserved results become **inventory items**. **Tasks** hang off batches. One data model, several batch types.

## Non-negotiable rules

1. Data lives in one SQLite file plus one photos folder. Copying those two things is a complete backup.
2. Every table exports to CSV and JSON from a settings page.
3. Every entity has a readable id, `created_at`, and `updated_at`.
4. Protocols are snapshotted into the batch at creation. Editing a protocol never changes an existing batch.
5. Readings are typed rows (kind, value, unit, taken_at), never free text, so they can be charted and compared.
6. Photos are files on disk, referenced by path. No blobs in the database.
7. Tests on the data layer. A schema change must not break old batches.
8. Runs with one command on a Mac laptop now and on a Raspberry Pi (ARM64 Linux) later. No dependency that fails on ARM.
9. No login in v1. The app is served on the home network only.
10. Mobile first. The main capture screens (new observation, photo, reading, task done) must work one-handed on a phone in a basement. Installable as a PWA.

## Stack (chosen for simplicity, do not relitigate without asking)

- TypeScript end to end
- Full-stack web framework with server routes (Next.js or SvelteKit; pick one and record it in DECISIONS.md)
- SQLite via a lightweight typed ORM with migrations
- Tailwind for styling; keep the UI plain and fast
- Photo uploads resized server-side to a sane max dimension; originals kept

## Data model

See `cellar-brief.md` section 3 for field-level definitions. Summary:

- `space` (id, name, kind, parent_space_id, notes)
- `equipment` (id, name, kind, model, specs_json, space_id, notes)
- `protocol` (id, name, batch_type, version, source, body_json, notes)
- `batch` (id, name, batch_type, protocol_snapshot_json, space_id, started_at, ended_at, status, phase, notes)
- `batch_equipment` (batch_id, equipment_id)
- `observation` (id, batch_id, observed_at, phase, note)
- `reading` (id, observation_id, kind, value, unit, taken_at)
- `photo` (id, observation_id, path, caption, taken_at)
- `outcome` (id, batch_id, yield_value, yield_unit, rating, summary, would_change)
- `inventory_item` (id, batch_id, name, quantity, unit, space_id, packed_at, use_by, status)
- `task` (id, batch_id, title, due_at, done_at, recurrence)

Batch types in v1: `ferment`. Added in later phases: `mushroom`, `hydroponic`, `seedling`, `preserve`.

## Build order

Work one vertical slice at a time: schema, server route, screen, test, commit. Do not scaffold all screens up front. Phases are in `cellar-brief.md` section 5. Phase 1 is ferments.

## Working style

- Use plan mode for anything larger than a small fix. Present the plan, wait for approval.
- One feature per session. Commit after each working feature with a plain-English message.
- When a choice has consequences later (schema, library, hosting), stop and ask. Record the answer in DECISIONS.md.
- US spelling. No em dashes anywhere, including UI copy and comments.
- Temperatures in °F. Store readings with their unit; do not assume.

## Out of scope

- Grocery lists and AnyList. Never integrate.
- Rebuilding a recipe manager. Recipes come in from Paprika export files (v1) and later from a self-hosted Mealie API.
- Multi-user accounts.
- Wild mushroom identification of any kind.
