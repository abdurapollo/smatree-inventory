/* ==========================================================================
   SMATREE SOLAR INVENTORY — Installations Module
   ========================================================================== */
const Installations = {
  state: { searchQuery: '', statusFilter: '', currentPage: 1, perPage: 10 },

  init() {
    if (!App.initPage('installations', 'Installations', [
      { label: 'Home', href: 'dashboard.html' }, { label: 'Installations' }
    ])) return;
    this.renderStats();
    this.renderToolbar();
    this.renderTable();
    this.setupEvents();
  },

  renderStats() {
    const container = document.getElementById('inst-stats');
    if (!container) return;
    const stats = Store.getInstallationStats();
    container.innerHTML = `
      <div class="stat-card animate-fadeInUp delay-1" style="--card-accent:var(--color-primary-400)">
        <div class="stat-icon blue">🔧</div><div class="stat-value">${stats.totalInstallations}</div><div class="stat-label">Total Installations</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-2" style="--card-accent:var(--color-emerald-400)">
        <div class="stat-icon green">⚡</div><div class="stat-value">${stats.totalCapacity.toFixed(1)} kW</div><div class="stat-label">Installed Capacity</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-3" style="--card-accent:var(--color-solar-400)">
        <div class="stat-icon amber">🚧</div><div class="stat-value">${stats.activeProjects}</div><div class="stat-label">Active Projects</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-4" style="--card-accent:var(--color-purple-400)">
        <div class="stat-icon purple">☀️</div><div class="stat-value">${stats.totalPanelsInstalled}</div><div class="stat-label">Panels Installed</div>
      </div>`;
  },

  renderToolbar() {
    const container = document.getElementById('inst-toolbar');
    if (!container) return;
    container.innerHTML = `
      <div class="search-box" style="flex:1;max-width:320px"><span class="search-icon">🔍</span>
        <input type="text" id="inst-search" placeholder="Search installations..."></div>
      <select class="form-control" id="inst-status-filter" style="width:auto;min-width:150px;border-radius:999px;padding:0.5rem 2rem 0.5rem 0.75rem;font-size:var(--fs-xs)">
        <option value="">All Status</option><option value="Completed">Completed</option><option value="In Progress">In Progress</option>
      </select>
      <button class="btn btn-primary btn-sm" id="inst-add-btn">+ Add Installation</button>`;
  },

  renderTable() {
    const container = document.getElementById('inst-table');
    if (!container) return;
    let items = Store.getAll('installations');
    if (this.state.searchQuery) items = Utils.searchFilter(items, this.state.searchQuery, ['customerName', 'address', 'id', 'panelType']);
    if (this.state.statusFilter) items = items.filter(i => i.status === this.state.statusFilter);
    const paginated = Utils.paginate(items, this.state.currentPage, this.state.perPage);

    const columns = [
      { label: 'ID', key: 'id', render: (r) => `<span class="fw-semibold text-primary">${r.id}</span>` },
      { label: 'Customer', key: 'customerName', render: (r) => `<div><div class="fw-semibold">${Utils.escapeHtml(r.customerName)}</div><div class="fs-xs text-muted">${r.phone}</div></div>` },
      { label: 'Location', key: 'address', render: (r) => `<span class="text-truncate" style="max-width:180px;display:block">${Utils.escapeHtml(r.address)}</span>` },
      { label: 'Panel', key: 'panelType' },
      { label: 'Qty', key: 'quantityInstalled' },
      { label: 'Capacity', key: 'totalCapacity', render: (r) => `${r.totalCapacity} kW` },
      { label: 'Date', key: 'installationDate', render: (r) => Utils.formatDate(r.installationDate) },
      { label: 'Status', key: 'status', render: (r) => `<span class="badge badge-dot ${r.status === 'Completed' ? 'badge-success' : 'badge-warning'}">${r.status}</span>` },
      { label: 'Actions', render: (r) => `<div class="actions">
        <button class="btn btn-ghost btn-sm btn-icon" data-edit-inst="${r.id}">✏️</button>
        <button class="btn btn-ghost btn-sm btn-icon" data-delete-inst="${r.id}">🗑️</button></div>` },
    ];

    container.innerHTML = Components.renderTable({ columns, data: paginated.items, emptyMessage: 'No installations found' });
    container.insertAdjacentHTML('beforeend', Components.renderPagination(paginated));
    window._onPageChange = (page) => { this.state.currentPage = page; this.renderTable(); };
  },

  setupEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#inst-add-btn')) this.showForm();
      if (e.target.closest('[data-edit-inst]')) this.showForm(e.target.closest('[data-edit-inst]').dataset.editInst);
      if (e.target.closest('[data-delete-inst]')) {
        const id = e.target.closest('[data-delete-inst]').dataset.deleteInst;
        Components.confirm({ title: 'Delete Installation', message: 'Delete this installation record?', type: 'danger',
          onConfirm: () => { Store.delete('installations', id); Components.toast('success', 'Deleted', 'Installation removed.'); this.renderStats(); this.renderTable(); }
        });
      }
    });
    document.addEventListener('input', Utils.debounce((e) => {
      if (e.target.id === 'inst-search') { this.state.searchQuery = e.target.value; this.state.currentPage = 1; this.renderTable(); }
    }, 250));
    document.addEventListener('change', (e) => {
      if (e.target.id === 'inst-status-filter') { this.state.statusFilter = e.target.value; this.state.currentPage = 1; this.renderTable(); }
    });
  },

  showForm(editId = null) {
    const item = editId ? Store.getById('installations', editId) : null;
    const isEdit = !!item;
    const content = `<form id="inst-form" novalidate>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Customer Name *</label>
          <input type="text" class="form-control" id="inst-customer" value="${item?.customerName || ''}" required></div>
        <div class="form-group"><label class="form-label">Phone *</label>
          <input type="text" class="form-control" id="inst-phone" value="${item?.phone || ''}" required></div>
      </div>
      <div class="form-group"><label class="form-label">Address *</label>
        <input type="text" class="form-control" id="inst-address" value="${item?.address || ''}" required></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Installation Date *</label>
          <input type="date" class="form-control" id="inst-date" value="${item?.installationDate || Utils.today()}" required></div>
        <div class="form-group"><label class="form-label">Panel Type *</label>
          <input type="text" class="form-control" id="inst-panel" value="${item?.panelType || ''}" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Quantity *</label>
          <input type="number" class="form-control" id="inst-qty" value="${item?.quantityInstalled || ''}" required></div>
        <div class="form-group"><label class="form-label">Total Capacity (kW) *</label>
          <input type="number" class="form-control" id="inst-capacity" value="${item?.totalCapacity || ''}" step="0.1" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Installation Team</label>
          <input type="text" class="form-control" id="inst-team" value="${item?.installationTeam || ''}"></div>
        <div class="form-group"><label class="form-label">Status</label>
          <select class="form-control" id="inst-status">
            <option value="In Progress" ${item?.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Completed" ${item?.status === 'Completed' ? 'selected' : ''}>Completed</option>
          </select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Inverter Used</label>
          <input type="text" class="form-control" id="inst-inverter" value="${item?.inverterUsed || ''}"></div>
        <div class="form-group"><label class="form-label">Battery Used</label>
          <input type="text" class="form-control" id="inst-battery" value="${item?.batteryUsed || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Warranty</label>
          <input type="text" class="form-control" id="inst-warranty" value="${item?.warranty || ''}"></div>
        <div class="form-group"><label class="form-label">Notes</label>
          <input type="text" class="form-control" id="inst-notes" value="${item?.notes || ''}"></div>
      </div></form>`;

    const modal = Components.showModal({ id: 'inst-modal', title: isEdit ? 'Edit Installation' : 'Add Installation', size: 'lg', content,
      footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button><button class="btn btn-primary" id="inst-save">${isEdit ? 'Update' : 'Save'}</button>` });

    document.getElementById('inst-save')?.addEventListener('click', () => {
      const data = {
        customerName: document.getElementById('inst-customer').value.trim(),
        phone: document.getElementById('inst-phone').value.trim(),
        address: document.getElementById('inst-address').value.trim(),
        installationDate: document.getElementById('inst-date').value,
        panelType: document.getElementById('inst-panel').value.trim(),
        quantityInstalled: parseInt(document.getElementById('inst-qty').value),
        totalCapacity: parseFloat(document.getElementById('inst-capacity').value),
        installationTeam: document.getElementById('inst-team').value.trim(),
        status: document.getElementById('inst-status').value,
        inverterUsed: document.getElementById('inst-inverter').value.trim(),
        batteryUsed: document.getElementById('inst-battery').value.trim(),
        warranty: document.getElementById('inst-warranty').value.trim(),
        notes: document.getElementById('inst-notes').value.trim(),
      };
      if (!data.customerName || !data.phone || !data.address || !data.panelType) return Components.toast('error', 'Error', 'Fill required fields.');
      if (isEdit) { Store.update('installations', editId, data); } else { data.id = Utils.generateId('INST'); data.createdAt = new Date().toISOString(); Store.add('installations', data); }
      Components.toast('success', isEdit ? 'Updated' : 'Added', 'Installation saved.');
      modal.close(); this.renderStats(); this.renderTable();
    });
  }
};
window.Installations = Installations;
