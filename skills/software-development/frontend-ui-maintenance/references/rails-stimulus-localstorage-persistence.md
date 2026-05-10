# Rails + Stimulus: UI State Persistence Across Reloads

Pattern from Joy Phone (Rails 8 + daisyUI + Stimulus + Turbo).

## User Preference: No Flash

The user explicitly prefers that the DOM **never contains the wrong state** on initial render. No "open first then hide" — the HTML must arrive with correct classes from the server.

## Pattern A: Cookie + Server-Side Render (PREFERRED)

Use this when the server renders HTML (Rails ERB). The cookie is readable server-side, so `is-collapsed` is in the HTML from the start.

### Stimulus Controller

```js
// app/javascript/controllers/sidebar_controller.js
import { Controller } from "@hotwired/stimulus"

const STORAGE_KEY = "joyphone-sidebar-collapsed"

export default class extends Controller {
  static targets = ["sidebar", "icon", "content", "mobileSidebar", "backdrop", "openButton"]

  connect() {
    // Mobile: always closed on connect
    try { this.close() } catch (e) {}
    // Desktop state is already correct from server — no restore needed
  }

  toggle() {
    if (!this.hasSidebarTarget || !this.hasContentTarget) return
    const isNowCollapsed = !this.sidebarTarget.classList.contains("is-collapsed")
    this._collapse(isNowCollapsed)
    this._saveState(isNowCollapsed)
  }

  _collapse(collapsed) {
    this.sidebarTarget.classList.toggle("is-collapsed", collapsed)
    this.contentTarget.classList.toggle("is-sidebar-collapsed", collapsed)
    if (this.hasIconTarget) {
      this.iconTarget.classList.toggle("rotate-180", collapsed)
    }
  }

  _saveState(collapsed) {
    const value = collapsed ? "1" : "0"
    // Cookie — server reads this for correct initial render
    try {
      document.cookie = `${STORAGE_KEY}=${value}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`
    } catch (_) {}
    // localStorage as backup
    try { localStorage.setItem(STORAGE_KEY, value) } catch (_) {}
  }
}
```

### Rails Layout (server-side class injection)

```erb
<!-- app/views/layouts/sidebar_layout.html.erb -->
<%
  sidebar_collapsed = cookies["joyphone-sidebar-collapsed"] == "1"
%>

<aside data-sidebar-target="sidebar"
  class="jp-sidebar hidden lg:fixed lg:w-64 lg:flex transition-[width] duration-300<%= " is-collapsed" if sidebar_collapsed %>">
  <%= render partial: 'shared/sidebar_nav' %>
</aside>

<div data-sidebar-target="content"
  class="jp-desktop-offset flex min-h-screen transition-[padding] duration-300<%= " is-sidebar-collapsed" if sidebar_collapsed %>">
  ...
</div>
```

### Result

- HTML arrives from server with `is-collapsed` already in the class attribute
- No inline script needed for sidebar state
- No flash, no glitch, no animation on reload
- Toggle updates cookie → next server render is correct

---

## Pattern B: localStorage + Inline Script + no-transition (FALLBACK)

Use this when cookies aren't feasible (e.g. JS-only SPA, no server access to cookies). Has a minor DOM flash (wrong state briefly in DOM) but no visual animation.

### CSS: Transition Suppression Rule

```css
/* app/assets/stylesheets/application.css */
.no-transition *,
.no-transition *::before,
.no-transition *::after {
  transition: none !important;
  animation: none !important;
}
```

### Inline Script in `<head>`

```html
<script>
  (() => {
    // Disable all transitions during state restoration
    document.documentElement.classList.add("no-transition");

    // Apply theme
    const themeKey = "joyphone-theme";
    let saved = null;
    try { saved = localStorage.getItem(themeKey); } catch (_) {}
    const theme = ["light", "dark"].includes(saved) ? saved
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    // Apply sidebar state (desktop only)
    const sidebarKey = "joyphone-sidebar-collapsed";
    let collapsed = false;
    try { collapsed = localStorage.getItem(sidebarKey) === "1"; } catch (_) {}
    if (collapsed && window.matchMedia("(min-width: 1024px)").matches) {
      document.querySelector(".jp-sidebar")?.classList.add("is-collapsed");
      document.querySelector(".jp-desktop-offset")?.classList.add("is-sidebar-collapsed");
    }

    // Re-enable transitions after 2 frames (after browser paint)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("no-transition");
      });
    });
  })();
</script>
```

### Stimulus Controller (with restore on connect)

```js
connect() {
  try { this.close() } catch (e) {}

  // Desktop: restore from localStorage
  if (this._isDesktop()) {
    const wasCollapsed = this._loadState()
    if (wasCollapsed) this._collapse(true)
  }
}
```

### Why `requestAnimationFrame` × 2

- First rAF: browser has parsed the inline `<script>` and applied classes, but hasn't painted yet
- Second rAF: browser has completed the first paint with correct classes → now safe to re-enable transitions
- Without this, the `no-transition` removal happens before paint, and transitions still animate the initial DOM state

---

## Pattern Rules (both approaches)

1. **Same key across layers**: cookie, localStorage, and controller must use the same key.
2. **Desktop-only via matchMedia**: mobile behavior (hamburger drawer) must not read persisted desktop state.
3. **`classList.toggle(name, force)` not `toggle(name)`**: explicit boolean prevents desync.
4. **Extract `_collapse()` helper**: shares logic between `toggle()` (user action) and `connect()` (restore).

## Pitfalls

1. **Only Stimulus without server-side cookie**: causes flash where sidebar is open then snaps closed.
2. **Cookie not set with `path=/`**: default cookie path is the current URL path. Toggling on `/products` won't apply to `/dashboard`.
3. **Different keys between layers**: copy-paste errors cause invisible desync.
4. **Forgetting `?.` in inline script**: HTML elements may not exist on every page (login, error pages).
5. **`requestAnimationFrame` × 1 only**: transitions may still fire. Always use × 2 for the fallback pattern.
