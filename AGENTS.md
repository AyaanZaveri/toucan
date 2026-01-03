# Repository Guidelines

## Project Structure & Module Organization
- `src/app` holds Next.js App Router entry points (`layout.tsx`, `page.tsx`, `globals.css`).
- `src/components` contains React components; `src/components/ui` is for reusable UI primitives.
- `src/lib` is shared utilities and domain logic; `src/lib/comfy` models ComfyUI data.
- `public` is for static assets; `backend-info.md` documents backend expectations.
- Core config lives in `next.config.ts`, `tsconfig.json`, `biome.json`, and `postcss.config.mjs`.

## Build, Test, and Development Commands
Use pnpm for all workflows.
- `pnpm dev` starts the local Next.js dev server.
- `pnpm build` creates a production build.
- `pnpm start` serves the production build locally.
- `pnpm lint` runs Biome lint checks.
- `pnpm format` formats the codebase with Biome.
- `pnpm typecheck` runs TypeScript checks without emitting output.

## Coding Style & Naming Conventions
- Indentation is 2 spaces; semicolons are added only when needed by Biome.
- TypeScript + React only; keep `.tsx` for React components.
- Component and hook exports use PascalCase and `useX` naming.
- File names are lowercase (e.g., `graph.tsx`, `objectInfo.ts`).
- Prefer `@/` path aliases (e.g., `@/components/ui/dialog`).

## Testing Guidelines
There is no automated test runner configured yet. If you add tests, colocate them under `src/**/__tests__` or use `*.test.ts(x)` naming and wire a script in `package.json` to run them. At minimum, run `pnpm lint` and `pnpm typecheck` before opening a PR.

## Commit & Pull Request Guidelines
Recent commits use short, imperative summaries (e.g., "add backend info doc"); follow that style unless a new convention is introduced. Keep commits focused and scoped to one change. For PRs, include a clear description of behavior changes, link related issues, and add screenshots or screen recordings for UI changes. See `CONTRIBUTING.md` for contribution expectations and review resources.

## Configuration & Local Setup
The frontend expects a ComfyUI backend. By default it targets `http://127.0.0.1:8188`; override with `NEXT_PUBLIC_COMFY_API_BASE` in `.env.local` when pointing at a different host.
