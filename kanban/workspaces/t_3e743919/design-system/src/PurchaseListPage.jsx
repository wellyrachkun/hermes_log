// Joyphone ERP — Daftar Pembelian (list page)
const { useState: useStateList, useMemo: useMemoList } = React;

function PurchaseListPage({ purchases, onView, onEdit, onAdd, onDelete }) {
  const [query, setQuery] = useStateList("");
  const [statusFilter, setStatusFilter] = useStateList("all"); // all|draft|pending|received|cancelled
  const [paymentFilter, setPaymentFilter] = useStateList("all");
  const [supplierFilter, setSupplierFilter] = useStateList("all");
  const [page, setPage] = useStateList(1);
  const [confirmDel, setConfirmDel] = useStateList(null);
  const PAGE_SIZE = 8;

  const filtered = useMemoList(() => {
    return purchases.filter(p => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (paymentFilter !== "all" && p.paymentStatus !== paymentFilter) return false;
      if (supplierFilter !== "all" && p.supplierId !== supplierFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!p.id.toLowerCase().includes(q) &&
            !p.supplier.toLowerCase().includes(q) &&
            !p.createdBy.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [purchases, query, statusFilter, paymentFilter, supplierFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // KPIs
  const kpis = useMemoList(() => {
    const totalSpend = purchases.reduce((s, p) => s + p.total, 0);
    const totalCount = purchases.length;
    const pending = purchases.filter(p => p.status === "pending" || p.status === "draft").length;
    const unpaid = purchases.filter(p => p.paymentStatus !== "paid")
      .reduce((s, p) => s + (p.total - p.paid), 0);
    return { totalSpend, totalCount, pending, unpaid };
  }, [purchases]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <a href="#">Pembelian</a>
            <JoyIcon name="chevron-right" />
            <span className="current">Daftar Pembelian</span>
          </div>
          <h1 className="page-title" style={{ marginTop: 6 }}>Daftar Pembelian</h1>
          <div className="page-subtitle">Riwayat seluruh purchase order dari supplier — Mei 2026</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary"><JoyIcon name="calendar" /><span>Mei 2026</span><JoyIcon name="chevron-down" /></button>
          <button className="btn btn-secondary"><JoyIcon name="download" /><span>Ekspor</span></button>
          <button className="btn btn-primary" onClick={onAdd}><JoyIcon name="plus" /><span>Pembelian Baru</span></button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-4">
        <div className="card kpi">
          <div className="kpi-label"><JoyIcon name="banknote" /><span>Total Pembelian</span></div>
          <div className="kpi-value">{fmtIDR(kpis.totalSpend)}</div>
          <div className="kpi-meta">
            <span className="delta up"><JoyIcon name="arrow-up" />+18,2%</span>
            <span>vs April</span>
          </div>
        </div>
        <div className="card kpi">
          <div className="kpi-label"><JoyIcon name="file-text" /><span>Jumlah PO</span></div>
          <div className="kpi-value">{kpis.totalCount}</div>
          <div className="kpi-meta">
            <span className="delta up"><JoyIcon name="arrow-up" />+4</span>
            <span>vs minggu lalu</span>
          </div>
        </div>
        <div className="card kpi featured">
          <div className="kpi-label"><JoyIcon name="clock" /><span>Menunggu Konfirmasi</span></div>
          <div className="kpi-value">{kpis.pending}</div>
          <div className="kpi-meta">
            <span style={{ color: "var(--warning-500)", fontWeight: 600 }}>Perlu ditindak lanjuti</span>
          </div>
        </div>
        <div className="card kpi">
          <div className="kpi-label"><JoyIcon name="alert-circle" /><span>Belum Dibayar</span></div>
          <div className="kpi-value">{fmtIDR(kpis.unpaid)}</div>
          <div className="kpi-meta">
            <span className="delta down"><JoyIcon name="arrow-down" />−5,4%</span>
            <span>vs minggu lalu</span>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="search-field">
          <JoyIcon name="search" />
          <input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Cari No. PO, supplier, dibuat oleh..." />
        </div>
        <FilterChip
          icon="circle-dot"
          label="Status"
          value={statusFilter}
          onChange={v => { setStatusFilter(v); setPage(1); }}
          options={[
            { v: "all", label: "Semua status" },
            { v: "draft", label: "Draft" },
            { v: "pending", label: "Pending" },
            { v: "received", label: "Diterima" },
            { v: "cancelled", label: "Dibatalkan" },
          ]}
        />
        <FilterChip
          icon="wallet"
          label="Pembayaran"
          value={paymentFilter}
          onChange={v => { setPaymentFilter(v); setPage(1); }}
          options={[
            { v: "all", label: "Semua pembayaran" },
            { v: "paid", label: "Lunas" },
            { v: "partial", label: "Sebagian" },
            { v: "unpaid", label: "Belum bayar" },
          ]}
        />
        <FilterChip
          icon="building-2"
          label="Supplier"
          value={supplierFilter}
          onChange={v => { setSupplierFilter(v); setPage(1); }}
          options={[
            { v: "all", label: "Semua supplier" },
            ...SUPPLIERS.map(s => ({ v: s.id, label: s.name })),
          ]}
        />
        <div className="spacer"></div>
        {(query || statusFilter !== "all" || paymentFilter !== "all" || supplierFilter !== "all") && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setQuery(""); setStatusFilter("all"); setPaymentFilter("all"); setSupplierFilter("all"); setPage(1); }}>
            <JoyIcon name="x" /><span>Reset filter</span>
          </button>
        )}
      </div>

      {/* Table card */}
      <div className="card flush">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <img src="assets/illustration-empty-box.svg" alt="" />
            <div className="title">Tidak ada pembelian ditemukan</div>
            <div className="sub">Coba ubah kata kunci pencarian atau atur ulang filter.</div>
            <button className="btn btn-primary" onClick={onAdd}>
              <JoyIcon name="plus" /><span>Tambah Pembelian</span>
            </button>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}><input type="checkbox" /></th>
                  <th>No. PO</th>
                  <th>Tanggal</th>
                  <th>Supplier</th>
                  <th className="num">Item</th>
                  <th className="num">Total</th>
                  <th>Status</th>
                  <th>Pembayaran</th>
                  <th>Dibuat oleh</th>
                  <th style={{ textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(p => {
                  const sp = statusPill(p.status);
                  const pp = paymentPill(p.paymentStatus);
                  return (
                    <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => onView(p.id)}>
                      <td onClick={e => e.stopPropagation()}><input type="checkbox" /></td>
                      <td className="mono" style={{ fontSize: 12, color: "var(--fg-1)", fontWeight: 600 }}>{p.id}</td>
                      <td style={{ color: "var(--fg-2)" }}>{p.date}</td>
                      <td>
                        <div className="supplier-cell">
                          <div className="supplier-avatar">{p.supplierShort}</div>
                          <div>
                            <div className="name">{p.supplier}</div>
                            <div className="sub">{p.warehouse.replace("Gudang ", "").replace("Toko Display — ", "")}</div>
                          </div>
                        </div>
                      </td>
                      <td className="num mono">{p.items}</td>
                      <td className="num mono" style={{ fontWeight: 700, color: "var(--fg-1)" }}>{fmtIDR(p.total)}</td>
                      <td><span className={`pill ${sp.cls}`}><span className="dot"></span>{sp.label}</span></td>
                      <td><span className={`pill ${pp.cls}`}><span className="dot"></span>{pp.label}</span></td>
                      <td>
                        <div className="user-cell">
                          <div className="avatar">{p.createdByInitials}</div>
                          <span>{p.createdBy}</span>
                        </div>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="row-actions">
                          <button className="icon-btn-sm" title="Lihat detail" onClick={() => onView(p.id)}><JoyIcon name="eye" /></button>
                          <button className="icon-btn-sm" title="Edit" onClick={() => onEdit(p.id)}><JoyIcon name="pencil" /></button>
                          <button className="icon-btn-sm danger" title="Hapus" onClick={() => setConfirmDel(p)}><JoyIcon name="trash-2" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="pagination">
              <div>
                Menampilkan <b style={{ color: "var(--fg-1)" }}>{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)}</b> dari <b style={{ color: "var(--fg-1)" }}>{filtered.length}</b> pembelian
              </div>
              <div className="pages">
                <button className="page-btn" disabled={safePage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}><JoyIcon name="chevron-left" /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button key={n} className={`page-btn ${n === safePage ? "active" : ""}`} onClick={() => setPage(n)}>{n}</button>
                ))}
                <button className="page-btn" disabled={safePage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}><JoyIcon name="chevron-right" /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {confirmDel && (
        <div className="scrim" onClick={() => setConfirmDel(null)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <div className="dialog-header">
              <div>
                <div className="title">Hapus pembelian?</div>
                <div className="sub">Tindakan ini tidak bisa dibatalkan.</div>
              </div>
              <button className="icon-btn-sm" onClick={() => setConfirmDel(null)}><JoyIcon name="x" /></button>
            </div>
            <div className="dialog-body">
              <p style={{ margin: 0, fontSize: 13, color: "var(--fg-2)" }}>
                PO <b style={{ color: "var(--fg-1)", fontFamily: "var(--font-mono)" }}>{confirmDel.id}</b> dari <b style={{ color: "var(--fg-1)" }}>{confirmDel.supplier}</b> senilai <b style={{ color: "var(--fg-1)" }}>{fmtIDR(confirmDel.total)}</b> akan dihapus permanen.
              </p>
            </div>
            <div className="dialog-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Batal</button>
              <button className="btn btn-danger" onClick={() => { onDelete(confirmDel.id); setConfirmDel(null); }}>
                <JoyIcon name="trash-2" /><span>Hapus pembelian</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ icon, label, value, onChange, options }) {
  const [open, setOpen] = useStateList(false);
  const active = value !== "all";
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const current = options.find(o => o.v === value);
  return (
    <div className="combo" ref={ref} style={{ width: "auto" }}>
      <button className={`chip-select ${active ? "active" : ""}`} onClick={() => setOpen(o => !o)}>
        <JoyIcon name={icon} />
        <span>{label}{active ? `: ${current?.label}` : ""}</span>
        <JoyIcon name="chevron-down" />
      </button>
      {open && (
        <div className="combo-popover" style={{ minWidth: 220 }}>
          <div className="combo-list">
            {options.map(o => (
              <div key={o.v} className={`combo-item ${o.v === value ? "active" : ""}`} onClick={() => { onChange(o.v); setOpen(false); }}>
                <span className="name">{o.label}</span>
                {o.v === value && <JoyIcon name="check" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

window.PurchaseListPage = PurchaseListPage;
