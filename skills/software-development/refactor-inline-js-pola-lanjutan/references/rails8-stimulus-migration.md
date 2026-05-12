# JSController → Rails 8 Stimulus: Analisis & Strategi Bridge

Analisis ini membandingkan pola `JSController.<modul>` + `AppDispatcher` (yang sudah dipakai Erzap)
dengan Stimulus controller (standar Rails 8), dan memberikan strategi migrasi bertahap.

Status refactor per 2026-05-12: ~108 modul selesai (68%), ~49 modul belum.

## Perbandingan Fitur

| Aspek | JSController (sekarang) | Stimulus (Rails 8) |
|---|---|---|
| Namespace | `JSController.nama_modul` object literal | `class extends Controller` |
| Dispatch | `data-controller` + `data-action` pada `<body>` | `data-controller` + `data-action` pada element manapun |
| Lifecycle | `init()` dipanggil sekali saat `DOMContentLoaded` + `turbolinks:load` | `connect()` / `disconnect()` otomatis saat element masuk/keluar DOM |
| DOM scope | Global `$()` — semua element di-bind ulang tiap dispatch | `this.element` — scoped ke element controller |
| Event binding | jQuery `.on('click', ...)` imperative | `data-action="click->ctrl#method"` declarative di HTML |
| Values/state | Manual `data-*` attributes + jQuery `.data()` | `static values = { key: type }` + `this.keyValue` getter/setter |
| Dependencies | jQuery + Sprockets (`//= require_tree`) | Vanilla JS + Propshaft/importmap |
| Turbo support | Turbolinks 5 (`turbolinks:load`) | Turbo 8 native (`turbo:load`, page morphing) |
| Cross-controller | `JSController.ctrl.method()` atau global `var` | Stimulus `this.application.getControllerForElementAndIdentifier()` atau events |

## Kesamaan Konseptual

1. **Dispatch berbasis data attributes** — Keduanya baca `data-controller` + `data-action` dari DOM
2. **Namespace per modul** — `JSController.kabupatens` ≈ `kabupatens_controller.js` di Stimulus
3. **Event delegation** — Keduanya menghindari inline `onclick=`, pakai binding JS
4. **Action methods** — `JSController.ctrl.new()` ≈ Stimulus `new()` method yang di-trigger via `data-action`

Makin bersih JS refactoring sekarang, makin cepat konversi ke Stimulus nanti. Modul yang sudah murni event delegation (zero inline JS, zero global var) bisa dikonversi ke Stimulus dalam hitungan menit.

## Strategi Bridge: 3 Fase

### Fase 1 — Cleanup (bisa dilakukan sekarang, paralel dengan refactor yang sedang berjalan)

1. **Pindahkan semua global `var` ke dalam `JSController.<ctrl>`** — Contoh masalah: `grup_outlets.js` (1299 baris) masih punya top-level:
   ```js
   var dateFormat = "dd-mm-yy";
   var check_tgl_ed_label_designer_state = function() { ... };
   var send_update_olzap_setting = function() { ... };
   ```
   Harusnya jadi method di `JSController.grup_outlets = { ... }`.

2. **Standarisasi cross-call** — Semua controller wajib pakai full path `JSController.ctrl.method()` (seperti yang sudah dilakukan `gajis.js`). Jangan campur `this.method()` dan `JSController.ctrl.method()` dalam satu file.

3. **Pecah `app_logic.js` (9645 baris)** — Fungsi yang spesifik untuk modul tertentu pindah ke controller masing-masing. `AutocompleteDispatcher` + `JSAutocomplete.*` tetap di vendor karena dipakai lintas modul.

### Fase 2 — Bridge Adapter (setelah foundation bersih)

Buat **satu Stimulus controller generic** sebagai wrapper yang memanggil `JSController.*` yang existing. Ini memungkinkan JSController dan Stimulus berjalan paralel — JSController tetap jalan sementara modul baru mulai pakai Stimulus native.

```js
// app/javascript/controllers/js_bridge_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    name: String,
    action: { type: String, default: "init" }
  }

  connect() {
    const ctrl = window.JSController?.[this.nameValue]
    if (ctrl && typeof ctrl[this.actionValue] === "function") {
      ctrl[this.actionValue]()
    }
  }
}
```

Penggunaan di ERB:
```erb
<!-- Sebelum: JSController via AppDispatcher -->
<body data-controller="gajis" data-action="index">

<!-- Sesudah: Via bridge, bisa coexist dengan Stimulus controller lain -->
<div data-controller="js-bridge" data-js-bridge-name-value="gajis" data-js-bridge-action-value="index">
  <!-- Konten existing -->
</div>
```

Keunggulan: tidak perlu rewrite semua controller sekaligus. Modul leaf bisa dikonversi dulu ke Stimulus native sebagai validasi.

### Fase 3 — Full Stimulus (setelah Rails 8 upgrade in-place)

1. Konversi controller bertahap: mulai dari modul leaf (sedikit dependensi)
   - Kandidat pertama: `kabupatens.js` (47 baris, cuma 2 event binding)
   - Kandidat berikutnya: `absensi_shifts.js` (35 baris), `kota.js`, `agamas.js`

2. Ganti Sprockets → Propshaft + importmap/jsbundling
3. Ganti Turbolinks → Turbo (`turbolinks:load` → `turbo:load`)
4. Ganti jQuery AJAX → `fetch()` / Turbo Streams
5. Hapus jQuery sepenuhnya (Bootstrap 5 sudah tidak butuh jQuery)

## Contoh Konversi: `kabupatens.js` (47 baris) → Stimulus

**Sebelum (JSController):**
```js
JSController.kabupatens = {
  init: function () {},
  new: function () { this.initKabupatenForm(); },
  edit: function () { this.initKabupatenForm(); },
  initKabupatenForm: function () {
    $('body').on('change', '#kabupaten_tmp_idcountry', function () {
      fetch_combo_box('/l_provincies/fetch_combobox/new', 'combo_provinsi', ...);
    });
    $('body').on('change', '#kabupaten_tmp_idprovinsi', function () {
      fetch_combo_box('/kota/fetch_combobox/new', 'combo_kota', ...);
    });
  }
};
```

**Sesudah (Stimulus):**
```js
// app/javascript/controllers/kabupaten_form_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["provinsiCombo", "kotaCombo"]
  
  onCountryChange(event) {
    fetch_combo_box('/l_provincies/fetch_combobox/new', 'combo_provinsi', ...);
  }
  
  onProvinsiChange(event) {
    fetch_combo_box('/kota/fetch_combobox/new', 'combo_kota', ...);
  }
}
```

```erb
<!-- View -->
<%= form_for(@kabupaten, data: { controller: "kabupaten-form" }) do |f| %>
  <%= f.collection_select :tmp_idcountry, ..., 
        data: { action: "change->kabupaten-form#onCountryChange" } %>
  ...
<% end %>
```

Perhatikan: `fetch_combo_box` tetap dipanggil — karena itu adalah fungsi global legacy yang belum dikonversi. Stimulus bisa coexist dengan fungsi global selama masa transisi.

## Risiko & Anti-pattern

- **JANGAN konversi modul core (penjualan, faktur, stok) duluan** — Risiko bisnis terlalu tinggi. Mulai dari master data sederhana.
- **JANGAN hapus JSController sebelum Stimulus terverifikasi** — Bridge adapter memungkinkan coexist.
- **JANGAN rewrite `app_logic.js` sekaligus** — Pecah bertahap, pindahkan fungsi spesifik ke controller terkait.
- **JANGAN skip global var cleanup** — Semakin banyak global var, semakin sulit konversi ke Stimulus (Stimulus controller harus self-contained).
- **JANGAN tunda refactor JS yang sedang berjalan** — Setiap inline JS yang sudah dipindah ke JSController adalah satu langkah lebih dekat ke Stimulus. Pola event delegation yang sudah dibangun sekarang adalah 80% dari pola Stimulus.

## Baseline Metrics (2026-05-12)

- Total modul: ~158
- JSController selesai: ~108 (68%)
- Global var leakage: `grup_outlets.js` (1299 baris), beberapa controller lain perlu audit
- `app_logic.js`: 9645 baris monolith (perlu dipecah)
- View file termodifikasi (M): ~100 file
- JS controller file unversioned (?): ~40 file — **wajib commit sebelum lanjut**
