---
name: refactor-inline-js-pola-lanjutan
description: Pola lanjutan untuk refactor inline JS ke JSController di project Erzap — object method pattern (recommended), ERB conditionals dalam script block, massive shared form partials (1000+ lines), hidden div data attributes, Bootstrap 5 modal handlers, cross-call dengan JSController full path. Use when refactoring inline JS in Rails ERB views that have ERB-interpolated scripts or shared form partials with 500+ lines of JS.
---

# Refactor Inline JS — Pola Lanjutan

Pola-pola yang melengkapi skill utama `/root/projects/works/main/.claude/skills/refactor-inline-js/SKILL.md`, ditemukan saat refactoring `produk_manufakturs` (~1260 baris JS) dan `tukar_sns` (~910 baris JS).

## Object Methods Pattern — RECOMMENDED (Massive Form Scripts)

Fungsi helper masuk ke dalam `JSController.<controller>` sebagai methods. Ini pendekatan yang bersih — tidak polusi global scope, namespace by object.

```js
// app/assets/javascripts/controllers/<controller>.js

JSController.produk_manufakturs = {

  // Existing action methods
  init: function () {},
  'new': function () { this.initForm(); },
  edit: function () { this.initForm(); },

  initForm: function () {
    // Panggil sesama method via JSController path (bukan this — lihat Cross-Call)
    JSController.produk_manufakturs.tambah_baris();
    JSController.produk_manufakturs.cek_stok_ajax(tr, id);
  },

  // === Migrated helper methods ===

  tambah_baris: function () { ... },
  cek_stok_ajax: function (tr, idgudang) { ... },
  submit_form_xxx: function () { ... },
  // ... 20-30 functions ...
};
```

**Cross-call antar methods — pakai full path:**
```js
cek_stok_ajax: function (object_tr, idgudang) {
  $.ajax({
    // ...
    success: function(data) {
      // ❌ this.cek_stok_detail() — 'this' disini adalah AJAX context, bukan JSController
      // ✅ Full path works everywhere:
      JSController.produk_manufakturs.cek_stok_detail(object_tr);
    }
  });
},
```

Alasan pakai `JSController.<ctrl>.<method>()` bukan `this.<method>()`:
- Di dalam callback (AJAX success/error, jQuery event handler), `this` berubah konteks
- Full path selalu aman, tanpa perlu `var self = this` atau `.bind(this)`
- Konsisten dengan ERB onclick (lihat bawah)

**ERB onclick — gunakan full path:**
```erb
<button onclick="JSController.produk_manufakturs.tambah_baris()">Tambah</button>
<button onclick="JSController.produk_manufakturs.konfirmasi_hpp_pembulatan(true)">Ya</button>
```

**Keunggulan dibanding global var:**
- Tidak polusi `window` scope — fungsi cuma ada di `JSController.<ctrl>`
- Tidak perlu prefix nama fungsi (object name sudah jadi namespace)
- Tidak ada risiko overwrite antar controller
- AppDispatcher tetap jalan normal

### Deprecated: Global Var + Prefix Pattern

Pola lama (global `var produk_manufakturs_tambah_baris`) sudah digantikan oleh object method pattern di atas. Pola ini hanya dipakai jika:
- Tim explicitly minta fungsi tetap global
- Ada backward compatibility constraint yang tidak bisa diubah

Jika pakai pola lama, pastikan prefix nama fungsi dengan controller name untuk hindari konflik. Tapi preferred approach tetap object methods.

Untuk teknik mass-refactor Python script (brace tracking, deduplikasi), lihat: [references/mass-refactor-script.md](references/mass-refactor-script.md)

## Hidden Div + Data Attributes (Zero Script Tags)

Kalau inline script cuma baca Ruby object values (misal `@obj.nama`, `@is_show`), jangan simpan `<script>` minimal. Ganti dengan hidden `<div>` + `data-*`:

View (ERB):
```erb
<!-- SEBELUM: inline script baca Ruby values -->
<script>
  $(document).ready(function() {
    <% if @is_show %>fetch_data_on_show();<% end %>
    $("#field_a").val("<%= @obj.nama rescue '' %>");
  });
</script>

<!-- SESUDAH: hidden div — ZERO <script> tags -->
<div id="<controller>_form_data" style="display:none"
     data-field-a="<%= @obj.nama rescue '' %>"
     data-is-show="<%= @is_show %>"></div>
```

JSController:
```js
initFormXxx: function () {
  var $fd = $('#<controller>_form_data');
  if ($fd.length > 0) {
    if ($fd.data('is-show') == 'true') fetch_data_on_show();
    $("#field_a").val($fd.data('field-a') || '');
  }
  // ...
}
```

**Kenapa ini clean:**
- View = pure ERB + HTML, nol `<script>` tag
- jQuery `.data()` auto-handles type coercion
- Bekerja di `list.html.erb` (AppDispatcher) dan `simple.html.erb` (manual ready)
- Tidak ada window global yang bocor

## ERB Conditionals di Dalam Script Block

Beberapa `<script>` block mengandung ERB conditionals yang mengubah struktur JS:

```erb
<script>
  $("#simpan").click(function() {
    <% if action_name == 'new_penjualan' %>
      // logic penjualan...
    <% else %>
      check_sn_database();
    <% end %>
  });
</script>
```

**Strategi:** Buat **action methods terpisah** di JSController, masing-masing dengan init sendiri:

```js
JSController.tukar_sns = {
  'new': function () { this.initFormPembelian(); },
  new_penjualan: function () { this.initFormPenjualan(); },

  initFormPembelian: function () {
    // logic pembelian...
    $("#simpan").click(function() { check_sn_database(); });
  },

  initFormPenjualan: function () {
    // logic penjualan...
    $("#simpan").click(function() { /* logic penjualan */ });
  }
};
```

AppDispatcher otomatis panggil method yang benar berdasarkan `<body data-action="...">`.

## ERB Values in JS — Replacements

| ERB di inline script | Replacement di .js file |
|---|---|
| `<%= u form_authenticity_token %>` | `$('meta[name=csrf-token]').attr('content')` |
| `<%= controller.controller_name %>` | Hardcode string `'produk_manufakturs'` |
| `<%= AJAX_ERROR %>` | Hardcode `'Gagal memproses data.'` |
| `<%= t 'form.validation.xxx' %>` | Hardcode teks Indonesian (sudah translated) |
| `<%= @obj.nama rescue '' %>` | Hidden div data attribute |

## Shared Partials — JANGAN DIMODIFIKASI

Partial seperti `_produk_search_nama_hasil.erb`, `_search_sn_baru.erb` yang punya guard `if no == '' || no == 0 || no == 1` dengan inline script **dipakai oleh banyak controller**. Jangan pernah hapus inline script dari shared partial — akan break modul lain.

Sebagai gantinya, JSController modul yang direfactor cukup panggil auto-complete init functions yang sama (fungsi-fungsi tersebut biasanya global helpers dari `application.js`):

```js
initForm: function () {
  // Panggil fungsi auto-complete yang sama seperti partial
  if (typeof auto_complete_searching_produk_nama_hasil === 'function') {
    auto_complete_searching_produk_nama_hasil();
  }
}
```

## Bootstrap Modal Handlers

Modal yang JS-nya conditional (`<% if @work_order.present? %>`):

```js
initWorkOrderModal: function () {
  // Guard: skip kalau modal tidak dirender
  if ($('#btn_wo_pro_man_list').length === 0) return;

  $('#woProManModal').on('show.bs.modal', function() {
    // AJAX load data...
  });
}
```

Panggil dari `initForm()`: `this.initWorkOrderModal();` — guard `.length === 0` akan skip otomatis kalau modal tidak ada.

## Pitfalls

- **`this` di callback beda konteks** — AJAX success/error, jQuery event handler, setTimeout — semuanya ubah `this`. Pakai `JSController.<ctrl>.<method>()` bukan `this.<method>()`.
- **ERB conditionals tidak bisa langsung copy ke .js** — ganti dengan action methods terpisah atau cek `$('body').data('action')`.
- **JANGAN hapus inline script dari shared partial** — partial dipakai lintas modul. Cukup panggil fungsi yang sama dari JSController.
- **File JSController baru = unversioned di SVN** — file `app/assets/javascripts/controllers/<name>.js` yang dibuat saat refactor biasanya status `?` (unversioned). Tidak bisa di-revert. Backup atau commit segera setelah selesai.
- **ERB onclick wajib update ke full path** — `onclick="tambah_baris()"` → `onclick="JSController.produk_manufakturs.tambah_baris()"`. Jangan skip ini.
- **Substring matching saat bulk rename** — fungsi dengan nama pendek akan ketelan di nama panjang (misal `tambah_baris_hasil` match di dalam `auto_tambah_baris_hasil` → jadi `auto_JSController.ctrl.tambah_baris_hasil`). Sort by length descending, lakukan semua replacement dalam SATU atomic pass, jangan multi-script. Setelah selesai, grep untuk `JSController.ctrl.JSController` (double prefix) dan pattern `\w+_JSController.ctrl.\w+` (substring corruption).
- **Selalu syntax-check setelah refactor** — `node --check file.js` sebelum declare selesai. Missing comma antar method, unmatched braces, dan broken method boundaries adalah bug umum hasil extraction script.
- **Kalau file corrupt, jangan iterasi repair** — setiap pass repair berisiko tambah corrupt. Lebih baik restore dari backup (VS Code Timeline/Local History) dan ulangi dengan script yang sudah verified.
