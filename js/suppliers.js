/* ==========================================================================
   SMATREE SOLAR INVENTORY — Suppliers Module
   Industry-standard validation, XSS protection, and MySQL Backend Integration
   ========================================================================== */
const Suppliers = {
  state: { searchQuery: '' },

  async init() {
    if (!App.initPage('suppliers', 'Suppliers', [
      { label: 'Home', href: 'dashboard.html' }, { label: 'Suppliers' }
    ])) return;

    await this.loadData();
    this.renderStats();
    this.renderToolbar();
    this.renderCards();
    this.setupEvents();
  },

  /**
   * Fetch suppliers from MySQL backend (with fallback to Store)
   */
  async loadData() {
    if (ApiConfig && ApiConfig.useBackend) {
      try {
        const resp = await fetch('../api/suppliers/index.php');
        const json = await resp.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          Store._set(Store.keys.suppliers, json.data);
        }
      } catch (err) {
        console.warn('Backend suppliers fetch failed, using local store:', err);
      }
    }
  },

  renderStats() {
    const container = document.getElementById('suppliers-stats');
    if (!container) return;
    const items = Store.getAll('suppliers');
    const totalSuppliers = items.length;
    const gstCount = items.filter(s => s.gst && s.gst.trim()).length;
    const allMaterials = items.flatMap(s => (s.materials || '').split(',').map(m => m.trim()).filter(Boolean));
    const uniqueMats = new Set(allMaterials).size;

    container.innerHTML = `
      <div class="stat-card animate-fadeInUp delay-1" style="--card-accent:var(--color-primary-500)">
        <div class="stat-card-header">
          <div class="stat-icon blue">${Icons.suppliers(22)}</div>
          <span class="stat-trend up">Verified</span>
        </div>
        <div class="stat-value">${totalSuppliers}</div>
        <div class="stat-label">Active Suppliers</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-2" style="--card-accent:var(--color-emerald-500)">
        <div class="stat-card-header">
          <div class="stat-icon green">${Icons.check(22)}</div>
          <span class="stat-trend up">Compliant</span>
        </div>
        <div class="stat-value">${gstCount}</div>
        <div class="stat-label">GST Registered</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-3" style="--card-accent:var(--color-solar-500)">
        <div class="stat-card-header">
          <div class="stat-icon amber">${Icons.package(22)}</div>
          <span class="stat-trend up">Categories</span>
        </div>
        <div class="stat-value">${uniqueMats}</div>
        <div class="stat-label">Material Types</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-4" style="--card-accent:var(--color-purple-500)">
        <div class="stat-card-header">
          <div class="stat-icon purple">${Icons.building(22)}</div>
          <span class="stat-trend up">Network</span>
        </div>
        <div class="stat-value">${totalSuppliers > 0 ? '100%' : '0%'}</div>
        <div class="stat-label">Supply Chain Coverage</div>
      </div>
    `;
  },

  renderToolbar() {
    const container = document.getElementById('suppliers-toolbar');
    if (!container) return;
    container.innerHTML = `
      <div class="search-box" style="flex:1;max-width:320px"><span class="search-icon">${Icons.search(16)}</span>
        <input type="text" id="sup-search" placeholder="Search suppliers..."></div>
      <div class="toolbar-actions">
        <button class="btn btn-primary btn-sm" id="sup-add-btn">${Icons.plus(15)} <span>Add Supplier</span></button>
      </div>`;
  },

  renderCards() {
    const container = document.getElementById('suppliers-grid');
    if (!container) return;
    let items = Store.getAll('suppliers');
    if (this.state.searchQuery) {
      items = Utils.searchFilter(items, this.state.searchQuery, ['name', 'company', 'materials', 'email', 'phone', 'gst']);
    }

    if (!items.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon" style="color:var(--color-primary-500);margin-bottom:var(--space-3)">${Icons.suppliers(44)}</div>
        <div class="empty-state-title">No Suppliers Found</div>
        <div class="empty-state-text">Add suppliers with verified details to manage your supply chain.</div></div>`;
      return;
    }

    container.innerHTML = `<div class="grid-cols-3">${items.map((s, i) => `
      <div class="card animate-fadeInUp delay-${(i % 4) + 1}" style="display:flex;flex-direction:column;height:100%">
        <div class="d-flex justify-between align-center mb-4">
          <div class="d-flex align-center gap-3" style="min-width:0">
            <div style="width:44px;height:44px;border-radius:var(--radius-lg);background:linear-gradient(135deg,var(--color-primary-400),var(--color-purple-500));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:var(--fs-md);flex-shrink:0;line-height:1">${Utils.getInitials(s.company || s.name)}</div>
            <div style="min-width:0">
              <div class="fw-semibold text-primary text-truncate" title="${Utils.escapeHtml(s.company || '')}">${Utils.escapeHtml(s.company || '—')}</div>
              <div class="fs-xs text-muted text-truncate" title="${Utils.escapeHtml(s.name || '')}">${Utils.escapeHtml(s.name || '—')}</div>
            </div>
          </div>
          <div class="actions" style="flex-shrink:0">
            <button class="btn btn-ghost btn-sm btn-icon" data-edit-sup="${s.id}" title="Edit Supplier">${Icons.edit(15)}</button>
            <button class="btn btn-ghost btn-sm btn-icon text-danger" data-delete-sup="${s.id}" title="Delete Supplier">${Icons.trash(15)}</button>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2);font-size:var(--fs-sm);color:var(--text-secondary);flex:1">
          <div class="d-flex align-center gap-2">${Icons.phone(14)} <span>${Utils.escapeHtml(s.phone || '—')}</span></div>
          <div class="d-flex align-center gap-2">${Icons.mail(14)} <span class="text-truncate">${Utils.escapeHtml(s.email || '—')}</span></div>
          <div class="d-flex align-center gap-2">${Icons.mapPin(14)} <span class="text-truncate" style="max-width:240px" title="${Utils.escapeHtml(s.address || '')}">${Utils.escapeHtml(s.address || '—')}</span></div>
          ${s.gst ? `<div class="d-flex align-center gap-2">${Icons.building(14)} <span class="text-truncate"><strong>GST:</strong> ${Utils.escapeHtml(s.gst)}</span></div>` : ''}
        </div>
        <div style="margin-top:auto;padding-top:var(--space-3);border-top:1px solid var(--border-light)">
          <div class="fs-xs text-muted mb-1">Materials Supplied</div>
          <div class="d-flex flex-wrap gap-1">${(s.materials || '').split(',').filter(m => m.trim()).map(m => `<span class="badge badge-primary" style="font-size:10px">${Utils.escapeHtml(m.trim())}</span>`).join('') || '<span class="text-muted fs-xs">None specified</span>'}</div>
        </div>
      </div>`).join('')}</div>`;
  },

  setupEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#sup-add-btn')) {
        if (typeof RBAC !== 'undefined' && !RBAC.hasPermission('suppliers.create')) {
          Components.toast('warning', 'Access Restricted', 'Your role cannot add suppliers.');
          return;
        }
        this.showForm();
      }
      if (e.target.closest('[data-edit-sup]')) {
        if (typeof RBAC !== 'undefined' && !RBAC.hasPermission('suppliers.edit')) {
          Components.toast('warning', 'Access Restricted', 'Your role cannot edit supplier records.');
          return;
        }
        const id = e.target.closest('[data-edit-sup]').dataset.editSup;
        this.showForm(id);
      }
      if (e.target.closest('[data-delete-sup]')) {
        if (typeof RBAC !== 'undefined' && !RBAC.hasPermission('suppliers.delete')) {
          Components.toast('warning', 'Access Restricted', 'Your role cannot delete suppliers.');
          return;
        }
        const id = e.target.closest('[data-delete-sup]').dataset.deleteSup;
        const supplier = Store.getById('suppliers', id);
        const name = supplier ? supplier.company : 'this supplier';
        
        Components.confirm({
          title: 'Delete Supplier',
          message: `Are you sure you want to delete "${Utils.escapeHtml(name)}"? This action cannot be undone.`,
          type: 'danger',
          confirmText: 'Delete',
          onConfirm: async () => {
            try {
              if (ApiConfig && ApiConfig.useBackend) {
                const resp = await fetch('../api/suppliers/delete.php', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                  body: JSON.stringify({ id })
                });
                const result = await resp.json();
                if (!resp.ok || !result.success) {
                  throw new Error(result.message || 'Failed to delete from database');
                }
              }
              Store.delete('suppliers', id);
              Components.toast('success', 'Deleted', `Supplier ${name} was removed.`);
              this.renderStats();
              this.renderCards();
            } catch (err) {
              console.error('Delete supplier error:', err);
              Components.toast('error', 'Error', err.message || 'Failed to delete supplier.');
            }
          }
        });
      }
    });

    document.addEventListener('input', Utils.debounce((e) => {
      if (e.target.id === 'sup-search') {
        this.state.searchQuery = e.target.value;
        this.renderCards();
      }
    }, 250));
  },

  /**
   * Modal with Industry-Standard Real-Time & Submit-Time Form Validation
   */
  showForm(editId = null) {
    const item = editId ? Store.getById('suppliers', editId) : null;
    const isEdit = !!item;
    const initialAddressLen = (item?.address || '').length;

    const content = `
      <form id="sup-form" novalidate autocomplete="off">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="sup-name">Contact Name <span class="text-danger">*</span></label>
            <input type="text" class="form-control" id="sup-name" name="name" 
              value="${Utils.escapeHtml(item?.name || '')}" 
              placeholder="e.g. Vikram Singh" 
              maxlength="100" 
              autocomplete="name" 
              required>
          </div>
          <div class="form-group">
            <label class="form-label" for="sup-company">Company Name <span class="text-danger">*</span></label>
            <input type="text" class="form-control" id="sup-company" name="company" 
              value="${Utils.escapeHtml(item?.company || '')}" 
              placeholder="e.g. SolarTech Industries" 
              maxlength="150" 
              autocomplete="organization" 
              required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="sup-phone">Phone <span class="text-danger">*</span></label>
            <input type="tel" class="form-control" id="sup-phone" name="phone" 
              value="${Utils.escapeHtml(item?.phone || '')}" 
              placeholder="e.g. +91 98765 43210" 
              maxlength="25" 
              autocomplete="tel" 
              required>
          </div>
          <div class="form-group">
            <label class="form-label" for="sup-email">Email <span class="text-danger">*</span></label>
            <input type="email" class="form-control" id="sup-email" name="email" 
              value="${Utils.escapeHtml(item?.email || '')}" 
              placeholder="e.g. contact@solartech.in" 
              maxlength="150" 
              autocomplete="email" 
              required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="sup-gst">GST Number</label>
            <input type="text" class="form-control" id="sup-gst" name="gst" 
              value="${Utils.escapeHtml(item?.gst || '')}" 
              placeholder="15-character GSTIN (e.g. 27AADCS1234F1ZP)" 
              maxlength="15" 
              style="text-transform:uppercase">
            <div class="form-text">Optional. Indian GSTIN: 2-digit state code + 10-char PAN + 3-char code.</div>
          </div>
          <div class="form-group">
            <label class="form-label" for="sup-materials">Materials Supplied</label>
            <input type="text" class="form-control" id="sup-materials" name="materials" 
              value="${Utils.escapeHtml(item?.materials || '')}" 
              placeholder="Comma-separated" 
              maxlength="500">
            <div class="form-text">Optional. e.g. Solar Cells, EVA Sheet, Glass</div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="sup-address">Address</label>
          <textarea class="form-control" id="sup-address" name="address" rows="2" maxlength="500" 
            placeholder="e.g. Plot 45, MIDC Bhosari, Pune, Maharashtra">${Utils.escapeHtml(item?.address || '')}</textarea>
          <div class="d-flex justify-between align-center mt-1">
            <div class="form-text">Optional physical or registered billing address.</div>
            <span class="char-counter" id="sup-address-count">${initialAddressLen}/500</span>
          </div>
        </div>
      </form>`;

    const modal = Components.showModal({
      id: 'sup-modal',
      title: isEdit ? 'Edit Supplier' : 'Add Supplier',
      content,
      footer: `
        <button type="button" class="btn btn-secondary" data-close-modal id="sup-cancel-btn">Cancel</button>
        <button type="button" class="btn btn-primary" id="sup-save">${isEdit ? 'Update' : 'Save'}</button>
      `
    });

    // Form elements references
    const form = document.getElementById('sup-form');
    const nameInput = document.getElementById('sup-name');
    const companyInput = document.getElementById('sup-company');
    const phoneInput = document.getElementById('sup-phone');
    const emailInput = document.getElementById('sup-email');
    const gstInput = document.getElementById('sup-gst');
    const materialsInput = document.getElementById('sup-materials');
    const addressInput = document.getElementById('sup-address');
    const addressCounter = document.getElementById('sup-address-count');
    const saveBtn = document.getElementById('sup-save');

    // ── Real-Time Validation & Input Formatting Listeners ──

    // 1. Contact Name Live Validation
    nameInput?.addEventListener('blur', () => {
      const err = Validator.validateName(nameInput.value, 'Contact Name');
      if (err) Validator.setError(nameInput, err);
      else Validator.setValid(nameInput);
    });
    nameInput?.addEventListener('input', () => {
      if (nameInput.classList.contains('is-invalid')) {
        const err = Validator.validateName(nameInput.value, 'Contact Name');
        if (!err) Validator.setValid(nameInput);
      }
    });

    // 2. Company Name Live Validation
    companyInput?.addEventListener('blur', () => {
      const err = Validator.validateCompany(companyInput.value, 'Company Name');
      if (err) Validator.setError(companyInput, err);
      else Validator.setValid(companyInput);
    });
    companyInput?.addEventListener('input', () => {
      if (companyInput.classList.contains('is-invalid')) {
        const err = Validator.validateCompany(companyInput.value, 'Company Name');
        if (!err) Validator.setValid(companyInput);
      }
    });

    // 3. Phone Live Validation
    phoneInput?.addEventListener('blur', () => {
      const err = Validator.validatePhone(phoneInput.value, 'Phone Number');
      if (err) Validator.setError(phoneInput, err);
      else Validator.setValid(phoneInput);
    });
    phoneInput?.addEventListener('input', () => {
      if (phoneInput.classList.contains('is-invalid')) {
        const err = Validator.validatePhone(phoneInput.value, 'Phone Number');
        if (!err) Validator.setValid(phoneInput);
      }
    });

    // 4. Email Live Validation
    emailInput?.addEventListener('blur', () => {
      const err = Validator.validateEmail(emailInput.value, 'Email');
      if (err) Validator.setError(emailInput, err);
      else Validator.setValid(emailInput);
    });
    emailInput?.addEventListener('input', () => {
      if (emailInput.classList.contains('is-invalid')) {
        const err = Validator.validateEmail(emailInput.value, 'Email');
        if (!err) Validator.setValid(emailInput);
      }
    });

    // 5. GST Live Uppercase Conversion & Validation
    gstInput?.addEventListener('input', (e) => {
      // Enforce uppercase and alphanumeric in real-time
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      e.target.value = e.target.value.toUpperCase();
      if (typeof e.target.setSelectionRange === 'function') {
        e.target.setSelectionRange(start, end);
      }
      if (gstInput.classList.contains('is-invalid')) {
        const err = Validator.validateGSTIN(gstInput.value, 'GST Number');
        if (!err) {
          if (gstInput.value.trim() === '') Validator.clearField(gstInput);
          else Validator.setValid(gstInput);
        }
      }
    });
    gstInput?.addEventListener('blur', () => {
      const val = gstInput.value.trim();
      if (!val) {
        Validator.clearField(gstInput);
        return;
      }
      const err = Validator.validateGSTIN(val, 'GST Number');
      if (err) Validator.setError(gstInput, err);
      else Validator.setValid(gstInput);
    });

    // 6. Materials Supplied
    materialsInput?.addEventListener('blur', () => {
      const val = materialsInput.value.trim();
      if (!val) {
        Validator.clearField(materialsInput);
        return;
      }
      const err = Validator.validateText(val, { max: 500, fieldName: 'Materials' });
      if (err) Validator.setError(materialsInput, err);
      else Validator.setValid(materialsInput);
    });

    // 7. Address Live Counter & Validation
    addressInput?.addEventListener('input', () => {
      const len = addressInput.value.length;
      if (addressCounter) {
        addressCounter.textContent = `${len}/500`;
        addressCounter.className = 'char-counter' + (len >= 500 ? ' at-limit' : len >= 450 ? ' near-limit' : '');
      }
      if (addressInput.classList.contains('is-invalid')) {
        const err = Validator.validateText(addressInput.value, { min: 5, max: 500, fieldName: 'Address' });
        if (!err) {
          if (addressInput.value.trim() === '') Validator.clearField(addressInput);
          else Validator.setValid(addressInput);
        }
      }
    });
    addressInput?.addEventListener('blur', () => {
      const val = addressInput.value.trim();
      if (!val) {
        Validator.clearField(addressInput);
        return;
      }
      const err = Validator.validateText(val, { min: 5, max: 500, fieldName: 'Address' });
      if (err) Validator.setError(addressInput, err);
      else Validator.setValid(addressInput);
    });

    // Prevent default form submit on Enter
    form?.addEventListener('submit', (e) => e.preventDefault());

    // ── Form Submission Handler ──
    saveBtn?.addEventListener('click', async () => {
      // Gather inputs
      const rawName = nameInput.value;
      const rawCompany = companyInput.value;
      const rawPhone = phoneInput.value;
      const rawEmail = emailInput.value;
      const rawGst = gstInput.value;
      const rawMaterials = materialsInput.value;
      const rawAddress = addressInput.value;

      // Complete synchronous validation pass across all fields
      let hasError = false;
      let firstInvalidInput = null;

      // Contact Name
      const nameErr = Validator.validateName(rawName, 'Contact Name');
      if (nameErr) {
        Validator.setError(nameInput, nameErr);
        hasError = true;
        if (!firstInvalidInput) firstInvalidInput = nameInput;
      } else {
        Validator.setValid(nameInput);
      }

      // Company Name
      const compErr = Validator.validateCompany(rawCompany, 'Company Name');
      if (compErr) {
        Validator.setError(companyInput, compErr);
        hasError = true;
        if (!firstInvalidInput) firstInvalidInput = companyInput;
      } else {
        Validator.setValid(companyInput);
      }

      // Phone
      const phoneErr = Validator.validatePhone(rawPhone, 'Phone');
      if (phoneErr) {
        Validator.setError(phoneInput, phoneErr);
        hasError = true;
        if (!firstInvalidInput) firstInvalidInput = phoneInput;
      } else {
        Validator.setValid(phoneInput);
      }

      // Email
      const emailErr = Validator.validateEmail(rawEmail, 'Email');
      if (emailErr) {
        Validator.setError(emailInput, emailErr);
        hasError = true;
        if (!firstInvalidInput) firstInvalidInput = emailInput;
      } else {
        Validator.setValid(emailInput);
      }

      // GST (optional)
      if (rawGst.trim()) {
        const gstErr = Validator.validateGSTIN(rawGst, 'GST Number');
        if (gstErr) {
          Validator.setError(gstInput, gstErr);
          hasError = true;
          if (!firstInvalidInput) firstInvalidInput = gstInput;
        } else {
          Validator.setValid(gstInput);
        }
      } else {
        Validator.clearField(gstInput);
      }

      // Materials (optional)
      if (rawMaterials.trim()) {
        const matErr = Validator.validateText(rawMaterials, { max: 500, fieldName: 'Materials' });
        if (matErr) {
          Validator.setError(materialsInput, matErr);
          hasError = true;
          if (!firstInvalidInput) firstInvalidInput = materialsInput;
        } else {
          Validator.setValid(materialsInput);
        }
      } else {
        Validator.clearField(materialsInput);
      }

      // Address (optional)
      if (rawAddress.trim()) {
        const addrErr = Validator.validateText(rawAddress, { min: 5, max: 500, fieldName: 'Address' });
        if (addrErr) {
          Validator.setError(addressInput, addrErr);
          hasError = true;
          if (!firstInvalidInput) firstInvalidInput = addressInput;
        } else {
          Validator.setValid(addressInput);
        }
      } else {
        Validator.clearField(addressInput);
      }

      // If any field is invalid, prevent submission and focus the first invalid field
      if (hasError) {
        if (firstInvalidInput) {
          firstInvalidInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstInvalidInput.focus();
        }
        Components.toast('error', 'Validation Error', 'Please correct the highlighted form errors before saving.');
        return;
      }

      // Sanitize payload data for XSS safety
      const payload = {
        id: isEdit ? editId : undefined,
        name: Utils.sanitize(rawName),
        company: Utils.sanitize(rawCompany),
        phone: Utils.sanitize(rawPhone),
        email: Utils.sanitize(rawEmail).toLowerCase(),
        gst: rawGst.trim() ? Utils.sanitize(rawGst).toUpperCase() : '',
        materials: rawMaterials.trim() ? Utils.sanitize(rawMaterials) : '',
        address: rawAddress.trim() ? Utils.sanitize(rawAddress) : ''
      };

      // Disable button to prevent double-click / duplicate submissions
      saveBtn.disabled = true;
      const originalText = saveBtn.textContent;
      saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> ${isEdit ? 'Updating...' : 'Saving...'}`;

      try {
        if (ApiConfig && ApiConfig.useBackend) {
          const endpoint = isEdit ? '../api/suppliers/update.php' : '../api/suppliers/create.php';
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
          });
          const result = await resp.json();

          if (!resp.ok || !result.success) {
            // Check if server returned field-specific validation errors
            if (result.errors && typeof result.errors === 'object') {
              const fieldMap = {
                name: nameInput,
                company: companyInput,
                phone: phoneInput,
                email: emailInput,
                gst: gstInput,
                materials: materialsInput,
                address: addressInput
              };
              let firstServerInput = null;
              Object.entries(result.errors).forEach(([fieldKey, errorMsg]) => {
                const targetEl = fieldMap[fieldKey];
                if (targetEl) {
                  Validator.setError(targetEl, errorMsg);
                  if (!firstServerInput) firstServerInput = targetEl;
                }
              });
              if (firstServerInput) firstServerInput.focus();
            }
            throw new Error(result.message || 'Server rejected the supplier data.');
          }

          // Successfully processed by MySQL backend
          const savedData = result.data || payload;
          if (isEdit) {
            Store.update('suppliers', editId, savedData);
          } else {
            Store.add('suppliers', savedData);
          }

          Components.toast('success', isEdit ? 'Supplier Updated' : 'Supplier Added', `${savedData.company} was saved to the database.`);
          if (typeof Notifications !== 'undefined') {
            Notifications.notify({
              title: isEdit ? `Supplier Updated: ${savedData.company}` : `New Supplier Added: ${savedData.company}`,
              message: `Materials supplied: ${savedData.materials || 'Solar Raw Materials'}. Contact: ${savedData.phone}.`,
              category: 'supplier',
              severity: 'info',
              link: 'suppliers.html',
              actionLabel: 'View Suppliers'
            }, false);
          }
          modal.close();
          this.renderStats();
          this.renderCards();
          return;
        }

        // Offline / LocalStorage Fallback
        if (isEdit) {
          Store.update('suppliers', editId, payload);
        } else {
          payload.id = Utils.generateId('SUP');
          payload.createdAt = new Date().toISOString();
          Store.add('suppliers', payload);
        }

        Components.toast('success', isEdit ? 'Updated' : 'Added', `${payload.company} saved.`);
        modal.close();
        this.renderStats();
        this.renderCards();

      } catch (err) {
        console.error('Supplier save error:', err);
        Components.toast('error', 'Error', err.message || 'An error occurred while saving the supplier.');
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
      }
    });
  }
};

window.Suppliers = Suppliers;
