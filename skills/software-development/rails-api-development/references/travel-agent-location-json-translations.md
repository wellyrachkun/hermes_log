# Travel Agent location JSON translations

Context: Travel Agent Rails API — Location model (`locations` table) needs multi-language `description`. Location `name` is auto-generated from `kabupaten, kecamatan` and is a proper name — it stays untranslated.

## Decision: `name` is not translatable

Location names like "Badung, Kuta" or "Gianyar, Ubud" are proper geographic names. The user explicitly decided only `description` should be localized, not `name`. This is different from ProductBadge where both `name` and `description` are localized.

## Implementation (same pattern as ProductBadge, with field restriction)

1. **Migration**: add `translations` JSON column:
   ```ruby
   add_column :locations, :translations, :json
   ```

2. **Model**: same `translated`/`translated_description` helpers and normalization, but whitelist only `description`:
   ```ruby
   attribute :translations, :json, default: {}
   before_validation :normalize_translations

   def translated(field, locale = I18n.locale)
     # ... same pattern
   end

   def translated_description(locale = I18n.locale)
     translated(:description, locale)
   end

   # normalize_translation_hash whitelist:
   next unless %w[description].include?(field.to_s)
   ```

3. **Admin controller**: permit `translations: {}` in strong params.

4. **Admin form**: use tabs (Main EN + Translation), but Translation tab only has `description` input, no `name`. The kabupaten/kecamatan/lat/long stay outside tabs since they're core data.

5. **API controller** (`location_data` method):
   - `name` → `location.name` (direct column, not translated)
   - `description` → `location.translated_description(@locale)`

6. **ActivitySerializer** (`serialize_locations` + `serialize_locations_summary`):
   - `name` → `loc.name` (direct, not translated)
   - `description` → `loc.translated_description(locale)`

7. **Routes**: add `GET /:locale/locations` for the index endpoint.

## Pitfall: proper names vs translatable fields

Before implementing translations on a model, ask: "Is this field a proper name (geographic, brand, personal) or a generic label?" Proper names should NOT be added to the translation whitelist. If in doubt, ask.

## Spec pattern

Fixture location with translations (description only):
```ruby
Location.create!(
  kabupaten: 'Badung',
  kecamatan: 'Kuta',
  latitude: -8.3405,
  longitude: 115.0920,
  description: 'Beautiful coastal area',
  translations: {
    'id' => { 'description' => 'Daerah pesisir yang indah' }
  }
)
```

Assertions:
- Default/EN: `expect(loc_data['name']).to eq('Badung, Kuta')`
- Locale ID: `expect(loc_data['name']).to eq('Badung, Kuta')` (unchanged), `expect(loc_data['description']).to eq('Daerah pesisir yang indah')`
- Nested activity locations: same pattern — name unchanged, description translated
