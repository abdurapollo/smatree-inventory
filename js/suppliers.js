/* ==========================================================================
   SMATREE SOLAR INVENTORY — Suppliers Module
   ========================================================================== */
const Suppliers = {
  state: { searchQuery: '' },

  init() {
    if (!App.initPage('suppliers', 'Suppliers', [
      { label: 'Home', href: 'dashboard.html' }, { label: 'Suppliers' }
    ])) return;
    this.renderToolbar();
    this.renderCards();
    this.setupEvents();
  },

  renderToolbar() {
    const container = document.getElementById('suppliers-toolbar');
    if (!container) return;
    container.innerHTML = `
      <div class="search-box" style="flex:1;max-width:320px"><span class="search-icon">🔍</span>
        <input type="text" id="sup-search" placeholder="Search suppliers..."></div>
      <button class="btn btn-primary btn-sm" id="sup-add-btn">+ Add Supplier</button>`;
  },

  renderCards() {
    const container = document.getElementById('suppliers-grid');
    if (!container) return;
    let items = Store.getAll('suppliers');
    if (this.state.searchQuery) items = Utils.searchFilter(items, this.state.searchQuery, ['name', 'company', 'materials', 'email']);

    if (!items.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🤝</div>
        <div class="empty-state-title">No Suppliers</div><div class="empty-state-text">Add suppliers to manage your supply chain.</div></div>`;
      return;
    }

    container.innerHTML = `<div class="grid-cols-3">${items.map((s, i) => `
      <div class="card animate-fadeInUp delay-${(i % 4) + 1}">
        <div class="d-flex justify-between align-center mb-4">
          <div class="d-flex align-center gap-3">
            <div style="width:44px;height:44px;border-radius:var(--radius-lg);background:linear-gradient(135deg,var(--color-primary-400),var(--color-purple-500));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:var(--fs-md)">${Utils.getInitials(s.company)}</div>
            <div>
              <div class="fw-semibold text-primary">${Utils.escapeHtml(s.company)}</div>
              <div class="fs-xs text-muted">${Utils.escapeHtml(s.name)}</div>
            </div>
          </div>
          <div class="actions">
            <button class="btn btn-ghost btn-sm btn-icon" data-edit-sup="${s.id}">✏️</button>
            <button class="btn btn-ghost btn-sm btn-icon" data-delete-sup="${s.id}">🗑️</button>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2);font-size:var(--fs-sm);color:var(--text-secondary)">
          <div class="d-flex align-center gap-2">📞 ${Utils.escapeHtml(s.phone)}</div>
          <div class="d-flex align-center gap-2">📧 ${Utils.escapeHtml(s.email)}</div>
          <div class="d-flex align-center gap-2">📍 <span class="text-truncate" style="max-width:200px">${Utils.escapeHtml(s.address)}</span></div>
          ${s.gst ? `<div class="d-flex align-center gap-2">🏢 GST: ${Utils.escapeHtml(s.gst)}</div>` : ''}
        </div>
        <div style="margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--border-light)">
          <div class="fs-xs text-muted mb-1">Materials Supplied</div>
          <div class="d-flex flex-wrap gap-1">${(s.materials || '').split(',').map(m => `<span class="badge badge-primary" style="font-size:10px">${m.trim()}</span>`).join('')}</div>
        </div>
      </div>`).join('')}</div>`;
  },

  setupEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#sup-add-btn')) this.showForm();
      if (e.target.closest('[data-edit-sup]')) this.showForm(e.target.closest('[data-edit-sup]').dataset.editSup);
      if (e.target.closest('[data-delete-sup]')) {
        const id = e.target.closest('[data-delete-sup]').dataset.deleteSup;
        Components.confirm({ title: 'Delete Supplier', message: 'Delete this supplier?', type: 'danger',
          onConfirm: () => { Store.delete('suppliers', id); Components.toast('success', 'Deleted', 'Supplier removed.'); this.renderCards(); }
        });
      }
    });
    document.addEventListener('input', Utils.debounce((e) => {
      if (e.target.id === 'sup-search') { this.state.searchQuery = e.target.value; this.renderCards(); }
    }, 250));
  },

  showForm(editId = null) {
    const item = editId ? Store.getById('suppliers', editId) : null;
    const isEdit = !!item;
    const content = `<form id="sup-form" novalidate>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Contact Name *</label>
          <input type="text" class="form-control" id="sup-name" value="${item?.name || ''}" required></div>
        <div class="form-group"><label class="form-label">Company Name *</label>
          <input type="text" class="form-control" id="sup-company" value="${item?.company || ''}" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Phone *</label>
          <input type="text" class="form-control" id="sup-phone" value="${item?.phone || ''}" required></div>
        <div class="form-group"><label class="form-label">Email *</label>
          <input type="email" class="form-control" id="sup-email" value="${item?.email || ''}" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">GST Number</label>
          <input type="text" class="form-control" id="sup-gst" value="${item?.gst || ''}"></div>
        <div class="form-group"><label class="form-label">Materials Supplied</label>
          <input type="text" class="form-control" id="sup-materials" value="${item?.materials || ''}" placeholder="Comma-separated"></div>
      </div>
      <div class="form-group"><label class="form-label">Address</label>
        <textarea class="form-control" id="sup-address" rows="2">${item?.address || ''}</textarea></div>
    </form>`;

    const modal = Components.showModal({ id: 'sup-modal', title: isEdit ? 'Edit Supplier' : 'Add Supplier', content,
      footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button><button class="btn btn-primary" id="sup-save">${isEdit ? 'Update' : 'Save'}</button>` });

    document.getElementById('sup-save')?.addEventListener('click', () => {
      const data = {
        name: document.getElementById('sup-name').value.trim(),
        company: document.getElementById('sup-company').value.trim(),
        phone: document.getElementById('sup-phone').value.trim(),
        email: document.getElementById('sup-email').value.trim(),
        gst: document.getElementById('sup-gst').value.trim(),
        materials: document.getElementById('sup-materials').value.trim(),
        address: document.getElementById('sup-address').value.trim(),
      };
      if (!data.name || !data.company || !data.phone || !data.email) return Components.toast('error', 'Error', 'Fill required fields.');
      if (isEdit) { Store.update('suppliers', editId, data); } else { data.id = Utils.generateId('SUP'); data.createdAt = new Date().toISOString(); Store.add('suppliers', data); }
      Components.toast('success', isEdit ? 'Updated' : 'Added', `${data.company} saved.`);
      modal.close(); this.renderCards();
    });
  }
};
window.Suppliers = Suppliers;
