# Legacy Rails 4 / Ruby 2.5 Bundler Setup Notes

Use for Rails 4.2 projects that must run on Ruby 2.5.x on modern Ubuntu hosts.

## Known-good pattern

- Use `mise` for per-project Ruby selection:
  ```bash
  cd /path/to/project
  mise use ruby@2.5.9
  printf '2.5.9\n' > .ruby-version
  ```
- Install the Bundler version from `Gemfile.lock`:
  ```bash
  gem install bundler -v 1.17.3 --no-document
  bundle _1.17.3_ -v
  ```
- Run bundle commands through the project Ruby if shell activation is uncertain:
  ```bash
  mise exec ruby@2.5.9 -- bundle _1.17.3_ check
  mise exec ruby@2.5.9 -- bundle _1.17.3_ install --jobs 4
  ```

## RubyGems 2.7 / ffi pitfall

Ruby 2.5.9 ships old RubyGems (e.g. 2.7.6.x). Modern precompiled `ffi` 1.17.x gems require RubyGems `>= 3.3.22`, causing errors like:

```text
ffi-1.17.2-x86_64-linux-musl requires rubygems version >= 3.3.22,
which is incompatible with the current version, 2.7.6.3
```

Fix by pinning ffi below 1.17 in `Gemfile`:

```ruby
# RubyGems 2.7 (Ruby 2.5.9) cannot install ffi 1.17.x precompiled gems
gem 'ffi', '< 1.17.0'
```

Then update/install:

```bash
bundle _1.17.3_ update ffi --jobs 4
bundle _1.17.3_ install --jobs 4
```

## Lockfile drift pitfall

Old SVN Rails apps may have a `Gemfile.lock` that no longer matches the current `Gemfile` (for example `Gemfile` says Rails 4.2.11.3 or `public_suffix 4.0.7` while lockfile still has Rails 4.2.3 or `public_suffix 3.1.1`). Bundler will fail with messages like:

```text
The bundle currently has public_suffix locked at 3.1.1.
Try running `bundle update public_suffix`
```

or Rails dependency conflicts. Prefer targeted update when possible:

```bash
bundle _1.17.3_ update public_suffix ffi --jobs 4
```

If the lockfile is substantially stale against the Gemfile, run:

```bash
bundle _1.17.3_ update --jobs 4
```

Verify afterwards:

```bash
bundle _1.17.3_ check
ruby -e 'require "bundler/setup"; puts "bundler setup ok"'
```

## bigdecimal 4.x pitfall (ActiveSupport 4.2 + Ruby 2.5.9)

Ruby 2.5.9 ships with bigdecimal 1.3.4 as default, but modern gem resolution can pull in
bigdecimal 4.x (e.g. 4.0.1). Bigdecimal 4.x removed `BigDecimal.new`, which
ActiveSupport 4.2.11.3 calls in `duplicable.rb`. Result:

```text
/activesupport-4.2.11.3/lib/active_support/core_ext/object/duplicable.rb:111:
in `<class:BigDecimal>': undefined method `new' for BigDecimal:Class (NoMethodError)
```

Fix: pin bigdecimal at 1.3.x in Gemfile alongside ffi:

```ruby
gem 'ffi', '< 1.17.0'
gem 'bigdecimal', '~> 1.3.0'
```

Then update:

```bash
mise exec ruby@2.5.9 -- bundle _1.17.3_ update bigdecimal --jobs 4
```

Verify (must run through bundle exec — system ruby still uses 4.x default):

```bash
mise exec ruby@2.5.9 -- bundle exec ruby -e \
  "require 'bigdecimal'; puts BigDecimal.new('1.0')"
# => 0.1e1
```

## Native package dependencies seen on Ubuntu 24.04

For Rails 4 apps using `mysql2`, `rmagick`, `sassc`, `fast_excel`, and assets:

```bash
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  build-essential autoconf bison libyaml-dev libreadline-dev zlib1g-dev \
  libncurses-dev libffi-dev libgdbm-dev libdb-dev uuid-dev \
  default-libmysqlclient-dev libmagickwand-dev pkg-config imagemagick nodejs
```

