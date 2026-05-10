# ActiveStorage absolute URLs in Rails serializers

Session-derived pattern from a Rails booking API.

## Problem

An endpoint returned nested activity cover images as relative paths like:

```text
/rails/active_storage/...
```

Another endpoint for the same business entity returned absolute URLs like:

```text
https://taraexp.com/rails/active_storage/...
```

The API contract needed the list/my-bookings endpoint to match the by-code endpoint.

## Investigation checklist

1. Search for both endpoint actions and the target JSON key:
   - `my_bookings`
   - `booking by code`
   - `cover_image_url`
   - `rails_blob_url`, `rails_blob_path`, `url_for`
2. Read the controller action to see which serializer is used.
3. Read the serializer method that builds the nested object.
4. Read the working serializer/endpoint to copy the URL generation convention.
5. Check routes/default URL config for host/protocol conventions.

## Fix pattern

Serializer nested object:

```ruby
def serialize_activity(booking)
  activity = booking.activity_package&.activity
  return nil unless activity

  translation = activity.activity_translations.find { |t| t.locale == locale.to_s } ||
                activity.activity_translations.first

  {
    id: activity.id,
    slug: activity.slug,
    title: translation&.title,
    cover_image_url: activity_cover_image_url(activity),
    overall_rating: activity.overall_rating,
    status: activity.status
  }
end

def activity_cover_image_url(activity)
  return nil unless activity.cover_image.attached?

  Rails.application.routes.url_helpers.rails_blob_url(
    activity.cover_image,
    host: default_url_options[:host],
    protocol: default_url_options[:protocol] || "http"
  )
rescue
  nil
end

def default_url_options
  {
    host: ENV.fetch("APP_HOST", "localhost:3000"),
    protocol: ENV.fetch("APP_PROTOCOL", "http")
  }
end
```

Controller eager loading:

```ruby
.includes(activity_package: { activity: [
  :activity_translations,
  { cover_image_attachment: :blob }
] })
```

## Request spec pattern

Use an `around` block so env changes do not leak between tests:

```ruby
around do |example|
  old_host = ENV["APP_HOST"]
  old_protocol = ENV["APP_PROTOCOL"]

  ENV["APP_HOST"] = "taraexp.com"
  ENV["APP_PROTOCOL"] = "https"

  example.run
ensure
  ENV["APP_HOST"] = old_host
  ENV["APP_PROTOCOL"] = old_protocol
end
```

Attach a fake file when only URL generation is being tested:

```ruby
activity.cover_image.attach(
  io: StringIO.new("fake image content"),
  filename: "cover.webp",
  content_type: "image/webp"
)
```

Expectation:

```ruby
expect(json.dig("activity_package", "activity", "cover_image_url"))
  .to start_with("https://taraexp.com/rails/active_storage/")
```

## Related failure encountered

After setting up the test DB and running request specs, unrelated serializer time fields failed with:

```text
NoMethodError: undefined method `strftime' for "09:30":String
```

Robust helper:

```ruby
def format_time(value)
  return nil if value.blank?
  return value.strftime("%H:%M") if value.respond_to?(:strftime)

  value.to_s
end
```

## Verification commands used

```bash
bin/bundle exec rspec spec/requests/api/v1/bookings_spec.rb
# If needed:
RAILS_ENV=test bin/rails db:create db:schema:load
```

Generate sample JSON safely with test data:

```bash
APP_HOST=taraexp.com APP_PROTOCOL=https RAILS_ENV=test bin/rails runner 'puts JSON.pretty_generate(...)'
```

## Reporting

When sending a sample response to a user:

- Keep it concise; include the nested part that proves the fix.
- Show `cover_image_url` starts with the production host.
- State test result and whether the changes are uncommitted/undeployed.
- Never include credentials, tokens, passwords, API keys, or connection strings.
