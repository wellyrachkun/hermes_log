# Rails Admin Index: Eager-Load Variants & Compute Min-Max Price

Pattern from Joy Phone (Rails 8, Product has_many ProductVariants with `price` column).

## Problem

Admin product index showed `product.price` (a static column on the `products` table, often `NULL` or stale). Real prices lived in `product_variants.price`. View also called `product.product_variants.count` per row → N+1 queries.

## Solution: Three changes across controller, model, view

### 1. Controller: eager-load variants

```ruby
# app/controllers/products_controller.rb
def index
  @products = Product.includes(:product_variants, :product_category)
                     .order(:name)
  # ...
end
```

Also fix `download_xlsx`:
```ruby
def download_xlsx
  products = Product.includes(:product_variants, :brand, :product_category).all
  # ...
end
```

### 2. Model: in-memory min-max from loaded variants

```ruby
# app/models/product.rb
def variant_price_range
  prices = product_variants.select { |v| v.price.to_f > 0 }.map(&:price)
  return nil if prices.empty?
  { min: prices.min, max: prices.max }
end
```

Key detail: `product_variants` is already loaded via `includes`, so this iterates in-memory (0 extra queries). The `.select { |v| v.price.to_f > 0 }` filter ignores variants with nil/zero price.

### 3. View: display range, use `.size` not `.count`

```erb
<%# app/views/products/_products_list.html.erb %>
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
<td><%= price_display %></td>
<td>
  <% if product.product_variants.size > 0 %>
    <%= "#{product.product_variants.size} varian" %>
  <% end %>
</td>
```

**Critical: `.size` not `.count`.** With eager-loaded associations:
- `.count` → always runs `SELECT COUNT(*)` (defeats the purpose of `includes`)
- `.size` / `.length` → uses the loaded collection (0 extra queries)

## Pattern rules

1. **`includes(:association)` in controller, not just `Model.all`.**
2. **Compute aggregates in the model method, not via SQL.** Loaded associations are already in memory — iterating them is free.
3. **Use `.size` or `.length` on eager-loaded collections.** Never `.count` (it ignores the loaded data).
4. **Format currency in the view, compute data in the model.** Don't call `number_to_currency` from the model (ActionView helper not available).
5. **Handle edge cases:** no variants, all variants have same price, some variants have zero/nil price.

## Pitfalls

1. **Forgetting `includes` in the controller.** The model method `variant_price_range` assumes variants are loaded. Without `includes`, each `product_variants` call triggers a separate query → N+1 is back.
2. **Using `.count` instead of `.size`.** With `includes`, `.count` still hits the database. Always use `.size`.
3. **Calling `number_to_currency` from the model.** Models don't include ActionView helpers. Keep display formatting in the view.
4. **Not filtering zero/nil prices.** Variants with `price: nil` or `price: 0` skew the min. Filter them out in the model method.
5. **Applying this to the frontend price list without checking.** The frontend (`price_list` page) uses `ProductVariant.filtered()` which returns individual variants grouped by category. Don't apply product-level aggregation there unless the UX demands it.
