# Rails Encrypted Credentials

## Show current credentials

```bash
cd <project> && bin/rails credentials:show
# or if bin/rails doesn't exist:
cd <project> && rails credentials:show
```

## Edit programmatically (no interactive editor)

When you need to add/update credentials from a script or remote session where interactive editors are impractical:

```bash
cd <project> && EDITOR="ruby -e 'data=File.read(ARGV[0]); File.write(ARGV[0], data + %Q{\\nkey:\\n  subkey: \"value\"\\n})'" rails credentials:edit
```

Or to add a nested hash:

```bash
EDITOR="ruby -e 'data=File.read(ARGV[0]); File.write(ARGV[0], data + %Q{\\ngoogle:\\n  client_id: \"xxx.apps.googleusercontent.com\"\\n  client_secret: \"GOCSPX-xxx\"\\n})'" rails credentials:edit
```

## Read credential in code

```ruby
# Preferred: credentials (encrypted, committed)
Rails.application.credentials.dig(:google, :client_id)

# Fallback: env var (for production without master.key)
ENV["GOOGLE_CLIENT_ID"]
```

## Common pattern: credentials with env fallback

```ruby
client_id = Rails.application.credentials.dig(:google, :client_id) || ENV["GOOGLE_CLIENT_ID"]
```

## Production note

`master.key` must exist on the server for `credentials:edit` / `credentials:show` to work. For Kamal deployments, set `RAILS_MASTER_KEY` as a secret env var or ensure the key file is deployed.
