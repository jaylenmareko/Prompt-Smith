# Prompt-Smith

Prompt-Smith is an AI prompt generator. A user describes what they want in plain language, and the app generates an optimized prompt for the tool they are targeting, including ChatGPT, Midjourney, and Claude. Users can copy the result, and save prompts under short names for reuse.

## What is in this repo

- `client/` is the web app: dashboard, pricing, privacy, and terms pages, plus the shared UI components.
- `server/` is the backend: sign-in and auth, API routes, storage, and the database layer.
- `shared/` holds the data schema shared by the client and the server.
- `script/` holds the production build script.
- Root config files cover the build, styling, and database tooling.

## Running it

Install dependencies, then use the scripts in `package.json`. The main ones are the dev server, the production build, and the type check.
