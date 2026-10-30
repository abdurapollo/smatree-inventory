/* ==========================================================================
   SMATREE SOLAR INVENTORY — Installations Module (Dynamic MySQL Backend)
   Full CRUD, live capacity calculations, status filtering, project modals,
   and customer deployment tracking.
   ========================================================================== */

const Installations = {
  state: {
    installations: [],
    serverStats: null,
    searchQuery: '',
    statusFilter: '',
    activeTab: 'all',
    currentPage: 1,
    perPage: 8,
    sortKey: 'id',
    sortDir: 'desc',
    isLoading: false
  },

  statuses: ['In Progress', 'Completed', 'Pending', 'Cancelled'],

  async init() {
    if (!App.initPage('installations', 'Solar Installations & Customer Projects', [
      { label: 'Home', href: 'dashboard.html' },
      { label: 'Installations' }
    ])) return;

    await this.loadData();
    this.renderStats();
    this.renderTabs();
    this.renderToolbar();
    this.renderTable();
    this.setupEvents();
  },

  /* ── 1. Fetch live installations from MySQL ── */
  async loadData() {
    this.state.isLoading = true;
    try {
      const resp = await ApiService.getInstallations();
      if (resp.success && resp.data && Array.isArray(resp.data.data)) {
        this.state.installations = resp.data.data;
        this.state.serverStats = resp.data.stats || null;
        Store._set(Store.keys.installations, this.state.installations);
      } else {
        this.state.installations = Store.getAll('installations') || [];
      }
    } catch (err) {
      console.warn('API error loading installations, using local store:', err);
      this.state.installations = Store.getAll('installations') || [];
    } finally {
      this.state.isLoading = false;
    }
  },

  /* ── 2. Top Metric KPI Cards ── */
  renderStats() {
    const container = document.getElementById('inst-stats');
    if (!container) return;

    let stats = this.state.serverStats;
    if (!stats) {
      const items = this.state.installations;
      stats = {
        totalInstallations: items.length,
        totalCapacity: items.reduce((sum, i) => sum + (parseFloat(i.totalCapacity) || 0), 0),
        activeProjects: items.filter(i => i.status === 'In Progress').length,
        totalPanelsInstalled: items.reduce((sum, i) => sum + (parseInt(i.quantityInstalled) || 0), 0)
      };
    }

    container.innerHTML = `
      <div class="stat-card animate-fadeInUp delay-1" style="--card-accent:var(--color-primary-500)">
        <div class="stat-card-header">
          <div class="stat-icon blue">${Icons.installations(22)}</div>
          <span class="stat-trend up">Active Sites</span>
        </div>
        <div class="stat-value">${stats.totalInstallations}</div>
        <div class="stat-label">Total Projects</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-2" style="--card-accent:var(--color-emerald-500)">
        <div class="stat-card-header">
          <div class="stat-icon green">${Icons.zap(22)}</div>
          <span class="stat-trend up">Clean Energy</span>
        </div>
        <div class="stat-value">${(parseFloat(stats.totalCapacity) || 0).toFixed(1)} kW</div>
        <div class="stat-label">Installed Capacity</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-3" style="--card-accent:var(--color-solar-500)">
        <div class="stat-card-header">
          <div class="stat-icon amber">${Icons.clock(22)}</div>
          <span class="stat-trend warning">On Field</span>
        </div>
        <div class="stat-value">${stats.activeProjects}</div>
        <div class="stat-label">Active Projects</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-4" style="--card-accent:var(--color-purple-500)">
        <div class="stat-card-header">
          <div class="stat-icon purple">${Icons.solarPanel(22)}</div>
          <span class="stat-trend up">Commissioned</span>
        </div>
        <div class="stat-value">${Utils.formatNumber(stats.totalPanelsInstalled)}</div>
        <div class="stat-label">Panels Installed</div>
      </div>
    `;
  },

  /* ── 3. Status Tabs Navigation ── */
  renderTabs() {
    const container = document.getElementById('inst-tabs-container');
    if (!container) return;

    const items = this.state.installations;
    const counts = {
      all: items.length,
      'In Progress': items.filter(i => i.status === 'In Progress').length,
      'Completed': items.filter(i => i.status === 'Completed').length,
      'Pending': items.filter(i => i.status === 'Pending').length
    };

    container.innerHTML = `
      <div class="d-flex align-center gap-2 flex-wrap" style="border-bottom:1px solid var(--border-color);padding-bottom:var(--space-2);">
        <button class="btn btn-sm ${this.state.activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}" data-inst-tab="all">
          All Projects <span class="badge ${this.state.activeTab === 'all' ? 'badge-primary' : 'badge-neutral'} ml-1" style="font-size:10px">${counts.all}</span>
        </button>
        <button class="btn btn-sm ${this.state.activeTab === 'In Progress' ? 'btn-primary' : 'btn-ghost'}" data-inst-tab="In Progress" style="display:inline-flex;align-items:center;gap:4px">
          ${Icons.clock(13)} In Progress <span class="badge ml-1" style="font-size:10px">${counts['In Progress']}</span>
        </button>
        <button class="btn btn-sm ${this.state.activeTab === 'Completed' ? 'btn-primary' : 'btn-ghost'}" data-inst-tab="Completed" style="display:inline-flex;align-items:center;gap:4px">
          ${Icons.check(13)} Completed <span class="badge ml-1" style="font-size:10px">${counts['Completed']}</span>
        </button>
        <button class="btn btn-sm ${this.state.activeTab === 'Pending' ? 'btn-primary' : 'btn-ghost'}" data-inst-tab="Pending" style="display:inline-flex;align-items:center;gap:4px">
          ${Icons.fileText(13)} Pending <span class="badge ml-1" style="font-size:10px">${counts['Pending']}</span>
        </button>
      </div>
    `;
  },

  /* ── 4. Search & Action Toolbar ── */
  renderToolbar() {
    const container = document.getElementById('inst-toolbar');
    if (!container) return;

    container.innerHTML = `
      <div class="search-box" style="flex:1;max-width:320px">
        <span class="search-icon">${Icons.search(16)}</span>
        <input type="text" id="inst-search" placeholder="Search customer, address, ID..." value="${Utils.escapeHtml(this.state.searchQuery)}">
      </div>
      <div class="toolbar-actions d-flex align-center gap-2">
        <button class="btn btn-secondary btn-sm" id="inst-export-btn" title="Export CSV report" style="display:inline-flex;align-items:center;gap:5px">
          ${Icons.download(15)} Export CSV
        </button>
        <button class="btn btn-secondary btn-sm btn-icon" id="inst-refresh-btn" title="Refresh live installations">
          ${Icons.refresh(15)}
        </button>
        <button class="btn btn-primary btn-sm" id="inst-add-btn" style="display:inline-flex;align-items:center;gap:5px">
          ${Icons.plus(15)} Add Installation
        </button>
      </div>
    `;
  },

  /* ── 5. Main Installations Data Table ── */
  renderTable() {
    const container = document.getElementById('inst-table');
    if (!container) return;

    if (this.state.isLoading) {
      container.innerHTML = `
        <div class="text-center p-8 text-muted">
          <div class="spinner-border spinner-border-sm mb-2" role="status"></div>
          <div>Loading installations from database...</div>
        </div>`;
      return;
    }

    let items = [...this.state.installations];

    // Tab filter
    if (this.state.activeTab !== 'all') {
      items = items.filter(i => i.status === this.state.activeTab);
    }

    // Search query filter
    if (this.state.searchQuery) {
      items = Utils.searchFilter(items, this.state.searchQuery, [
        'id', 'installationCode', 'customerName', 'phone', 'address', 'panelType', 'teamAssigned'
      ]);
    }

    // Sorting
    items.sort((a, b) => {
      let va = a[this.state.sortKey] ?? '';
      let vb = b[this.state.sortKey] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return this.state.sortDir === 'asc' ? -1 : 1;
      if (va > vb) return this.state.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const paginated = Utils.paginate(items, this.state.currentPage, this.state.perPage);

    const columns = [
      {
        label: 'Project ID',
        key: 'installationCode',
        sortable: true,
        render: (r) => `<span class="fw-semibold text-primary">${r.installationCode || r.id}</span>`
      },
      {
        label: 'Customer & Contact',
        key: 'customerName',
        sortable: true,
        render: (r) => `
          <div>
            <div class="fw-semibold">${Utils.escapeHtml(r.customerName)}</div>
            <div class="fs-xs text-muted" style="display:flex;align-items:center;gap:4px">${Icons.phone(12)} ${Utils.escapeHtml(r.phone || 'No phone')}</div>
          </div>`
      },
      {
        label: 'Location / Site',
        key: 'address',
        render: (r) => `
          <span class="text-truncate" style="max-width:200px;display:flex;align-items:center;gap:4px" title="${Utils.escapeHtml(r.address)}">
            ${Icons.mapPin(12)} <span>${Utils.escapeHtml(r.address)}</span>
          </span>`
      },
      {
        label: 'Panel Specs',
        key: 'panelType',
        render: (r) => `
          <div>
            <div class="fw-medium">${Utils.escapeHtml(r.panelType)}</div>
            <div class="fs-xs text-muted">${r.quantityInstalled} panels</div>
          </div>`
      },
      {
        label: 'Capacity',
        key: 'totalCapacity',
        sortable: true,
        render: (r) => `<span class="badge badge-primary fw-bold">${(parseFloat(r.totalCapacity) || 0).toFixed(1)} kW</span>`
      },
      {
        label: 'Date',
        key: 'installationDate',
        sortable: true,
        render: (r) => `<div>${Utils.formatDate(r.installationDate)}</div>`
      },
      {
        label: 'Status',
        key: 'status',
        render: (r) => {
          const isDone = r.status === 'Completed';
          return `<span class="badge badge-dot ${isDone ? 'badge-success' : 'badge-warning'}">${r.status}</span>`;
        }
      },
      {
        label: 'Actions',
        render: (r) => `
          <div class="actions d-flex align-center gap-1">
            <button class="btn btn-ghost btn-sm btn-icon" data-view-inst="${r.id}" title="View Project Details">${Icons.eye(15)}</button>
            <button class="btn btn-ghost btn-sm btn-icon" data-edit-inst="${r.id}" title="Edit Installation">${Icons.edit(15)}</button>
            <button class="btn btn-ghost btn-sm btn-icon text-danger" data-delete-inst="${r.id}" title="Delete Installation">${Icons.trash(15)}</button>
          </div>`
      }
    ];

    container.innerHTML = Components.renderTable({
      columns,
      data: paginated.items,
      emptyMessage: 'No solar installation projects match your criteria.'
    });

    container.insertAdjacentHTML('beforeend', Components.renderPagination(paginated));
    window._onPageChange = (page) => {
      this.state.currentPage = page;
      this.renderTable();
    };
  },

  /* ── 6. Event Listeners ── */
  setupEvents() {
    document.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-inst-tab]');
      if (tabBtn) {
        this.state.activeTab = tabBtn.dataset.instTab;
        this.state.currentPage = 1;
        this.renderTabs();
        this.renderTable();
      }

      if (e.target.closest('#inst-add-btn')) {
        if (typeof RBAC !== 'undefined' && !RBAC.hasPermission('installations.create')) {
          Components.toast('warning', 'Access Restricted', 'Your role cannot add installation projects.');
          return;
        }
        this.showForm();
      }
      if (e.target.closest('#inst-refresh-btn')) this.refreshData();
      if (e.target.closest('#inst-export-btn')) this.exportCSV();

      const viewBtn = e.target.closest('[data-view-inst]');
      if (viewBtn) this.viewInstallation(viewBtn.dataset.viewInst);

      const editBtn = e.target.closest('[data-edit-inst]');
      if (editBtn) {
        if (typeof RBAC !== 'undefined' && !RBAC.hasPermission('installations.edit')) {
          Components.toast('warning', 'Access Restricted', 'Your role cannot edit installation projects.');
          return;
        }
        this.showForm(editBtn.dataset.editInst);
      }

      const deleteBtn = e.target.closest('[data-delete-inst]');
      if (deleteBtn) {
        if (typeof RBAC !== 'undefined' && !RBAC.hasPermission('installations.delete')) {
          Components.toast('warning', 'Access Restricted', 'Your role cannot delete installation records.');
          return;
        }
        this.confirmDelete(deleteBtn.dataset.deleteInst);
      }
    });

    document.addEventListener('input', Utils.debounce((e) => {
      if (e.target.id === 'inst-search') {
        this.state.searchQuery = e.target.value.trim();
        this.state.currentPage = 1;
        this.renderTable();
      }
    }, 250));
  },

  async refreshData() {
    const btn = document.getElementById('inst-refresh-btn');
    if (btn) btn.classList.add('loading');
    await this.loadData();
    this.renderStats();
    this.renderTabs();
    this.renderTable();
    if (btn) btn.classList.remove('loading');
    Components.toast('info', 'Refreshed', 'Live installation projects synchronized from database.');
  },

  /* ── 7. Create / Edit Installation Modal ── */
  showForm(editId = null) {
    const item = editId ? this.state.installations.find(i => i.id === editId || i.installationCode === editId) : null;
    const isEdit = !!item;

    const content = `
      <form id="inst-form" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Customer / Client Name *</label>
            <input type="text" class="form-control" id="inst-customer" value="${Utils.escapeHtml(item?.customerName || '')}" placeholder="e.g. Green Valley School" required>
          </div>
          <div class="form-group">
            <label class="form-label">Phone Number *</label>
            <input type="text" class="form-control" id="inst-phone" value="${Utils.escapeHtml(item?.phone || '')}" placeholder="e.g. +91 98765 43210" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Contact Email</label>
            <input type="email" class="form-control" id="inst-email" value="${Utils.escapeHtml(item?.email || '')}" placeholder="contact@domain.com">
          </div>
          <div class="form-group">
            <label class="form-label">Installation Date *</label>
            <input type="date" class="form-control" id="inst-date" value="${item?.installationDate || Utils.today()}" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Installation Site Address *</label>
          <input type="text" class="form-control" id="inst-address" value="${Utils.escapeHtml(item?.address || '')}" placeholder="Full site or rooftop address..." required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Panel Type / Model *</label>
            <input type="text" class="form-control" id="inst-panel" value="${Utils.escapeHtml(item?.panelType || 'Mono PERC 400W')}" placeholder="e.g. Mono PERC 400W" required>
          </div>
          <div class="form-group">
            <label class="form-label">Panels Installed *</label>
            <input type="number" class="form-control" id="inst-qty" value="${item?.quantityInstalled || 20}" min="1" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Total Capacity (kW) *</label>
            <input type="number" class="form-control" id="inst-capacity" value="${item?.totalCapacity || 8.0}" step="0.1" min="0.1" required>
          </div>
          <div class="form-group">
            <label class="form-label">Installation Team Assigned</label>
            <input type="text" class="form-control" id="inst-team" value="${Utils.escapeHtml(item?.teamAssigned || item?.installationTeam || '')}" placeholder="e.g. Install Team Alpha">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Inverter Spec / Model</label>
            <input type="text" class="form-control" id="inst-inverter" value="${Utils.escapeHtml(item?.inverterUsed || '')}" placeholder="e.g. Grid-Tie 5kW x2">
          </div>
          <div class="form-group">
            <label class="form-label">Battery Storage Spec</label>
            <input type="text" class="form-control" id="inst-battery" value="${Utils.escapeHtml(item?.batteryUsed || '')}" placeholder="e.g. Lithium 5kWh x2 (Optional)">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Project Status *</label>
            <select class="form-control" id="inst-status">
              ${this.statuses.map(s => `<option value="${s}" ${item?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Warranty Details</label>
            <input type="text" class="form-control" id="inst-warranty" value="${Utils.escapeHtml(item?.warranty || '25 years panels, 10 years inverter')}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Site Notes & Special Instructions</label>
          <textarea class="form-control" id="inst-notes" rows="2" placeholder="Rooftop angle, structure type, grid net-metering status...">${Utils.escapeHtml(item?.notes || '')}</textarea>
        </div>
      </form>
    `;

    const modal = Components.showModal({
      id: 'inst-modal',
      title: isEdit ? `Edit Installation — ${item.installationCode || item.id}` : 'Create New Solar Installation',
      size: 'lg',
      content,
      footer: `
        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
        <button type="button" class="btn btn-primary" id="inst-save-btn">${isEdit ? 'Update Installation' : 'Save Project'}</button>
      `
    });

    // Auto-calculate kW capacity from quantity
    const qtyInput = document.getElementById('inst-qty');
    const capInput = document.getElementById('inst-capacity');
    qtyInput?.addEventListener('input', () => {
      const q = parseInt(qtyInput.value) || 0;
      if (q > 0 && capInput && (!capInput.dataset.manual || capInput.value == 0)) {
        capInput.value = ((q * 400) / 1000).toFixed(1);
      }
    });
    capInput?.addEventListener('input', () => {
      capInput.dataset.manual = 'true';
    });

    // Save action
    document.getElementById('inst-save-btn')?.addEventListener('click', async () => {
      const saveBtn = document.getElementById('inst-save-btn');

      const payload = {
        id: isEdit ? (item.db_id || item.id) : undefined,
        customerName: document.getElementById('inst-customer').value.trim(),
        phone: document.getElementById('inst-phone').value.trim(),
        email: document.getElementById('inst-email').value.trim(),
        address: document.getElementById('inst-address').value.trim(),
        panelType: document.getElementById('inst-panel').value.trim(),
        quantityInstalled: parseInt(document.getElementById('inst-qty').value) || 1,
        totalCapacity: parseFloat(document.getElementById('inst-capacity').value) || 0.1,
        installationDate: document.getElementById('inst-date').value,
        teamAssigned: document.getElementById('inst-team').value.trim(),
        inverterUsed: document.getElementById('inst-inverter').value.trim(),
        batteryUsed: document.getElementById('inst-battery').value.trim(),
        status: document.getElementById('inst-status').value,
        warranty: document.getElementById('inst-warranty').value.trim(),
        notes: document.getElementById('inst-notes').value.trim(),
      };

      if (!payload.customerName || !payload.phone || !payload.address || !payload.panelType) {
        return Components.toast('error', 'Validation Error', 'Please fill in all required customer and site fields.');
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving to Database...';

      try {
        let resp;
        if (isEdit) {
          resp = await ApiService.updateInstallation(payload);
        } else {
          resp = await ApiService.addInstallation(payload);
        }

        if (resp.success) {
          Components.toast('success', isEdit ? 'Installation Updated' : 'Installation Added', resp.data?.message || 'Installation record saved.');
          if (typeof Notifications !== 'undefined') {
            Notifications.notify({
              title: payload.status === 'Completed' ? `Installation Commissioned: ${payload.customerName}` : (isEdit ? `Project Updated: ${payload.customerName}` : `New Installation: ${payload.customerName}`),
              message: `${payload.totalCapacity} kW solar project (${payload.panelType}) scheduled for ${payload.installationDate} with status: ${payload.status}.`,
              category: 'installations',
              severity: payload.status === 'Completed' ? 'success' : 'info',
              link: 'installations.html',
              actionLabel: 'View Project'
            }, false);
          }
          modal.close();
          await this.loadData();
          this.renderStats();
          this.renderTabs();
          this.renderTable();
        } else {
          Components.toast('error', 'Save Failed', resp.error || 'Could not save installation.');
          saveBtn.disabled = false;
          saveBtn.textContent = isEdit ? 'Update Installation' : 'Save Project';
        }
      } catch (err) {
        console.error('Save installation error:', err);
        Components.toast('error', 'Error', err.message || 'An error occurred.');
        saveBtn.disabled = false;
        saveBtn.textContent = isEdit ? 'Update Installation' : 'Save Project';
      }
    });
  },

  /* ── 8. View Installation Modal ── */
  viewInstallation(id) {
    const item = this.state.installations.find(i => i.id === id || i.installationCode === id);
    if (!item) return;

    const content = `
      <div class="installation-details">
        <div class="d-flex justify-between align-center mb-4 pb-3" style="border-bottom:1px solid var(--border-color)">
          <div>
            <h3 class="mb-1">${item.installationCode || item.id} — ${Utils.escapeHtml(item.customerName)}</h3>
            <span class="fs-sm text-muted" style="display:inline-flex;align-items:center;gap:4px">${Icons.mapPin(13)} ${Utils.escapeHtml(item.address)}</span>
          </div>
          <span class="badge ${item.status === 'Completed' ? 'badge-success' : 'badge-warning'}" style="font-size:14px;padding:6px 12px">
            ${item.status}
          </span>
        </div>

        <div class="grid-cols-2 mb-4 gap-4">
          <div class="p-3 rounded" style="background:var(--bg-badge)">
            <div class="fs-xs text-muted">System Capacity</div>
            <div class="fs-lg fw-bold text-primary">${(parseFloat(item.totalCapacity) || 0).toFixed(1)} kW</div>
          </div>
          <div class="p-3 rounded" style="background:var(--bg-badge)">
            <div class="fs-xs text-muted">Panels Deployed</div>
            <div class="fs-lg fw-bold">${item.quantityInstalled} Units</div>
          </div>
        </div>

        <table class="table mb-4" style="font-size:var(--fs-sm)">
          <tbody>
            <tr><th style="width:35%">Contact Phone</th><td><span style="display:inline-flex;align-items:center;gap:5px">${Icons.phone(14)} ${Utils.escapeHtml(item.phone)}</span></td></tr>
            <tr><th>Contact Email</th><td><span style="display:inline-flex;align-items:center;gap:5px">${Icons.mail(14)} ${Utils.escapeHtml(item.email || 'N/A')}</span></td></tr>
            <tr><th>Panel Model</th><td><span style="display:inline-flex;align-items:center;gap:5px">${Icons.solarPanel(14)} ${Utils.escapeHtml(item.panelType)}</span></td></tr>
            <tr><th>Installation Date</th><td><span style="display:inline-flex;align-items:center;gap:5px">${Icons.calendar(14)} ${Utils.formatDate(item.installationDate)}</span></td></tr>
            <tr><th>Install Team</th><td><span style="display:inline-flex;align-items:center;gap:5px">${Icons.worker(14)} ${Utils.escapeHtml(item.teamAssigned || item.installationTeam || 'Standard Team')}</span></td></tr>
            <tr><th>Inverter</th><td><span style="display:inline-flex;align-items:center;gap:5px">${Icons.zap(14)} ${Utils.escapeHtml(item.inverterUsed || 'Not specified')}</span></td></tr>
            <tr><th>Battery Storage</th><td><span style="display:inline-flex;align-items:center;gap:5px">${Icons.zap(14)} ${Utils.escapeHtml(item.batteryUsed || 'Grid-Tie Only')}</span></td></tr>
            <tr><th>Warranty</th><td><span style="display:inline-flex;align-items:center;gap:5px">${Icons.shield(14)} ${Utils.escapeHtml(item.warranty || '25 Years')}</span></td></tr>
            <tr><th>Notes</th><td>${Utils.escapeHtml(item.notes || 'None')}</td></tr>
          </tbody>
        </table>
      </div>
    `;

    Components.showModal({
      id: 'view-inst-modal',
      title: 'Project Commissioning Dossier',
      size: 'md',
      content,
      footer: `<button type="button" class="btn btn-secondary" data-close-modal>Close</button>`
    });
  },

  /* ── 9. Confirm Delete ── */
  confirmDelete(id) {
    const item = this.state.installations.find(i => i.id === id || i.installationCode === id);
    if (!item) return;

    Components.confirm({
      title: 'Delete Installation Project',
      message: `Delete project <strong>${item.installationCode || item.id}</strong> for <strong>${Utils.escapeHtml(item.customerName)}</strong>? This cannot be undone.`,
      confirmText: 'Delete Permanently',
      type: 'danger',
      onConfirm: async () => {
        try {
          const resp = await ApiService.deleteInstallation(item.db_id || item.id);
          if (resp.success) {
            Components.toast('success', 'Deleted', `Project ${item.installationCode || item.id} removed.`);
            await this.loadData();
            this.renderStats();
            this.renderTabs();
            this.renderTable();
          } else {
            Components.toast('error', 'Delete Failed', resp.error || 'Could not delete.');
          }
        } catch (err) {
          Components.toast('error', 'Error', err.message);
        }
      }
    });
  },

  /* ── 10. CSV Export ── */
  exportCSV() {
    const items = this.state.installations;
    if (!items.length) return Components.toast('warning', 'Empty', 'No installations to export.');

    const headers = ['Project Code', 'Customer', 'Phone', 'Address', 'Panel Type', 'Quantity', 'Capacity (kW)', 'Date', 'Status', 'Inverter'];
    const rows = items.map(i => [
      i.installationCode || i.id,
      `"${(i.customerName || '').replace(/"/g, '""')}"`,
      `"${(i.phone || '').replace(/"/g, '""')}"`,
      `"${(i.address || '').replace(/"/g, '""')}"`,
      `"${(i.panelType || '').replace(/"/g, '""')}"`,
      i.quantityInstalled,
      i.totalCapacity,
      i.installationDate,
      i.status,
      `"${(i.inverterUsed || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smatree_installations_${Utils.today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    Components.toast('success', 'CSV Exported', 'Installations downloaded.');
  }
};

window.Installations = Installations;
