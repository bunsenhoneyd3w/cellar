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

## Production build (the Raspberry Pi path)

```sh
npm run build
npm start
```

Serves on port 3000. Set `PORT` to change it.

## Other commands

| Command | What it does |
|---|---|
| `npm run check` | Type-checks Svelte and TypeScript |
| `npm test` | Runs the unit tests once |
| `npm run lint` | Prettier and ESLint checks |
| `npm run format` | Formats the code |
