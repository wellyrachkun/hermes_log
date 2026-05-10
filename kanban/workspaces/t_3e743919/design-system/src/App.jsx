// Joyphone ERP — Purchase module App
const { useState: useStateApp, useEffect: useEffectApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "formLayout": "fullpage"
}/*EDITMODE-END*/;

function App() {
  const [collapsed, setCollapsed] = useStateApp(false);
  const [activeId, setActiveId] = useStateApp("purchase-list");
  const [view, setView] = useStateApp({ name: "list", id: null });
  const [purchases, setPurchases] = useStateApp(() => SAMPLE_PURCHASES);
  const [toast, setToast] = useStateApp(null);

  const [t, setT] = useTweaks(TWEAK_DEFAULTS);

  useEffectApp(() => {
    document.documentElement.setAttribute("data-theme", t.theme);
  }, [t.theme]);

  // Sidebar nav binding
  useEffectApp(() => {
    if (activeId === "purchase-list") setView({ name: "list" });
    else if (activeId === "purchase-add") setView({ name: "add" });
  }, [activeId]);

  const showToast = (title, meta, kind = "success") => {
    setToast({ title, meta, kind });
    setTimeout(() => setToast(null), 3500);
  };

  const goView = (id) => { setView({ name: "detail", id }); setActiveId("purchase-list"); };
  const goEdit = (id) => { setView({ name: "edit", id }); setActiveId("purchase-list"); };
  const goAdd = () => { setView({ name: "add" }); setActiveId("purchase-add"); };
  const goList = () => { setView({ name: "list" }); setActiveId("purchase-list"); };

  const handleSave = (data, asDraft) => {
    const existing = purchases.find(p => p.id === data.id);
    if (existing) {
      setPurchases(ps => ps.map(p => p.id === data.id ? { ...p, ...data } : p));
      showToast("Pembelian diperbarui", `${data.id} berhasil disimpan`);
    } else {
      setPurchases(ps => [data, ...ps]);
      showToast(asDraft ? "Draft tersimpan" : "Pembelian dibuat", `${data.id} · ${fmtIDR(data.total)}`);
    }
    goList();
  };

  const handleDelete = (id) => {
    setPurchases(ps => ps.filter(p => p.id !== id));
    showToast("Pembelian dihapus", `${id} dihapus permanen`, "error");
    goList();
  };

  const currentDetail = view.name === "detail" ? purchases.find(p => p.id === view.id) : null;
  const editingItem = view.name === "edit" ? purchases.find(p => p.id === view.id) : null;

  const useModalForm = t.formLayout === "modal";

  return (
    <div className={`app ${collapsed ? "collapsed" : ""}`}>
      <Sidebar
        collapsed={collapsed}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          if (id === "purchase-list") setView({ name: "list" });
          else if (id === "purchase-add") setView({ name: "add" });
        }}
      />
      <div className="main">
        <PurchaseTopbar
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed(c => !c)}
          theme={t.theme}
          onToggleTheme={() => setT('theme', t.theme === "dark" ? "light" : "dark")}
          onNew={goAdd}
        />

        {view.name === "list" && (
          <PurchaseListPage
            purchases={purchases}
            onView={goView}
            onEdit={goEdit}
            onAdd={goAdd}
            onDelete={handleDelete}
          />
        )}
        {view.name === "add" && !useModalForm && (
          <PurchaseFormPage mode="add" initial={null} onCancel={goList} onSave={handleSave} />
        )}
        {view.name === "edit" && !useModalForm && editingItem && (
          <PurchaseFormPage mode="edit" initial={editingItem} onCancel={goList} onSave={handleSave} />
        )}
        {view.name === "detail" && currentDetail && (
          <PurchaseDetailPage purchase={currentDetail} onBack={goList} onEdit={goEdit} onDelete={handleDelete} />
        )}
      </div>

      {/* Modal form variant */}
      {useModalForm && (view.name === "add" || view.name === "edit") && (
        <div className="scrim" onClick={goList}>
          <div className="dialog lg" onClick={e => e.stopPropagation()}>
            <div className="dialog-header">
              <div>
                <div className="title">{view.name === "edit" ? "Edit Pembelian" : "Tambah Pembelian"}</div>
                <div className="sub">Isi detail PO ke supplier</div>
              </div>
              <button className="icon-btn-sm" onClick={goList}><JoyIcon name="x" /></button>
            </div>
            <div className="dialog-body flush" style={{ background: "var(--bg)" }}>
              <PurchaseFormPage mode={view.name} initial={editingItem} onCancel={goList} onSave={handleSave} />
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="toast-region">
        {toast && (
          <div className={`toast ${toast.kind === "error" ? "error" : ""}`}>
            <div className="toast-icon"><JoyIcon name={toast.kind === "error" ? "trash-2" : "check"} /></div>
            <div className="toast-body">
              <div className="toast-title">{toast.title}</div>
              <div className="toast-meta">{toast.meta}</div>
            </div>
          </div>
        )}
      </div>

      {/* Tweaks */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Tampilan">
          <TweakRadio label="Tema" value={t.theme} options={[{ value: "light", label: "Terang" }, { value: "dark", label: "Gelap" }]} onChange={v => setT('theme', v)} />
          <TweakRadio label="Layout form" value={t.formLayout} options={[{ value: "fullpage", label: "Halaman penuh" }, { value: "modal", label: "Modal" }]} onChange={v => setT('formLayout', v)} />
        </TweakSection>
      </TweaksPanel>

      <script dangerouslySetInnerHTML={{ __html: "window.lucide && window.lucide.createIcons();" }}></script>
    </div>
  );
}

// Lucide refresh after mount
setTimeout(() => { if (window.lucide) window.lucide.createIcons(); }, 100);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
