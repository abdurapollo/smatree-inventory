/* ==========================================================================
   SMATREE SOLAR INVENTORY — Inventory Module
   Complete CRUD for raw materials with search, filter, sort, pagination
   ========================================================================== */

const Inventory = {
  state: {
    searchQuery: '',
    categoryFilter: '',
    sortKey: 'name',
    sortDir: 'asc',
    currentPage: 1,
    perPage: 10,
    editingId: null,
  },

  categories: [
    'Solar Cells', 'Glass', 'Aluminum Frame', 'EVA Sheet', 'Backsheet',
    'Junction Box', 'Copper Wire', 'Inverter', 'Battery', 'Mounting Structure'
  ],

  unitTypes: ['Pieces', 'Sheets', 'Rolls', 'Sets', 'Meters', 'Units', 'Kg', 'Liters'],

  async init() {
    if (!App.initPage('inventory', 'Raw Materials', [
      { label: 'Home', href: 'dashboard.html' },
      { label: 'Raw Materials' }
    ])) return;

    await this.loadFromDatabase();
    if (typeof Components !== 'undefined') {
      Components.updateNavBadges();
      Components.syncNavBadgesWithBackend();
    }
    this.renderStats();
    this.renderToolbar();
    this.renderTable();
    this.setupEvents();
  },

  /* ── Sync with MySQL Database ── */
  async loadFromDatabase() {
    try {
      const resp = await fetch('../api/inventory/index.php');
      const result = await resp.json();
      if (result && result.success && Array.isArray(result.data) && result.data.length > 0) {
        Store._set(Store.keys.inventory, result.data);
        if (typeof Components !== 'undefined') {
          Components.updateNavBadges();
        }
      }
    } catch (err) {
      console.warn('Backend database API load error, using local cached store:', err);
    }
  },

  /* ── Stats Cards ── */
  renderStats() {
    const container = document.getElementById('inventory-stats');
    if (!container) return;

    const inv = Store.getInventoryStats();
    const items = Store.getAll('inventory');
    const categories = new Set(items.map(i => i.category)).size;

    const isReadOnly = typeof RBAC !== 'undefined' && RBAC.isReadOnly('inventory');
    const readOnlyBannerHtml = isReadOnly ? `
      <div class="rbac-readonly-banner animate-fadeInUp" style="grid-column: 1 / -1; margin-bottom: 0;">
        <div class="rbac-banner-icon">👁️</div>
        <div class="rbac-banner-content">
          <div class="rbac-banner-title">Plant Manager View • Read-Only Material Telemetry</div>
          <div class="rbac-banner-text">You have permission to inspect solar cell raw materials, stock availability, and warehouse storage locations for manufacturing batches. Modifying supplier procurement contracts or material catalogs is restricted to Inventory Lead.</div>
        </div>
      </div>
    ` : '';

    container.innerHTML = `
      ${readOnlyBannerHtml}
      <div class="stat-card animate-fadeInUp delay-1" style="--card-accent:var(--color-primary-500)">
        <div class="stat-card-header">
          <div class="stat-icon blue">${Icons.package(22)}</div>
          <span class="stat-trend up">Healthy</span>
        </div>
        <div class="stat-value">${inv.totalMaterials}</div>
        <div class="stat-label">Raw Materials in Stock</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-2" style="--card-accent:var(--color-emerald-500)">
        <div class="stat-card-header">
          <div class="stat-icon green">${Icons.folder(22)}</div>
          <span class="stat-trend up">Catalog Linked</span>
        </div>
        <div class="stat-value">${categories}</div>
        <div class="stat-label">Material Categories</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-3" style="--card-accent:var(--color-red-500)">
        <div class="stat-card-header">
          <div class="stat-icon red">${Icons.alertTriangle(22)}</div>
          <span class="stat-trend ${inv.lowStockCount > 0 ? 'down' : 'up'}">${inv.lowStockCount > 0 ? 'Action Needed' : 'Healthy'}</span>
        </div>
        <div class="stat-value">${inv.lowStockCount}</div>
        <div class="stat-label">Low Stock Alerts</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-4" style="--card-accent:var(--color-solar-500)">
        <div class="stat-card-header">
          <div class="stat-icon amber">${Icons.coins(22)}</div>
          <span class="stat-trend up">Live Value</span>
        </div>
        <div class="stat-value">${Utils.formatCurrency(inv.totalValue)}</div>
        <div class="stat-label">Inventory Valuation</div>
      </div>
    `;
  },

  /* ── Toolbar ── */
  renderToolbar() {
    const container = document.getElementById('inventory-toolbar');
    if (!container) return;

    const canCreate = typeof RBAC === 'undefined' || RBAC.hasPermission('inventory.create');
    const addBtnHtml = canCreate
      ? `<button class="btn btn-primary btn-sm" id="inv-add-btn">${Icons.plus(15)} <span>Add Material</span></button>`
      : `<span class="badge badge-neutral" style="font-size:11px;padding:6px 12px;font-weight:600;display:inline-flex;align-items:center;gap:4px;">👁️ Read-Only Mode</span>`;

    container.innerHTML = `
      <div class="search-box" style="flex:1;max-width:320px">
        <span class="search-icon">${Icons.search(16)}</span>
        <input type="text" id="inv-search" placeholder="Search materials..." value="${this.state.searchQuery}">
      </div>
      <select class="form-control" id="inv-category-filter" style="width:auto;min-width:160px;border-radius:999px;padding:0.5rem 2rem 0.5rem 0.75rem;font-size:var(--fs-xs)">
        <option value="">All Categories</option>
        ${this.categories.map(c => `<option value="${c}" ${this.state.categoryFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <div class="toolbar-actions">
        <button class="btn btn-secondary btn-sm" id="inv-export-btn">${Icons.download(15)} <span>Export CSV</span></button>
        ${addBtnHtml}
      </div>
    `;
  },

  /* ── Table ── */
  renderTable() {
    const container = document.getElementById('inventory-table');
    if (!container) return;

    let items = Store.getAll('inventory');

    // Filter
    if (this.state.searchQuery) {
      items = Utils.searchFilter(items, this.state.searchQuery, ['name', 'category', 'supplier', 'warehouse', 'id']);
    }
    if (this.state.categoryFilter) {
      items = items.filter(i => i.category === this.state.categoryFilter);
    }

    // Sort
    items = Utils.sortBy(items, this.state.sortKey, this.state.sortDir);

    // Paginate
    const paginated = Utils.paginate(items, this.state.currentPage, this.state.perPage);

    const canEdit = typeof RBAC === 'undefined' || RBAC.hasPermission('inventory.edit');
    const canDelete = typeof RBAC === 'undefined' || RBAC.hasPermission('inventory.delete');

    const columns = [
      { label: 'Material', key: 'name', sortable: true, render: (row) => `
        <div class="d-flex align-center gap-3">
          <div class="material-thumb">${row.image ? `<img src="${row.image}" alt="">` : Icons.package(20)}</div>
          <div>
            <div class="fw-semibold text-primary">${Utils.escapeHtml(row.name)}</div>
            <div class="fs-xs text-muted">${row.id}</div>
          </div>
        </div>` },
      { label: 'Category', key: 'category', sortable: true, render: (row) => `<span class="badge badge-primary">${row.category}</span>` },
      { label: 'Supplier', key: 'supplier', sortable: true },
      { label: 'Qty', key: 'quantity', sortable: true, render: (row) => `<span class="fw-semibold">${Utils.formatNumber(row.quantity)}</span> <span class="text-muted fs-xs">${row.unit}</span>` },
      { label: 'Cost/Unit', key: 'costPerUnit', sortable: true, render: (row) => Utils.formatCurrency(row.costPerUnit) },
      { label: 'Total Value', key: 'totalValue', sortable: false, render: (row) => `<span class="fw-semibold">${Utils.formatCurrency(row.costPerUnit * row.quantity)}</span>` },
      { label: 'Status', key: 'status', sortable: false, render: (row) => {
        const s = Utils.getStockStatus(row.quantity, row.reorderLevel);
        return `<span class="badge badge-dot ${s.class}">${s.label}</span>`;
      }},
    ];

    if (canEdit || canDelete) {
      columns.push({
        label: 'Actions',
        key: 'actions',
        render: (row) => `
          <div class="actions">
            ${canEdit ? `<button class="btn btn-ghost btn-sm btn-icon" data-edit="${row.id}" data-tooltip="Edit">${Icons.edit(15)}</button>` : ''}
            ${canDelete ? `<button class="btn btn-ghost btn-sm btn-icon text-danger" data-delete="${row.id}" data-tooltip="Delete">${Icons.trash(15)}</button>` : ''}
          </div>`
      });
    } else {
      columns.push({
        label: 'Access',
        key: 'access',
        render: () => `<span class="badge badge-neutral" style="font-size:10px;">Read-Only</span>`
      });
    }

    container.innerHTML = Components.renderTable({ columns, data: paginated.items, emptyMessage: 'No materials found' });

    // Pagination
    const paginationHtml = Components.renderPagination(paginated);
    container.insertAdjacentHTML('beforeend', paginationHtml);

    // Page change handler
    window._onPageChange = (page) => {
      this.state.currentPage = page;
      this.renderTable();
    };
  },

  /* ── Events ── */
  setupEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#inv-add-btn')) {
        if (typeof RBAC !== 'undefined' && !RBAC.hasPermission('inventory.create')) {
          Components.toast('warning', 'Access Restricted', 'Your role cannot add raw materials.');
          return;
        }
        this.showForm();
      }
      if (e.target.closest('[data-edit]')) {
        if (typeof RBAC !== 'undefined' && !RBAC.hasPermission('inventory.edit')) {
          Components.toast('warning', 'Access Restricted', 'Your role cannot edit raw materials.');
          return;
        }
        this.showForm(e.target.closest('[data-edit]').dataset.edit);
      }
      if (e.target.closest('[data-delete]')) {
        if (typeof RBAC !== 'undefined' && !RBAC.hasPermission('inventory.delete')) {
          Components.toast('warning', 'Access Restricted', 'Your role cannot delete raw materials.');
          return;
        }
        this.confirmDelete(e.target.closest('[data-delete]').dataset.delete);
      }
      if (e.target.closest('#inv-export-btn')) this.exportCSV();

      // Table sort
      const th = e.target.closest('.data-table thead th[data-sort]');
      if (th && th.dataset.sort) {
        const key = th.dataset.sort;
        if (this.state.sortKey === key) {
          this.state.sortDir = this.state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this.state.sortKey = key;
          this.state.sortDir = 'asc';
        }
        this.renderTable();
      }
    });

    // Search debounce
    document.addEventListener('input', Utils.debounce((e) => {
      if (e.target.id === 'inv-search') {
        this.state.searchQuery = e.target.value;
        this.state.currentPage = 1;
        this.renderTable();
      }
    }, 250));

    // Category filter
    document.addEventListener('change', (e) => {
      if (e.target.id === 'inv-category-filter') {
        this.state.categoryFilter = e.target.value;
        this.state.currentPage = 1;
        this.renderTable();
      }
    });
  },

  /* ── Form Modal ── */
  async showForm(editId = null) {
    this.state.editingId = editId;
    const item = editId ? Store.getById('inventory', editId) : null;
    const isEdit = !!item;
    const title = isEdit ? 'Edit Material' : 'Add Raw Material';

    // Dynamically fetch suppliers from database
    let suppliers = Store.getAll('suppliers');
    try {
      const supResp = await fetch('../api/suppliers/index.php');
      const supData = await supResp.json();
      if (supData && supData.success && Array.isArray(supData.data) && supData.data.length > 0) {
        suppliers = supData.data;
        Store._set(Store.keys.suppliers, suppliers);
      }
    } catch (e) {
      console.warn('Could not fetch dynamic suppliers from database:', e);
    }

    const content = `
      <form id="material-form" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Category *</label>
            <select class="form-control" id="mat-category" required>
              <option value="">Select category</option>
              ${this.categories.map(c => `<option value="${c}" ${item?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Supplier</label>
            <select class="form-control" id="mat-supplier">
              <option value="">Select supplier</option>
              ${suppliers.map(s => `<option value="${s.company}" ${item?.supplier === s.company ? 'selected' : ''}>${s.company}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Quantity *</label>
            <input type="number" class="form-control" id="mat-quantity" value="${item?.quantity || ''}" min="0" required>
          </div>
          <div class="form-group">
            <label class="form-label">Unit Type *</label>
            <select class="form-control" id="mat-unit" required>
              ${this.unitTypes.map(u => `<option value="${u}" ${item?.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Cost Per Unit (₹) *</label>
            <input type="number" class="form-control" id="mat-cost" value="${item?.costPerUnit || ''}" min="0" step="0.01" required>
          </div>
          <div class="form-group">
            <label class="form-label">Total Value</label>
            <input type="text" class="form-control" id="mat-total" readonly value="${item ? Utils.formatCurrency(item.costPerUnit * item.quantity) : '₹0.00'}" style="background:var(--bg-badge)">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Warehouse Location</label>
            <input type="text" class="form-control" id="mat-warehouse" value="${item?.warehouse || ''}" placeholder="e.g. Warehouse A - Rack 1">
          </div>
          <div class="form-group">
            <label class="form-label">Purchase Date</label>
            <input type="date" class="form-control" id="mat-date" value="${item?.purchaseDate || Utils.today()}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea class="form-control" id="mat-notes" rows="2" placeholder="Additional notes...">${item?.notes || ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Image</label>
          <div class="image-upload" id="mat-image-upload">
            ${item?.image ? `<img src="${item.image}" alt="Material">` : `<span>${Icons.camera(18)} Click to upload image</span>`}
            <input type="file" id="mat-image-file" accept="image/*">
          </div>
        </div>
      </form>
    `;

    const modal = Components.showModal({
      id: 'material-modal',
      title: title,
      size: 'lg',
      content: content,
      footer: `
        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
        <button type="button" class="btn btn-primary" id="material-save-btn">${isEdit ? 'Update' : 'Save'} Material</button>
      `,
    });

    // Auto-calc total value
    const calcTotal = () => {
      const qty = parseFloat(document.getElementById('mat-quantity')?.value) || 0;
      const cost = parseFloat(document.getElementById('mat-cost')?.value) || 0;
      const totalEl = document.getElementById('mat-total');
      if (totalEl) totalEl.value = Utils.formatCurrency(qty * cost);
    };
    const qtyInput = document.getElementById('mat-quantity');
    const costInput = document.getElementById('mat-cost');
    const catInput = document.getElementById('mat-category');
    const unitInput = document.getElementById('mat-unit');

    qtyInput?.addEventListener('input', () => {
      calcTotal();
      if (qtyInput.classList.contains('is-invalid')) {
        const q = parseInt(qtyInput.value);
        if (!isNaN(q) && q >= 0) Validator.setValid(qtyInput);
      }
    });
    costInput?.addEventListener('input', () => {
      calcTotal();
      if (costInput.classList.contains('is-invalid')) {
        const c = parseFloat(costInput.value);
        if (!isNaN(c) && c >= 0) Validator.setValid(costInput);
      }
    });
    catInput?.addEventListener('change', () => {
      if (catInput.value) Validator.setValid(catInput);
    });
    unitInput?.addEventListener('change', () => {
      if (unitInput.value) Validator.setValid(unitInput);
    });

    // Image upload
    const uploadArea = document.getElementById('mat-image-upload');
    const fileInput = document.getElementById('mat-image-file');
    uploadArea?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        const dataUrl = await Utils.readFileAsDataURL(file);
        uploadArea.innerHTML = `<img src="${dataUrl}" alt="Preview"><input type="file" id="mat-image-file" accept="image/*">`;
        uploadArea.dataset.image = dataUrl;
      }
    });

    // Save
    document.getElementById('material-save-btn')?.addEventListener('click', () => {
      this.saveForm(modal, isEdit);
    });
  },

  async saveForm(modal, isEdit) {
    if (typeof RBAC !== 'undefined') {
      const perm = isEdit ? 'inventory.edit' : 'inventory.create';
      if (!RBAC.hasPermission(perm)) {
        Components.toast('warning', 'Access Restricted', 'Your role does not have permission to modify raw materials.');
        modal.close();
        return;
      }
    }
    const existing = isEdit ? Store.getById('inventory', this.state.editingId) : null;
    const catEl = document.getElementById('mat-category');
    const supEl = document.getElementById('mat-supplier');
    const qtyEl = document.getElementById('mat-quantity');
    const unitEl = document.getElementById('mat-unit');
    const costEl = document.getElementById('mat-cost');
    const whEl = document.getElementById('mat-warehouse');
    const dateEl = document.getElementById('mat-date');
    const notesEl = document.getElementById('mat-notes');

    const category = catEl ? catEl.value.trim() : '';
    const supplier = supEl ? supEl.value.trim() : '';
    const quantity = qtyEl ? parseInt(qtyEl.value) : NaN;
    const unit = unitEl ? unitEl.value.trim() : '';
    const costPerUnit = costEl ? parseFloat(costEl.value) : NaN;
    const warehouse = whEl ? Utils.sanitize(whEl.value) : '';
    const purchaseDate = dateEl ? dateEl.value : Utils.today();
    const notes = notesEl ? Utils.sanitize(notesEl.value) : '';
    const imageUpload = document.getElementById('mat-image-upload');
    const image = imageUpload?.dataset.image || (isEdit ? existing?.image : null);

    // Validate fields with Validator engine
    let hasError = false;
    let firstInvalid = null;

    if (!category) {
      Validator.setError(catEl, 'Please select a material category.');
      hasError = true;
      if (!firstInvalid) firstInvalid = catEl;
    } else {
      Validator.setValid(catEl);
    }

    if (isNaN(quantity) || quantity < 0) {
      Validator.setError(qtyEl, 'Please enter a valid non-negative quantity (0 or greater).');
      hasError = true;
      if (!firstInvalid) firstInvalid = qtyEl;
    } else {
      Validator.setValid(qtyEl);
    }

    if (!unit) {
      Validator.setError(unitEl, 'Please select a unit type.');
      hasError = true;
      if (!firstInvalid) firstInvalid = unitEl;
    } else {
      Validator.setValid(unitEl);
    }

    if (isNaN(costPerUnit) || costPerUnit < 0) {
      Validator.setError(costEl, 'Please enter a valid non-negative cost per unit.');
      hasError = true;
      if (!firstInvalid) firstInvalid = costEl;
    } else {
      Validator.setValid(costEl);
    }

    if (hasError) {
      if (firstInvalid) firstInvalid.focus();
      return Components.toast('error', 'Validation Error', 'Please correct the highlighted form errors before saving.');
    }

    // Derive name and reorderLevel
    const name = existing?.name || (supplier ? `${category} (${supplier})` : category);
    const reorderLevel = existing?.reorderLevel ?? Math.max(10, Math.round((quantity || 100) * 0.2));

    const payload = {
      id: isEdit ? this.state.editingId : undefined,
      category,
      supplier,
      quantity,
      unit,
      costPerUnit,
      warehouse,
      purchaseDate,
      notes,
      image,
      reorderLevel
    };

    const saveBtn = document.getElementById('material-save-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = isEdit ? 'Updating Database...' : 'Saving to Database...';
    }

    let savedToDb = false;
    try {
      const endpoint = isEdit ? '../api/inventory/update.php' : '../api/inventory/create.php';
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await resp.json();

      if (resp.ok && result.success && result.data) {
        savedToDb = true;
        const dbItem = {
          id: result.data.id || result.data.materialCode,
          name: result.data.name || name,
          category: result.data.category,
          supplier: result.data.supplier,
          quantity: result.data.quantity,
          unit: result.data.unit,
          costPerUnit: result.data.costPerUnit,
          reorderLevel: result.data.reorderLevel,
          warehouse: result.data.warehouse,
          purchaseDate: result.data.purchaseDate,
          notes: result.data.notes,
          image: result.data.image,
          createdAt: result.data.createdAt || new Date().toISOString()
        };

        if (isEdit) {
          Store.update('inventory', this.state.editingId, dbItem);
          Components.toast('success', 'Database Updated', `Purchased raw material ${dbItem.name} updated in MySQL.`);
        } else {
          Store.add('inventory', dbItem);
          Components.toast('success', 'Added to Database', `Purchased raw material (${dbItem.id}) dynamically stored into MySQL.`);
        }
      }
    } catch (apiErr) {
      console.warn('Backend database API error, fallback to local store:', apiErr);
    }

    // Fallback to local store if server is unreachable
    if (!savedToDb) {
      const data = { name, category, supplier, quantity, unit, costPerUnit, reorderLevel, warehouse, purchaseDate, notes, image };
      if (isEdit) {
        Store.update('inventory', this.state.editingId, data);
        Components.toast('success', 'Material Updated', `${name} updated locally.`);
      } else {
        data.id = Utils.generateId('MAT');
        data.createdAt = new Date().toISOString();
        Store.add('inventory', data);
        Components.toast('success', 'Material Added', `${name} added to inventory.`);
      }
    }

    if (typeof Notifications !== 'undefined') {
      const isLow = quantity <= reorderLevel;
      Notifications.notify({
        title: isLow ? `Low Stock Alert: ${name}` : (isEdit ? `Material Updated: ${name}` : `Material Added: ${name}`),
        message: isLow ? `Stock is ${quantity} ${unit} (threshold: ${reorderLevel}). Reorder from ${supplier || 'supplier'}.` : `Current inventory: ${quantity} ${unit} stored at ${warehouse || 'warehouse'}.`,
        category: 'inventory',
        severity: quantity === 0 ? 'critical' : (isLow ? 'warning' : (isEdit ? 'info' : 'success')),
        link: 'inventory.html',
        actionLabel: 'Inspect Stock'
      }, false);
    }

    modal.close();
    await this.loadFromDatabase();
    if (typeof Components !== 'undefined') {
      Components.updateNavBadges();
      Components.syncNavBadgesWithBackend();
    }
    this.renderStats();
    this.renderTable();
  },

  confirmDelete(id) {
    if (typeof RBAC !== 'undefined' && !RBAC.hasPermission('inventory.delete')) {
      Components.toast('warning', 'Access Restricted', 'Your role cannot delete raw materials.');
      return;
    }
    const item = Store.getById('inventory', id);
    if (!item) return;
    Components.confirm({
      title: 'Delete Material',
      message: `Are you sure you want to delete "${item.name}"? This action will remove it from the database.`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        try {
          await fetch('../api/inventory/delete.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
          });
        } catch (e) {
          console.warn('Database delete request failed:', e);
        }
        Store.delete('inventory', id);
        if (typeof Notifications !== 'undefined') {
          Notifications.notify({
            title: `Material Removed: ${item.name}`,
            message: `Material was deleted from the inventory records.`,
            category: 'inventory',
            severity: 'warning',
            link: 'inventory.html',
            actionLabel: 'View Inventory'
          }, false);
        }
        Components.toast('success', 'Deleted', `${item.name} removed from database.`);
        await this.loadFromDatabase();
        if (typeof Components !== 'undefined') {
          Components.updateNavBadges();
          Components.syncNavBadgesWithBackend();
        }
        this.renderStats();
        this.renderTable();
      }
    });
  },

  exportCSV() {
    const items = Store.getAll('inventory');
    const headers = [
      { key: 'id', label: 'Material ID' },
      { key: 'name', label: 'Material Name' },
      { key: 'category', label: 'Category' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'unit', label: 'Unit' },
      { key: 'costPerUnit', label: 'Cost Per Unit' },
      { key: 'reorderLevel', label: 'Reorder Level' },
      { key: 'warehouse', label: 'Warehouse' },
      { key: 'purchaseDate', label: 'Purchase Date' },
      { key: 'notes', label: 'Notes' },
    ];
    Utils.exportCSV(items, headers, `inventory-${Utils.today()}.csv`);
    Components.toast('success', 'Exported', 'Inventory data exported to CSV.');
  }
};

window.Inventory = Inventory;
