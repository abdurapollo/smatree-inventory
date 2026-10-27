/* ==========================================================================
   SMATREE SOLAR INVENTORY — Data Store
   LocalStorage CRUD abstraction layer for all entities
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
  }

  /* ── Core CRUD ── */

  _get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Store read error [${key}]:`, e);
      return null;
    }
  }

  _set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      if (key === this.keys.inventory && typeof window !== 'undefined' && window.Components?.updateNavBadges) {
        window.Components.updateNavBadges();
      }
      return true;
    } catch (e) {
      console.error(`Store write error [${key}]:`, e);
      return false;
    }
  }

  getAll(entity) {
    return this._get(this.keys[entity]) || [];
  }

  getById(entity, id) {
    const items = this.getAll(entity);
    return items.find(item => item.id === id) || null;
  }

  add(entity, item) {
    const items = this.getAll(entity);
    items.push(item);
    this._set(this.keys[entity], items);
    this.logActivity('create', entity, item.id, `Added new ${entity} record`);
    return item;
  }

  update(entity, id, updates) {
    const items = this.getAll(entity);
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    this._set(this.keys[entity], items);
    this.logActivity('update', entity, id, `Updated ${entity} record`);
    return items[index];
  }

  delete(entity, id) {
    const items = this.getAll(entity);
    const filtered = items.filter(item => item.id !== id);
    if (filtered.length === items.length) return false;
    this._set(this.keys[entity], filtered);
    this.logActivity('delete', entity, id, `Deleted ${entity} record`);
    return true;
  }

  /* ── Activity Log ── */

  logActivity(action, entity, entityId, description) {
    const activities = this._get(this.keys.activity) || [];
    activities.unshift({
      id: Utils.generateId('ACT'),
      action,
      entity,
      entityId,
      description,
      user: this.getCurrentUser()?.name || 'System',
      timestamp: new Date().toISOString(),
    });
    // Keep last 200 activities
    if (activities.length > 200) activities.length = 200;
    this._set(this.keys.activity, activities);
  }

  getActivities(limit = 20) {
    const activities = this._get(this.keys.activity) || [];
    return activities.slice(0, limit);
  }

  /* ── Session Management ── */

  setSession(user) {
    this._set(this.keys.session, {
      ...user,
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
    localStorage.removeItem(this.keys.session);
  }

  isAuthenticated() {
    return !!this.getSession();
  }

  /* ── Settings ── */

  getSettings() {
    return this._get(this.keys.settings) || { theme: 'light', sidebarCollapsed: false };
  }

  updateSettings(updates) {
    const settings = this.getSettings();
    this._set(this.keys.settings, { ...settings, ...updates });
  }

  /* ── Aggregate Queries ── */

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

  /* ── Full Backup / Restore ── */

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
    Object.values(this.keys).forEach(key => localStorage.removeItem(key));
  }

  /* ── Check if first load ── */
  isFirstLoad() {
    return !this._get(this.keys.users);
  }
}

// Singleton
const Store = new DataStore();
window.Store = Store;
