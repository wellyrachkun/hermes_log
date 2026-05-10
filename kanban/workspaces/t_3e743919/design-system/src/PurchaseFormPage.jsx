// Joyphone ERP — Tambah / Edit Pembelian (full page form)
const { useState: useStateForm, useMemo: useMemoForm, useRef: useRefForm, useEffect: useEffectForm } = React;

function emptyLine() { return { key: Math.random().toString(36).slice(2), productId: "", qty: 1, price: 0, discount: 0 }; }

function PurchaseFormPage({ mode, initial, onCancel, onSave }) {
  const [poNumber] = useStateForm(() => initial?.id || "PO-2026-" + String(Math.floor(Math.random() * 9000) + 43).padStart(4, "0"));
  const [date, setDate] = useStateForm(() => initial?.dateRaw || "2026-05-12");
  const [supplierId, setSupplierId] = useStateForm(() => initial?.supplierId || "");
  const [warehouseId, setWarehouseId] = useStateForm(() => "wh-01");
  const [paymentMethod, setPaymentMethod] = useStateForm(() => initial?.paymentMethod || "transfer");
  const [dueDate, setDueDate] = useStateForm("2026-06-11");
  const [notes, setNotes] = useStateForm(() => initial?.notes || "");
  const [discountTotal, setDiscountTotal] = useStateForm(0);
  const [shipping, setShipping] = useStateForm(0);
  const [taxRate, setTaxRate] = useStateForm(11);
  const [files, setFiles] = useStateForm([]);
  const [lines, setLines] = useStateForm(() => {
    if (initial?.lines?.length) return initial.lines.map(l => ({ ...l, key: Math.random().toString(36).slice(2) }));
    return [emptyLine(), emptyLine()];
  });
  const [errors, setErrors] = useStateForm({});

  const addLine = () => setLines(l => [...l, emptyLine()]);
  const removeLine = (key) => setLines(l => l.filter(x => x.key !== key));
  const updateLine = (key, patch) => setLines(l => l.map(x => x.key === key ? { ...x, ...patch } : x));

  const totals = useMemoForm(() => {
    const subtotal = lines.reduce((s, l) => {
      const p = PRODUCTS.find(pp => pp.id === l.productId);
      const price = Number(l.price) || (p ? p.price : 0);
      const qty = Number(l.qty) || 0;
      const disc = Number(l.discount) || 0;
      return s + Math.max(0, price * qty - disc);
    }, 0);
    const afterDiscount = Math.max(0, subtotal - Number(discountTotal || 0));
    const tax = afterDiscount * (Number(taxRate) || 0) / 100;
    const grand = afterDiscount + tax + (Number(shipping) || 0);
    const itemCount = lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
    return { subtotal, afterDiscount, tax, grand, itemCount };
  }, [lines, discountTotal, taxRate, shipping]);

  const validate = () => {
    const e = {};
    if (!supplierId) e.supplier = "Supplier wajib dipilih";
    if (!warehouseId) e.warehouse = "Gudang wajib dipilih";
    const validLines = lines.filter(l => l.productId && Number(l.qty) > 0);
    if (validLines.length === 0) e.lines = "Tambahkan minimal 1 produk dengan qty > 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = (asDraft = false) => {
    if (!asDraft && !validate()) return;
    const supplier = SUPPLIERS.find(s => s.id === supplierId);
    const warehouse = WAREHOUSES.find(w => w.id === warehouseId);
    onSave({
      id: poNumber,
      dateRaw: date,
      date: formatId(date),
      supplier: supplier?.name || "—",
      supplierId,
      supplierShort: supplier ? supplier.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase().slice(0, 3) : "??",
      warehouse: warehouse?.label || "—",
      items: totals.itemCount,
      total: Math.round(totals.grand),
      paid: 0,
      status: asDraft ? "draft" : "pending",
      paymentStatus: "unpaid",
      createdBy: "Budi Santoso",
      createdByInitials: "BS",
      paymentMethod,
      notes,
      lines: lines.filter(l => l.productId).map(l => ({ productId: l.productId, qty: Number(l.qty) || 0, price: Number(l.price) || 0, discount: Number(l.discount) || 0 })),
    }, asDraft);
  };

  const onPickFile = (e) => {
    const list = Array.from(e.target.files || []);
    setFiles(f => [...f, ...list.map(file => ({ name: file.name, size: file.size }))]);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <a href="#" onClick={onCancel}>Pembelian</a>
            <JoyIcon name="chevron-right" />
            <a href="#" onClick={onCancel}>Daftar Pembelian</a>
            <JoyIcon name="chevron-right" />
            <span className="current">{mode === "edit" ? "Edit Pembelian" : "Tambah Pembelian"}</span>
          </div>
          <h1 className="page-title" style={{ marginTop: 6 }}>
            {mode === "edit" ? "Edit Pembelian" : "Tambah Pembelian"}
          </h1>
          <div className="page-subtitle">
            Buat purchase order baru ke supplier. No. PO: <span className="mono" style={{ color: "var(--fg-1)", fontWeight: 600 }}>{poNumber}</span>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary" onClick={onCancel}><JoyIcon name="x" /><span>Batal</span></button>
          <button className="btn btn-secondary" onClick={() => handleSave(true)}><JoyIcon name="file-text" /><span>Simpan sebagai Draft</span></button>
          <button className="btn btn-primary" onClick={() => handleSave(false)}><JoyIcon name="check" /><span>Simpan Pembelian</span></button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "7fr 5fr", alignItems: "start" }}>
        {/* LEFT: form sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Info dasar */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="icon-wrap"><JoyIcon name="file-text" /></div>
              <div className="text-wrap">
                <div className="title">Informasi Pembelian</div>
                <div className="sub">No. PO, tanggal, dan tujuan gudang</div>
              </div>
            </div>
            <div className="form-section-body">
              <div className="field-grid">
                <div className="field">
                  <label>No. PO</label>
                  <input className="input mono" value={poNumber} readOnly style={{ background: "var(--bg-inset)", color: "var(--fg-2)" }} />
                  <div className="hint">Dibuat otomatis oleh sistem</div>
                </div>
                <div className="field">
                  <label>Tanggal Pembelian</label>
                  <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className={`field ${errors.supplier ? "error" : ""}`}>
                  <label>Supplier</label>
                  <SupplierCombo value={supplierId} onChange={setSupplierId} />
                  {errors.supplier && <div className="err-msg">{errors.supplier}</div>}
                </div>
                <div className={`field ${errors.warehouse ? "error" : ""}`}>
                  <label>Gudang Tujuan</label>
                  <div className="select-wrap">
                    <select className="select" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                      <option value="">— Pilih gudang —</option>
                      {WAREHOUSES.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
                    </select>
                    <JoyIcon name="chevron-down" className="lucide-caret" />
                  </div>
                  {errors.warehouse && <div className="err-msg">{errors.warehouse}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Daftar produk */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="icon-wrap"><JoyIcon name="package" /></div>
              <div className="text-wrap">
                <div className="title">Daftar Produk</div>
                <div className="sub">Tambah produk yang dibeli, qty, harga, dan diskon per item</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={addLine}>
                <JoyIcon name="plus" /><span>Tambah Baris</span>
              </button>
            </div>
            <div className="form-section-body" style={{ padding: 16 }}>
              <div className="lineitems">
                <table className="lineitems-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 240 }}>Produk</th>
                      <th className="num" style={{ width: 70 }}>Qty</th>
                      <th className="num" style={{ width: 140 }}>Harga</th>
                      <th className="num" style={{ width: 110 }}>Diskon</th>
                      <th className="num" style={{ width: 140 }}>Subtotal</th>
                      <th style={{ width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, idx) => {
                      const product = PRODUCTS.find(p => p.id === l.productId);
                      const price = Number(l.price) || (product ? product.price : 0);
                      const sub = Math.max(0, price * (Number(l.qty) || 0) - (Number(l.discount) || 0));
                      return (
                        <tr key={l.key}>
                          <td className="product-picker-cell">
                            <ProductCombo
                              value={l.productId}
                              onChange={pid => {
                                const p = PRODUCTS.find(pp => pp.id === pid);
                                updateLine(l.key, { productId: pid, price: p ? p.price : 0 });
                              }}
                            />
                          </td>
                          <td>
                            <input className="line-input num" type="number" min="0" value={l.qty}
                              onChange={e => updateLine(l.key, { qty: e.target.value })} />
                          </td>
                          <td>
                            <input className="line-input num" type="number" min="0" value={price}
                              onChange={e => updateLine(l.key, { price: e.target.value })} />
                          </td>
                          <td>
                            <input className="line-input num" type="number" min="0" value={l.discount}
                              onChange={e => updateLine(l.key, { discount: e.target.value })} />
                          </td>
                          <td className="subtotal">{fmtIDR(sub)}</td>
                          <td>
                            <button className="icon-btn-sm danger" onClick={() => removeLine(l.key)} disabled={lines.length === 1} title="Hapus baris"><JoyIcon name="trash-2" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="lineitems-footer">
                  <button className="btn btn-ghost btn-sm" onClick={addLine}><JoyIcon name="plus" /><span>Tambah produk lain</span></button>
                  <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{totals.itemCount} unit total</div>
                </div>
              </div>
              {errors.lines && <div className="err-msg" style={{ marginTop: 8 }}>{errors.lines}</div>}
            </div>
          </div>

          {/* Pembayaran */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="icon-wrap"><JoyIcon name="wallet" /></div>
              <div className="text-wrap">
                <div className="title">Pembayaran</div>
                <div className="sub">Metode pembayaran ke supplier dan jatuh tempo</div>
              </div>
            </div>
            <div className="form-section-body">
              <div className="field-grid">
                <div className="field">
                  <label>Metode Pembayaran</label>
                  <div className="select-wrap">
                    <select className="select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                      {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                    <JoyIcon name="chevron-down" className="lucide-caret" />
                  </div>
                </div>
                <div className="field">
                  <label>Jatuh Tempo</label>
                  <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  <div className="hint">Standar Net 30 untuk supplier ini</div>
                </div>
              </div>
            </div>
          </div>

          {/* Catatan + lampiran */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="icon-wrap"><JoyIcon name="paperclip" /></div>
              <div className="text-wrap">
                <div className="title">Catatan & Lampiran</div>
                <div className="sub">Faktur supplier, surat jalan, atau catatan internal</div>
              </div>
            </div>
            <div className="form-section-body">
              <div className="field" style={{ marginBottom: 16 }}>
                <label>Catatan</label>
                <textarea className="input" placeholder="Tambahkan catatan internal untuk PO ini..."
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div className="field">
                <label>Lampiran</label>
                <label className="file-drop">
                  <JoyIcon name="upload-cloud" />
                  <div className="title">Klik untuk upload atau drop file di sini</div>
                  <div className="sub">PDF, JPG, atau PNG · maks 10 MB per file</div>
                  <input type="file" hidden multiple onChange={onPickFile} />
                </label>
                {files.length > 0 && (
                  <div className="file-list">
                    {files.map((f, i) => (
                      <div key={i} className="file-item">
                        <JoyIcon name="file-text" />
                        <span className="fname">{f.name}</span>
                        <span className="fsize">{(f.size / 1024).toFixed(1)} KB</span>
                        <button className="icon-btn-sm" onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))}><JoyIcon name="x" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: totals sticky */}
        <div style={{ position: "sticky", top: 80, display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="totals-card">
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-1)", marginBottom: 4 }}>Ringkasan Pembelian</div>
            <div className="row-line">
              <span>Subtotal ({lines.filter(l => l.productId).length} produk)</span>
              <span className="v">{fmtIDR(totals.subtotal)}</span>
            </div>
            <div className="row-line">
              <span>Diskon total</span>
              <input className="line-input num" style={{ maxWidth: 120, height: 28, border: "1px solid var(--border-1)" }} type="number" min="0" value={discountTotal} onChange={e => setDiscountTotal(e.target.value)} />
            </div>
            <div className="row-line">
              <span>Setelah diskon</span>
              <span className="v">{fmtIDR(totals.afterDiscount)}</span>
            </div>
            <div className="row-line">
              <span>PPN
                <input className="line-input num" style={{ maxWidth: 50, height: 24, border: "1px solid var(--border-1)", display: "inline-block", marginLeft: 6 }} type="number" min="0" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
                <span style={{ marginLeft: 4 }}>%</span>
              </span>
              <span className="v">{fmtIDR(totals.tax)}</span>
            </div>
            <div className="row-line">
              <span>Biaya kirim</span>
              <input className="line-input num" style={{ maxWidth: 120, height: 28, border: "1px solid var(--border-1)" }} type="number" min="0" value={shipping} onChange={e => setShipping(e.target.value)} />
            </div>
            <div className="grand">
              <span className="label">Total</span>
              <span className="v">{fmtIDR(totals.grand)}</span>
            </div>
          </div>

          <div className="card" style={{ background: "var(--bg-2)", border: "1px dashed var(--border-2)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--joy-yellow-100)", color: "var(--joy-yellow-700)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <JoyIcon name="info" />
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.5 }}>
                <b style={{ color: "var(--fg-1)" }}>Tips:</b> Pembelian akan masuk sebagai status <b>Pending</b> menunggu konfirmasi penerimaan barang. Stok gudang otomatis bertambah ketika status diubah ke <b>Diterima</b>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SupplierCombo({ value, onChange }) {
  const [open, setOpen] = useStateForm(false);
  const [q, setQ] = useStateForm("");
  const ref = useRefForm(null);
  useEffectForm(() => {
    if (!open) return;
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const filtered = SUPPLIERS.filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.code.toLowerCase().includes(q.toLowerCase()));
  const sel = SUPPLIERS.find(s => s.id === value);
  return (
    <div className={`combo ${open ? "open" : ""}`} ref={ref}>
      <div className="combo-trigger" onClick={() => setOpen(o => !o)}>
        {sel ? (
          <>
            <div className="supplier-avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{sel.name.split(" ").slice(0, 2).map(w => w[0]).join("")}</div>
            <span className="selected">{sel.name}</span>
          </>
        ) : (
          <>
            <JoyIcon name="building-2" />
            <span className="placeholder">Pilih supplier...</span>
          </>
        )}
        <JoyIcon name="chevron-down" />
      </div>
      {open && (
        <div className="combo-popover">
          <div className="combo-search">
            <JoyIcon name="search" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama atau kode supplier..." />
          </div>
          <div className="combo-list">
            {filtered.length === 0 && <div className="combo-empty">Supplier tidak ditemukan</div>}
            {filtered.map(s => (
              <div key={s.id} className={`combo-item ${s.id === value ? "active" : ""}`} onClick={() => { onChange(s.id); setOpen(false); setQ(""); }}>
                <div className="supplier-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{s.name.split(" ").slice(0, 2).map(w => w[0]).join("")}</div>
                <div>
                  <div className="name">{s.name}</div>
                  <div className="sub">{s.code} · {s.city} · {s.paymentTerm}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCombo({ value, onChange }) {
  const [open, setOpen] = useStateForm(false);
  const [q, setQ] = useStateForm("");
  const ref = useRefForm(null);
  useEffectForm(() => {
    if (!open) return;
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const filtered = PRODUCTS.filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()));
  const sel = PRODUCTS.find(p => p.id === value);
  return (
    <div className={`combo ${open ? "open" : ""}`} ref={ref}>
      <div className="line-product" onClick={() => setOpen(o => !o)} style={{ cursor: "pointer", padding: "0 8px", height: 32, borderRadius: 6, transition: "background 120ms" }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--bg-2)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
        <div className="thumb"><JoyIcon name={sel ? "smartphone" : "package"} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {sel ? (
            <>
              <div className="pname" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sel.name}</div>
              <div className="meta mono">{sel.sku}</div>
            </>
          ) : (
            <div style={{ color: "var(--fg-4)", fontSize: 13 }}>Pilih produk...</div>
          )}
        </div>
        <JoyIcon name="chevron-down" />
      </div>
      {open && (
        <div className="combo-popover" style={{ minWidth: 320 }}>
          <div className="combo-search">
            <JoyIcon name="search" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Cari produk atau SKU..." />
          </div>
          <div className="combo-list">
            {filtered.length === 0 && <div className="combo-empty">Produk tidak ditemukan</div>}
            {filtered.map(p => (
              <div key={p.id} className={`combo-item ${p.id === value ? "active" : ""}`} onClick={() => { onChange(p.id); setOpen(false); setQ(""); }}>
                <div className="thumb" style={{ width: 28, height: 28, borderRadius: 6, background: "var(--bg-2)", display: "grid", placeItems: "center" }}>
                  <JoyIcon name="smartphone" />
                </div>
                <div>
                  <div className="name">{p.name}</div>
                  <div className="sub mono">{p.sku}</div>
                </div>
                <div className="meta mono">{fmtIDR(p.price)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatId(d) {
  if (!d) return "—";
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const months2 = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${parseInt(day, 10)} ${months2[parseInt(m, 10) - 1]} ${y}`;
}

window.PurchaseFormPage = PurchaseFormPage;
window.formatId = formatId;
