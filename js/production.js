/* ==========================================================================
   SMATREE SOLAR INVENTORY — Production Module (Dynamic MySQL Backend)
   Production batch management with live inventory sync, progress tracking,
   product catalog linkage, and full CRUD operations.
   ========================================================================== */

const Production = {
  state: {
    batches: [],
    products: [],
    serverStats: null,
    searchQuery: '',
    statusFilter: '',
    currentPage: 1,
    perPage: 8,
    activeTab: 'all',
    sortKey: 'id',
    sortDir: 'desc',
    isLoading: false,
  },

  statuses: ['Pending', 'In Production', 'Quality Check', 'Completed'],

  async init() {
    if (!App.initPage('production', 'Manufacturing & Production Batches', [
      { label: 'Home', href: 'dashboard.html' },
      { label: 'Production' }
    ])) return;

    await this.loadData();
    this.renderStats();
    this.renderTabs();
    this.renderToolbar();
    this.renderTable();
    this.setupEvents();
  },

  /* ── 1. Fetch live production batches & products from MySQL ── */
  async loadData() {
    this.state.isLoading = true;
    try {
      // 1. Fetch batches
      const resp = await ApiService.getProduction();
      if (resp.success && resp.data && Array.isArray(resp.data.data)) {
        this.state.batches = resp.data.data;
        this.state.serverStats = resp.data.stats || null;
        // Keep store in sync for cross-page cache
        Store._set(Store.keys.production, this.state.batches);
      } else {
        this.state.batches = Store.getAll('production') || [];
      }

      // 2. Fetch products catalog for linkage
      const prodResp = await ApiService.getProducts('all');
      if (prodResp.success && prodResp.data && Array.isArray(prodResp.data.data)) {
        this.state.products = prodResp.data.data;
      } else {
        this.state.products = Store.getAll('finishedGoods') || [];
      }
    } catch (err) {
      console.warn('API error loading production data, using local store:', err);
      this.state.batches = Store.getAll('production') || [];
      this.state.products = Store.getAll('finishedGoods') || [];
    } finally {
      this.state.isLoading = false;
    }
  },

  /* ── 2. Top Metric KPI Cards ── */
  renderStats() {
    const container = document.getElementById('production-stats');
    if (!container) return;

    let stats = this.state.serverStats;
    if (!stats) {
      const items = this.state.batches;
      stats = {
        totalBatches: items.length,
        inProgress: items.filter(b => b.status === 'In Production').length,
        completed: items.filter(b => b.status === 'Completed').length,
        totalPanels: items.filter(b => b.status === 'Completed').reduce((sum, b) => sum + (parseInt(b.quantity) || 0), 0)
      };
    }

    container.innerHTML = `
      <div class="stat-card animate-fadeInUp delay-1" style="--card-accent:var(--color-primary-400)">
        <div class="stat-icon blue">🏭</div>
        <div class="stat-value">${stats.totalBatches}</div>
        <div class="stat-label">Total Batches</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-2" style="--card-accent:var(--color-solar-400)">
        <div class="stat-icon amber">⏳</div>
        <div class="stat-value">${stats.inProgress}</div>
        <div class="stat-label">In Production</div>
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
      </div>
    `;
  },

  /* ── 3. Status Tabs Navigation ── */
  renderTabs() {
    const container = document.getElementById('production-tabs-container');
    if (!container) return;

    const batches = this.state.batches;
    const counts = {
      all: batches.length,
      'In Production': batches.filter(b => b.status === 'In Production').length,
      'Quality Check': batches.filter(b => b.status === 'Quality Check').length,
      'Completed': batches.filter(b => b.status === 'Completed').length,
      'Pending': batches.filter(b => b.status === 'Pending').length,
    };

    container.innerHTML = `
      <div class="d-flex align-center gap-2 flex-wrap" style="border-bottom:1px solid var(--border-color);padding-bottom:var(--space-2);">
        <button class="btn btn-sm ${this.state.activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}" data-prod-tab="all">
          All Batches <span class="badge ${this.state.activeTab === 'all' ? 'badge-primary' : 'badge-neutral'} ml-1" style="font-size:10px">${counts.all}</span>
        </button>
        <button class="btn btn-sm ${this.state.activeTab === 'In Production' ? 'btn-primary' : 'btn-ghost'}" data-prod-tab="In Production">
          ⏳ In Production <span class="badge ml-1" style="font-size:10px">${counts['In Production']}</span>
        </button>
        <button class="btn btn-sm ${this.state.activeTab === 'Quality Check' ? 'btn-primary' : 'btn-ghost'}" data-prod-tab="Quality Check">
          🔬 Quality Check <span class="badge ml-1" style="font-size:10px">${counts['Quality Check']}</span>
        </button>
        <button class="btn btn-sm ${this.state.activeTab === 'Completed' ? 'btn-primary' : 'btn-ghost'}" data-prod-tab="Completed">
          ✅ Completed <span class="badge ml-1" style="font-size:10px">${counts['Completed']}</span>
        </button>
        <button class="btn btn-sm ${this.state.activeTab === 'Pending' ? 'btn-primary' : 'btn-ghost'}" data-prod-tab="Pending">
          📋 Pending <span class="badge ml-1" style="font-size:10px">${counts['Pending']}</span>
        </button>
      </div>
    `;
  },

  /* ── 4. Search & Action Toolbar ── */
  renderToolbar() {
    const container = document.getElementById('production-toolbar');
    if (!container) return;

    container.innerHTML = `
      <div class="search-box" style="flex:1;max-width:320px">
        <span class="search-icon">🔍</span>
        <input type="text" id="prod-search" placeholder="Search batch ID, panel, team..." value="${Utils.escapeHtml(this.state.searchQuery)}">
      </div>
      <div class="toolbar-actions d-flex align-center gap-2">
        <button class="btn btn-secondary btn-sm" id="prod-export-btn" title="Export CSV report">
          📥 Export CSV
        </button>
        <button class="btn btn-secondary btn-sm btn-icon" id="prod-refresh-btn" title="Refresh live batches">
          🔄
        </button>
        <button class="btn btn-primary btn-sm" id="prod-add-btn">
          + New Batch
        </button>
      </div>
    `;
  },

  /* ── 5. Main Production Batches Table ── */
  renderTable() {
    const container = document.getElementById('production-table');
    if (!container) return;

    if (this.state.isLoading) {
      container.innerHTML = `
        <div class="text-center p-8 text-muted">
          <div class="spinner-border spinner-border-sm mb-2" role="status"></div>
          <div>Loading production batches from database...</div>
        </div>`;
      return;
    }

    let items = [...this.state.batches];

    // Tab filter
    if (this.state.activeTab !== 'all') {
      items = items.filter(b => b.status === this.state.activeTab);
    }

    // Search query filter
    if (this.state.searchQuery) {
      items = Utils.searchFilter(items, this.state.searchQuery, [
        'id', 'batchCode', 'panelType', 'teamAssigned', 'productName', 'materialsUsed'
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

    const statusBadge = (status) => {
      const map = {
        'Pending': 'badge-neutral',
        'In Production': 'badge-primary',
        'Quality Check': 'badge-warning',
        'Completed': 'badge-success'
      };
      return `<span class="badge badge-dot ${map[status] || 'badge-neutral'}">${status}</span>`;
    };

    const columns = [
      {
        label: 'Batch ID',
        key: 'batchCode',
        sortable: true,
        render: (r) => `
          <div>
            <span class="fw-semibold text-primary">${r.batchCode || r.id}</span>
            ${r.productName ? `<div class="fs-xs text-muted" style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${Utils.escapeHtml(r.productName)}</div>` : ''}
          </div>`
      },
      {
        label: 'Panel Specification',
        key: 'panelType',
        sortable: true,
        render: (r) => `
          <div>
            <div class="fw-medium">${Utils.escapeHtml(r.panelType)}</div>
            <div class="fs-xs text-muted">${r.wattCapacity} Watts</div>
          </div>`
      },
      {
        label: 'Batch Qty',
        key: 'quantity',
        sortable: true,
        render: (r) => `<span class="fw-semibold">${Utils.formatNumber(r.quantity)}</span> <span class="fs-xs text-muted">pcs</span>`
      },
      {
        label: 'Team & Schedule',
        key: 'teamAssigned',
        render: (r) => `
          <div>
            <div class="fs-xs fw-semibold">👷 ${Utils.escapeHtml(r.teamAssigned)}</div>
            <div class="fs-xs text-muted">Start: ${Utils.formatDate(r.startDate)}</div>
          </div>`
      },
      {
        label: 'Progress',
        key: 'progress',
        render: (r) => `
          <div class="batch-progress" style="min-width:110px">
            <div class="d-flex justify-between mb-1">
              <span class="fs-xs fw-medium">${r.progress}%</span>
              ${r.status === 'Completed' ? '<span class="fs-xs text-success fw-bold">✓ Ready</span>' : ''}
            </div>
            <div class="progress" style="height:6px;background:var(--bg-badge);border-radius:999px;overflow:hidden">
              <div class="progress-bar ${r.progress >= 100 ? 'bg-success' : r.progress > 50 ? 'bg-primary' : 'bg-warning'}" 
                   style="width:${r.progress}%;height:100%;transition:width 0.4s ease"></div>
            </div>
          </div>`
      },
      {
        label: 'Status',
        key: 'status',
        render: (r) => statusBadge(r.status)
      },
      {
        label: 'Mfg Cost',
        key: 'productionCost',
        render: (r) => `<span class="fw-semibold">${Utils.formatCurrency(r.productionCost)}</span>`
      },
      {
        label: 'Actions',
        render: (r) => `
          <div class="actions d-flex align-center gap-1">
            <button class="btn btn-ghost btn-sm btn-icon" data-view-prod="${r.id}" title="View Batch Details">👁️</button>
            ${r.status !== 'Completed' ? `<button class="btn btn-ghost btn-sm btn-icon text-success" data-complete-prod="${r.id}" title="Complete Batch & Add to Stock">✔️</button>` : ''}
            <button class="btn btn-ghost btn-sm btn-icon" data-edit-prod="${r.id}" title="Edit Batch">✏️</button>
            <button class="btn btn-ghost btn-sm btn-icon text-danger" data-delete-prod="${r.id}" title="Delete Batch">🗑️</button>
          </div>`
      }
    ];

    container.innerHTML = Components.renderTable({
      columns,
      data: paginated.items,
      emptyMessage: 'No production batches match your current filter.'
    });

    container.insertAdjacentHTML('beforeend', Components.renderPagination(paginated));
    window._onPageChange = (page) => {
      this.state.currentPage = page;
      this.renderTable();
    };
  },

  /* ── 6. Event Handlers ── */
  setupEvents() {
    // Tab switching
    document.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-prod-tab]');
      if (tabBtn) {
        this.state.activeTab = tabBtn.dataset.prodTab;
        this.state.currentPage = 1;
        this.renderTabs();
        this.renderTable();
      }

      if (e.target.closest('#prod-add-btn')) this.showForm();
      if (e.target.closest('#prod-refresh-btn')) this.refreshData();
      if (e.target.closest('#prod-export-btn')) this.exportCSV();

      const viewBtn = e.target.closest('[data-view-prod]');
      if (viewBtn) this.viewBatch(viewBtn.dataset.viewProd);

      const completeBtn = e.target.closest('[data-complete-prod]');
      if (completeBtn) this.completeBatchQuick(completeBtn.dataset.completeProd);

      const editBtn = e.target.closest('[data-edit-prod]');
      if (editBtn) this.showForm(editBtn.dataset.editProd);

      const deleteBtn = e.target.closest('[data-delete-prod]');
      if (deleteBtn) this.confirmDelete(deleteBtn.dataset.deleteProd);
    });

    // Search input
    document.addEventListener('input', Utils.debounce((e) => {
      if (e.target.id === 'prod-search') {
        this.state.searchQuery = e.target.value.trim();
        this.state.currentPage = 1;
        this.renderTable();
      }
    }, 250));
  },

  async refreshData() {
    const btn = document.getElementById('prod-refresh-btn');
    if (btn) btn.classList.add('loading');
    await this.loadData();
    this.renderStats();
    this.renderTabs();
    this.renderTable();
    if (btn) btn.classList.remove('loading');
    Components.toast('info', 'Synchronized', 'Live production data refreshed from database.');
  },

  /* ── 7. Create / Edit Batch Form with Product Sync ── */
  showForm(editId = null) {
    const item = editId ? this.state.batches.find(b => b.id === editId || b.batchCode === editId) : null;
    const isEdit = !!item;

    const productsOptions = this.state.products.map(p => `
      <option value="${p.db_id || p.id}" 
              data-watts="${p.watt_capacity || p.wattCapacity || 400}" 
              data-panel="${Utils.escapeHtml(p.name || '')}"
              ${(item && (item.productId == (p.db_id || p.id) || item.productCode === p.product_code)) ? 'selected' : ''}>
        ${Utils.escapeHtml(p.name || p.product_code)} (${p.watt_capacity || p.wattCapacity || 400}W) — Ready Stock: ${p.ready_to_sell || p.readyToSell || 0}
      </option>
    `).join('');

    const content = `
      <form id="prod-form" novalidate>
        <div class="p-3 mb-4 rounded" style="background:var(--bg-badge);border:1px solid var(--border-color);font-size:var(--fs-xs)">
          ℹ️ <strong>Inventory Synchronization Notice:</strong> When a batch status is set to <strong>Completed</strong>, manufactured solar panels are atomically added to the selected product's finished goods stock in MySQL.
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Linked Product Catalog (Optional)</label>
            <select class="form-control" id="prod-product-select">
              <option value="">-- Auto Match by Watt/Type or Custom --</option>
              ${productsOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Panel Type / Title *</label>
            <input type="text" class="form-control" id="prod-type" value="${Utils.escapeHtml(item?.panelType || '')}" placeholder="e.g. SunMax Mono PERC 400W" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Watt Capacity (W) *</label>
            <input type="number" class="form-control" id="prod-watts" value="${item?.wattCapacity || 400}" placeholder="400" min="50" max="1500" required>
          </div>
          <div class="form-group">
            <label class="form-label">Quantity to Produce *</label>
            <input type="number" class="form-control" id="prod-qty" value="${item?.quantity || 100}" min="1" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Assigned Production Team *</label>
            <input type="text" class="form-control" id="prod-team" value="${Utils.escapeHtml(item?.teamAssigned || '')}" placeholder="e.g. Team Alpha / Plant A" required>
          </div>
          <div class="form-group">
            <label class="form-label">Production Cost (₹)</label>
            <input type="number" class="form-control" id="prod-cost" value="${item?.productionCost || 0}" min="0" step="100">
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
            <label class="form-label">Batch Status *</label>
            <select class="form-control" id="prod-status">
              ${this.statuses.map(s => `<option value="${s}" ${item?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Manufacturing Progress (%)</label>
            <input type="number" class="form-control" id="prod-progress" value="${item?.progress ?? (item?.status === 'Completed' ? 100 : 0)}" min="0" max="100">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Raw Materials Used / Bill of Materials</label>
          <input type="text" class="form-control" id="prod-materials" value="${Utils.escapeHtml(item?.materialsUsed || '')}" placeholder="e.g. Solar Cells, Glass, Aluminum Frame, EVA Sheet, Backsheet, Junction Box">
        </div>

        <div class="form-group">
          <label class="form-label">Production Notes</label>
          <textarea class="form-control" id="prod-notes" rows="2" placeholder="Quality checks, test reports, or operational notes...">${Utils.escapeHtml(item?.notes || '')}</textarea>
        </div>
      </form>
    `;

    const modal = Components.showModal({
      id: 'production-modal',
      title: isEdit ? `Edit Batch — ${item.batchCode || item.id}` : 'Create New Production Batch',
      size: 'lg',
      content,
      footer: `
        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
        <button type="button" class="btn btn-primary" id="prod-save-btn">${isEdit ? 'Update Batch' : 'Create Batch & Sync'}</button>
      `
    });

    // Auto-fill watts and panel name when a linked product is chosen
    const prodSelect = document.getElementById('prod-product-select');
    prodSelect?.addEventListener('change', (e) => {
      const selectedOption = prodSelect.options[prodSelect.selectedIndex];
      if (selectedOption && selectedOption.value) {
        const typeInput = document.getElementById('prod-type');
        const wattsInput = document.getElementById('prod-watts');
        if (typeInput && !typeInput.value) typeInput.value = selectedOption.dataset.panel || '';
        if (wattsInput) wattsInput.value = selectedOption.dataset.watts || 400;
      }
    });

    // Auto-adjust progress when status changes
    const statusSelect = document.getElementById('prod-status');
    statusSelect?.addEventListener('change', (e) => {
      const progInput = document.getElementById('prod-progress');
      const endInput = document.getElementById('prod-end');
      if (e.target.value === 'Completed') {
        if (progInput) progInput.value = 100;
        if (endInput && !endInput.value) endInput.value = Utils.today();
      } else if (e.target.value === 'In Production') {
        if (progInput && (progInput.value == 0 || progInput.value == 100)) progInput.value = 50;
      } else if (e.target.value === 'Quality Check') {
        if (progInput) progInput.value = 90;
      }
    });

    // Save action
    document.getElementById('prod-save-btn')?.addEventListener('click', async () => {
      const saveBtn = document.getElementById('prod-save-btn');
      const selectedProdVal = prodSelect ? prodSelect.value : null;

      const payload = {
        id: isEdit ? (item.db_id || item.id) : undefined,
        productId: selectedProdVal ? parseInt(selectedProdVal) : undefined,
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
        notes: document.getElementById('prod-notes').value.trim(),
      };

      if (!payload.panelType || isNaN(payload.wattCapacity) || isNaN(payload.quantity) || !payload.teamAssigned) {
        return Components.toast('error', 'Validation Error', 'Please fill in all required fields.');
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving to Database...';

      try {
        let resp;
        if (isEdit) {
          resp = await ApiService.updateProduction(payload);
        } else {
          resp = await ApiService.addProduction(payload);
        }

        if (resp.success) {
          Components.toast('success', isEdit ? 'Batch Updated' : 'Batch Created', resp.data?.message || 'Production record saved.');
          modal.close();
          await this.loadData();
          this.renderStats();
          this.renderTabs();
          this.renderTable();
        } else {
          Components.toast('error', 'Save Failed', resp.error || 'Could not save production batch.');
          saveBtn.disabled = false;
          saveBtn.textContent = isEdit ? 'Update Batch' : 'Create Batch & Sync';
        }
      } catch (err) {
        console.error('Save production error:', err);
        Components.toast('error', 'Error', err.message || 'An unexpected error occurred.');
        saveBtn.disabled = false;
        saveBtn.textContent = isEdit ? 'Update Batch' : 'Create Batch & Sync';
      }
    });
  },

  /* ── 8. Quick Complete Batch (1-Click) ── */
  async completeBatchQuick(id) {
    const item = this.state.batches.find(b => b.id === id || b.batchCode === id);
    if (!item) return;

    Components.confirm({
      title: 'Complete Production Batch',
      message: `Mark batch <strong>${item.batchCode || item.id}</strong> as Completed? This will instantly add <strong>${item.quantity} panels</strong> to sales-ready finished goods stock.`,
      confirmText: 'Complete & Add Stock',
      type: 'primary',
      onConfirm: async () => {
        try {
          const payload = {
            id: item.db_id || item.id,
            status: 'Completed',
            progress: 100,
            completionDate: Utils.today()
          };
          const resp = await ApiService.updateProduction(payload);
          if (resp.success) {
            Components.toast('success', 'Production Completed', `Batch ${item.batchCode || item.id} completed. Finished goods stock updated.`);
            await this.loadData();
            this.renderStats();
            this.renderTabs();
            this.renderTable();
          } else {
            Components.toast('error', 'Failed', resp.error || 'Could not complete batch.');
          }
        } catch (err) {
          Components.toast('error', 'Error', err.message);
        }
      }
    });
  },

  /* ── 9. View Batch Modal ── */
  viewBatch(id) {
    const item = this.state.batches.find(b => b.id === id || b.batchCode === id);
    if (!item) return;

    const content = `
      <div class="batch-details">
        <div class="d-flex justify-between align-center mb-4 pb-3" style="border-bottom:1px solid var(--border-color)">
          <div>
            <h3 class="mb-1">${item.batchCode || item.id}</h3>
            <span class="fs-sm text-muted">${item.panelType} • ${item.wattCapacity}W</span>
          </div>
          <span class="badge ${item.status === 'Completed' ? 'badge-success' : 'badge-primary'}" style="font-size:14px;padding:6px 12px">
            ${item.status}
          </span>
        </div>

        <div class="grid-cols-2 mb-4 gap-4">
          <div class="p-3 rounded" style="background:var(--bg-badge)">
            <div class="fs-xs text-muted">Quantity Produced</div>
            <div class="fs-lg fw-bold text-primary">${Utils.formatNumber(item.quantity)} units</div>
          </div>
          <div class="p-3 rounded" style="background:var(--bg-badge)">
            <div class="fs-xs text-muted">Production Cost</div>
            <div class="fs-lg fw-bold">${Utils.formatCurrency(item.productionCost)}</div>
          </div>
        </div>

        <table class="table mb-4" style="font-size:var(--fs-sm)">
          <tbody>
            <tr><th style="width:35%">Team Assigned</th><td>👷 ${Utils.escapeHtml(item.teamAssigned)}</td></tr>
            <tr><th>Start Date</th><td>📅 ${Utils.formatDate(item.startDate)}</td></tr>
            <tr><th>Completion Date</th><td>🏁 ${item.completionDate ? Utils.formatDate(item.completionDate) : 'In Progress'}</td></tr>
            <tr><th>Progress</th><td>${item.progress}%</td></tr>
            <tr><th>Materials Used</th><td>${Utils.escapeHtml(item.materialsUsed || 'Standard solar cell BOM')}</td></tr>
            <tr><th>Notes</th><td>${Utils.escapeHtml(item.notes || 'None')}</td></tr>
          </tbody>
        </table>
      </div>
    `;

    Components.showModal({
      id: 'view-batch-modal',
      title: 'Batch Specification & Telemetry',
      size: 'md',
      content,
      footer: `<button type="button" class="btn btn-secondary" data-close-modal>Close</button>`
    });
  },

  /* ── 10. Confirm Delete Batch ── */
  confirmDelete(id) {
    const item = this.state.batches.find(b => b.id === id || b.batchCode === id);
    if (!item) return;

    Components.confirm({
      title: 'Delete Production Batch',
      message: `Are you sure you want to delete batch <strong>${item.batchCode || item.id}</strong>? If this batch was completed, its stock addition will be safely deducted from inventory.`,
      confirmText: 'Delete Permanently',
      type: 'danger',
      onConfirm: async () => {
        try {
          const resp = await ApiService.deleteProduction(item.db_id || item.id);
          if (resp.success) {
            Components.toast('success', 'Deleted', `Batch ${item.batchCode || item.id} deleted successfully.`);
            await this.loadData();
            this.renderStats();
            this.renderTabs();
            this.renderTable();
          } else {
            Components.toast('error', 'Delete Failed', resp.error || 'Could not delete batch.');
          }
        } catch (err) {
          Components.toast('error', 'Error', err.message);
        }
      }
    });
  },

  /* ── 11. CSV Export ── */
  exportCSV() {
    const items = this.state.batches;
    if (!items.length) return Components.toast('warning', 'Empty', 'No batches to export.');

    const headers = ['Batch Code', 'Panel Type', 'Watts', 'Quantity', 'Team', 'Start Date', 'Completion Date', 'Status', 'Progress (%)', 'Cost (INR)'];
    const rows = items.map(b => [
      b.batchCode || b.id,
      `"${(b.panelType || '').replace(/"/g, '""')}"`,
      b.wattCapacity,
      b.quantity,
      `"${(b.teamAssigned || '').replace(/"/g, '""')}"`,
      b.startDate,
      b.completionDate || '',
      b.status,
      b.progress,
      b.productionCost
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smatree_production_batches_${Utils.today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    Components.toast('success', 'CSV Exported', 'Production batches downloaded.');
  }
};

window.Production = Production;
