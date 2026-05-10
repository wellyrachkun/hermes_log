// Joyphone ERP — Purchase data (suppliers, products, sample purchases)
// Indonesian electronics retail context

window.SUPPLIERS = [
  { id: "sup-01", name: "PT Cahaya Elektronik Nusantara", code: "SUP-001", city: "Jakarta",   contact: "Bapak Hendra",  paymentTerm: "Net 30" },
  { id: "sup-02", name: "Samsung Indonesia Distributor",   code: "SUP-002", city: "Tangerang", contact: "Ibu Wulan",     paymentTerm: "Net 14" },
  { id: "sup-03", name: "Apple Authorized Reseller",       code: "SUP-003", city: "Jakarta",   contact: "Bapak Marco",   paymentTerm: "Cash" },
  { id: "sup-04", name: "Xiaomi Mi Store Wholesale",       code: "SUP-004", city: "Surabaya",  contact: "Ibu Ratna",     paymentTerm: "Net 30" },
  { id: "sup-05", name: "CV Mitra Aksesoris Sentosa",      code: "SUP-005", city: "Bandung",   contact: "Bapak Joko",    paymentTerm: "Net 14" },
  { id: "sup-06", name: "PT Anker Innovations",            code: "SUP-006", city: "Jakarta",   contact: "Ibu Linda",     paymentTerm: "Net 30" },
  { id: "sup-07", name: "Realme Distributor Resmi",        code: "SUP-007", city: "Semarang",  contact: "Bapak Doni",    paymentTerm: "Cash" },
  { id: "sup-08", name: "Oppo Indonesia",                  code: "SUP-008", city: "Jakarta",   contact: "Ibu Sinta",     paymentTerm: "Net 14" },
];

window.WAREHOUSES = [
  { id: "wh-01", label: "Gudang Pusat — Jakarta" },
  { id: "wh-02", label: "Gudang Cabang — Bandung" },
  { id: "wh-03", label: "Gudang Cabang — Surabaya" },
  { id: "wh-04", label: "Toko Display — Mall Central Park" },
];

window.PAYMENT_METHODS = [
  { id: "transfer",  label: "Transfer Bank" },
  { id: "cash",      label: "Tunai" },
  { id: "credit",    label: "Kredit Supplier" },
  { id: "giro",      label: "Giro / Cek" },
  { id: "ewallet",   label: "E-Wallet (OVO / GoPay)" },
];

window.PRODUCTS = [
  { id: "p1",  name: "iPhone 15 Pro 256GB Titanium",  sku: "IP15PRO-256-TI",  price: 18500000, unit: "unit" },
  { id: "p2",  name: "iPhone 15 128GB Black",          sku: "IP15-128-BLK",    price: 13900000, unit: "unit" },
  { id: "p3",  name: "Samsung Galaxy S24 Ultra 512GB", sku: "SGS24U-512-GRY",  price: 21500000, unit: "unit" },
  { id: "p4",  name: "Samsung Galaxy A55 5G 256GB",    sku: "SMA55-256-BLK",   price: 5700000,  unit: "unit" },
  { id: "p5",  name: "Xiaomi Redmi Note 13 Pro",       sku: "RN13P-256-GRN",   price: 4200000,  unit: "unit" },
  { id: "p6",  name: "AirPods Pro 2 (USB-C)",          sku: "APP2-USBC",       price: 3650000,  unit: "unit" },
  { id: "p7",  name: "Anker 65W GaN Charger",          sku: "ANK-65W-GAN",     price: 580000,   unit: "unit" },
  { id: "p8",  name: "Realme GT Neo 6 SE 12/256GB",    sku: "RGT-256-BLU",     price: 6200000,  unit: "unit" },
  { id: "p9",  name: "Oppo Reno 11 Pro 5G",            sku: "ORN11P-256",      price: 8400000,  unit: "unit" },
  { id: "p10", name: "Charger Type-C 25W Original",    sku: "CHG-25W-USBC",    price: 285000,   unit: "unit" },
  { id: "p11", name: "Tempered Glass iPhone 15 Pro",   sku: "TG-IP15PRO",      price: 65000,    unit: "unit" },
  { id: "p12", name: "Powerbank Anker 20.000 mAh",     sku: "ANK-PB-20K",      price: 720000,   unit: "unit" },
];

window.SAMPLE_PURCHASES = [
  {
    id: "PO-2026-0042", date: "12 Mei 2026", dateRaw: "2026-05-12",
    supplier: "Apple Authorized Reseller", supplierId: "sup-03", supplierShort: "AAR",
    warehouse: "Gudang Pusat — Jakarta",
    items: 25, total: 462500000, paid: 462500000,
    status: "received", paymentStatus: "paid",
    createdBy: "Budi Santoso", createdByInitials: "BS",
    paymentMethod: "transfer",
    notes: "PO untuk persediaan launching iPhone 15 Pro batch 2.",
    lines: [
      { productId: "p1", qty: 20, price: 18500000, discount: 500000 },
      { productId: "p11", qty: 100, price: 65000, discount: 0 },
    ],
  },
  {
    id: "PO-2026-0041", date: "11 Mei 2026", dateRaw: "2026-05-11",
    supplier: "Samsung Indonesia Distributor", supplierId: "sup-02", supplierShort: "SS",
    warehouse: "Gudang Pusat — Jakarta",
    items: 50, total: 285000000, paid: 142500000,
    status: "received", paymentStatus: "partial",
    createdBy: "Sari Lestari", createdByInitials: "SL",
    paymentMethod: "credit",
  },
  {
    id: "PO-2026-0040", date: "11 Mei 2026", dateRaw: "2026-05-11",
    supplier: "PT Anker Innovations", supplierId: "sup-06", supplierShort: "AN",
    warehouse: "Gudang Cabang — Bandung",
    items: 120, total: 84600000, paid: 84600000,
    status: "received", paymentStatus: "paid",
    createdBy: "Hendra Setiawan", createdByInitials: "HS",
    paymentMethod: "transfer",
  },
  {
    id: "PO-2026-0039", date: "10 Mei 2026", dateRaw: "2026-05-10",
    supplier: "Xiaomi Mi Store Wholesale", supplierId: "sup-04", supplierShort: "XM",
    warehouse: "Gudang Cabang — Surabaya",
    items: 30, total: 126000000, paid: 0,
    status: "pending", paymentStatus: "unpaid",
    createdBy: "Budi Santoso", createdByInitials: "BS",
    paymentMethod: "credit",
  },
  {
    id: "PO-2026-0038", date: "09 Mei 2026", dateRaw: "2026-05-09",
    supplier: "CV Mitra Aksesoris Sentosa", supplierId: "sup-05", supplierShort: "MA",
    warehouse: "Gudang Pusat — Jakarta",
    items: 200, total: 14250000, paid: 14250000,
    status: "received", paymentStatus: "paid",
    createdBy: "Maya Putri", createdByInitials: "MP",
    paymentMethod: "cash",
  },
  {
    id: "PO-2026-0037", date: "08 Mei 2026", dateRaw: "2026-05-08",
    supplier: "Realme Distributor Resmi", supplierId: "sup-07", supplierShort: "RM",
    warehouse: "Gudang Pusat — Jakarta",
    items: 18, total: 111600000, paid: 0,
    status: "draft", paymentStatus: "unpaid",
    createdBy: "Rizki Pratama", createdByInitials: "RP",
    paymentMethod: "transfer",
  },
  {
    id: "PO-2026-0036", date: "07 Mei 2026", dateRaw: "2026-05-07",
    supplier: "Oppo Indonesia", supplierId: "sup-08", supplierShort: "OP",
    warehouse: "Gudang Cabang — Bandung",
    items: 15, total: 126000000, paid: 126000000,
    status: "received", paymentStatus: "paid",
    createdBy: "Sari Lestari", createdByInitials: "SL",
    paymentMethod: "transfer",
  },
  {
    id: "PO-2026-0035", date: "06 Mei 2026", dateRaw: "2026-05-06",
    supplier: "Apple Authorized Reseller", supplierId: "sup-03", supplierShort: "AAR",
    warehouse: "Gudang Pusat — Jakarta",
    items: 10, total: 36500000, paid: 36500000,
    status: "received", paymentStatus: "paid",
    createdBy: "Budi Santoso", createdByInitials: "BS",
    paymentMethod: "transfer",
  },
  {
    id: "PO-2026-0034", date: "05 Mei 2026", dateRaw: "2026-05-05",
    supplier: "Samsung Indonesia Distributor", supplierId: "sup-02", supplierShort: "SS",
    warehouse: "Toko Display — Mall Central Park",
    items: 8, total: 45600000, paid: 45600000,
    status: "received", paymentStatus: "paid",
    createdBy: "Hendra Setiawan", createdByInitials: "HS",
    paymentMethod: "transfer",
  },
  {
    id: "PO-2026-0033", date: "04 Mei 2026", dateRaw: "2026-05-04",
    supplier: "PT Cahaya Elektronik Nusantara", supplierId: "sup-01", supplierShort: "CN",
    warehouse: "Gudang Pusat — Jakarta",
    items: 60, total: 38400000, paid: 38400000,
    status: "received", paymentStatus: "paid",
    createdBy: "Maya Putri", createdByInitials: "MP",
    paymentMethod: "transfer",
  },
  {
    id: "PO-2026-0032", date: "03 Mei 2026", dateRaw: "2026-05-03",
    supplier: "Xiaomi Mi Store Wholesale", supplierId: "sup-04", supplierShort: "XM",
    warehouse: "Gudang Cabang — Surabaya",
    items: 22, total: 92400000, paid: 92400000,
    status: "received", paymentStatus: "paid",
    createdBy: "Budi Santoso", createdByInitials: "BS",
    paymentMethod: "credit",
  },
  {
    id: "PO-2026-0031", date: "02 Mei 2026", dateRaw: "2026-05-02",
    supplier: "PT Anker Innovations", supplierId: "sup-06", supplierShort: "AN",
    warehouse: "Gudang Cabang — Bandung",
    items: 80, total: 56400000, paid: 28200000,
    status: "received", paymentStatus: "partial",
    createdBy: "Sari Lestari", createdByInitials: "SL",
    paymentMethod: "credit",
  },
];

// Format helpers
window.fmtIDR = function(n, withPrefix = true) {
  if (n == null || isNaN(n)) return withPrefix ? "Rp 0" : "0";
  const s = Math.round(n).toLocaleString("id-ID");
  return (withPrefix ? "Rp " : "") + s;
};
window.statusPill = function(status) {
  const map = {
    draft:    { cls: "draft",    label: "Draft" },
    pending:  { cls: "warning",  label: "Pending" },
    received: { cls: "received", label: "Diterima" },
    cancelled:{ cls: "danger",   label: "Dibatalkan" },
  };
  return map[status] || map.draft;
};
window.paymentPill = function(status) {
  const map = {
    paid:    { cls: "paid",    label: "Lunas" },
    partial: { cls: "partial", label: "Sebagian" },
    unpaid:  { cls: "unpaid",  label: "Belum Bayar" },
  };
  return map[status] || map.unpaid;
};
