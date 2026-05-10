# Locale header failures when DB locales exceed `I18n.available_locales`

## Symptom

Production API returns 500 only for some `Accept-Language` values (for example `jp` or `my`), while `id`/`en` work.

Kamal/Rails logs show:

```text
I18n::InvalidLocale (:jp is not a valid locale)
app/controllers/concerns/api/v1/locale_setup.rb:26:in `set_api_locale'
```

## Root cause pattern

The API may validate the requested language against active rows in a `locales` database table:

```ruby
available_locales = Locale.available_locale_codes
if available_locales.include?(@locale)
  I18n.locale = @locale.to_sym
end
```

But Rails also enforces `config.i18n.available_locales`. If DB contains active locales (`jp`, `my`) that are not listed in `config.i18n.available_locales`, assigning `I18n.locale = :jp` raises `I18n::InvalidLocale` before any fallback can happen.

Example mismatch:

```ruby
# db/seeds.rb
{ locale: 'jp', name: 'Japanese', is_active: true }
{ locale: 'my', name: 'Malay', is_active: true }

# config/application.rb
config.i18n.available_locales = [ :en, :id ]
```

## Fix options

Prefer keeping Rails config aligned with all active DB locales that the API accepts:

```ruby
config.i18n.available_locales = [ :en, :id, :jp, :my ]
config.i18n.fallbacks = true
```

If translations are missing for the new locale, Rails fallbacks can still return English strings as long as the locale itself is allowed.

Alternative: filter against `I18n.available_locales.map(&:to_s)` before assigning, if unsupported DB locales should not be accepted.

## Regression test pattern

Add request specs for every active API locale, including locales that rely on fallback translations:

```ruby
Locale.find_or_create_by!(locale: "jp") { |l| l.name = "Japanese"; l.is_active = true }
Locale.find_or_create_by!(locale: "my") { |l| l.name = "Malay"; l.is_active = true }

get "/api/v1/activities/non-existent-slug", headers: { "Accept-Language" => "jp" }
expect(response).to have_http_status(:not_found)
expect(JSON.parse(response.body)["error"]).to eq("Activity not found")

get "/api/v1/activities/non-existent-slug", headers: { "Accept-Language" => "my" }
expect(response).to have_http_status(:not_found)
expect(JSON.parse(response.body)["error"]).to eq("Activity not found")
```

## Production verification

Before deploy, current production may still show the bug:

```bash
for lang in id jp my; do
  curl -sS -o /tmp/api.json -w "$lang -> %{http_code}\n" \
    -H "Accept: application/json" \
    -H "Accept-Language: $lang" \
    'https://<domain>/api/v1/locales'
done
```

After deploy, all active locales should avoid 500. If `jp`/`my` have no dedicated YAML translation files, content may fall back to English; the important regression is no `I18n::InvalidLocale`.
