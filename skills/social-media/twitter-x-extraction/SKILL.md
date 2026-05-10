---
name: twitter-x-extraction
description: "Extract Twitter/X content without authentication — profile timelines, single tweets, media, and search workarounds."
version: 1.0.0
---

# Twitter/X Content Extraction (No Auth)

Extract content from Twitter/X without API keys or login.

## Profile Timeline

```bash
curl -s "https://syndication.twitter.com/srv/timeline-profile/screen-name/USERNAME" | jq
```

The JSON is embedded in `__NEXT_DATA__` — parse that for tweets.

## Single Tweet

```bash
curl -s "https://cdn.syndication.twimg.com/tweet-result?id=TWEETID&token=x"
```

## Media

Images at full resolution:
```
https://pbs.twimg.com/media/MEDIA_KEY?format=jpg&name=orig
```

## Fallback Search

DuckDuckGo HTML (no JS):
```
https://html.duckduckgo.com/html/?q=site:twitter.com+QUERY
```

## Notes

- DeepSeek Vision API cannot process images — use `tesseract` OCR for image text extraction.
