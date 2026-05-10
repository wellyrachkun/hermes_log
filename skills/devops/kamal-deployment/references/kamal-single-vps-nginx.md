# Kamal on single VPS behind existing host Nginx (Session Note)

## Scenario
- App: static Vite SPA
- Deploy target: same VPS already running Nginx on ports 80/443
- Kamal image registry: Docker Hub

## Observed failures

1. `kamal-proxy` startup failed with:
   - `failed to bind host port 0.0.0.0:80/tcp: address already in use`

2. `kamal deploy` failed healthchecks although app container itself was healthy:
   - `Error: target failed to become healthy within configured timeout`
   - `kamal-proxy` logs showed DNS failures resolving container-id hostnames via `127.0.0.53`.

## Working fix path

1. Ensure app provides `/up` endpoint and Docker `HEALTHCHECK`.
2. Configure Kamal proxy to bind loopback port only:
   - `/root/.kamal/proxy/options`
   - `--publish 127.0.0.1:9080:80 --log-opt max-size=10m`
3. Keep `proxy.ssl: false` in `config/deploy.yml` (TLS handled by host Nginx).
4. Recreate Kamal runtime objects when network/proxy state is bad:
   - `docker rm -f kamal-proxy`
   - `docker network rm kamal`
   - `kamal setup`
5. Configure host Nginx vhost:
   - `server_name fin.rachkun.dev`
   - `proxy_pass http://127.0.0.1:9080`
6. Issue cert on host Nginx:
   - `certbot --nginx -d fin.rachkun.dev --redirect`

## Verification used

- `curl -I -H 'Host: fin.rachkun.dev' http://127.0.0.1:9080` -> `200 OK`
- `curl -I https://fin.rachkun.dev` -> `200 OK`
- `docker ps` showed `kamal-proxy` and app container up.

## Pitfall reminder
- Kamal builds from git clone; critical deploy config must be committed or it may deploy with stale settings.
