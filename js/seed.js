/* ==========================================================================
   SMATREE SOLAR INVENTORY — Seed Generator (Legacy Stub)
   Database-first architecture: All data is loaded directly from MySQL API.
   LocalStorage persistence is permanently disabled.
   ========================================================================== */

const SeedData = {
  generate() {
    // Disabled: Data is loaded live from MySQL database, never stored in localStorage.
  },
  seedUsers() {},
  seedSuppliers() {},
  seedInventory() {},
  seedProduction() {},
  seedFinishedGoods() {},
  seedInstallations() {},
  seedSales() {},
  seedActivity() {}
};

window.SeedData = SeedData;
