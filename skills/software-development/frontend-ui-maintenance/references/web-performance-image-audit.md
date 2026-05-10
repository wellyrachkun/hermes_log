# Web Performance: Image Audit Technique

## When to Use

Page feels sluggish, especially on mobile, and especially while images are loading. The goal:
quantify total page image weight, identify the worst offenders (oversized dimensions, bloated
file sizes), and surface structural issues (no lazy loading, Active Storage redirects, no CDN).

## Step-by-Step Workflow

### 1. Extract all image URLs + intrinsic dimensions

```
browser_get_images
```

The returned `width`/`height` are the **intrinsic** (natural) dimensions, not CSS rendering size.
Compare these against the displayed size (usually far smaller) to identify waste.

### 2. HEAD-request images for file sizes

Use `execute_code` (Python) to send HEAD requests and grab `Content-Length`:

```python
import urllib.request
for url in image_urls:
    req = urllib.request.Request(url, method='HEAD')
    resp = urllib.request.urlopen(req, timeout=15)
    size = int(resp.headers.get('Content-Length', 0))
    # log per-image size + running total
```

This gives you the raw transfer size per image. Sum to get total page image weight.

### 3. Capture browser-side load timing

```
browser_console
expression: performance.getEntriesByType('resource')
  .filter(r => r.name.includes('.png') || r.name.includes('.jpg'))
  .map(r => ({name: r.name.split('/').pop().substring(0,40),
              duration: Math.round(r.duration),
              transferSize: r.transferSize,
              decodedBodySize: r.decodedBodySize}))
```

`duration` = total fetch+decode time. Images >300ms need attention; >500ms are severe.

### 4. Check for structural anti-patterns

- **Active Storage redirects**: URLs like `/rails/active_storage/blobs/redirect/...` mean
  2 HTTP round-trips per unique image (Rails → DB → 302 redirect → file). Count these.
- **No `loading="lazy"`**: grep the HTML for `<img` tags lacking the attribute.
- **No CDN**: if `config.active_storage.service = :local` in production, all images hit the
  app server directly.
- **PNG for photos**: photos should be JPEG or WebP. PNG is for graphics/logos with transparency.
- **Repeated images**: carousel/marquee patterns often render the same image N times.
  Browser caching helps, but N `<img>` tags still cost parse time.

## Red-Flag Thresholds

| Metric | Yellow | Red |
|--------|--------|-----|
| Single image | >200 KB | >500 KB |
| Total page image weight | >2 MB | >5 MB |
| Image intrinsic width vs displayed | 3× | 10×+ |
| Image load duration | >300ms | >500ms |
| Active Storage redirect images | >5 | >10 |

## Example: joy-phone.cloud (2026-05-08)

- Total image weight: **~5.2 MB** (30 images)
- Logo: 4566×655px intrinsic, displayed ~150px → **30× waste**
- 3 promo images: 964–1366 KB each (1080×2202, PNG)
- Social icons: 360–903px intrinsic, displayed 20px → **18–45× waste**
- All images PNG, no lazy loading, no CDN, Active Storage redirects throughout
- Load durations: 300–421ms per image, total load wall-clock >5s on cold cache
