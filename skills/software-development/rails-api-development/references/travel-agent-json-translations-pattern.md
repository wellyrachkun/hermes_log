# Travel Agent JSON Translation Pattern

Complete recipe for adding multi-language JSON translation support to Travel Agent models. Applied successfully to ProductBadge, Location, and Tag.

## Pattern Overview

Each model gets a `translations` JSON column. The original `name`/`description` columns remain as the English/default fallback. Other locales live in the JSON hash. A `translated_name(locale)` helper checks the JSON first, then falls back to the primary column.

## Decision: Which Fields to Translate

**ProductBadge and Tag**: both `name` and `description` are translatable — they are user-facing content labels.

**Location**: only `description` is translatable. `name` (auto-generated: "Badung, Kuta"), `kabupaten`, and `kecamatan` are geographic proper names — they should not be translated. The normalizer's whitelist should be `%w[description]` for Location.

## Full Implementation per Model

### 1. Migration

```bash
rails g migration AddTranslationsTo<Model>s translations:json
rails db:migrate
```

### 2. Model (`app/models/<model>.rb`)

Add these to the model class:

```ruby
attribute :translations, :json, default: {}
before_validation :normalize_translations

def translated(field, locale = I18n.locale)
  locale_str = locale.to_s
  if translations.present? && translations.is_a?(Hash)
    translation_data = translations[locale_str]
    return translation_data[field.to_s] if translation_data.is_a?(Hash) && translation_data[field.to_s].present?
  end
  send(field)
end

def translated_name(locale = I18n.locale)
  translated(:name, locale)
end

def translated_description(locale = I18n.locale)
  translated(:description, locale)
end
```

Private normalizer methods — copy from ProductBadge model. Key difference: the `normalize_translation_hash` whitelist:

- **ProductBadge and Tag**: `%w[name description]`
- **Location**: `%w[description]` (no name — proper geographic names)

### 3. Admin Controller (`app/controllers/<model>s_controller.rb`)

Add `translations: {}` to strong params:

```ruby
def <model>_params
  params.expect(<model>: [ :name, :description, :is_active, translations: {} ])
end
```

### 4. Admin Form (`app/views/<model>s/_form.html.erb`)

Two-tab layout: Main (EN) + Translation. Wrap fields in tab structure with `data-controller="tabs"`.

Main tab: original `name` and `description` fields.
Translation tab: dynamic grid of `Locale.active.ordered.reject { |l| l.locale.to_s == "en" }`.

Input naming: `<model>[translations][<locale>][name]` and `<model>[translations][<locale>][description]`.

For Location: only render the `description` textarea, skip the `name` input.

### 5. Admin Show (`app/views/<model>s/show.html.erb`)

Copy from `app/views/product_badges/show.html.erb`. Same two-tab structure. Load translation entries at top:

```erb
<% translation_entries = (@model.translations || {}).select { |_locale, fields| fields.is_a?(Hash) && fields.values.any?(&:present?) } %>
<% translation_locales = Locale.where(locale: translation_entries.keys).index_by { |l| l.locale.to_s } %>
```

Translation tab: grid of cards per locale showing `name` and `description` (Location: description only).

### 6. API Controller (`app/controllers/api/v1/<model>s_controller.rb`)

Replace `model.name` with `model.translated_name(@locale)` and `model.description` with `model.translated_description(@locale)` in all response builders (index, show, and any nested data helpers).

### 7. ActivitySerializer (`app/serializers/api/v1/activity_serializer.rb`)

Update `serialize_<models>` and `serialize_<models>_summary` to use `translated_name(locale)` and `translated_description(locale)`.

For Location: `name` stays as `loc.name` (untranslated), only `description` uses `loc.translated_description(locale)`.

### 8. Routes (`config/routes.rb`)

Add `/:locale/<models>` for index:

```ruby
get "/<models>", to: "<models>#index"
get "/:locale/<models>", to: "<models>#index"
get "/<models>/:id", to: "<models>#show"
get "/:locale/<models>/:id", to: "<models>#show"
```

### 9. Specs (`spec/requests/api/v1/<model>s_spec.rb`)

- Add `translations: { 'id' => { 'name' => '...', 'description' => '...' } }` to fixture
- Add locale-aware index test (`path '/api/v1/{locale}/<models>'`)
- Assert `name`/`description` match locale-specific values in `id` path tests
- Assert nested `name` from activity serializer matches locale
- For Location: only assert `description` changes, `name` stays untranslated

## Pitfall: Singular vs Plural in `includes`

When eager-loading for activity serializers in nested controllers (show actions), always use the plural association name:

```ruby
.includes(:locations, :tags, :product_badges)  # correct
.includes(:location)  # raises ActiveRecord::ConfigurationError in Rails 8
```

This affects tags, locations, and product badges controllers — all three originally had `:location` (singular) which was a pre-existing bug.

## Pitfall: Forgetting the Show Page

After adding translations to a model, the admin show page (`show.html.erb`) needs the same Translation tab as the form. Copy the pattern from `product_badges/show.html.erb`.

## Verified Test Commands

```bash
# All three together
bundle exec rspec spec/requests/api/v1/product_badges_spec.rb spec/requests/api/v1/locations_spec.rb spec/requests/api/v1/tags_spec.rb
```

Expected: 20 examples, 0 failures (7 badges + 6 locations + 7 tags).

## External Audit Trail

Original product badge implementation: `1119ffb` "add support locale pada product badges".
Subsequent location and tag implementation: same pattern, uncommitted as of session.
