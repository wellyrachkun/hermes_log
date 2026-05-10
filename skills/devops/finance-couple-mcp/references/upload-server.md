# Finance Couple — File Upload Server

SPA (Vite/React) tanpa backend → upload file diselesaikan dengan Flask server terpisah.

## Arsitektur

```
Browser → nginx:443 → /api/upload/ → Flask (127.0.0.1:9082) → /var/www/fin.rachkun.dev/uploads/
                   → /uploads/*     → nginx static serve dari /var/www/fin.rachkun.dev/uploads/
```

## Komponen

| Komponen | Path/Lokasi |
|----------|-------------|
| Flask server | `/root/projects/freelance/finance_couple/upload-server/server.py` |
| Requirements | `upload-server/requirements.txt` (flask, gunicorn) |
| Venv | `upload-server/venv/` |
| Systemd service | `/etc/systemd/system/finance-upload.service` → `systemctl enable/start finance-upload` |
| Upload dir | `/var/www/fin.rachkun.dev/uploads/` |
| Migration script | `upload-server/migrate_attachments.py` |
| Watchdog | `/root/.local/bin/ensure-cozyfinance-db.sh` — cek `curl http://127.0.0.1:9082/api/upload/health` |

## Nginx Config

Tambahkan di dalam `server { }` block `fin.rachkun.dev.conf`:

```nginx
# Static serve uploaded files
location /uploads/ {
    alias /var/www/fin.rachkun.dev/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}

# Proxy upload API
location /api/upload/ {
    proxy_pass http://127.0.0.1:9082/api/upload/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 10M;
}
```

PENTING: `location /uploads/` dan `location /api/upload/` harus ditaruh **SEBELUM** `location /` agar tidak ditangkap oleh catch-all proxy ke app container.

## Flask Server (server.py)

- Port: 127.0.0.1:9082
- POST `/api/upload/` → terima `multipart/form-data` field `file`, return JSON `{"url": "/uploads/YYYYMMDD_uuid.ext", ...}`
- GET `/api/upload/health` → `{"status": "ok"}`
- Max file: 5MB
- Naming: `YYYYMMDD_<uuid12>.ext`

## Frontend Usage

Di `AddTransactionPage.tsx`:

```tsx
const formData = new FormData();
formData.append("file", file);
const res = await fetch("/api/upload/", { method: "POST", body: formData });
const data = await res.json();
// data.url → "/uploads/20260507_abc123.jpg"
```

Display check (support both old base64 dan new URL):
```tsx
const isImage = att.startsWith("data:image/") || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(att);
```

## Migrasi Base64 → File

Script: `upload-server/migrate_attachments.py`

Jalankan dengan venv yang sudah punya psycopg2:
```bash
/root/hermes-mcp-servers/finance_couple/venv/bin/python3 migrate_attachments.py
```

Proses:
1. Query semua `transactions WHERE attachments IS NOT NULL`
2. Parse JSONB → deteksi base64 data URL (`data:image/...;base64,...`)
3. Decode → simpan ke `/var/www/fin.rachkun.dev/uploads/`
4. Update DB: ganti base64 dengan `/uploads/filename.ext`

Column type: PostgreSQL `jsonb`, auto-deserialized oleh psycopg2 RealDictCursor jadi Python list.

## Pitfalls

| Problem | Fix |
|---------|-----|
| Upload tidak sampai (502/404) | Pastikan `/api/upload/` location ada SEBELUM `/` di nginx |
| Flask tidak start | `systemctl status finance-upload`, cek `journalctl -u finance-upload` |
| venv tidak punya package | `venv/bin/pip install flask gunicorn` |
| psycopg2 tidak ada di venv upload | Gunakan venv MCP server yang sudah ada psycopg2 |
| File terlalu besar | Frontend reject >5MB, nginx `client_max_body_size 10M` |
| Upload service mati setelah reboot | `systemctl enable finance-upload` + watchdog di crontab |
| Kamal deploy overwrite nginx? | Nginx config di luar container (host VPS), tidak kena deploy |
