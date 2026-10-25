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

  init() {
    if (!App.initPage('inventory', 'Raw Materials', [
      { label: 'Home', href: 'dashboard.html' },
      { label: 'Raw Materials' }
    ])) return;

    this.renderStats();
    this.renderToolbar();
    this.renderTable();
    this.setupEvents();
  },

  /* ── Stats Cards ── */
  renderStats() {
    const container = document.getElementById('inventory-stats');
    if (!container) return;

    const inv = Store.getInventoryStats();
    const items = Store.getAll('inventory');
    const categories = new Set(items.map(i => i.category)).size;

    container.innerHTML = `
      <div class="stat-card animate-fadeInUp delay-1" style="--card-accent:var(--color-primary-400)">
        <div class="stat-icon blue">📦</div>
        <div class="stat-value">${inv.totalMaterials}</div>
        <div class="stat-label">Total Materials</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-2" style="--card-accent:var(--color-emerald-400)">
        <div class="stat-icon green">📂</div>
        <div class="stat-value">${categories}</div>
        <div class="stat-label">Categories</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-3" style="--card-accent:var(--color-red-400)">
        <div class="stat-icon red">⚠️</div>
        <div class="stat-value">${inv.lowStockCount}</div>
        <div class="stat-label">Low Stock Items</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-4" style="--card-accent:var(--color-solar-400)">
        <div class="stat-icon amber">💰</div>
        <div class="stat-value">${Utils.formatCurrency(inv.totalValue)}</div>
        <div class="stat-label">Inventory Value</div>
      </div>
    `;
  },

  /* ── Toolbar ── */
  renderToolbar() {
    const container = document.getElementById('inventory-toolbar');
    if (!container) return;

    container.innerHTML = `
      <div class="search-box" style="flex:1;max-width:320px">
        <span class="search-icon">🔍</span>
        <input type="text" id="inv-search" placeholder="Search materials..." value="${this.state.searchQuery}">
      </div>
      <select class="form-control" id="inv-category-filter" style="width:auto;min-width:160px;border-radius:999px;padding:0.5rem 2rem 0.5rem 0.75rem;font-size:var(--fs-xs)">
        <option value="">All Categories</option>
        ${this.categories.map(c => `<option value="${c}" ${this.state.categoryFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <div class="toolbar-actions">
        <button class="btn btn-secondary btn-sm" id="inv-export-btn">📥 Export CSV</button>
        <button class="btn btn-primary btn-sm" id="inv-add-btn">+ Add Material</button>
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

    const columns = [
      { label: 'Material', key: 'name', sortable: true, render: (row) => `
        <div class="d-flex align-center gap-3">
          <div class="material-thumb">${row.image ? `<img src="${row.image}" alt="">` : '📦'}</div>
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
      { label: 'Actions', key: 'actions', render: (row) => `
        <div class="actions">
          <button class="btn btn-ghost btn-sm btn-icon" data-edit="${row.id}" data-tooltip="Edit">✏️</button>
          <button class="btn btn-ghost btn-sm btn-icon" data-delete="${row.id}" data-tooltip="Delete">🗑️</button>
        </div>` },
    ];

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
      if (e.target.closest('#inv-add-btn')) this.showForm();
      if (e.target.closest('[data-edit]')) this.showForm(e.target.closest('[data-edit]').dataset.edit);
      if (e.target.closest('[data-delete]')) this.confirmDelete(e.target.closest('[data-delete]').dataset.delete);
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
  showForm(editId = null) {
    this.state.editingId = editId;
    const item = editId ? Store.getById('inventory', editId) : null;
    const isEdit = !!item;
    const title = isEdit ? 'Edit Material' : 'Add Raw Material';

    const suppliers = Store.getAll('suppliers');

    const content = `
      <form id="material-form" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Material Name *</label>
            <input type="text" class="form-control" id="mat-name" value="${item?.name || ''}" placeholder="e.g. Monocrystalline Solar Cell" required>
          </div>
          <div class="form-group">
            <label class="form-label">Category *</label>
            <select class="form-control" id="mat-category" required>
              <option value="">Select category</option>
              ${this.categories.map(c => `<option value="${c}" ${item?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Supplier</label>
            <select class="form-control" id="mat-supplier">
              <option value="">Select supplier</option>
              ${suppliers.map(s => `<option value="${s.company}" ${item?.supplier === s.company ? 'selected' : ''}>${s.company}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Warehouse Location</label>
            <input type="text" class="form-control" id="mat-warehouse" value="${item?.warehouse || ''}" placeholder="e.g. Warehouse A - Rack 1">
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
            <label class="form-label">Reorder Level *</label>
            <input type="number" class="form-control" id="mat-reorder" value="${item?.reorderLevel || ''}" min="0" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Purchase Date</label>
            <input type="date" class="form-control" id="mat-date" value="${item?.purchaseDate || Utils.today()}">
          </div>
          <div class="form-group">
            <label class="form-label">Total Value</label>
            <input type="text" class="form-control" id="mat-total" readonly value="${item ? Utils.formatCurrency(item.costPerUnit * item.quantity) : '₹0.00'}" style="background:var(--bg-badge)">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea class="form-control" id="mat-notes" rows="2" placeholder="Additional notes...">${item?.notes || ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Image</label>
          <div class="image-upload" id="mat-image-upload">
            ${item?.image ? `<img src="${item.image}" alt="Material">` : '<span>📷 Click to upload image</span>'}
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
    document.getElementById('mat-quantity')?.addEventListener('input', calcTotal);
    document.getElementById('mat-cost')?.addEventListener('input', calcTotal);

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

  saveForm(modal, isEdit) {
    const name = document.getElementById('mat-name').value.trim();
    const category = document.getElementById('mat-category').value;
    const supplier = document.getElementById('mat-supplier').value;
    const quantity = parseInt(document.getElementById('mat-quantity').value);
    const unit = document.getElementById('mat-unit').value;
    const costPerUnit = parseFloat(document.getElementById('mat-cost').value);
    const reorderLevel = parseInt(document.getElementById('mat-reorder').value);
    const warehouse = document.getElementById('mat-warehouse').value.trim();
    const purchaseDate = document.getElementById('mat-date').value;
    const notes = document.getElementById('mat-notes').value.trim();
    const imageUpload = document.getElementById('mat-image-upload');
    const image = imageUpload?.dataset.image || (isEdit ? Store.getById('inventory', this.state.editingId)?.image : null);

    // Validate
    if (!name) return Components.toast('error', 'Validation Error', 'Material name is required');
    if (!category) return Components.toast('error', 'Validation Error', 'Category is required');
    if (isNaN(quantity) || quantity < 0) return Components.toast('error', 'Validation Error', 'Valid quantity is required');
    if (isNaN(costPerUnit) || costPerUnit < 0) return Components.toast('error', 'Validation Error', 'Valid cost is required');
    if (isNaN(reorderLevel) || reorderLevel < 0) return Components.toast('error', 'Validation Error', 'Reorder level is required');

    const data = { name, category, supplier, quantity, unit, costPerUnit, reorderLevel, warehouse, purchaseDate, notes, image };

    if (isEdit) {
      Store.update('inventory', this.state.editingId, data);
      Components.toast('success', 'Material Updated', `${name} has been updated successfully.`);
    } else {
      data.id = Utils.generateId('MAT');
      data.createdAt = new Date().toISOString();
      Store.add('inventory', data);
      Components.toast('success', 'Material Added', `${name} has been added to inventory.`);
    }

    modal.close();
    this.renderStats();
    this.renderTable();
  },

  confirmDelete(id) {
    const item = Store.getById('inventory', id);
    if (!item) return;
    Components.confirm({
      title: 'Delete Material',
      message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: () => {
        Store.delete('inventory', id);
        Components.toast('success', 'Deleted', `${item.name} has been removed.`);
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
