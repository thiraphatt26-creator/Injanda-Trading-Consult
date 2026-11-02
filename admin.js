/* =====================================================================
   Injanda Shop — hidden admin panel
   Open it with the faint dot at the end of the footer copyright line,
   or with Ctrl + Shift + A, then log in with an account whose role is
   "admin" (first run: username 123 / password 123 — change it in Settings).
   All data is stored in Supabase, so it is shared across every device.
   ===================================================================== */

const NAV = [
  ['dashboard', 'Dashboard', '<path d="M4 13h6V4H4zM14 20h6V4h-6zM4 20h6v-3H4z"/>'],
  ['products',  'Products',  '<path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>'],
  ['orders',    'Orders',    '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>'],
  ['customers', 'Customers', '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M18 20a6 6 0 0 0-3-5.2"/>'],
  ['vouchers',  'Vouchers',  '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/>'],
  ['banners',   'Banners',   '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 15 5-4 4 3 3-2 6 4"/>'],
  ['settings',  'Settings',  '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'],
];
const STATUS = { new: 'New', confirmed: 'Confirmed', shipped: 'Shipped', done: 'Completed', cancelled: 'Cancelled' };
const AD = { sec: 'dashboard', q: '', cat: 'all', st: '' };
const LIB = () => Object.keys(window.IMG_BACKUP || {}).length ? Object.keys(window.IMG_BACKUP) : ['hero', 'k1', 'k2', 'k3', 'k4', 'r1', 'r2', 'r3', 'r4', 'v1', 'b1', 'bl1', 'bl2', 'bl3', 'pin', 'st', 'pl', 'sp', 'set', 'e1', 'e2', 'e3', 'e4', 'c1', 'c2', 'c3'];
const fdate = iso => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const ico = p => `<svg class="i" viewBox="0 0 24 24">${p}</svg>`;

/* ---------- Image upload (Supabase Storage, with inline fallback) ---------- */
function compress(file, max = 900) {
  return new Promise((res, rej) => {
    const r = new FileReader(); r.onerror = rej;
    r.onload = () => { const im = new Image(); im.onerror = rej; im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); res(c); }; im.src = r.result; };
    r.readAsDataURL(file);
  });
}
async function uploadImage(file) {
  const c = await compress(file);
  try {
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .82));
    const path = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}.jpg`;
    const up = await supabase.storage.from('product-images').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (up.error) throw up.error;
    return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  } catch (e) { toast('Storage upload failed — saved inline instead (run supabase-setup.sql)'); return c.toDataURL('image/jpeg', .72); }
}

/* ---------- Shell ---------- */
function enterAdmin() {
  if (!isAdmin()) return toast('Admin access only');
  document.body.classList.add('lock');
  $('#admin').hidden = false;
  $('#admin').innerHTML = `<aside class="ad-side"><div class="ad-logo"><i>IN</i><b>Seller Centre</b></div>
    ${NAV.map(n => `<button data-ad="nav" data-sec="${n[0]}">${ico(n[2])}<span>${n[1]}</span></button>`).join('')}
    <div class="grow"></div><button data-ad="shop">${ico('<path d="M3 9 5 4h14l2 5M5 9v11h14V9"/>')}<span>View storefront</span></button>
    <button data-ad="logout">${ico('<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>')}<span>Log out</span></button></aside>
    <section class="ad-main"><header class="ad-top"><h2 id="adTitle"></h2><span class="who">Signed in as <b>${esc(me().user)}</b></span></header><div class="ad-body" id="adBody"></div></section>`;
  adShow(AD.sec);
}
function exitAdmin() { document.body.classList.remove('lock'); $('#admin').hidden = true; $('#admin').innerHTML = ''; closeDlg(); renderChrome(); updateBadges(); renderCart(); route(true); }
function adShow(sec) {
  AD.sec = sec;
  $$('#admin [data-sec]').forEach(b => b.classList.toggle('on', b.dataset.sec === sec));
  $('#adTitle').textContent = NAV.find(n => n[0] === sec)[1];
  $('#adBody').innerHTML = { dashboard, products, orders, customers, vouchers, banners, settings }[sec]();
}
const adSave = (msg, rerender = true) => { if (persist()) { if (msg) toast(msg); } if (rerender) adShow(AD.sec); };
const openDlg = html => { $('#adlgBox').innerHTML = html; $('#adlg').classList.add('on'); };
const closeDlg = () => $('#adlg').classList.remove('on');

/* ---------- Image picker (upload / library / URL) ---------- */
const pickerHTML = val => `<div class="pk"><div class="pk-prev">${imgTag(val, '', false)}</div><div class="pk-in">
  <div class="pk-btns"><label class="btn ghost sm">Upload photo<input type="file" accept="image/*" hidden data-pkfile></label><button type="button" class="btn ghost sm" data-pklib>Choose from library</button></div>
  <input class="pk-url" placeholder="…or paste an image URL" value="${isKey(val) || (val || '').startsWith('data:') ? '' : esc(val)}">
  <input type="hidden" class="pk-val" data-k="img" value="${esc(val)}"></div>
  <div class="pk-lib" hidden>${LIB().map(k => `<button type="button" data-pkpick="${k}">${imgTag(k, k)}</button>`).join('')}</div></div>`;

function setPicker(pk, val) {
  $('.pk-prev', pk).innerHTML = imgTag(val, '', false);
  $('.pk-url', pk).value = isKey(val) || val.startsWith('data:') ? '' : val;
  const v = $('.pk-val', pk); v.value = val;
  v.dispatchEvent(new Event('change', { bubbles: true }));
}
function pickerEvents(e) {
  const pk = e.target.closest('.pk'); if (!pk) return false;
  const t = e.target;
  if (e.type === 'click') {
    if (t.closest('[data-pklib]')) { $('.pk-lib', pk).hidden = !$('.pk-lib', pk).hidden; return true; }
    const b = t.closest('[data-pkpick]'); if (b) { setPicker(pk, b.dataset.pkpick); $('.pk-lib', pk).hidden = true; return true; }
  }
  if (e.type === 'change') {
    if (t.matches('[data-pkfile]') && t.files[0]) { uploadImage(t.files[0]).then(d => { setPicker(pk, d); toast('Image ready'); }).catch(() => toast('Could not read that image')); t.value = ''; return true; }
    if (t.matches('.pk-url')) { setPicker(pk, t.value.trim()); return true; }
  }
  return false;
}

/* ---------- Dashboard ---------- */
function dashboard() {
  const live = DB.orders.filter(o => o.status !== 'cancelled');
  const rev = live.reduce((a, o) => a + o.total, 0), parts = DB.products.filter(tracked);
  const low = parts.filter(p => p.stock <= 10).sort((a, b) => a.stock - b.stock);
  const byCat = {}; live.forEach(o => o.items.forEach(i => { const p = find(i.id); const c = p ? p.cat : 'other'; byCat[c] = (byCat[c] || 0) + i.price * i.qty; }));
  const max = Math.max(1, ...Object.values(byCat));
  const kpi = (l, v, s = '') => `<div class="kpi"><span>${l}</span><b>${v}</b><small>${s}</small></div>`;
  return `<div class="kpis">
    ${kpi('Revenue', baht(rev), `${live.length} active orders`)}${kpi('New orders', DB.orders.filter(o => o.status === 'new').length, 'waiting to confirm')}
    ${kpi('Products', DB.products.length, `${DB.products.filter(p => p.hidden).length} hidden`)}${kpi('Low stock', low.length, `${parts.filter(p => !p.stock).length} sold out`)}</div>
  <div class="two-col"><div class="panel"><h4>Sales by category</h4>${CATEGORIES.filter(c => c.id !== 'all').map(c => `<div class="hbar"><span>${c.name}</span><div><i style="width:${(byCat[c.id] || 0) / max * 100}%"></i></div><b>${baht(byCat[c.id] || 0)}</b></div>`).join('')}</div>
  <div class="panel"><h4>Needs restocking</h4>${low.length ? low.slice(0, 7).map(p => `<div class="lrow"><span>${esc(p.name)}</span><b class="${p.stock ? '' : 'red'}">${p.stock}</b><button class="btn ghost sm" data-ad="restock" data-id="${p.id}">+20</button></div>`).join('') : '<p class="muted">All products are well stocked.</p>'}</div></div>
  <div class="panel"><h4>Recent orders</h4>${DB.orders.length ? `<table class="tbl"><tr><th>Ref</th><th>Date</th><th>Customer</th><th>Total</th><th>Status</th></tr>${DB.orders.slice(0, 6).map(o => `<tr><td><a data-ad="vieworder" data-ref="${o.ref}">${o.ref}</a></td><td>${fdate(o.date)}</td><td>${esc(o.customer.name)}</td><td>${baht(o.total)}</td><td><span class="pill ${o.status}">${STATUS[o.status]}</span></td></tr>`).join('')}</table>` : '<p class="muted">No orders yet. They appear here when customers place an order request.</p>'}</div>`;
}

/* ---------- Products ---------- */
function products() {
  const q = AD.q.toLowerCase();
  const list = DB.products.filter(p => (AD.cat === 'all' || p.cat === AD.cat) && (!q || `${p.name} ${p.sku}`.toLowerCase().includes(q)));
  return `<div class="bar-row"><input class="in" id="adq" placeholder="Search name or SKU" value="${esc(AD.q)}">
    <select class="in" id="adcat">${CATEGORIES.map(c => `<option value="${c.id}" ${AD.cat === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select>
    <div class="grow"></div><button class="btn ghost red" data-ad="clearprods">Delete all products</button><button class="btn ghost" data-ad="seedprods">Restore catalogue products</button><button class="btn" data-ad="newprod">+ Add product</button></div>
  <div class="panel np"><table class="tbl prod"><tr><th></th><th>Product</th><th>Price (฿) <small>0 = quote</small></th><th>Stock</th><th>Visible</th><th></th></tr>
  ${list.map(p => `<tr data-id="${p.id}"><td class="th">${imgTag(p.img, '')}</td>
    <td><b>${esc(p.name)}</b><small>${esc(p.sku)} · ${CATEGORIES.find(c => c.id === p.cat)?.name || ''}${p.old ? ' · on sale' : ''}</small></td>
    <td><input class="in sm" type="number" min="0" data-f="price" value="${p.price}"></td>
    <td>${!tracked(p) ? `<span class="muted">${p.kind === 'service' ? 'Service' : 'On request'}</span>${p.kind === 'part' ? ' <button class="btn ghost sm" data-ad="track">Track stock</button>' : ''}` : `<div class="stp"><button data-ad="stk" data-d="-1">−</button><input class="in sm" type="number" min="0" data-f="stock" value="${p.stock}"><button data-ad="stk" data-d="1">+</button><button class="btn ghost sm" data-ad="stk" data-d="10">+10</button></div>`}</td>
    <td><label class="sw"><input type="checkbox" data-f="visible" ${p.hidden ? '' : 'checked'}><i></i></label></td>
    <td class="acts"><button class="btn ghost sm" data-ad="editprod">Edit</button><button class="btn ghost sm red" data-ad="delprod">Delete</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">No products found.</td></tr>'}</table></div>`;
}

function prodForm(id) {
  const p = id ? find(id) : { name: '', sku: '', cat: 'part', kind: 'part', price: 0, old: '', stock: null, unit: '', img: 'sp', desc: '', spec: {} };
  const specs = Object.entries(p.spec || {}).map(([k, v]) => `${k}: ${v}`).join('\n');
  openDlg(`<form id="prodForm" data-id="${id || ''}"><div class="dlg-h"><h3>${id ? 'Edit product' : 'Add product'}</h3><button type="button" class="x" data-ad="closedlg">✕</button></div>
  <div class="dlg-b"><div class="fgrid">
    <label class="full">Product name<input class="in" name="name" required value="${esc(p.name)}"></label>
    <label>SKU<input class="in" name="sku" value="${esc(p.sku)}" placeholder="e.g. FB-STD"></label>
    <label>Category<select class="in" name="cat">${CATEGORIES.filter(c => c.id !== 'all').map(c => `<option value="${c.id}" ${p.cat === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
    <label>Type<select class="in" name="kind"><option value="part" ${p.kind === 'part' ? 'selected' : ''}>Product / part (has stock)</option><option value="service" ${p.kind === 'service' ? 'selected' : ''}>Service</option></select></label>
    <label>Price label (optional)<input class="in" name="unit" value="${esc(p.unit || '')}" placeholder='e.g. From'></label>
    <label>Price (฿) — 0 means “request a quote”<input class="in" type="number" min="0" name="price" required value="${p.price}"></label>
    <label>Original price (฿) — fills the sale badge<input class="in" type="number" min="0" name="old" value="${p.old || ''}"></label>
    <label>Stock — leave blank if not tracked<input class="in" type="number" min="0" name="stock" value="${tracked(p) ? p.stock : ''}"></label>
    <label class="full">Description<textarea class="in" name="desc" rows="3">${esc(p.desc)}</textarea></label>
    <label class="full">Specifications — one per line, “Name: value”<textarea class="in" name="spec" rows="4">${esc(specs)}</textarea></label>
    <div class="full"><span class="lab">Product image</span>${pickerHTML(p.img)}</div></div></div>
  <div class="dlg-f"><button type="button" class="btn ghost" data-ad="closedlg">Cancel</button><button class="btn">${id ? 'Save changes' : 'Add product'}</button></div></form>`);
  $('#prodForm').onsubmit = e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target)), spec = {};
    f.spec.split('\n').forEach(l => { const i = l.indexOf(':'); if (i > 0) spec[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
    const data = { name: f.name.trim(), sku: f.sku.trim() || 'SKU-' + Date.now().toString(36).toUpperCase().slice(-5), cat: f.cat, kind: f.kind, unit: f.unit.trim(), price: +f.price || 0,
      old: +f.old > +f.price ? +f.old : 0, stock: f.kind === 'part' && f.stock !== '' ? Math.max(0, +f.stock || 0) : null, desc: f.desc.trim(), spec, img: $('.pk-val', e.target).value || 'sp' };
    if (id) Object.assign(find(id), data); else DB.products.unshift({ id: uid('p'), v: 2, hidden: false, ...data });
    closeDlg(); adSave(id ? 'Product updated' : 'Product added');
  };
}

/* ---------- Orders ---------- */
function orders() {
  const list = DB.orders.filter(o => !AD.st || o.status === AD.st);
  return `<div class="bar-row"><select class="in" id="adst"><option value="">All statuses</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${AD.st === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
  <div class="panel np">${list.length ? `<table class="tbl"><tr><th>Ref</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr>
  ${list.map(o => `<tr data-ref="${o.ref}"><td><a data-ad="vieworder" data-ref="${o.ref}">${o.ref}</a></td><td>${fdate(o.date)}</td><td>${esc(o.customer.name)}<small>${esc(o.customer.phone)}</small></td><td>${o.type === 'quote' ? 'Quote' : o.items.reduce((a, i) => a + i.qty, 0)}</td><td>${baht(o.total)}</td>
    <td><select class="in sm st-${o.status}" data-f="status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
    <td class="acts"><button class="btn ghost sm red" data-ad="delorder">Delete</button></td></tr>`).join('')}</table>` : '<p class="muted pad">No orders to show.</p>'}</div>`;
}
function setStatus(o, st) {
  const was = o.status === 'cancelled'; o.status = st;
  const adj = d => o.items.forEach(i => { const p = find(i.id); if (p && tracked(p)) p.stock = Math.max(0, p.stock + d * i.qty); });
  if (st === 'cancelled' && !was) adj(1);             // cancelled: put the items back in stock
  if (was && st !== 'cancelled') adj(-1);
}
function orderView(ref) {
  const o = DB.orders.find(x => x.ref === ref), c = o.customer;
  openDlg(`<div class="dlg-h"><h3>Order ${o.ref}</h3><button class="x" data-ad="closedlg">✕</button></div><div class="dlg-b">
    <p class="muted">${fdate(o.date)} · <span class="pill ${o.status}">${STATUS[o.status]}</span></p>
    <div class="kv"><span>Customer</span><b>${esc(c.name)}</b><span>Phone</span><b>${esc(c.phone)}</b><span>Email</span><b>${esc(c.email)}</b><span>Company</span><b>${esc(c.company) || '—'}</b><span>Address</span><b>${esc(c.addr)}</b><span>Notes</span><b>${esc(c.note) || '—'}</b></div>
    <table class="tbl"><tr><th>Item</th><th>Qty</th><th>Price</th></tr>${o.items.map(i => `<tr><td>${esc(i.name)}<small>${esc(i.sku)}</small></td><td>${i.qty}</td><td>${baht(i.price * i.qty)}</td></tr>`).join('')}</table>
    <div class="kv tot"><span>Subtotal</span><b>${baht(o.sub)}</b>${o.disc ? `<span>Voucher ${esc(o.code)}</span><b>−${baht(o.disc)}</b>` : ''}<span>Shipping</span><b>${o.ship ? baht(o.ship) : 'Free'}</b><span>Total</span><b>${baht(o.total)}</b></div></div>
    <div class="dlg-f"><button class="btn" data-ad="closedlg">Close</button></div>`);
}

/* ---------- Vouchers ---------- */
function vouchers() {
  return `<div class="panel"><h4>Create voucher</h4><div class="vform"><input class="in" id="vcode" placeholder="CODE" maxlength="16">
    <select class="in" id="vtype"><option value="pct">% off</option><option value="fix">฿ off</option></select><input class="in" id="vval" type="number" min="1" placeholder="Value">
    <input class="in" id="vmin" type="number" min="0" placeholder="Min. spend (฿)"><button class="btn" data-ad="addvoucher">Add</button></div></div>
  <div class="panel np"><table class="tbl"><tr><th>Code</th><th>Discount</th><th>Min. spend</th><th>Active</th><th></th></tr>
  ${DB.vouchers.map((v, i) => `<tr data-vi="${i}"><td><b>${esc(v.code)}</b></td><td>${v.pct ? v.pct + '%' : baht(v.fix)}</td><td>${baht(v.min || 0)}</td><td><label class="sw"><input type="checkbox" data-f="von" ${v.on ? 'checked' : ''}><i></i></label></td><td class="acts"><button class="btn ghost sm red" data-ad="delvoucher">Delete</button></td></tr>`).join('') || '<tr><td colspan="5" class="muted">No vouchers.</td></tr>'}</table></div>`;
}

/* ---------- Banners ---------- */
function banners() {
  const card = b => `<div class="panel bcard" data-b="${b.id}"><div class="bhead"><b>${b.slot === 'main' ? 'Main carousel' : 'Side banner'}</b><button class="btn ghost sm red" data-ad="delbanner">Delete</button></div>
    <div class="fgrid"><label>Tag<input class="in" data-k="tag" value="${esc(b.tag)}"></label><label>Background colour<input class="in" type="color" data-k="bg" value="${esc(b.bg)}"></label>
    <label class="full">Title<input class="in" data-k="title" value="${esc(b.title)}"></label><label class="full">Subtitle<input class="in" data-k="sub" value="${esc(b.sub)}"></label>
    <label>Links to category<select class="in" data-k="cat">${CATEGORIES.map(c => `<option value="${c.id}" ${b.cat === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
    <div class="full"><span class="lab">Image</span>${pickerHTML(b.img)}</div></div></div>`;
  return `<div class="bar-row"><p class="muted">Edits save automatically. The carousel auto-rotates; two side banners are shown.</p><div class="grow"></div><button class="btn" data-ad="newbanner" data-slot="main">+ Carousel slide</button><button class="btn ghost" data-ad="newbanner" data-slot="side">+ Side banner</button></div>
  <div class="bgrid">${DB.banners.map(card).join('')}</div>`;
}

/* ---------- Customers ---------- */
function customers() {
  const list = DB.users.filter(u => u.role !== 'admin');
  return `<div class="panel np">${list.length ? `<table class="tbl"><tr><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Joined</th><th>Orders</th><th></th></tr>
  ${list.map(u => `<tr data-uid="${esc(u.id)}"><td><b>${esc(u.name)}</b></td><td>${esc(u.user)}</td><td>${esc(u.email)}</td><td>${esc(u.phone)}</td><td>${u.at ? fdate(new Date(u.at).toISOString()) : '—'}</td><td>${DB.orders.filter(o => o.uid === u.id).length}</td><td class="acts"><button class="btn ghost sm red" data-ad="delcust">Delete</button></td></tr>`).join('')}</table>` : '<p class="muted pad">No customers have registered yet.</p>'}</div>`;
}

/* ---------- Settings ---------- */
function settings() {
  const s = cfg(), f = (l, k, t = 'text') => `<label>${l}<input class="in" type="${t}" data-set="${k}" value="${esc(s[k])}"></label>`;
  return `<div class="two-col"><div class="panel"><h4>Store</h4><div class="fgrid one">${f('Store name', 'storeName')}${f('Tagline', 'tagline')}${f('Top announcement', 'announce')}${f('Free shipping over (฿)', 'freeShip', 'number')}${f('Shipping fee (฿)', 'shipFee', 'number')}</div></div>
  <div class="panel"><h4>Contact details (shown on the site)</h4><div class="fgrid one">${f('Phone', 'phone')}${f('Email', 'email', 'email')}${f('Address', 'address')}</div>
  <h4 style="margin-top:20px">Admin login</h4><div class="fgrid one"><label>Username<input class="in" id="admUser" value="${esc(me().user)}"></label><label>New password<input class="in" id="admPass" type="password" placeholder="Leave blank to keep"></label></div>
  <div class="bar-row" style="margin-top:12px"><button class="btn" data-ad="chpass">Save login</button></div></div></div>
  <div class="panel"><h4>Backup</h4><p class="muted">Data lives in Supabase and is shared by every device. Export a JSON copy of products, banners, vouchers and settings, or restore one.</p>
  <div class="bar-row"><button class="btn" data-ad="export">Export backup (.json)</button><label class="btn ghost">Import backup<input type="file" accept=".json" hidden id="impFile"></label></div></div>`;
}

/* ---------- Events ---------- */
const adRoot = $('#admin'), dlgRoot = $('#adlg');
async function onClick(e) {
  if (pickerEvents(e)) return;
  const b = e.target.closest('[data-ad]'); if (!b) { if (e.target === dlgRoot) closeDlg(); return; }
  const a = b.dataset.ad, tr = b.closest('tr'), pid = tr && tr.dataset.id;
  switch (a) {
    case 'nav': return adShow(b.dataset.sec);
    case 'shop': return exitAdmin();
    case 'logout': toast('Logged out'); return exitAdmin();
    case 'closedlg': return closeDlg();
    case 'restock': { const p = find(b.dataset.id); p.stock += 20; return adSave(`${p.name}: +20 stock`); }
    case 'newprod': return prodForm();
    case 'editprod': return prodForm(pid);
    case 'delprod': if (confirm('Delete this product permanently?')) { DB.products = DB.products.filter(p => String(p.id) !== pid); adSave('Product deleted'); } return;
    case 'stk': { const p = find(pid); p.stock = Math.max(0, p.stock + +b.dataset.d); persist(); const i = $('[data-f=stock]', tr); i.value = p.stock; return toast(`Stock: ${p.stock}`); }
    case 'vieworder': return orderView(b.dataset.ref);
    case 'delorder': if (confirm('Delete this order record?')) { DB.orders = DB.orders.filter(o => o.ref !== tr.dataset.ref); adSave('Order deleted'); } return;
    case 'addvoucher': {
      const code = $('#vcode').value.trim().toUpperCase(), val = +$('#vval').value, t = $('#vtype').value;
      if (!code || !val) return toast('Enter a code and a value');
      if (DB.vouchers.some(v => v.code === code)) return toast('That code already exists');
      DB.vouchers.push({ code, [t]: val, min: +$('#vmin').value || 0, on: true }); return adSave('Voucher added');
    }
    case 'delvoucher': DB.vouchers.splice(+tr.dataset.vi, 1); return adSave('Voucher deleted');
    case 'newbanner': DB.banners.push({ id: 'n' + Date.now(), slot: b.dataset.slot, tag: 'NEW', title: 'New banner', sub: 'Edit this text', img: 'hero', bg: '#33424a', cat: 'all' }); return adSave('Banner added');
    case 'delbanner': DB.banners = DB.banners.filter(x => x.id !== b.closest('[data-b]').dataset.b); return adSave('Banner deleted');
    case 'export': {
      const url = URL.createObjectURL(new Blob([JSON.stringify({ products: DB.products, banners: DB.banners, vouchers: DB.vouchers, settings: DB.settings }, null, 1)], { type: 'application/json' }));
      Object.assign(document.createElement('a'), { href: url, download: `injanda-backup-${new Date().toISOString().slice(0, 10)}.json` }).click(); return URL.revokeObjectURL(url);
    }
    case 'track': { find(pid).stock = 0; return adSave('Stock tracking on — set the quantity'); }
    case 'delcust': if (confirm('Delete this customer account?')) { DB.users = DB.users.filter(u => u.id !== tr.dataset.uid); adSave('Customer deleted'); } return;
    case 'clearprods': if (confirm('Delete ALL products? This cannot be undone (you can restore the catalogue products afterwards).')) { DB.products = []; adSave('All products deleted'); } return;
    case 'seedprods': if (confirm('Add the original catalogue products back? Existing products are kept.')) { SEED_PRODUCTS.forEach(sp => { if (!find(sp.id)) DB.products.push({ ...structuredClone(sp), v: 2 }); }); adSave('Catalogue products restored'); } return;
    case 'chpass': {
      const u = me(), name = $('#admUser').value.trim(), pw = $('#admPass').value;
      if (!name) return toast('Username cannot be empty'); u.user = name; if (pw) u.pass = await sha(pw);
      persist(); $('#admPass').value = ''; return toast('Admin login updated');
    }
  }
}
function onChange(e) {
  if (pickerEvents(e)) return;
  const t = e.target, tr = t.closest('tr');
  if (t.id === 'adq') { AD.q = t.value; return adShow('products'), $('#adq').focus(), $('#adq').setSelectionRange(99, 99); }
  if (t.id === 'adcat') { AD.cat = t.value; return adShow('products'); }
  if (t.id === 'adst') { AD.st = t.value; return adShow('orders'); }
  if (t.id === 'impFile' && t.files[0]) {
    return t.files[0].text().then(txt => { const d = JSON.parse(txt); if (!Array.isArray(d.products)) throw 0; DB.products = d.products.map(p => ({ ...p, v: 2 })); DB.banners = d.banners || DB.banners; DB.vouchers = d.vouchers || DB.vouchers; DB.settings = { ...DEFAULT_SETTINGS, ...d.settings }; adSave('Backup imported'); }).catch(() => toast('Invalid backup file'));
  }
  if (t.dataset.set) { DB.settings[t.dataset.set] = t.type === 'number' ? +t.value || 0 : t.value; persist(); return toast('Setting saved'); }
  const bc = t.closest('[data-b]');
  if (bc && t.dataset.k) { const b = DB.banners.find(x => x.id === bc.dataset.b); b[t.dataset.k] = t.value; persist(); return toast('Banner saved'); }
  if (tr && t.dataset.f) {
    if (tr.dataset.ref) { const o = DB.orders.find(x => x.ref === tr.dataset.ref); setStatus(o, t.value); return adSave('Order status updated'); }
    if (tr.dataset.vi) { DB.vouchers[+tr.dataset.vi].on = t.checked; persist(); return toast(t.checked ? 'Voucher on' : 'Voucher off'); }
    const p = find(tr.dataset.id);
    if (t.dataset.f === 'visible') p.hidden = !t.checked; else p[t.dataset.f] = Math.max(0, +t.value || 0);
    persist(); toast('Saved');
  }
}
['#admin', '#adlg'].forEach(s => { $(s).addEventListener('click', onClick); $(s).addEventListener('change', onChange); });
$('#adq')?.addEventListener('input', () => {});
$('#admin').addEventListener('input', e => { if (e.target.id === 'adq') { AD.q = e.target.value; clearTimeout(AD.t); AD.t = setTimeout(() => { adShow('products'); const i = $('#adq'); i.focus(); i.setSelectionRange(99, 99); }, 250); } });
