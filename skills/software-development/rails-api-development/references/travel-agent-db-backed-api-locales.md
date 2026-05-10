# Travel Agent: DB-backed API locales and `I18n::InvalidLocale`

## Symptom

Production API returned 500 when requests included:

```http
Accept-Language: jp
Accept-Language: my
```

`Accept-Language: id` worked.

Kamal app logs showed:

```text
I18n::InvalidLocale (:jp is not a valid locale)
app/controllers/concerns/api/v1/locale_setup.rb:26:in 'Api::V1::LocaleSetup#set_api_locale'

I18n::InvalidLocale (:my is not a valid locale)
app/controllers/concerns/api/v1/locale_setup.rb:26:in 'Api::V1::LocaleSetup#set_api_locale'
```

## Root cause

`locales` DB table had active rows for `jp` and `my`, so API locale validation allowed them. But Rails config only had:

```ruby
config.i18n.available_locales = [ :en, :id ]
```

Then this raised for DB-active locales that Rails did not know about:

```ruby
I18n.locale = @locale.to_sym
```

## Fix pattern

Keep DB active locales as the API source of truth, but avoid DB queries in `config/application.rb`.

```ruby
# config/application.rb
config.i18n.default_locale = :en
config.i18n.available_locales = [ :en, :id ]
config.i18n.enforce_available_locales = false
config.i18n.fallbacks = true
```

```ruby
# app/controllers/concerns/api/v1/locale_setup.rb
available_locales = Locale.available_locale_codes.map(&:to_s)

if available_locales.include?(@locale)
  I18n.locale = @locale.to_sym
else
  @locale = "en"
  I18n.locale = I18n.default_locale
end
```

## Regression test

Seed active `jp` and `my` in the request spec and assert API requests with those headers do not 500; missing translation text should fall back to English.

```ruby
get "/api/v1/activities/non-existent-slug", headers: { "Accept-Language" => "jp" }
expect(response).to have_http_status(:not_found)
expect(JSON.parse(response.body)["error"]).to eq("Activity not found")
```

## Verification commands

```bash
mise exec ruby@3.4.5 -- bundle exec rspec spec/requests/api/v1/locale_header_spec.rb

for lang in id jp my; do
  curl -sS -o /tmp/tara_${lang}.json -w "%{http_code}\n" \
    -H "Accept: application/json" \
    -H "Accept-Language: ${lang}" \
    "https://taraexp.com/api/v1/locales"
done
```

Expected after deploy: `id`, `jp`, and `my` return HTTP 200.
