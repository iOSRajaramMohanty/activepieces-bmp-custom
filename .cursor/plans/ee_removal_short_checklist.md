# EE removal — short checklist

Companion to [remove_ee_folders_and_dependencies.plan.md](./remove_ee_folders_and_dependencies.plan.md).

**Quick re-check (staged files):** `git diff --cached --name-only | while IFS= read -r f; do test -f "$f" || continue; grep -nE "from ['\"].*\\/ee\\/|from ['\"]\\.\\/ee|from ['\"]\\.\\.\\/ee" "$f" && echo "^^ $f"; done`

## Already aligned (typical staged work)

- [ ] Root `package.json`: no `packages/ee/embed-sdk` in `workspaces`; no `ee-embed-sdk` in `lint-core` (if you dropped that package).
- [ ] `tsconfig.base.json`: no `@activepieces/ee-auth`, `@ee/*`, `ee-embed-sdk` → `packages/ee/...`.
- [ ] `packages/web` tsconfig: no `ee-embed-sdk` path to `packages/ee/embed-sdk`.
- [ ] Web sources: no imports of `packages/ee`, `./ee/`, `../ee/`, `ee-embed-sdk`, `@ee/`.

## Phase 1 (server) — done in repo

CE modules no longer import `app/ee` (grep `from '.*ee/` under `packages/server/api/src/app` excluding `ee/` → none). Code that used to live under `app/ee` for CE paths was **moved** to e.g. `platform/platform-plan/`, `project/`, `community/`, `authentication/api-keys`, `authentication/otp`, `app-connection/secret-managers`, `helper/email`, `helper/ce-domain-helper` (`domainHelper`), etc.

**Temporary:** `packages/server/api/tsconfig.app.json` **excludes** `src/app/ee/**/*.ts` so the API build typechecks while the old `ee/` tree still exists for Phase 2 deletion. Remove that exclude when you delete `app/ee`.

## Blockers before deleting `app/ee` + `packages/ee` (Phase 2)

- [x] CE graph: no `../ee/` / `./ee/` imports from non-`ee` server files (verify with grep).
- [ ] **Delete** `packages/server/api/src/app/ee` and **`packages/ee`**, then remove `exclude` for `src/app/ee/**` from `tsconfig.app.json`.
- [ ] Fix or drop **tests** that still import `src/app/ee/...` (integration/unit mocks).
- [ ] `react-ui-sdk` webpack: drop `@activepieces/ee-shared` → `packages/ee/shared`.

## `react-ui-sdk` bundle

- [ ] Remove or replace webpack alias `@activepieces/ee-shared` → `packages/ee/shared` (commercial).
- [ ] Keep `ee-embed-sdk` → local stub **or** remove feature and stub usage entirely.

## Optional MIT path (not commercial)

- [ ] `packages/shared/src/lib/ee/*` may stay per plan **Scope A**; renames are **Scope B**.

## Final gates

- [ ] `scripts/validate-license-compliance.sh` / husky still match your path list after deletes.
- [ ] `npm run lint-dev` (or project-equivalent) green.
- [ ] Smoke: sign-in, flows, platform admin, embed (if CE-supported).
