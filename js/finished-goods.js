/* ==========================================================================
   SMATREE SOLAR INVENTORY — Finished Goods Module
   ========================================================================== */
const FinishedGoods = {
  state: { searchQuery: '', currentPage: 1, perPage: 8, editingId: null },

  init() {
    if (!App.initPage('finished-goods', 'Finished Goods', [
      { label: 'Home', href: 'dashboard.html' }, { label: 'Finished Goods' }
    ])) return;
    this.renderStats();
    this.renderToolbar();
    this.renderCards();
    this.setupEvents();
  },

  renderStats() {
    const container = document.getElementById('fg-stats');
    if (!container) return;
    const stats = Store.getFinishedGoodsStats();
    container.innerHTML = `
      <div class="stat-card animate-fadeInUp delay-1" style="--card-accent:var(--color-primary-400)">
        <div class="stat-icon blue">☀️</div><div class="stat-value">${stats.totalProducts}</div><div class="stat-label">Product Lines</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-2" style="--card-accent:var(--color-emerald-400)">
        <div class="stat-icon green">📦</div><div class="stat-value">${Utils.formatNumber(stats.totalQuantity)}</div><div class="stat-label">Total Panels</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-3" style="--card-accent:var(--color-solar-400)">
        <div class="stat-icon amber">🏷️</div><div class="stat-value">${Utils.formatNumber(stats.readyToSell)}</div><div class="stat-label">Ready to Sell</div>
      </div>`;
  },

  renderToolbar() {
    const container = document.getElementById('fg-toolbar');
    if (!container) return;
    container.innerHTML = `
      <div class="search-box" style="flex:1;max-width:320px"><span class="search-icon">🔍</span>
        <input type="text" id="fg-search" placeholder="Search products..."></div>
      <button class="btn btn-primary btn-sm" id="fg-add-btn">+ Add Product</button>`;
  },

  renderCards() {
    const container = document.getElementById('fg-grid');
    if (!container) return;
    let items = Store.getAll('finishedGoods');
    if (this.state.searchQuery) items = Utils.searchFilter(items, this.state.searchQuery, ['name', 'id', 'wattCapacity']);

    if (!items.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">☀️</div>
        <div class="empty-state-title">No Finished Goods</div><div class="empty-state-text">Add completed solar panels from production.</div></div>`;
      return;
    }
    container.innerHTML = `<div class="grid-cols-3">${items.map((p, i) => `
      <div class="card animate-fadeInUp delay-${(i % 4) + 1}">
        <div class="d-flex justify-between align-center mb-4">
          <span class="badge badge-primary">${p.id}</span>
          <div class="actions">
            <button class="btn btn-ghost btn-sm btn-icon" data-edit-fg="${p.id}">✏️</button>
            <button class="btn btn-ghost btn-sm btn-icon" data-delete-fg="${p.id}">🗑️</button>
          </div>
        </div>
        <div style="text-align:center;margin-bottom:var(--space-4)">
          <div style="font-size:3rem;margin-bottom:var(--space-2)">☀️</div>
          <h4 class="fs-md fw-semibold">${Utils.escapeHtml(p.name)}</h4>
          <p class="fs-xs text-muted">${p.wattCapacity}W Panel</p>
        </div>
        <div class="d-flex justify-between py-2" style="border-top:1px solid var(--border-light)">
          <div class="text-center"><div class="fs-lg fw-bold text-primary">${p.quantity}</div><div class="fs-xs text-muted">Total</div></div>
          <div class="text-center"><div class="fs-lg fw-bold text-success">${p.readyToSell}</div><div class="fs-xs text-muted">Ready</div></div>
          <div class="text-center"><div class="fs-xs text-muted mt-1">Warranty</div><div class="fs-xs fw-medium">${p.warranty}</div></div>
        </div>
        <div class="fs-xs text-muted mt-3">Produced: ${Utils.formatDate(p.productionDate)} • Batch: ${p.batchId || '—'}</div>
      </div>`).join('')}</div>`;
  },

  setupEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#fg-add-btn')) this.showForm();
      if (e.target.closest('[data-edit-fg]')) this.showForm(e.target.closest('[data-edit-fg]').dataset.editFg);
      if (e.target.closest('[data-delete-fg]')) {
        const id = e.target.closest('[data-delete-fg]').dataset.deleteFg;
        Components.confirm({ title: 'Delete Product', message: 'Delete this finished good?', type: 'danger',
          onConfirm: () => { Store.delete('finishedGoods', id); Components.toast('success', 'Deleted', 'Product removed.'); this.renderStats(); this.renderCards(); }
        });
      }
    });
    document.addEventListener('input', Utils.debounce((e) => {
      if (e.target.id === 'fg-search') { this.state.searchQuery = e.target.value; this.renderCards(); }
    }, 250));
  },

  showForm(editId = null) {
    const item = editId ? Store.getById('finishedGoods', editId) : null;
    const isEdit = !!item;
    const content = `<form id="fg-form" novalidate>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Panel Name *</label>
          <input type="text" class="form-control" id="fg-name" value="${item?.name || ''}" required></div>
        <div class="form-group"><label class="form-label">Watt Capacity *</label>
          <input type="number" class="form-control" id="fg-watts" value="${item?.wattCapacity || ''}" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Quantity *</label>
          <input type="number" class="form-control" id="fg-qty" value="${item?.quantity || ''}" required></div>
        <div class="form-group"><label class="form-label">Ready to Sell *</label>
          <input type="number" class="form-control" id="fg-ready" value="${item?.readyToSell || ''}" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Production Date</label>
          <input type="date" class="form-control" id="fg-date" value="${item?.productionDate || Utils.today()}"></div>
        <div class="form-group"><label class="form-label">Warranty</label>
          <input type="text" class="form-control" id="fg-warranty" value="${item?.warranty || '25 years'}"></div>
      </div>
      <div class="form-group"><label class="form-label">Batch ID</label>
        <input type="text" class="form-control" id="fg-batch" value="${item?.batchId || ''}"></div>
    </form>`;

    const modal = Components.showModal({ id: 'fg-modal', title: isEdit ? 'Edit Product' : 'Add Product', content,
      footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button><button class="btn btn-primary" id="fg-save">${isEdit ? 'Update' : 'Save'}</button>` });

    document.getElementById('fg-save')?.addEventListener('click', () => {
      const data = {
        name: document.getElementById('fg-name').value.trim(),
        wattCapacity: parseInt(document.getElementById('fg-watts').value),
        quantity: parseInt(document.getElementById('fg-qty').value),
        readyToSell: parseInt(document.getElementById('fg-ready').value),
        productionDate: document.getElementById('fg-date').value,
        warranty: document.getElementById('fg-warranty').value.trim(),
        batchId: document.getElementById('fg-batch').value.trim(),
      };
      if (!data.name || !data.wattCapacity || !data.quantity) return Components.toast('error', 'Error', 'Fill required fields.');
      if (isEdit) { Store.update('finishedGoods', editId, data); } else { data.id = Utils.generateId('FG'); data.createdAt = new Date().toISOString(); Store.add('finishedGoods', data); }
      Components.toast('success', isEdit ? 'Updated' : 'Added', `${data.name} saved.`);
      modal.close(); this.renderStats(); this.renderCards();
    });
  }
};
window.FinishedGoods = FinishedGoods;
