# Travel Agent activity package `package_name` source of truth

## Symptom

`GET /api/v1/activities/:slug` returned a stale package name such as `Standard Rafting` while the backend/admin UI showed the updated package name `Rafting`.

## Root cause

`Api::V1::ActivitySerializer` serializes nested packages through `ActivityPackageSerializer`, which uses `ActivityPackage#translated_package_name(locale)`. That method previously delegated to `translated(:package_name, locale)` for all locales, so stale `translations['en']['package_name']` could override the canonical `activity_packages.package_name` column.

The admin form edits/displays the primary package name from the `package_name` column. Translation JSON is a supplemental localized layer, not the canonical value for English/default locale.

## Fix pattern

Keep the primary backend column authoritative for English/default API responses:

```ruby
# Get package name for API/admin display.
# English/default locale is the primary backend column. Translation JSON is only
# used for non-primary locales so stale "en" translations do not override the
# current package_name edited in the backend form.
def translated_package_name(locale = I18n.locale)
  return package_name if locale.to_s == "en"

  translated(:package_name, locale)
end
```

## Regression test pattern

In request specs, create an activity package with conflicting values:

```ruby
ActivityPackage.create!(
  activity: activity,
  package_name: "Beach Day Tour",
  translations: {
    "en" => { "package_name" => "Old Beach Package" },
    "id" => { "package_name" => "Tur Pantai Sehari" }
  }
)
```

Assert:
- `/api/v1/activities/:slug` (default/EN) returns `Beach Day Tour`, not stale `Old Beach Package`.
- `/api/v1/id/activities/:slug` still returns `Tur Pantai Sehari`.

## Verification commands

```bash
bin/bundle exec rspec spec/requests/api/v1/activities_spec.rb
bin/bundle exec rspec spec/requests/api/v1/activity_packages_spec.rb
```

## Pitfall

Do not "fix" this in the serializer by reading `package_name` directly everywhere. Keep the locale decision in the model helper so `/api/v1/activity_packages/:id` and nested activity package serialization remain consistent.
