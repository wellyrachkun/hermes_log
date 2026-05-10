---
name: rails-api-development
description: "Use when implementing, debugging, or verifying Ruby on Rails JSON APIs, serializers, request specs, ActiveStorage URLs, and production-like API response examples."
version: 1.1.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [rails, api, serializers, rspec, active-storage, json]
    related_skills: [systematic-debugging, test-driven-development, requesting-code-review]
---

# Rails API Development

## Overview

Use this skill for Rails backend work where the deliverable is a JSON API response: controllers, serializers, request specs, ActiveStorage URLs, authentication-scoped endpoints, and production-like sample payloads.
The default workflow is: identify the endpoint, compare with a working endpoint/serializer, make the smallest serializer/controller change, add or update request specs, run targeted tests, then generate a sanitized sample JSON response if the user asks to see the output.

## When to Use

- User asks to adjust a Rails JSON response shape.
- A serializer returns inconsistent fields across endpoints.
- ActiveStorage images/files appear as relative paths but need absolute URLs.
- Request specs fail after serializer/controller changes.
- User asks for one tested example JSON response.
- Production behavior differs from expected API output and you need to inspect Rails code/tests.
- Adding multi-language JSON translation columns to models with API + admin support.

Don't use this for non-Rails APIs unless Rails conventions are still relevant.

## Workflow

1. **Find the endpoint and response builder**
   - Search routes/controllers for the action name and URL.
   - Search serializers/presenters for the target JSON keys.
   - Read comparable working endpoints completely before patching.

2. **Check git state before edits**
   ```bash
   git status --short --branch
   git log --oneline -5
   ```
   Do not overwrite user changes. Keep final notes clear about modified files and whether changes are uncommitted.

3. **Compare against the working pattern**
   - If endpoint A has the correct output and endpoint B does not, copy the established pattern instead of inventing a new one.
   - Look for existing helpers for `url_for`, `rails_blob_url`, locale/translation fallback, pagination metadata, and auth.

4. **Patch controller loading and serializer together**
   - Serializer changes often require eager loading in the controller to avoid N+1 queries.
   - For nested activity/package responses, preload translations and ActiveStorage blobs when the serializer reads them.

5. **Handle ActiveStorage absolute URLs explicitly**
   - Use `Rails.application.routes.url_helpers.rails_blob_url(...)` for absolute URLs.
   - Provide `host:` and `protocol:` from environment/config.
   - Prefer production-configurable values such as `ENV.fetch("APP_HOST", "localhost:3000")` and `ENV.fetch("APP_PROTOCOL", "http")` when the app does not already centralize `default_url_options`.
   - Use `rails_blob_path` only when the API contract explicitly wants relative paths.

6. **Make serializers robust to test/runtime value types**
   - Rails time/date columns may serialize as `Time`, `Date`, or strings depending on fixture/factory/schema setup.
   - Guard formatting helpers with `respond_to?(:strftime)` and fall back to `to_s` or `nil`.

7. **Update request specs**
   - Set environment host/protocol inside an `around` block and restore prior values.
   - Attach fake ActiveStorage files with `StringIO` when only URL generation is under test.
   - Assert key API contract details, e.g. URL starts with `https://domain/rails/active_storage/`.

8. **Run targeted tests first**
   ```bash
   bin/bundle exec rspec spec/requests/path/to_spec.rb
   ```
   If bundler or gems are missing, install the exact bundler/gems needed for the repo. If test DB is missing, run the repo's setup command or Rails default:
   ```bash
   RAILS_ENV=test bin/rails db:create db:schema:load
   ```

9. **Generate sample JSON when requested**
   - Use `rails runner` in test/development with safe sample data.
   - Set production-like `APP_HOST`/`APP_PROTOCOL` to verify absolute URLs.
   - Redact credentials/tokens/secrets before sending.
   - Include only the relevant slice if the full payload is large.

10. **Final response**
    - State what changed, tests run, pass/fail result, and sample JSON if requested.
    - Say clearly if changes are not committed or not deployed.
    - Ask before production deploy unless the user explicitly requested deploy.

## ActiveStorage URL Pattern

```ruby
def active_storage_url(attachment)
  return nil unless attachment.attached?

  Rails.application.routes.url_helpers.rails_blob_url(
    attachment,
    host: ENV.fetch("APP_HOST", "localhost:3000"),
    protocol: ENV.fetch("APP_PROTOCOL", "http")
  )
rescue
  nil
end
```

## Time Formatting Pattern

```ruby
def format_time(value)
  return nil if value.blank?
  return value.strftime("%H:%M") if value.respond_to?(:strftime)

  value.to_s
end
```

## Primary Column vs Translation JSON Pattern

For API fields that have both a primary database column and locale-specific JSON translations, identify which value the backend/admin UI treats as authoritative before changing serializers. If the admin form displays/edits the primary column, default/English API responses should usually use that column directly; otherwise stale `translations['en']` data can override the real backend value. Keep non-primary locales using translation JSON fallback logic.

Travel Agent example: nested `activity_packages.package_name` in `/api/v1/activities/:slug` should use the `activity_packages.package_name` column for `en`, while `id`/other locales still use `translations[locale]['package_name']`. See `references/travel-agent-activity-package-primary-name.md`.

Regression test pattern: create conflicting values (`package_name: "Current Name"`, `translations['en']['package_name']: "Old Name"`) and assert default/EN API returns the primary column while localized endpoints still return localized translations.

## DB-Backed API Locale Pattern

When API languages are managed in a `locales` database table, treat active DB rows as the source of truth for request headers/params. Do not hardcode every supported app language into `config.i18n.available_locales`, and do not query the DB from `config/application.rb` during boot.

Recommended config:

```ruby
config.i18n.default_locale = :en
config.i18n.available_locales = [ :en, :id ] # locales with YAML files, not the whole DB list
config.i18n.enforce_available_locales = false
config.i18n.fallbacks = true
```

Recommended API concern:

```ruby
available_locales = Locale.available_locale_codes.map(&:to_s)

if available_locales.include?(@locale)
  I18n.locale = @locale.to_sym
else
  @locale = "en"
  I18n.locale = I18n.default_locale
end
```

Why: if DB has active locales like `jp`/`my` but Rails only has YAML/config for `en`/`id`, `I18n.locale = :jp` can raise `I18n::InvalidLocale` and return 500. With `enforce_available_locales = false` plus fallbacks, active DB locales are accepted and missing translations fall back safely.

Add request specs for DB-active locales that lack YAML translations, e.g. `Accept-Language: jp` and `Accept-Language: my`, asserting non-500 responses and fallback text.

## Request Spec Env Pattern

```ruby
around do |example|
  old_host = ENV["APP_HOST"]
  old_protocol = ENV["APP_PROTOCOL"]

  ENV["APP_HOST"] = "example.com"
  ENV["APP_PROTOCOL"] = "https"

  example.run
ensure
  ENV["APP_HOST"] = old_host
  ENV["APP_PROTOCOL"] = old_protocol
end
```

## Legacy Rails 4 / Ruby 2.5 Bundler Setup

For old Rails 4.2 apps that must run on Ruby 2.5.x, prefer per-project Ruby via `mise` plus the lockfile Bundler version. If shell activation is uncertain, run bundle through `mise exec ruby@2.5.9 -- ...` to avoid accidentally using Ruby 3.x.

Key pitfall: Ruby 2.5.9 ships old RubyGems (2.7.x), which cannot install modern precompiled `ffi` 1.17.x gems. Pin `ffi` below 1.17:

```ruby
gem 'ffi', '< 1.17.0'
```

Another pitfall: bigdecimal 4.x removes `BigDecimal.new`, which ActiveSupport 4.2.11.3 still calls. Pin `bigdecimal` at 1.3.x:

```ruby
gem 'bigdecimal', '~> 1.3.0'
```

If `Gemfile.lock` is stale against `Gemfile`, use targeted `bundle _1.17.3_ update <gem>` when possible, or full `bundle _1.17.3_ update --jobs 4` when core Rails/Gemfile versions have drifted. See `references/legacy-rails4-ruby25-bundler.md` for the full recipe and Ubuntu native package list.

## JSON Translation Pattern (Product Badge, Tag, Location)

For adding multi-language JSON translation support to models via a `translations` JSON column. See `references/travel-agent-json-translations-pattern.md` for the full recipe covering all three models, the "proper names" decision for Location, and the checklist.

### Checklist per model

1. **Migration**: `rails g migration AddTranslationsTo<Model>s translations:json && rails db:migrate`
2. **Model**: `attribute :translations, :json, default: {}`, `before_validation :normalize_translations`, `translated_name(locale)`, `translated_description(locale)`, normalizer methods
3. **Admin controller**: `translations: {}` in strong params
4. **Admin form**: Tabs — Main (EN) + Translation grid with `Locale.active.ordered` excluding `en`
5. **Admin show**: Tabs — Main (EN) + Translation grid displaying `translation_entries` per locale
6. **API controller**: `translated_name(@locale)` / `translated_description(@locale)` in all response builders
7. **ActivitySerializer**: `translated_name(locale)` in `serialize_<models>` and `serialize_<models>_summary`
8. **Routes**: add `GET /:locale/<models>` for index, `GET /:locale/<models>/:id` for show
9. **Specs**: fixture with `translations: { 'id' => { ... } }`, locale-aware index assertions, nested activity assertions

## Common Pitfalls

1. **Only changing the serializer.** If the serializer now reads nested translations or blobs, update eager loading too.
2. **Using `rails_blob_path` for public API contracts.** Mobile/frontend consumers often need absolute URLs with host and protocol.
3. **Forgetting host/protocol in tests.** Rails URL helpers may fail or produce localhost/relative values unless configured.
4. **Leaking real data in sample JSON.** Use test/dev sample rows and redact secrets, tokens, phone/email if sensitive.
5. **Letting stale default-locale translation JSON override primary backend columns.** If the admin UI treats the base column as source of truth, make `en`/default helpers return the column and reserve translation JSON for non-primary locales.
6. **Assuming `bundle` exists.** Rails apps may only have `bin/bundle`; install the locked Bundler version if missing.
7. **Skipping test DB setup.** A serializer fix can be correct while specs fail because `RAILS_ENV=test` database has not been created or schema-loaded.
8. **Masking unrelated test failures.** If targeted tests expose an existing serializer bug, fix it only when required to get the relevant suite green and mention it.
9. **DB locales not in `I18n.available_locales`.** If `Accept-Language: jp/my` raises `I18n::InvalidLocale` while `id/en` work, compare active `Locale` rows against `config.i18n.available_locales`; align them or filter before assigning `I18n.locale`. See `references/locale-header-i18n-available-locales.md`.
10. **Singular vs plural association in `includes`.** When eager-loading for activity serializers, always use the plural form: `includes(:locations)` not `includes(:location)`, `includes(:tags)` not `includes(:tag)`, `includes(:product_badges)` not `includes(:product_badge)`. The singular form raises `ActiveRecord::ConfigurationError: Can't join 'Activity' to association named '…'` in Rails 8 when the association is `has_many`.
11. **Proper names vs translatable fields.** When adding translation JSON to models, decide which fields are proper names (identities that should not be translated) vs content that should be localized. Geographic names (`kabupaten`, `kecamatan`, location `name`) are proper names and should stay in the primary column only — don't expose them in translation JSON. See `references/travel-agent-json-translations-pattern.md`.
12. **Forgetting the admin show page.** After adding translation support to a model, the admin show page (`show.html.erb`) also needs a Translation tab — not just the form. Follow the pattern in product badges/show.html.erb.
13. **ActiveRecord session store with separate database.** Some legacy Rails 4 apps (e.g., Erzap main) use `ActiveRecord::SessionStore` with a dedicated session database. If that database doesn't exist, every request fails with `ActiveRecord::NoDatabaseError` even though Rails boots. Create the session database and `sessions` table. See `references/erzap-session-database-setup.md`.
14. **BigDecimal.new removed in bigdecimal 4.x.** Ruby 2.5.9 + ActiveSupport 4.2.11.3 fails to boot with `undefined method 'new' for BigDecimal:Class` if bigdecimal 4.x is resolved. Pin `gem 'bigdecimal', '~> 1.3.0'` in Gemfile and `bundle update bigdecimal`. See `references/legacy-rails4-ruby25-bundler.md`.
15. **Using `.count` on eager-loaded associations.** `product.product_variants.count` always fires `SELECT COUNT(*)` even when variants were eager-loaded with `includes(:product_variants)`. Use `.size` (or `.length`) to use the loaded collection in-memory — zero extra queries. This is a common N+1 trap in views that display variant counts or iterate associations.
16. **Removing a uniqueness constraint on soft-delete models.** When relaxing \"one per pair\" rules, you must unwind three layers: (a) model `validates … uniqueness: { scope: …, conditions: … }`, (b) the unique DB index (often paired with a virtual `active_record` / `is_active` column in MySQL), and (c) any guard `return if exists?(…)` in create helpers. Don't forget the guard — it silently blocks duplicates even after validation and index are removed. See `references/travel-agent-remove-uniqueness-constraint-soft-delete.md`.\n17. **Aggregating child data in admin index views.** When an admin index displays child-association aggregates (count, min/max price from variants), add `includes(:association)` in the controller, compute aggregates in a model method that iterates the loaded collection, and use `.size` (not `.count`) in the view — `.count` always triggers a SQL COUNT even with eager-loading. See `references/n-plus-one-admin-index-aggregates.md`.

## Verification Checklist

- [ ] Endpoint action, route, and serializer identified.
- [ ] Comparable working endpoint/serializer checked.
- [ ] Controller eager loading matches serializer data access.
- [ ] Request specs cover the changed JSON contract.
- [ ] Targeted RSpec command passes.
- [ ] Sample JSON generated from safe test/dev data when requested.
- [ ] Final response includes modified files, test result, and commit/deploy status.

## References

- `references/rails-admin-index-eager-loading-variant-prices.md` — Admin index pattern: eager-load variants with `includes`, compute min-max price in-memory, use `.size` not `.count`.
- `references/active-storage-absolute-url-in-serializers.md` — example from a booking API where `my_bookings` needed `https://taraexp.com/rails/active_storage/...` instead of a relative path.
- `references/travel-agent-promo-code-cover-image-host.md` — Travel Agent `/api/v1/promo_codes` fix: replace `only_path: true` with env-backed `rails_blob_url`, eager-load cover image blobs, and verify with the targeted request spec.
- `references/travel-agent-db-backed-api-locales.md` — Travel Agent API locale fix: DB active locales as source of truth, `enforce_available_locales = false`, fallback translations, and Kamal/curl verification for `Accept-Language: jp/my`.
- `references/travel-agent-json-translations-pattern.md` — JSON translation pattern for multi-language models: ProductBadge, Tag, and Location with the "proper names" decision for geographic fields.
- `references/travel-agent-activity-package-primary-name.md` — Travel Agent activity package `package_name` regression: default/EN API should use the primary column, not stale translations JSON.
- `references/locale-header-i18n-available-locales.md` — Debugging `Accept-Language` 500s where active DB locales (`jp`, `my`) are missing from `config.i18n.available_locales`, causing `I18n::InvalidLocale` despite fallbacks.
- `references/erzap-session-database-setup.md` — Erzap main: ActiveRecord session store with separate `erzap_session` database. Missing DB causes 500 on all requests.
- `references/rails-encrypted-credentials.md` — Editing Rails encrypted credentials programmatically via `EDITOR` env var, read patterns with env fallback, and production notes.
- `references/travel-agent-google-oauth-setup.md` — Travel Agent Google OAuth: API flow vs web flow endpoints, gem requirements, credential setup, User model `from_google_oauth` logic, and production checklist.
- `references/travel-agent-remove-uniqueness-constraint-soft-delete.md` — Pattern: removing uniqueness constraint on soft-delete models (model validation + DB index + guard method). Travel Agent promo codes: allow multiple per activity per affiliator.
- `references/n-plus-one-admin-index-aggregates.md` — Fixing N+1 in admin HTML index views: eager-load child associations, compute min/max in-model, use `.size` not `.count`. Example from Joy Phone products index.
