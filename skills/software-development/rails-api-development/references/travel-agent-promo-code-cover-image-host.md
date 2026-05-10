# Travel Agent promo code activity cover image host

Session-derived note from `~/projects/freelance/travel_agent`.

## Problem

`GET /api/v1/promo_codes` returned nested `activity.cover_image_url` as a relative ActiveStorage path:

```text
/rails/active_storage/blobs/redirect/...
```

The API contract expected an absolute production URL:

```text
https://taraexp.com/rails/active_storage/blobs/redirect/...
```

## Working pattern copied

Use the same convention as `Api::V1::BookingSerializer`: generate the URL with `rails_blob_url` and explicit host/protocol from env.

```ruby
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

Do **not** use:

```ruby
rails_blob_url(activity.cover_image, only_path: true)
```

That intentionally returns a relative path.

## Controller eager loading

When listing promo codes, preload the nested activity translations and ActiveStorage blob:

```ruby
current_affiliator.promo_codes.includes(activity: [
  :activity_translations,
  { cover_image_attachment: :blob }
]).order(created_at: :desc)
```

## Request spec pattern

Set production-like URL env in an `around` block and attach a fake cover image to the activity fixture:

```ruby
around do |example|
  old_app_host = ENV["APP_HOST"]
  old_app_protocol = ENV["APP_PROTOCOL"]

  ENV["APP_HOST"] = "taraexp.com"
  ENV["APP_PROTOCOL"] = "https"

  example.run
ensure
  ENV["APP_HOST"] = old_app_host
  ENV["APP_PROTOCOL"] = old_app_protocol
end

activity.cover_image.attach(
  io: StringIO.new("fake image content"),
  filename: "bali-adventure.webp",
  content_type: "image/webp"
)

expect(data.first.dig("activity", "cover_image_url"))
  .to start_with("https://taraexp.com/rails/active_storage/")
```

## Verification command used

```bash
cd ~/projects/freelance/travel_agent
APP_HOST=taraexp.com APP_PROTOCOL=https mise exec ruby@3.4.5 -- \
  bundle exec rspec spec/requests/api/v1/promo_codes_spec.rb
# 33 examples, 0 failures
```

## Extra environment note

If Ruby 3.4.5 gems are missing in this repo, first run:

```bash
mise exec ruby@3.4.5 -- bundle install --jobs 4
```
