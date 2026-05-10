// Joyphone ERP — Sidebar with collapsible sub-menus
const { useState } = React;

function Icon({ name, className = "" }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = "";
      const svg = window.lucide.icons[toCamel(name)] || window.lucide.icons[name];
      if (svg) {
        const el = window.lucide.createElement(svg);
        ref.current.appendChild(el);
      }
    }
  }, [name]);
  return <span ref={ref} className={`lucide ${className}`} aria-hidden="true"></span>;
}
function toCamel(s) { return s.split('-').map((w,i)=> i===0? w.charAt(0).toUpperCase()+w.slice(1) : w.charAt(0).toUpperCase()+w.slice(1)).join(''); }

const NAV = [
  {
    section: "Utama",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
      { id: "pos", label: "Point of Sale", icon: "scan-line", badge: "Live" },
    ]
  },
  {
    section: "Operasional",
    items: [
      { id: "inventory", label: "Inventaris", icon: "package", children: [
        { id: "products", label: "Produk" },
        { id: "stock", label: "Stok Gudang" },
        { id: "categories", label: "Kategori" },
        { id: "transfer", label: "Transfer Stok" },
      ]},
      { id: "sales", label: "Penjualan", icon: "shopping-cart", badge: "12", children: [
        { id: "orders", label: "Pesanan" },
        { id: "invoices", label: "Faktur" },
        { id: "returns", label: "Retur" },
      ]},
      { id: "purchase", label: "Pembelian", icon: "truck", badge: "8", children: [
        { id: "purchase-list", label: "Daftar Pembelian" },
        { id: "purchase-add", label: "Tambah Pembelian" },
        { id: "suppliers", label: "Supplier" },
        { id: "receipts", label: "Tanda Terima" },
      ]},
      { id: "customers", label: "Pelanggan", icon: "users" },
    ]
  },
  {
    section: "Keuangan",
    items: [
      { id: "finance", label: "Keuangan", icon: "wallet", children: [
        { id: "transactions", label: "Transaksi" },
        { id: "expenses", label: "Pengeluaran" },
        { id: "tax", label: "Pajak" },
      ]},
      { id: "reports", label: "Laporan", icon: "bar-chart-3" },
    ]
  },
  {
    section: "Sumber Daya",
    items: [
      { id: "hr", label: "Karyawan", icon: "id-card", children: [
        { id: "employees", label: "Daftar Karyawan" },
        { id: "attendance", label: "Absensi" },
        { id: "payroll", label: "Penggajian" },
      ]},
      { id: "stores", label: "Toko & Cabang", icon: "store" },
    ]
  },
  {
    section: "Sistem",
    items: [
      { id: "settings", label: "Pengaturan", icon: "settings" },
      { id: "help", label: "Bantuan", icon: "life-buoy" },
    ]
  }
];

function Sidebar({ collapsed, activeId, onSelect }) {
  const [expanded, setExpanded] = useState({ purchase: true });

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-mark">
          <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true">
            <path d="M30 11v18.5c0 4.7-3.8 8.5-8.5 8.5h-1.2c-3.5 0-6.7-2.1-8-5.4" stroke="#14110e" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
            <circle cx="30" cy="11" r="2.5" fill="#14110e"/>
          </svg>
        </div>
        <div className="brand-name">Joyphone</div>
      </div>
      <nav className="sidebar-nav">
        {NAV.map(group => (
          <React.Fragment key={group.section}>
            <div className="sidebar-section-label">{group.section}</div>
            {group.items.map(item => {
              const hasChildren = !!item.children;
              const isExpanded = expanded[item.id];
              const isActive = activeId === item.id || (hasChildren && item.children.some(c => c.id === activeId));
              return (
                <React.Fragment key={item.id}>
                  <div
                    className={`nav-item ${isActive && !hasChildren ? "active" : ""} ${isExpanded ? "expanded" : ""}`}
                    onClick={() => hasChildren ? toggle(item.id) : onSelect(item.id)}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon name={item.icon} />
                    <span className="nav-label">{item.label}</span>
                    {item.badge && <span className={`nav-badge ${item.badge === "Live" ? "" : "muted"}`}>{item.badge}</span>}
                    {hasChildren && <Icon name="chevron-right" className="nav-caret" />}
                  </div>
                  {hasChildren && (
                    <div className={`submenu ${isExpanded ? "open" : ""}`}>
                      {item.children.map(c => (
                        <div
                          key={c.id}
                          className={`submenu-item ${activeId === c.id ? "active" : ""}`}
                          onClick={() => onSelect(c.id)}
                        >{c.label}</div>
                      ))}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="avatar">BS</div>
        <div className="sidebar-footer-text">
          <div className="name">Budi Santoso</div>
          <div className="role">Store Manager</div>
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
window.JoyIcon = Icon;
window.NAV = NAV;
