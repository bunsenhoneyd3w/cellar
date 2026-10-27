# Cellar

Single-user lab notebook for a basement grow and preservation room. See `CLAUDE.md` for the standing brief, `cellar-brief.md` for the full plan, and `DECISIONS.md` for every choice made so far.

## Run it

Needs Node LTS (installed with nvm on the Mac). Install dependencies once:

```sh
npm install
```

Then one command starts the app and exposes it on the home network so the phone can load it:

```sh
npm run dev
```

Open the "Network" URL that Vite prints on the phone, or `http://localhost:5173` on the laptop.

To try things without touching your real data, `npm run dev:scratch` runs on port 5175 and keeps its database and photos in `.scratch/` instead.

## Production build (the Raspberry Pi path)

```sh
npm run build
npm start
```

Serves on port 3000 over plain HTTP, reachable from the phone at the laptop's network address. Set `PORT` to change it. `npm start` runs `server.js`, which accepts uploads up to 500 MB (phone photos, Paprika exports); see D16 in `DECISIONS.md`.

## Where the data lives

| What | Default | Move it with |
|---|---|---|
| Database | `data/cellar.db` | `CELLAR_DATA_DIR` |
| Photos | `photos/` (resized copies), `photos/originals/` | `CELLAR_PHOTOS_DIR` |

Copying those two is a complete backup. Copy the database while the app is stopped, or also copy the `cellar.db-wal` and `cellar.db-shm` files next to it. Settings in the app downloads every table as CSV or JSON.

The app creates the database and applies any pending migrations when it starts. After changing `src/lib/server/db/schema.ts`, run `npm run db:generate` to write the next migration into `drizzle/`, and commit it.

## Using it (Phase 1: ferments)

1. More, Spaces: add the basement room, then shelves inside it.
2. More, Equipment: add jars, crocks, airlocks, meters.
3. Protocols, Import from Paprika: in Paprika choose File, Export, then pick the `.paprikarecipes` file and tick the ferments. Edit a protocol to add target ranges (pH, salinity) and expected days; each edit is a new version.
4. Start batch from a protocol. The method is frozen into the batch at that moment.
5. Add observation from the batch page, on the phone: photos, readings, note, phase.
6. Finish batch: done or failed, yield, rating, what to change.

## Using it (Phase 2: Today and tasks)

1. Today shows what is overdue, what is due today, the coming week, and undated tasks, above the active batches. Tap Done on a task; Undo shows for a few seconds if you hit the wrong one.
2. Add task from Today (general) or from a batch page. A repeating task (every day, every week, every few days) makes its next copy when you tap Done, counted from the day you did it, and can stop after a date.
3. Edit a protocol to give it "Tasks for each batch", such as "Top up airlock water, day 1, every week, last day 28". Every batch started from it gets those tasks.
4. On Add observation, tick the tasks you did. Ticking alone is enough to save.

## Other commands

| Command | What it does |
|---|---|
| `npm run check` | Type-checks Svelte and TypeScript |
| `npm test` | Runs the unit tests once |
| `npm run dev:scratch` | Dev server with throwaway data in `.scratch/` |
| `npm run db:generate` | Writes a migration after a schema change |
| `npm run lint` | Prettier and ESLint checks |
| `npm run format` | Formats the code |
