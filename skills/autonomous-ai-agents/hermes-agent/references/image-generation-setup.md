# Image Generation Setup

## Quick Start

Image generation requires a `FAL_KEY` in `~/.hermes/.env`. FAL.ai is the primary backend and also hosts third-party models (GPT Image 2, Gemini, etc.) through a single API key.

```bash
echo 'FAL_KEY=fal-xxxxxxxxxxxxxxxx' >> /root/.hermes/.env
```

Restart session (`/reset`) after setting the key.

**FAL.ai has a free tier** — no credit card required. Sign up at https://fal.ai.

---

## Backends & Providers

### Primary: FAL.ai (recommended)

Single `FAL_KEY` gives access to all models below. This is the default and recommended path.

| Model ID | Display | Real Provider | Speed | Price |
|----------|---------|---------------|-------|-------|
| `fal-ai/flux-2/klein/9b` | FLUX 2 Klein 9B | Black Forest Labs | <1s | $0.006/MP |
| `fal-ai/flux-2-pro` | FLUX 2 Pro | Black Forest Labs | ~6s | $0.03/MP |
| `fal-ai/z-image/turbo` | Z-Image Turbo | Z-Image | ~2s | $0.005/MP |
| `fal-ai/nano-banana-pro` | Nano Banana Pro (Gemini 3 Pro) | Google | ~8s | $0.15/img |
| `fal-ai/gpt-image-1.5` | GPT Image 1.5 | OpenAI | ~15s | $0.04–0.08/img |
| `fal-ai/gpt-image-2` | GPT Image 2 | OpenAI | ~20s | $0.04–0.06/img |
| `fal-ai/ideogram/v3` | Ideogram V3 | Ideogram | ~10s | $0.04/img |
| `fal-ai/recraft-v4-pro` | Recraft V4 Pro | Recraft | ~10s | $0.04/img |
| `fal-ai/qwen-image` | Qwen Image | Alibaba | ~5s | $0.005/img |

**Model selection:** `hermes tools` → Image Generation → pick model. Persisted to `image_gen.model` in `config.yaml`.

**FAL.ai vs OpenAI direct for GPT Image 2:**

|  | Via FAL.ai | Via OpenAI Plugin |
|---|---|---|
| Key | `FAL_KEY` | `OPENAI_API_KEY` |
| Quality tiers | Medium (fixed) | Low / Medium / High |
| Price | $0.04–0.06/img | ~$0.02 / ~$0.07 / ~$0.19 |
| Resolution | up to 1024×1024 | up to 1536×1024 |
| Free tier | ✅ | ❌ (needs card) |

FAL's medium-tier GPT Image 2 is price-competitive with OpenAI direct ($0.04-0.06 vs $0.07). FAL wins on convenience — one key for all models, no card verification.

### Alternative: OpenAI Direct Plugin

Plugin at `plugins/image_gen/openai/`. Requires `OPENAI_API_KEY`, `pip install openai`.

Three quality tiers for gpt-image-2:
- `gpt-image-2-low` — ~15s, fastest/cheapest
- `gpt-image-2-medium` — ~40s, balanced (default)
- `gpt-image-2-high` — ~2min, highest fidelity

Configure via `hermes tools` → Image Generation → OpenAI.

### Alternative: OpenAI Codex Plugin

Plugin at `plugins/image_gen/openai-codex/`. Uses ChatGPT/Codex OAuth — no separate `OPENAI_API_KEY` needed if already logged in via `hermes login --provider openai-codex`. Same tier IDs as the direct OpenAI plugin.

### Alternative: xAI Plugin

Plugin at `plugins/image_gen/xai/`. Requires `XAI_API_KEY`.

---

## Configuration

### Env vars

| Var | Backend | Required |
|-----|---------|----------|
| `FAL_KEY` | FAL.ai | Yes (for FAL backend) |
| `OPENAI_API_KEY` | OpenAI direct | Yes (for OpenAI plugin) |
| `XAI_API_KEY` | xAI | Yes (for xAI plugin) |

### Config keys (config.yaml)

```yaml
image_gen:
  model: fal-ai/flux-2/klein/9b   # active model
  # For OpenAI plugin:
  openai:
    model: gpt-image-2-medium
  # For Codex plugin:
  openai-codex:
    model: gpt-image-2-medium
```

---

## Troubleshooting

### Image generation tool not appearing
- Check `FAL_KEY` is set and non-empty in `~/.hermes/.env`
- Verify `image_gen` toolset is enabled: `hermes tools` → check platform
- Restart session: `/reset`

### "FAL_KEY not configured"
The `image_generate` tool requires `FAL_KEY`. If using the OpenAI or Codex plugins instead, ensure those are configured and the FAL backend is not selected.

### Switching between FAL and OpenAI
Use `hermes tools` → Image Generation to select the active provider/backend. The `image_gen.model` config key stores the active model.
