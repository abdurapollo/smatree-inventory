/* ==========================================================================
   SMATREE SOLAR INVENTORY — Production Module
   Production batch management with timeline, progress tracking
   ========================================================================== */

const Production = {
  state: { searchQuery: '', statusFilter: '', currentPage: 1, perPage: 8, editingId: null },
  statuses: ['Pending', 'In Production', 'Quality Check', 'Completed'],

  init() {
    if (!App.initPage('production', 'Production', [
      { label: 'Home', href: 'dashboard.html' },
      { label: 'Production' }
    ])) return;
    this.renderStats();
    this.renderToolbar();
    this.renderTable();
    this.setupEvents();
  },

  renderStats() {
    const container = document.getElementById('production-stats');
    if (!container) return;
    const stats = Store.getProductionStats();
    container.innerHTML = `
      <div class="stat-card animate-fadeInUp delay-1" style="--card-accent:var(--color-primary-400)">
        <div class="stat-icon blue">🏭</div>
        <div class="stat-value">${stats.totalBatches}</div>
        <div class="stat-label">Total Batches</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-2" style="--card-accent:var(--color-solar-400)">
        <div class="stat-icon amber">⏳</div>
        <div class="stat-value">${stats.inProgress}</div>
        <div class="stat-label">In Progress</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-3" style="--card-accent:var(--color-emerald-400)">
        <div class="stat-icon green">✅</div>
        <div class="stat-value">${stats.completed}</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-4" style="--card-accent:var(--color-purple-400)">
        <div class="stat-icon purple">☀️</div>
        <div class="stat-value">${Utils.formatNumber(stats.totalPanels)}</div>
        <div class="stat-label">Panels Produced</div>
      </div>`;
  },

  renderToolbar() {
    const container = document.getElementById('production-toolbar');
    if (!container) return;
    container.innerHTML = `
      <div class="search-box" style="flex:1;max-width:320px">
        <span class="search-icon">🔍</span>
        <input type="text" id="prod-search" placeholder="Search batches...">
      </div>
      <select class="form-control" id="prod-status-filter" style="width:auto;min-width:150px;border-radius:999px;padding:0.5rem 2rem 0.5rem 0.75rem;font-size:var(--fs-xs)">
        <option value="">All Statuses</option>
        ${this.statuses.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
      <div class="toolbar-actions">
        <button class="btn btn-primary btn-sm" id="prod-add-btn">+ New Batch</button>
      </div>`;
  },

  renderTable() {
    const container = document.getElementById('production-table');
    if (!container) return;
    let items = Store.getAll('production');
    if (this.state.searchQuery) items = Utils.searchFilter(items, this.state.searchQuery, ['id', 'panelType', 'teamAssigned']);
    if (this.state.statusFilter) items = items.filter(i => i.status === this.state.statusFilter);
    const paginated = Utils.paginate(items, this.state.currentPage, this.state.perPage);

    const statusBadge = (status) => {
      const map = { 'Pending': 'badge-neutral', 'In Production': 'badge-primary', 'Quality Check': 'badge-warning', 'Completed': 'badge-success' };
      return `<span class="badge badge-dot ${map[status] || 'badge-neutral'}">${status}</span>`;
    };

    const columns = [
      { label: 'Batch ID', key: 'id', sortable: true, render: (r) => `<span class="fw-semibold text-primary">${r.id}</span>` },
      { label: 'Panel Type', key: 'panelType', sortable: true },
      { label: 'Watts', key: 'wattCapacity', sortable: true, render: (r) => `${r.wattCapacity}W` },
      { label: 'Qty', key: 'quantity', sortable: true, render: (r) => Utils.formatNumber(r.quantity) },
      { label: 'Team', key: 'teamAssigned' },
      { label: 'Progress', key: 'progress', render: (r) => `
        <div class="batch-progress">
          <div class="d-flex justify-between mb-1"><span class="fs-xs text-muted">${r.progress}%</span></div>
          <div class="progress"><div class="progress-bar ${r.progress === 100 ? 'success' : r.progress > 50 ? '' : 'warning'}" style="width:${r.progress}%"></div></div>
        </div>` },
      { label: 'Status', key: 'status', render: (r) => statusBadge(r.status) },
      { label: 'Cost', key: 'productionCost', render: (r) => Utils.formatCurrency(r.productionCost) },
      { label: 'Actions', render: (r) => `
        <div class="actions">
          <button class="btn btn-ghost btn-sm btn-icon" data-edit-prod="${r.id}">✏️</button>
          <button class="btn btn-ghost btn-sm btn-icon" data-delete-prod="${r.id}">🗑️</button>
        </div>` },
    ];

    container.innerHTML = Components.renderTable({ columns, data: paginated.items, emptyMessage: 'No production batches' });
    container.insertAdjacentHTML('beforeend', Components.renderPagination(paginated));
    window._onPageChange = (page) => { this.state.currentPage = page; this.renderTable(); };
  },

  setupEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#prod-add-btn')) this.showForm();
      if (e.target.closest('[data-edit-prod]')) this.showForm(e.target.closest('[data-edit-prod]').dataset.editProd);
      if (e.target.closest('[data-delete-prod]')) this.confirmDelete(e.target.closest('[data-delete-prod]').dataset.deleteProd);
    });
    document.addEventListener('input', Utils.debounce((e) => {
      if (e.target.id === 'prod-search') { this.state.searchQuery = e.target.value; this.state.currentPage = 1; this.renderTable(); }
    }, 250));
    document.addEventListener('change', (e) => {
      if (e.target.id === 'prod-status-filter') { this.state.statusFilter = e.target.value; this.state.currentPage = 1; this.renderTable(); }
    });
  },

  showForm(editId = null) {
    const item = editId ? Store.getById('production', editId) : null;
    const isEdit = !!item;
    const content = `
      <form id="prod-form" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Panel Type *</label>
            <input type="text" class="form-control" id="prod-type" value="${item?.panelType || ''}" placeholder="e.g. Mono PERC 400W" required>
          </div>
          <div class="form-group">
            <label class="form-label">Watt Capacity *</label>
            <input type="number" class="form-control" id="prod-watts" value="${item?.wattCapacity || ''}" placeholder="e.g. 400" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Quantity *</label>
            <input type="number" class="form-control" id="prod-qty" value="${item?.quantity || ''}" min="1" required>
          </div>
          <div class="form-group">
            <label class="form-label">Team Assigned *</label>
            <input type="text" class="form-control" id="prod-team" value="${item?.teamAssigned || ''}" placeholder="e.g. Team Alpha" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Start Date *</label>
            <input type="date" class="form-control" id="prod-start" value="${item?.startDate || Utils.today()}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Completion Date</label>
            <input type="date" class="form-control" id="prod-end" value="${item?.completionDate || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-control" id="prod-status">
              ${this.statuses.map(s => `<option value="${s}" ${item?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Progress (%)</label>
            <input type="number" class="form-control" id="prod-progress" value="${item?.progress ?? 0}" min="0" max="100">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Production Cost (₹)</label>
            <input type="number" class="form-control" id="prod-cost" value="${item?.productionCost || 0}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">Materials Used</label>
            <input type="text" class="form-control" id="prod-materials" value="${item?.materialsUsed || ''}" placeholder="Comma-separated list">
          </div>
        </div>
      </form>`;

    const modal = Components.showModal({
      id: 'production-modal', title: isEdit ? 'Edit Batch' : 'New Production Batch', size: 'lg', content,
      footer: `<button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
               <button type="button" class="btn btn-primary" id="prod-save-btn">${isEdit ? 'Update' : 'Create'} Batch</button>`
    });

    document.getElementById('prod-save-btn')?.addEventListener('click', () => {
      const data = {
        panelType: document.getElementById('prod-type').value.trim(),
        wattCapacity: parseInt(document.getElementById('prod-watts').value),
        quantity: parseInt(document.getElementById('prod-qty').value),
        teamAssigned: document.getElementById('prod-team').value.trim(),
        startDate: document.getElementById('prod-start').value,
        completionDate: document.getElementById('prod-end').value || null,
        status: document.getElementById('prod-status').value,
        progress: parseInt(document.getElementById('prod-progress').value) || 0,
        productionCost: parseFloat(document.getElementById('prod-cost').value) || 0,
        materialsUsed: document.getElementById('prod-materials').value.trim(),
      };

      if (!data.panelType || !data.wattCapacity || !data.quantity || !data.teamAssigned) {
        return Components.toast('error', 'Validation Error', 'Please fill all required fields.');
      }

      if (isEdit) {
        Store.update('production', editId, data);
        Components.toast('success', 'Batch Updated', `${editId} has been updated.`);
      } else {
        data.id = Utils.generateId('BATCH');
        data.createdAt = new Date().toISOString();
        Store.add('production', data);
        Components.toast('success', 'Batch Created', `New production batch ${data.id} created.`);
      }
      modal.close();
      this.renderStats();
      this.renderTable();
    });
  },

  confirmDelete(id) {
    const item = Store.getById('production', id);
    if (!item) return;
    Components.confirm({
      title: 'Delete Batch', message: `Delete batch "${id}"? This cannot be undone.`,
      confirmText: 'Delete', type: 'danger',
      onConfirm: () => {
        Store.delete('production', id);
        Components.toast('success', 'Deleted', `Batch ${id} removed.`);
        this.renderStats(); this.renderTable();
      }
    });
  }
};
window.Production = Production;
