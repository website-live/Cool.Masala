# cool-masala

React Router SSR scaffolded by camelAI with Tailwind v4 and shadcn-style UI primitives.

## Commands

- `bun install` installs explicit dependencies and CLIs.
- `bun run dev` starts React Router local development.
- `bun run typecheck` regenerates React Router route types and checks TypeScript.
- `bun run build` typechecks first (`react-router typegen && tsc --noEmit`), then runs `react-router build`, bundles a Cloudflare Worker wrapper, and writes `build/server/wrangler.json` for `deploy_project`. Type errors fail the build — fix them rather than loosening tsconfig.
- `bun run deploy` is included for compatibility; camelAI's `deploy_project` uses the platform direct-deploy path.
- In camelAI chat, call `deploy_project({ project: "<project>" })` once to build, publish, return the live URL, and open the app in preview. Use `dry_run: true` only for build validation without publishing. No manual `set_preview` or `list_apps` call is needed after deploy; `set_preview` remains available for an explicit preview switch.
- In camelAI chat, add bundled shadcn/ui components or full blocks (login pages, sidebar layouts, dashboards) with `add_shadcn_component({ project: "<project>", components: ["accordion", "chart", "login-03"] })` — the whole shadcn catalog is bundled, dependencies resolve automatically, and needed npm packages are added to package.json. Block pages land under `app/blocks/<name>/page.tsx`; register them in `app/routes.ts`. For local development outside camelAI, use `bunx --bun shadcn@latest add <component> --yes`. `components.json`, `app/app.css`, and `~/lib/utils` are already configured.

Build scripts must declare every CLI they use in `dependencies` or `devDependencies`; package scripts can then resolve those binaries from `node_modules/.bin`.

## Persistence (Durable Objects + SQLite)

Use SQLite-backed Durable Objects for persistence: add the class under `workers/`, export it from `workers/app.ts`, and declare it in `wrangler.jsonc` under `durable_objects.bindings` plus a `migrations` entry with `new_sqlite_classes`.

Durable Object SQLite is NOT the D1 API. `this.ctx.storage.sql` has no `.prepare()`, `.bind()`, `.all()`, `.first()`, or `.run()` — D1-style calls fail the build's typecheck. Pass parameters directly to `exec` and read the cursor:

```ts
const rows = this.ctx.storage.sql
  .exec("SELECT * FROM items WHERE owner = ?", ownerId)
  .toArray(); // .one() for a single row, .raw() for column arrays
```

## GitHub staging and production deployments

The repository uses two deployment environments:

- `staging` branch → `cool-masala-staging` Worker and isolated Durable Object storage.
- `main` branch → `cool-masala-prod` Worker and isolated Durable Object storage.

The workflow is in `.github/workflows/deploy-cloudflare.yml`. It also supports a manual run with an explicit `target_environment` input. Configure GitHub Actions environments named `staging` and `production`; protect `production` with required reviewers if desired.

Required repository/environment secrets:

- Shared: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Staging: `STAGING_ADMIN_ACCESS_KEY`, `STAGING_ADMIN_TOTP_SECRET`, `STAGING_NOTIFICATION_FROM_EMAIL`.
- Production: `PROD_ADMIN_ACCESS_KEY`, `PROD_ADMIN_TOTP_SECRET`, `PROD_NOTIFICATION_FROM_EMAIL`.

The workflow records the Worker version/deployment ID, URL when Wrangler emits one, branch, and source SHA in the GitHub Actions step summary. For an emergency rollback:

```bash
bash scripts/rollback-cloudflare.sh production <VERSION_ID>
# or
bash scripts/rollback-cloudflare.sh staging <VERSION_ID>
```

The same rollback is available in Cloudflare Dashboard → Workers & Pages → select the environment Worker → Deployments → version menu → Rollback. This restores the selected Worker version; it does not alter the source branch or Durable Object data.

This app does not currently use KV storage. No fake KV namespace IDs are committed: if KV is added later, create separate staging and production namespaces and add their real IDs under the matching `env` block in `wrangler.jsonc`.
