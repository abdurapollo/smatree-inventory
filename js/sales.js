/* ==========================================================================
   SMATREE SOLAR INVENTORY — Sales Module
   ========================================================================== */
const Sales = {
  state: { statusFilter: '', currentPage: 1, perPage: 10 },

  init() {
    if (!App.initPage('sales', 'Sales Stock', [
      { label: 'Home', href: 'dashboard.html' }, { label: 'Sales Stock' }
    ])) return;
    this.renderStats();
    this.renderToolbar();
    this.renderTable();
    this.setupEvents();
  },

  renderStats() {
    const container = document.getElementById('sales-stats');
    if (!container) return;
    const sales = Store.getAll('sales');
    const sold = sales.filter(s => s.status === 'Sold').reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
    const reserved = sales.filter(s => s.status === 'Reserved').reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
    const fg = Store.getFinishedGoodsStats();

    container.innerHTML = `
      <div class="stat-card animate-fadeInUp delay-1" style="--card-accent:var(--color-emerald-400)">
        <div class="stat-icon green">🏷️</div><div class="stat-value">${Utils.formatNumber(fg.readyToSell)}</div><div class="stat-label">Ready to Sell</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-2" style="--card-accent:var(--color-solar-400)">
        <div class="stat-icon amber">📋</div><div class="stat-value">${Utils.formatNumber(reserved)}</div><div class="stat-label">Reserved Units</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-3" style="--card-accent:var(--color-primary-400)">
        <div class="stat-icon blue">✅</div><div class="stat-value">${Utils.formatNumber(sold)}</div><div class="stat-label">Sold Units</div>
      </div>`;
  },

  renderToolbar() {
    const container = document.getElementById('sales-toolbar');
    if (!container) return;
    container.innerHTML = `
      <select class="form-control" id="sales-status-filter" style="width:auto;min-width:150px;border-radius:999px;padding:0.5rem 2rem 0.5rem 0.75rem;font-size:var(--fs-xs)">
        <option value="">All</option><option value="Reserved">Reserved</option><option value="Sold">Sold</option>
      </select>
      <button class="btn btn-primary btn-sm" id="sales-add-btn">+ Add Sale Record</button>`;
  },

  renderTable() {
    const container = document.getElementById('sales-table');
    if (!container) return;
    let items = Store.getAll('sales');
    if (this.state.statusFilter) items = items.filter(s => s.status === this.state.statusFilter);
    const paginated = Utils.paginate(items, this.state.currentPage, this.state.perPage);

    const columns = [
      { label: 'Sale ID', key: 'id', render: (r) => `<span class="fw-semibold text-primary">${r.id}</span>` },
      { label: 'Product', key: 'productName' },
      { label: 'Customer', key: 'customerName' },
      { label: 'Quantity', key: 'quantity', render: (r) => Utils.formatNumber(r.quantity) },
      { label: 'Date', key: 'saleDate', render: (r) => Utils.formatDate(r.saleDate) },
      { label: 'Status', key: 'status', render: (r) => `<span class="badge badge-dot ${r.status === 'Sold' ? 'badge-success' : 'badge-warning'}">${r.status}</span>` },
      { label: 'Actions', render: (r) => `<div class="actions">
        ${r.status === 'Reserved' ? `<button class="btn btn-success btn-sm" data-mark-sold="${r.id}">Mark Sold</button>` : ''}
        <button class="btn btn-ghost btn-sm btn-icon" data-delete-sale="${r.id}">🗑️</button></div>` },
    ];

    container.innerHTML = Components.renderTable({ columns, data: paginated.items, emptyMessage: 'No sales records' });
    container.insertAdjacentHTML('beforeend', Components.renderPagination(paginated));
    window._onPageChange = (page) => { this.state.currentPage = page; this.renderTable(); };
  },

  setupEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#sales-add-btn')) this.showForm();
      if (e.target.closest('[data-mark-sold]')) {
        const id = e.target.closest('[data-mark-sold]').dataset.markSold;
        Store.update('sales', id, { status: 'Sold' });
        Components.toast('success', 'Sold', 'Marked as sold.');
        this.renderStats(); this.renderTable();
      }
      if (e.target.closest('[data-delete-sale]')) {
        const id = e.target.closest('[data-delete-sale]').dataset.deleteSale;
        Components.confirm({ title: 'Delete Sale', message: 'Delete this record?', type: 'danger',
          onConfirm: () => { Store.delete('sales', id); Components.toast('success', 'Deleted', 'Sale record removed.'); this.renderStats(); this.renderTable(); }
        });
      }
    });
    document.addEventListener('change', (e) => {
      if (e.target.id === 'sales-status-filter') { this.state.statusFilter = e.target.value; this.state.currentPage = 1; this.renderTable(); }
    });
  },

  showForm() {
    const goods = Store.getAll('finishedGoods');
    const content = `<form id="sales-form" novalidate>
      <div class="form-group"><label class="form-label">Product *</label>
        <select class="form-control" id="sale-product" required>
          <option value="">Select product</option>
          ${goods.map(g => `<option value="${g.id}" data-name="${g.name}">${g.name} (${g.readyToSell} available)</option>`).join('')}
        </select></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Customer Name *</label>
          <input type="text" class="form-control" id="sale-customer" required></div>
        <div class="form-group"><label class="form-label">Quantity *</label>
          <input type="number" class="form-control" id="sale-qty" min="1" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Date</label>
          <input type="date" class="form-control" id="sale-date" value="${Utils.today()}"></div>
        <div class="form-group"><label class="form-label">Status</label>
          <select class="form-control" id="sale-status"><option value="Reserved">Reserved</option><option value="Sold">Sold</option></select></div>
      </div></form>`;

    const modal = Components.showModal({ id: 'sales-modal', title: 'Add Sale Record', content,
      footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button><button class="btn btn-primary" id="sale-save">Save</button>` });

    document.getElementById('sale-save')?.addEventListener('click', () => {
      const productEl = document.getElementById('sale-product');
      const productId = productEl.value;
      const productName = productEl.selectedOptions[0]?.dataset.name || '';
      const data = {
        id: Utils.generateId('SALE'), productId, productName,
        customerName: document.getElementById('sale-customer').value.trim(),
        quantity: parseInt(document.getElementById('sale-qty').value),
        saleDate: document.getElementById('sale-date').value,
        status: document.getElementById('sale-status').value,
        createdAt: new Date().toISOString(),
      };
      if (!data.productId || !data.customerName || !data.quantity) return Components.toast('error', 'Error', 'Fill required fields.');
      Store.add('sales', data);
      Components.toast('success', 'Added', 'Sale record created.');
      modal.close(); this.renderStats(); this.renderTable();
    });
  }
};
window.Sales = Sales;
