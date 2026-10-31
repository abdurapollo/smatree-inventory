/* ==========================================================================
   SMATREE SOLAR INVENTORY — In-Memory Data Store Runtime Layer
   Database-first architecture: All data is loaded directly from MySQL API.
   LocalStorage persistence is permanently disabled for all business entities.
   ========================================================================== */

class DataStore {
  constructor() {
    this.prefix = 'smatree_';
    this.keys = {
      users: 'smatree_users',
      session: 'smatree_session',
      inventory: 'smatree_inventory',
      production: 'smatree_production',
      finishedGoods: 'smatree_finished_goods',
      installations: 'smatree_installations',
      suppliers: 'smatree_suppliers',
      sales: 'smatree_sales',
      activity: 'smatree_activity',
      settings: 'smatree_settings',
    };

    // In-memory data collections (loaded live from MySQL database; NEVER stored in localStorage)
    this._memory = {
      smatree_inventory: [],
      smatree_production: [],
      smatree_finished_goods: [],
      smatree_installations: [],
      smatree_suppliers: [],
      smatree_sales: [],
      smatree_activity: [],
      smatree_users: [],
      smatree_session: null,
    };

    // Purge any stale business data from localStorage on load
    this._purgeLocalStorageData();
  }

  /* ── Purge any legacy business records from localStorage ── */
  _purgeLocalStorageData() {
    try {
      const dataKeys = [
        'smatree_users',
        'smatree_inventory',
        'smatree_production',
        'smatree_finished_goods',
        'smatree_installations',
        'smatree_suppliers',
        'smatree_sales',
        'smatree_activity',
        'smatree_notifications'
      ];
      dataKeys.forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
      });
    } catch (_) {}
  }

  /* ── Core In-Memory Access (Zero LocalStorage for business data) ── */

  _get(key) {
    // Only non-sensitive UI theme preferences may use localStorage
    if (key === this.keys.settings) {
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        return null;
      }
    }

    // Active session stored in sessionStorage or in-memory (never in localStorage)
    if (key === this.keys.session) {
      try {
        const data = sessionStorage.getItem(key) || this._memory[key];
        return typeof data === 'string' ? JSON.parse(data) : (data || null);
      } catch (e) {
        return this._memory[key] || null;
      }
    }

    // All business data is strictly read from in-memory cache
    return this._memory[key] || [];
  }

  _set(key, data) {
    // Only UI theme preferences are written to localStorage
    if (key === this.keys.settings) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {}
      return true;
    }

    // Session profile stored in sessionStorage (cleared when browser tab closes)
    if (key === this.keys.session) {
      const safeData = data ? { ...data } : null;
      if (safeData) delete safeData.password;
      this._memory[key] = safeData;
      try {
        if (safeData) {
          sessionStorage.setItem(key, JSON.stringify(safeData));
        } else {
          sessionStorage.removeItem(key);
        }
      } catch (e) {}
      return true;
    }

    // Business entities: stored ONLY in memory, NEVER in localStorage
    this._memory[key] = Array.isArray(data) ? data : (data || []);

    if (key === this.keys.inventory && typeof window !== 'undefined' && window.Components?.updateNavBadges) {
      window.Components.updateNavBadges();
    }
    if (typeof window !== 'undefined' && window.Notifications?.scanAll && key !== 'smatree_notifications') {
      window.Notifications.scanAll();
    }
    return true;
  }

  getAll(entity) {
    const key = this.keys[entity] || entity;
    return this._get(key) || [];
  }

  getById(entity, id) {
    const items = this.getAll(entity);
    return items.find(item => (item.id === id || item.db_id === id || item.material_code === id || item.supplier_code === id || item.product_code === id || item.batch_code === id || item.installation_code === id || item.sale_code === id)) || null;
  }

  add(entity, item) {
    const key = this.keys[entity] || entity;
    const items = this.getAll(entity);
    items.push(item);
    this._set(key, items);
    return item;
  }

  update(entity, id, updates) {
    const key = this.keys[entity] || entity;
    const items = this.getAll(entity);
    const index = items.findIndex(item => (item.id === id || item.db_id === id || item.material_code === id || item.supplier_code === id || item.product_code === id || item.batch_code === id || item.installation_code === id || item.sale_code === id));
    if (index === -1) return null;
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    this._set(key, items);
    return items[index];
  }

  delete(entity, id) {
    const key = this.keys[entity] || entity;
    const items = this.getAll(entity);
    const filtered = items.filter(item => !(item.id === id || item.db_id === id || item.material_code === id || item.supplier_code === id || item.product_code === id || item.batch_code === id || item.installation_code === id || item.sale_code === id));
    if (filtered.length === items.length) return false;
    this._set(key, filtered);
    return true;
  }

  /* ── Activity Log (In-Memory for UI) ── */

  logActivity(action, entity, entityId, description) {
    const activities = this._memory[this.keys.activity] || [];
    activities.unshift({
      id: Utils.generateId('ACT'),
      action,
      entity,
      entityId,
      description,
      user: this.getCurrentUser()?.name || 'System',
      timestamp: new Date().toISOString(),
    });
    if (activities.length > 200) activities.length = 200;
    this._memory[this.keys.activity] = activities;
  }

  getActivities(limit = 20) {
    const activities = this._memory[this.keys.activity] || [];
    return activities.slice(0, limit);
  }

  /* ── Session Management (SessionStorage / In-Memory only) ── */

  setSession(user) {
    const safeUser = { ...user };
    delete safeUser.password;
    this._set(this.keys.session, {
      ...safeUser,
      loginTime: new Date().toISOString(),
    });
  }

  getSession() {
    return this._get(this.keys.session);
  }

  getCurrentUser() {
    return this.getSession();
  }

  clearSession() {
    this._memory[this.keys.session] = null;
    try {
      sessionStorage.removeItem(this.keys.session);
      localStorage.removeItem(this.keys.session);
    } catch (_) {}
  }

  isAuthenticated() {
    return !!this.getSession();
  }

  /* ── UI Settings (Theme only) ── */

  getSettings() {
    return this._get(this.keys.settings) || { theme: 'light', sidebarCollapsed: false };
  }

  updateSettings(updates) {
    const settings = this.getSettings();
    this._set(this.keys.settings, { ...settings, ...updates });
  }

  /* ── Aggregate Queries (Computed from in-memory collections) ── */

  getInventoryStats() {
    const inventory = this.getAll('inventory');
    const totalMaterials = inventory.length;
    const lowStockCount = inventory.filter(m => {
      const r = m.reorderLevel !== undefined && m.reorderLevel !== null 
        ? m.reorderLevel 
        : (m.reorder_level !== undefined && m.reorder_level !== null ? m.reorder_level : 50);
      const status = Utils.getStockStatus(m.quantity, r);
      return status.level === 'low' || status.level === 'critical';
    }).length;
    const totalValue = inventory.reduce((sum, m) => {
      const cost = parseFloat(m.costPerUnit || m.cost_per_unit || 0) || 0;
      const qty = parseFloat(m.quantity || 0) || 0;
      return sum + (cost * qty);
    }, 0);
    return { totalMaterials, lowStockCount, totalValue };
  }

  getProductionStats() {
    const production = this.getAll('production');
    const totalBatches = production.length;
    const completed = production.filter(p => p.status === 'Completed').length;
    const inProgress = production.filter(p => p.status === 'In Production').length;
    const totalPanels = production.filter(p => p.status === 'Completed')
      .reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);
    const monthlyProduction = production.filter(p => {
      const d = new Date(p.completionDate);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && p.status === 'Completed';
    }).reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);
    return { totalBatches, completed, inProgress, totalPanels, monthlyProduction };
  }

  getFinishedGoodsStats() {
    const goods = this.getAll('finishedGoods');
    const totalProducts = goods.length;
    const readyToSell = goods.reduce((sum, g) => sum + (parseInt(g.readyToSell) || 0), 0);
    const totalQuantity = goods.reduce((sum, g) => sum + (parseInt(g.quantity) || 0), 0);
    return { totalProducts, readyToSell, totalQuantity };
  }

  getInstallationStats() {
    const installations = this.getAll('installations');
    const totalInstallations = installations.length;
    const totalCapacity = installations.reduce((sum, i) => sum + (parseFloat(i.totalCapacity) || 0), 0);
    const activeProjects = installations.filter(i => i.status === 'In Progress').length;
    const totalPanelsInstalled = installations.reduce((sum, i) => sum + (parseInt(i.quantityInstalled) || 0), 0);
    return { totalInstallations, totalCapacity, activeProjects, totalPanelsInstalled };
  }

  /* ── Full Backup / Restore (Operates on memory) ── */

  exportAllData() {
    const data = {};
    Object.entries(this.keys).forEach(([entity, key]) => {
      data[entity] = this._get(key);
    });
    data.exportDate = new Date().toISOString();
    return data;
  }

  importData(data) {
    Object.entries(this.keys).forEach(([entity, key]) => {
      if (data[entity]) this._set(key, data[entity]);
    });
  }

  clearAllData() {
    Object.keys(this._memory).forEach(key => {
      this._memory[key] = [];
    });
    this._purgeLocalStorageData();
  }

  /* ── Check if first load: Database handles all persistence ── */
  isFirstLoad() {
    return false;
  }
}

// Singleton
const Store = new DataStore();
window.Store = Store;
