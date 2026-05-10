// Joyphone ERP — Topbar (purchase module)
function PurchaseTopbar({ collapsed, onToggleSidebar, theme, onToggleTheme, onNew }) {
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <JoyIcon name="panel-left" />
      </button>
      <div className="search">
        <JoyIcon name="search" />
        <input placeholder="Cari produk, faktur, supplier, PO..." />
        <kbd>⌘K</kbd>
      </div>
      <div className="spacer"></div>
      <div className="topbar-right">
        <button className="icon-btn" onClick={onToggleTheme} aria-label="Toggle theme" title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}>
          <JoyIcon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <button className="icon-btn" aria-label="Help"><JoyIcon name="help-circle" /></button>
        <span className="bell-wrap"><button className="icon-btn" aria-label="Notifications"><JoyIcon name="bell" /></button></span>
        <button className="btn btn-primary" onClick={onNew}>
          <JoyIcon name="plus" /><span>Pembelian Baru</span>
        </button>
      </div>
    </header>
  );
}
window.PurchaseTopbar = PurchaseTopbar;
