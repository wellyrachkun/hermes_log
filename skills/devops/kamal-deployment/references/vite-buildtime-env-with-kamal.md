# Vite build-time env with Kamal (static frontend)

## Failure signature
- Site is reachable over HTTPS, but app behaves as if env missing (offline/fallback mode).
- `kamal deploy` logs show: `Building from a local git clone, so ignoring these uncommitted changes`.
- Docker build step for generated env file shows empty values, e.g.:
  - `RUN printf "VITE_SUPABASE_URL=%s ..." "" "" > .env.production`

## Root cause
1. Vite reads `import.meta.env.VITE_*` at build time.
2. Runtime env injection (`env.secret`) does not modify already-built `dist` assets.
3. `builder.args: ${VAR}` resolves from deploy shell env, not from `.kamal/secrets`.
4. Uncommitted Dockerfile/deploy.yml changes are ignored by Kamal clone-build.

## Proven fix
1. Pass required public vars to image build (builder args).
2. Generate `.env.production` before `npm run build` in Dockerfile if needed.
3. Commit config and Dockerfile changes, then deploy.
4. Verify by downloading current JS bundle and checking expected strings exist (e.g. Supabase URL/key).

## Notes
- Supabase publishable/anon key is safe for frontend; never embed service-role keys.
- Keep sensitive credentials in `.kamal/secrets` for runtime-only services.