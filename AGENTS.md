<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Car Parts app

Next.js 16.3.4 + React 19 + Tailwind v4. Frontend-only dashboard that talks to an external backend over axios + Socket.IO; there are no Next API routes.

## Commands
- `npm run dev` / `npm run build` / `npm start`
- `npm run lint` runs plain `eslint` (Next 16 removed `next lint` — do not use it)
- No test framework/script. Typecheck with `npx tsc --noEmit` (clean after `next dev`).

## Known current state (don't chase ghosts)
- `npm run lint` reports 3 pre-existing errors (e.g. empty `interface UserStore extends User {}` in `src/stores/userStore.ts`).
- Typecheck quirk: `next build` writes BOTH `.next/types/validator.ts` and `.next/dev/types/validator.ts`, and `tsconfig.json` includes both globs → direct `npx tsc --noEmit` then fails with "Duplicate identifier 'PagesPageConfig'". The build's own typecheck still passes; `rm -rf .next` then `next dev` restores a clean `tsc`.

## Architecture
- Pages Router under `src/pages/` (no `app/` dir). Path alias `@/*` → `./src/*`.
- All state is Zustand + `immer` middleware in `src/stores/`. Mutate only via `useXStore.setState((draft) => { draft.field = ... })`; never spread-replace state.
- Offline-first by design: `useAxios` (src/hooks/useAxios.ts) caches successful GETs to Capacitor Preferences (`hl_get_cache`, 7-day TTL, 60 entries) and queues failed mutations (`hl_offline_queue`). Online/offline banner is driven by `useOfflineStore` + Socket.IO connect/`connect_error` (3s debounce) + successful axios round-trips. Use the provided axios instance — bypassing it breaks offline caching/queueing.
- Auth: tokens in `useDashboardStore`; refresh token persisted under `X-SIG` preference. 401 → one retry via `/user/refresh`; 451 → `router.replace("/subscription-expired")`; logout redirects to `/auth/signin`. Those two pages don't exist yet — they're redirect targets.
- Capacitor plugins (device, preferences, local-notifications) are installed but there's no `capacitor.config.*`; it runs as a plain web app in dev. Capacitor calls are try/catch-wrapped and no-op on web.

## HeroUI v3 (stable 3.2.4)
- Installed `@heroui/react` + `@heroui/styles`; stylesheet imported in `src/styles/globals.css` as `@import "@heroui/styles";` right after `@import "tailwindcss";` (order matters).
- v3 API differs from v2: `addToast` is gone — use `toast()`/`toast.warning(...)`, and toasts require a `<Toast.Provider />` at the app root (mounted in `src/pages/_app.tsx`). No Provider wrapper needed for other components.
- Theme isolation: HeroUI's vars are declared inside `@layer base`, while the app's `:root` tokens in globals.css are unlayered and come after the import — so existing classes (`bg-primary`, `bg-card`, ...) keep their values. An unlayered `:root` block at the end of globals.css maps HeroUI's `--accent`/`--surface`/`--overlay`/`--focus`/`--link` onto the app palette. Keep such overrides unlayered (layered overrides would lose to HeroUI's base layer).
- Global `button:hover`/`:active` styles live in `@layer base` so they don't clobber HeroUI component styles (which are in `@layer components`).
- `<html>` sets `className="light" data-theme="light"` in `src/pages/_document.tsx`. The home page (`src/pages/index.tsx`) has a HeroUI `<Button>` as a smoke test — remove it if unwanted.

## Env & backend
- `NEXT_PUBLIC_API_URL` (in gitignored `.env.local`) is the backend base URL for both axios and socket.io.
- Keep the `X-Platform` header (`client` for axios, `socket` for socket.io) and `ngrok-skip-browser-warning: true`; the backend is often reached via an ngrok tunnel during dev.

## Styling
- Tailwind v4; design tokens are defined in `src/styles/globals.css` as `:root` CSS vars mapped through `@theme inline`. Use semantic classes (`bg-primary`, `bg-card`, `text-secondary`), not raw hex. globals.css also applies global `button:hover`/`:active` styles (in `@layer base`) to plain buttons only — they don't affect HeroUI components.