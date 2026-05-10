// Joyphone ERP — Detail Pembelian
function PurchaseDetailPage({ purchase, onBack, onEdit, onDelete }) {
  if (!purchase) return null;
  const sp = statusPill(purchase.status);
  const pp = paymentPill(purchase.paymentStatus);
  const supplier = SUPPLIERS.find(s => s.id === purchase.supplierId) || { name: purchase.supplier, city: "—", contact: "—", paymentTerm: "—", code: "—" };
  const lines = (purchase.lines || []).map(l => {
    const p = PRODUCTS.find(pp => pp.id === l.productId) || { name: "Produk", sku: "—", price: l.price };
    const sub = Math.max(0, (l.price || p.price) * l.qty - (l.discount || 0));
    return { ...l, product: p, subtotal: sub };
  });
  const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
  const tax = Math.round(subtotal * 0.11);
  const grand = purchase.total;
  const remaining = purchase.total - purchase.paid;

  const events = [
    { icon: "file-plus", kind: "brand", title: <>PO dibuat oleh <b>{purchase.createdBy}</b></>, meta: `${purchase.date} · 09:14` },
    { icon: "send", kind: "info", title: <>PO dikirim ke <b>{purchase.supplier}</b></>, meta: `${purchase.date} · 09:18` },
    purchase.status !== "draft" && { icon: "check", kind: "info", title: <>Supplier mengkonfirmasi PO</>, meta: `${purchase.date} · 11:32` },
    purchase.status === "received" && { icon: "package-check", kind: "success", title: <>Barang diterima di <b>{purchase.warehouse}</b></>, meta: `${purchase.date} · 14:05` },
    purchase.paymentStatus === "paid" && { icon: "banknote", kind: "success", title: <>Pembayaran lunas <b>{fmtIDR(purchase.total)}</b></>, meta: `${purchase.date} · 16:20` },
    purchase.paymentStatus === "partial" && { icon: "wallet", kind: "info", title: <>Pembayaran sebagian <b>{fmtIDR(purchase.paid)}</b></>, meta: `${purchase.date} · 16:20` },
  ].filter(Boolean);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <a href="#" onClick={onBack}>Pembelian</a>
            <JoyIcon name="chevron-right" />
            <a href="#" onClick={onBack}>Daftar Pembelian</a>
            <JoyIcon name="chevron-right" />
            <span className="current">{purchase.id}</span>
          </div>
          <div className="row" style={{ gap: 12, marginTop: 6 }}>
            <h1 className="page-title">{purchase.id}</h1>
            <span className={`pill ${sp.cls}`} style={{ fontSize: 12 }}><span className="dot"></span>{sp.label}</span>
            <span className={`pill ${pp.cls}`} style={{ fontSize: 12 }}><span className="dot"></span>{pp.label}</span>
          </div>
          <div className="page-subtitle">{purchase.date} · {purchase.supplier} · {fmtIDR(purchase.total)}</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary" onClick={onBack}><JoyIcon name="arrow-left" /><span>Kembali</span></button>
          <button className="btn btn-secondary"><JoyIcon name="printer" /><span>Cetak</span></button>
          <button className="btn btn-secondary"><JoyIcon name="download" /><span>Unduh PDF</span></button>
          <button className="btn btn-primary" onClick={() => onEdit(purchase.id)}><JoyIcon name="pencil" /><span>Edit</span></button>
        </div>
      </div>

      <div className="detail-grid">
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Info card */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="icon-wrap"><JoyIcon name="file-text" /></div>
              <div className="text-wrap">
                <div className="title">Informasi Pembelian</div>
                <div className="sub">Detail PO dan supplier</div>
              </div>
            </div>
            <div className="form-section-body">
              <div className="kv-list">
                <div className="kv"><div className="l">No. PO</div><div className="v mono">{purchase.id}</div></div>
                <div className="kv"><div className="l">Tanggal</div><div className="v">{purchase.date}</div></div>
                <div className="kv">
                  <div className="l">Supplier</div>
                  <div className="v">
                    <div className="supplier-cell">
                      <div className="supplier-avatar">{purchase.supplierShort}</div>
                      <div>
                        <div className="name">{supplier.name}</div>
                        <div className="sub">{supplier.code} · {supplier.city}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="kv"><div className="l">Gudang Tujuan</div><div className="v">{purchase.warehouse}</div></div>
                <div className="kv"><div className="l">Kontak Supplier</div><div className="v">{supplier.contact}</div></div>
                <div className="kv"><div className="l">Termin Pembayaran</div><div className="v">{supplier.paymentTerm}</div></div>
                <div className="kv"><div className="l">Dibuat Oleh</div><div className="v"><div className="user-cell"><div className="avatar">{purchase.createdByInitials}</div><span>{purchase.createdBy}</span></div></div></div>
                <div className="kv"><div className="l">Metode Pembayaran</div><div className="v">{(PAYMENT_METHODS.find(m => m.id === purchase.paymentMethod) || {}).label || "—"}</div></div>
              </div>
              {purchase.notes && (
                <div style={{ marginTop: 16, padding: 12, background: "var(--bg-2)", borderRadius: 10, fontSize: 13, color: "var(--fg-2)" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Catatan</div>
                  {purchase.notes}
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="icon-wrap"><JoyIcon name="package" /></div>
              <div className="text-wrap">
                <div className="title">Daftar Produk</div>
                <div className="sub">{lines.length} produk · {purchase.items} unit total</div>
              </div>
            </div>
            <div style={{ padding: "0 0 16px" }}>
              {lines.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>Tidak ada detail produk untuk PO ini.</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th className="num">Qty</th>
                      <th className="num">Harga</th>
                      <th className="num">Diskon</th>
                      <th className="num">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => (
                      <tr key={i}>
                        <td>
                          <div className="product-cell">
                            <div className="product-thumb"><JoyIcon name="smartphone" /></div>
                            <div>
                              <div className="name">{l.product.name}</div>
                              <div className="sku">{l.product.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td className="num mono">{l.qty}</td>
                        <td className="num mono">{fmtIDR(l.price || l.product.price)}</td>
                        <td className="num mono">{fmtIDR(l.discount)}</td>
                        <td className="num mono" style={{ fontWeight: 700 }}>{fmtIDR(l.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Totals */}
          <div className="totals-card">
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-1)", marginBottom: 4 }}>Ringkasan Tagihan</div>
            <div className="row-line"><span>Subtotal</span><span className="v">{fmtIDR(subtotal || grand - tax)}</span></div>
            <div className="row-line"><span>PPN 11%</span><span className="v">{fmtIDR(tax)}</span></div>
            <div className="row-line"><span>Biaya kirim</span><span className="v">{fmtIDR(0)}</span></div>
            <div className="grand">
              <span className="label">Total</span>
              <span className="v">{fmtIDR(grand)}</span>
            </div>
            <div className="divider"></div>
            <div className="row-line"><span>Sudah dibayar</span><span className="v" style={{ color: "var(--success-500)" }}>{fmtIDR(purchase.paid)}</span></div>
            <div className="row-line"><span>Sisa tagihan</span><span className="v" style={{ color: remaining > 0 ? "var(--danger-500)" : "var(--fg-1)", fontWeight: 700 }}>{fmtIDR(remaining)}</span></div>
            {remaining > 0 && (
              <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }}>
                <JoyIcon name="banknote" /><span>Catat Pembayaran</span>
              </button>
            )}
          </div>

          {/* Timeline */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="icon-wrap"><JoyIcon name="activity" /></div>
              <div className="text-wrap">
                <div className="title">Riwayat Aktivitas</div>
                <div className="sub">Log perubahan status PO</div>
              </div>
            </div>
            <div className="form-section-body">
              <div className="timeline">
                {events.map((e, i) => (
                  <div key={i} className="timeline-item">
                    <div className={`timeline-icon ${e.kind}`}><JoyIcon name={e.icon} /></div>
                    <div className="timeline-body">
                      <div className="timeline-title">{e.title}</div>
                      <div className="timeline-meta">{e.meta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.PurchaseDetailPage = PurchaseDetailPage;
