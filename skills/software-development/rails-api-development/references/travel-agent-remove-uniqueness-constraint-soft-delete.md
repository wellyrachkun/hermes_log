# Removing Uniqueness Constraint on Soft-Delete Models

## Context

Travel Agent had a constraint: 1 promo code per 1 activity per 1 affiliator. The user wanted multiple promo codes per activity per affiliator.

## The Three Layers

Removing a "one per pair" constraint with soft-delete requires unwinding three independent layers:

### 1. Model Validation (`app/models/promo_code.rb`)
```ruby
validates :activity_id,
  uniqueness: {
    scope: :affiliator_id,
    conditions: -> { where(deleted_at: nil) },
  }
```
**Action:** Remove the entire `validates :activity_id, ...` block.

### 2. Database Unique Index
The previous migration (`20260502124500`) created a virtual column and composite unique index for soft-delete safety:
```ruby
add_column :promo_codes, :active_record, :boolean,
  as: 'IF(deleted_at IS NULL, 1, 0)', stored: true

add_index :promo_codes,
  [:activity_id, :affiliator_id, :active_record, :deleted_at],
  unique: true,
  name: 'index_promo_codes_unique_active_per_activity_affiliator'
```

**Action:** Create a new migration that drops the index and virtual column:
```ruby
class RemoveUniqueIndexPromoCodesActivityAffiliator < ActiveRecord::Migration[8.0]
  def up
    remove_index :promo_codes, name: 'index_promo_codes_unique_active_per_activity_affiliator'
    remove_column :promo_codes, :active_record
  end

  def down
    add_column :promo_codes, :active_record, :boolean,
      as: 'IF(deleted_at IS NULL, 1, 0)', stored: true
    add_index :promo_codes,
      [:activity_id, :affiliator_id, :active_record, :deleted_at],
      unique: true,
      name: 'index_promo_codes_unique_active_per_activity_affiliator'
  end
end
```

### 3. Guard Method (`create_promo_code_if_not_exists`)
```ruby
def self.create_promo_code_if_not_exists(activity, affiliator)
  return if exists?(activity: activity, affiliator: affiliator)  # ← REMOVE
  create!(...)
end
```
**Action:** Remove the `return if exists?` line. This guard quietly blocks duplicates even after validation and index are removed.

## Verification

After changes, run:
```bash
RAILS_ENV=development bin/rails db:migrate
RAILS_ENV=test bin/rails db:migrate
RAILS_ENV=test bundle exec rspec spec/requests/api/v1/promo_codes_spec.rb
```

All specs should pass (33 examples, 0 failures in this case).

## API Impact

No controller changes needed. The API controllers (`PromoCodesController#create`, `PromoCodeValidationsController#validate`, `BookingsController#create`) don't assume single-code-per-pair. They look up by `code` string, which remains globally unique.

## Side Effect

With the guard removed, `generate_for_activity` and `generate_for_affiliator` will now **always create new codes** on every call — they won't skip if codes already exist. If a different guard is needed (e.g., max N per pair), add it explicitly.
