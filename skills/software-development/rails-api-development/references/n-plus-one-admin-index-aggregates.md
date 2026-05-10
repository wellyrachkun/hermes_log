# N+1 in Admin HTML Index: Aggregating Child Data

## Problem

Admin HTML index pages that display aggregated data from `has_many` associations (counts, min/max, sums) often trigger N+1 queries when:
1. The controller queries without `includes`
2. The view calls `.count` on the association (always hits DB, even with eager-load)
3. The view reads child records without eager-loading

## Example: Joy Phone Products Index

**Before (N+1):**
```ruby
# controller — no eager loading
def index
  @products = Product.all  # 1 query
end
```
```erb
<!-- view — N+1 per product -->
<%= product.price %>                    <!-- reads stale parent column, not variant data -->
<%= product.product_variants.count %>   <!-- COUNT query per product -->
```

**After (fixed):**
```ruby
# controller — eager load variants
def index
  @products = Product.includes(:product_variants, :product_category).order(:name)
end
```

```ruby
# model — compute min/max from loaded association (0 extra queries)
def variant_price_range
  prices = product_variants.select { |v| v.price.to_f > 0 }.map(&:price)
  return nil if prices.empty?
  { min: prices.min, max: prices.max }
end
```

```erb
<!-- view — uses .size (in-memory, not DB) and model method -->
<%
  range = product.variant_price_range
  if range && range[:min] == range[:max]
    price_display = number_to_currency(range[:min], unit: "Rp")
  elsif range
    price_display = "#{number_to_currency(range[:min], unit: 'Rp')} - #{number_to_currency(range[:max], unit: 'Rp')}"
  else
    price_display = number_to_currency(0, unit: "Rp")
  end
%>
<%= price_display %>
<%= "#{product.product_variants.size} varian" %>
```

## Key Rules

| Call | With `includes` | Without `includes` |
|------|----------------|-------------------|
| `.count` | Still hits DB (COUNT query) | DB query |
| `.size` | Uses loaded collection (0 queries) | DB query |
| `.length` | Loads & counts (1 query if not loaded) | DB query |

**Always use `.size`** when you've eager-loaded — `.count` defeats the purpose.

## When `.size` == `.count` Gotcha

If the association is scoped (e.g. `has_many :active_variants, -> { where(is_active: true) }`), `includes(:active_variants)` won't eager-load the scoped association. Either:
- Use `includes(:product_variants)` and filter in-memory with `.select`, or
- Use a separate query with `joins` + aggregation

## Checklist

- [ ] Controller uses `includes` for any associations rendered in the view
- [ ] View uses `.size`, NOT `.count`, for association size display
- [ ] Aggregation logic (min, max, sum) happens in-memory from the loaded collection
- [ ] Display formatting stays in the view (model returns raw data, not `number_to_currency`)
