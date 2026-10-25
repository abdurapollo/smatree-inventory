/* ==========================================================================
   SMATREE SOLAR INVENTORY — API Configuration
   Backend endpoint configuration for future PHP + MySQL integration
   ========================================================================== */

const ApiConfig = {
  // Toggle between localStorage and backend API
  useBackend: true,

  // Base URL for the PHP backend
  baseUrl: (function() {
    if (typeof window !== 'undefined' && window.location) {
      const pathname = window.location.pathname;
      const appIdx = pathname.indexOf('/smatree-inventory');
      if (appIdx !== -1) {
        return pathname.substring(0, appIdx + '/smatree-inventory'.length) + '/api';
      }
    }
    return '/smatree-inventory/api';
  })(),

  // API endpoints mapping
  endpoints: {
    // Auth
    login:       '/auth/login.php',
    logout:      '/auth/logout.php',
    session:     '/auth/session.php',

    // Inventory
    inventory:     '/inventory/index.php',
    inventoryById: '/inventory/show.php',
    inventoryAdd:  '/inventory/create.php',
    inventoryEdit: '/inventory/update.php',
    inventoryDel:  '/inventory/delete.php',

    // Production
    production:     '/production/index.php',
    productionAdd:  '/production/create.php',
    productionEdit: '/production/update.php',
    productionDel:  '/production/delete.php',

    // Finished Goods
    finishedGoods:    '/finished-goods/index.php',
    finishedGoodsAdd: '/finished-goods/create.php',

    // Installations
    installations:     '/installations/index.php',
    installationsAdd:  '/installations/create.php',
    installationsEdit: '/installations/update.php',
    installationsDel:  '/installations/delete.php',

    // Suppliers
    suppliers:     '/suppliers/index.php',
    suppliersAdd:  '/suppliers/create.php',
    suppliersEdit: '/suppliers/update.php',
    suppliersDel:  '/suppliers/delete.php',

    // Sales
    sales:     '/sales/index.php',
    salesAdd:  '/sales/create.php',

    // Reports
    reports:       '/reports/index.php',
    reportsExport: '/reports/export.php',

    // Dashboard
    dashboardStats: '/dashboard/stats.php',
    activities:     '/dashboard/activities.php',
  },

  // Get full URL for an endpoint
  getUrl(endpoint) {
    return this.baseUrl + (this.endpoints[endpoint] || endpoint);
  },

  // Database config (for PHP backend reference)
  database: {
    host: 'localhost',
    name: 'smatree_inventory',
    user: 'root',
    password: '',
    charset: 'utf8mb4',
  }
};

window.ApiConfig = ApiConfig;
