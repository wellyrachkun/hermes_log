# Kamal MySQL accessory: safe revert/recovery after accidental reboot

Use this reference when a Kamal MySQL accessory was rebooted/recreated and production data appears missing, especially when `config/deploy.yml` lacks a stable `directories:` mount.

## Failure pattern

- `kamal accessory reboot db` recreates the MySQL container.
- If the accessory has no named directory mount (for example `directories: - data:/var/lib/mysql`), Docker may attach a new anonymous volume.
- App may boot but data looks empty, e.g. `/api/v1/locales` returns `[]`.
- `docker volume ls` shows multiple anonymous volumes containing MySQL datadirs; the largest/oldest volume often contains the prior data, but verify before switching.

## Safe inspection

On the production host:

```bash
docker ps -a --filter name=<service>-db --format '{{.Names}} {{.Status}} {{.Ports}}'
docker inspect <service>-db --format '{{range .Mounts}}{{.Name}} {{.Source}} {{.Destination}}{{println}}{{end}}'

docker volume ls --format '{{.Name}}' | while read v; do
  if docker run --rm -v "$v":/v alpine sh -c 'test -d /v/mysql || find /v -maxdepth 1 -type d -name "*_production" | grep -q .' >/dev/null 2>&1; then
    size=$(docker run --rm -v "$v":/v alpine sh -c 'du -sh /v 2>/dev/null | cut -f1')
    created=$(docker volume inspect "$v" --format '{{.CreatedAt}}')
    echo "$v $created $size"
  fi
done
```

Avoid mounting a candidate data volume into a long-running MySQL inspection container while also trying to attach it to the real container. If `Unable to lock ./ibdata1 error: 11` appears, another container/process still has the volume open; find and remove it:

```bash
fuser -v /var/lib/docker/volumes/<volume>/_data/ibdata1 || true
docker ps -q | xargs -r docker inspect --format '{{.Id}} {{.Name}} {{.State.Pid}} {{.Mounts}}' | grep <volume> || true
docker rm -f <stale-inspection-container>
```

## Revert pattern

1. Capture current mounted volume and env before changes:

```bash
CURRENT_VOL=$(docker inspect <service>-db --format '{{range .Mounts}}{{if eq .Destination "/var/lib/mysql"}}{{.Name}}{{end}}{{end}}')
docker inspect <service>-db --format '{{range .Config.Env}}{{println .}}{{end}}' > /root/<service>-db.env
chmod 600 /root/<service>-db.env
```

2. Back up the current volume before replacing it:

```bash
mkdir -p /root/<service>_db_revert_backup
TS=$(date +%Y%m%d-%H%M%S)
docker run --rm -v "$CURRENT_VOL":/from:ro -v /root/<service>_db_revert_backup:/backup alpine \
  sh -c "tar czf /backup/${CURRENT_VOL}-${TS}.tgz -C /from ."
```

3. Stop/rename the current DB container, then run a replacement with the selected old volume:

```bash
docker stop <service>-db
docker rename <service>-db <service>-db-before-revert-$TS

docker run -d \
  --name <service>-db \
  --restart unless-stopped \
  --network kamal \
  -p 0.0.0.0:3306:3306 \
  --env-file /root/<service>-db.env \
  -v <old-volume>:/var/lib/mysql \
  mysql:8.0 \
  --default-authentication-plugin=mysql_native_password
```

4. Wait for MySQL, then verify app health and application-level data:

```bash
ROOT_PASSWORD=$(docker inspect <service>-db --format '{{range .Config.Env}}{{println .}}{{end}}' | awk -F= '$1=="MYSQL_ROOT_PASSWORD" {sub(/^MYSQL_ROOT_PASSWORD=/,""); print; exit}')
for i in $(seq 1 60); do
  docker exec -e MYSQL_PWD="$ROOT_PASSWORD" <service>-db mysqladmin ping -uroot --silent && break
  sleep 2
done

curl -sk -o /dev/null -w '%{http_code}\n' https://<domain>/up
curl -sk https://<domain>/<known-data-endpoint>
```

## Important pitfall

This is a production data operation. Confirm the target server and whether the user wants to revert public port/firewall changes vs recover the old DB volume. If asked to “revert your changes”, restore exactly what changed, but keep a backup and verify the data endpoint that exposed the problem.
