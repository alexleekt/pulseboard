# Repository Guidelines

## Project Structure & Module Organization
Code lives in `app/` (Next.js routes and server actions) and `components/` (shared UI). Feature helpers sit in `lib/`, while static data sources are under `data/`. Public assets and icons are in `public/`. Configuration lives in files at the repo root (`next.config.ts`, `eslint.config.mjs`, `tailwind` and `postcss` configs). Support scripts, including vector-store helpers, are in `scripts/`; they expect to be run from the project root.

## Build, Test, and Development Commands
Install dependencies with `bun install` (preferred) or `npm install`. Start local development via `bun run dev` to launch Next.js with Turbopack. Build production assets using `bun run build`, then verify with `bun run start`. Lint the codebase using `bun run lint`. To work with the embedded ChromaDB service, use `bun run chroma:start` (or `stop`, `restart`, `status`, `logs`).

## Coding Style & Naming Conventions
This project uses TypeScript, React Server Components, and Tailwind. Follow ESLint recommendations (`bun run lint`) and prefer 2-space indentation. Name React components and files with PascalCase (e.g., `TeamCard.tsx`), hooks with `use` prefixes, and utility modules in `lib/` with camelCase filenames. Co-locate component-specific styles or helper functions next to the component. Keep imports absolute from the project root when clarity improves readability.

## Testing Guidelines
Automated tests are not yet in place; add new tests alongside features. Use Playwright or Jest with React Testing Library depending on scope, naming files `*.spec.ts(x)` next to the code under test. When adding features, cover edge cases for async server actions and serializing data read from `data/` sources. Ensure Chroma-dependent workflows are mocked in tests.

## Commit & Pull Request Guidelines
Adopt Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) to keep history readable. Keep messages under 72 characters on the subject line, expanding critical context in the body. Pull requests should include a concise summary, screenshots or recordings for UI changes, testing evidence (`bun run lint`, relevant specs), and references to tracked issues. Flag any required environment variables or Chroma setup changes in the description to help reviewers.

## Environment & Services
ChromaDB runs locally via the scripts in `scripts/`. Ensure Docker Desktop is available before invoking `bun run chroma:start`. Environment variables belong in `.env.local` (not checked in); mirror any changes in the PR description so other contributors can reproduce your setup.
