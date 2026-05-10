/* ==========================================================================
   SMATREE SOLAR INVENTORY — Seed Data Generator
   Realistic demo data for first load
   ========================================================================== */

const SeedData = {
  generate() {
    if (!Store.isFirstLoad()) return;
    console.log('🌱 Seeding demo data...');
    this.seedUsers();
    this.seedSuppliers();
    this.seedInventory();
    this.seedProduction();
    this.seedFinishedGoods();
    this.seedInstallations();
    this.seedSales();
    this.seedActivity();
    console.log('✅ Demo data seeded successfully');
  },

  seedUsers() {
    const users = [
      { id: 'USR-001', name: 'Rajesh Kumar', email: 'admin@smatree.com', password: 'admin123', role: 'Admin', avatar: null, createdAt: '2025-01-15T10:00:00Z' },
      { id: 'USR-002', name: 'Priya Sharma', email: 'inventory@smatree.com', password: 'inv123', role: 'Inventory Manager', avatar: null, createdAt: '2025-02-01T10:00:00Z' },
      { id: 'USR-003', name: 'Amit Patel', email: 'production@smatree.com', password: 'prod123', role: 'Production Manager', avatar: null, createdAt: '2025-02-15T10:00:00Z' },
      { id: 'USR-004', name: 'Sneha Reddy', email: 'sales@smatree.com', password: 'sales123', role: 'Sales Manager', avatar: null, createdAt: '2025-03-01T10:00:00Z' },
    ];
    Store._set(Store.keys.users, users);
  },

  seedSuppliers() {
    const suppliers = [
      { id: 'SUP-001', name: 'Vikram Singh', company: 'SolarTech Industries', phone: '+91 98765 43210', email: 'vikram@solartech.in', gst: '27AADCS1234F1ZP', address: 'Plot 45, MIDC Bhosari, Pune, Maharashtra', materials: 'Solar Cells, EVA Sheet', createdAt: '2025-01-20T10:00:00Z' },
      { id: 'SUP-002', name: 'Arun Mehta', company: 'GlassCraft Ltd', phone: '+91 87654 32109', email: 'arun@glasscraft.in', gst: '24AADCG5678K1ZQ', address: '12 Industrial Area, Vadodara, Gujarat', materials: 'Glass, Backsheet', createdAt: '2025-01-25T10:00:00Z' },
      { id: 'SUP-003', name: 'Deepak Joshi', company: 'FrameWorks Aluminium', phone: '+91 76543 21098', email: 'deepak@frameworks.in', gst: '29AADCF9012L1ZR', address: '78 Peenya Industrial, Bangalore, Karnataka', materials: 'Aluminum Frame, Mounting Structure', createdAt: '2025-02-05T10:00:00Z' },
      { id: 'SUP-004', name: 'Meera Nair', company: 'PowerBox Electronics', phone: '+91 65432 10987', email: 'meera@powerbox.in', gst: '32AADCP3456M1ZS', address: '34 Technopark, Trivandrum, Kerala', materials: 'Junction Box, Inverter, Copper Wire', createdAt: '2025-02-10T10:00:00Z' },
      { id: 'SUP-005', name: 'Suresh Gupta', company: 'BatteryKing Pvt Ltd', phone: '+91 54321 09876', email: 'suresh@batteryking.in', gst: '07AADCB7890N1ZT', address: '56 Okhla Industrial, New Delhi', materials: 'Battery', createdAt: '2025-03-01T10:00:00Z' },
    ];
    Store._set(Store.keys.suppliers, suppliers);
  },

  seedInventory() {
    const inventory = [
      { id: 'MAT-001', name: 'Monocrystalline Solar Cell 6x6', category: 'Solar Cells', supplier: 'SolarTech Industries', quantity: 5000, unit: 'Pieces', costPerUnit: 85, reorderLevel: 1000, warehouse: 'Warehouse A - Rack 1', purchaseDate: '2026-04-15', notes: 'Grade A cells, 22% efficiency', image: null, createdAt: '2026-04-15T10:00:00Z' },
      { id: 'MAT-002', name: 'Polycrystalline Solar Cell 6x6', category: 'Solar Cells', supplier: 'SolarTech Industries', quantity: 3200, unit: 'Pieces', costPerUnit: 65, reorderLevel: 800, warehouse: 'Warehouse A - Rack 2', purchaseDate: '2026-04-18', notes: 'Grade B cells, 18% efficiency', image: null, createdAt: '2026-04-18T10:00:00Z' },
      { id: 'MAT-003', name: 'Tempered Solar Glass 3.2mm', category: 'Glass', supplier: 'GlassCraft Ltd', quantity: 1200, unit: 'Sheets', costPerUnit: 450, reorderLevel: 300, warehouse: 'Warehouse B - Section 1', purchaseDate: '2026-04-20', notes: 'Anti-reflective coating, 4mm thickness', image: null, createdAt: '2026-04-20T10:00:00Z' },
      { id: 'MAT-004', name: 'Aluminum Frame Profile 40x35mm', category: 'Aluminum Frame', supplier: 'FrameWorks Aluminium', quantity: 800, unit: 'Sets', costPerUnit: 620, reorderLevel: 200, warehouse: 'Warehouse C - Bay 1', purchaseDate: '2026-04-22', notes: 'Anodized silver, pre-drilled holes', image: null, createdAt: '2026-04-22T10:00:00Z' },
      { id: 'MAT-005', name: 'EVA Encapsulant Film 0.5mm', category: 'EVA Sheet', supplier: 'SolarTech Industries', quantity: 2500, unit: 'Rolls', costPerUnit: 180, reorderLevel: 500, warehouse: 'Warehouse A - Rack 3', purchaseDate: '2026-04-25', notes: 'Fast cure formula, UV resistant', image: null, createdAt: '2026-04-25T10:00:00Z' },
      { id: 'MAT-006', name: 'TPT Backsheet White', category: 'Backsheet', supplier: 'GlassCraft Ltd', quantity: 1500, unit: 'Rolls', costPerUnit: 220, reorderLevel: 400, warehouse: 'Warehouse B - Section 2', purchaseDate: '2026-04-28', notes: 'Tedlar-PET-Tedlar composite', image: null, createdAt: '2026-04-28T10:00:00Z' },
      { id: 'MAT-007', name: 'IP67 Junction Box 3-Diode', category: 'Junction Box', supplier: 'PowerBox Electronics', quantity: 150, unit: 'Pieces', costPerUnit: 95, reorderLevel: 300, warehouse: 'Warehouse D - Shelf 1', purchaseDate: '2026-05-01', notes: 'With bypass diodes, MC4 compatible', image: null, createdAt: '2026-05-01T10:00:00Z' },
      { id: 'MAT-008', name: 'Tinned Copper Ribbon 1.5x0.2mm', category: 'Copper Wire', supplier: 'PowerBox Electronics', quantity: 3000, unit: 'Meters', costPerUnit: 12, reorderLevel: 1000, warehouse: 'Warehouse D - Shelf 2', purchaseDate: '2026-05-02', notes: 'For cell interconnection', image: null, createdAt: '2026-05-02T10:00:00Z' },
      { id: 'MAT-009', name: 'Grid-Tie Inverter 5kW', category: 'Inverter', supplier: 'PowerBox Electronics', quantity: 45, unit: 'Units', costPerUnit: 28000, reorderLevel: 15, warehouse: 'Warehouse E - Zone 1', purchaseDate: '2026-05-03', notes: 'MPPT tracking, WiFi monitoring', image: null, createdAt: '2026-05-03T10:00:00Z' },
      { id: 'MAT-010', name: 'Lithium Battery 5kWh', category: 'Battery', supplier: 'BatteryKing Pvt Ltd', quantity: 30, unit: 'Units', costPerUnit: 85000, reorderLevel: 10, warehouse: 'Warehouse E - Zone 2', purchaseDate: '2026-05-05', notes: 'LiFePO4, 10-year warranty', image: null, createdAt: '2026-05-05T10:00:00Z' },
      { id: 'MAT-011', name: 'Rooftop Mounting Rails 4.2m', category: 'Mounting Structure', supplier: 'FrameWorks Aluminium', quantity: 320, unit: 'Sets', costPerUnit: 1200, reorderLevel: 80, warehouse: 'Warehouse C - Bay 2', purchaseDate: '2026-05-06', notes: 'Galvanized steel, wind load rated', image: null, createdAt: '2026-05-06T10:00:00Z' },
      { id: 'MAT-012', name: 'Hybrid Inverter 10kW', category: 'Inverter', supplier: 'PowerBox Electronics', quantity: 8, unit: 'Units', costPerUnit: 55000, reorderLevel: 10, warehouse: 'Warehouse E - Zone 1', purchaseDate: '2026-05-07', notes: 'On/off grid capability', image: null, createdAt: '2026-05-07T10:00:00Z' },
    ];
    Store._set(Store.keys.inventory, inventory);
  },

  seedProduction() {
    const production = [
      { id: 'BATCH-001', panelType: 'Mono PERC 400W', wattCapacity: 400, quantity: 200, startDate: '2026-04-01', completionDate: '2026-04-15', teamAssigned: 'Team Alpha', materialsUsed: 'Monocrystalline Cells, Glass, Aluminum Frame, EVA, Backsheet, Junction Box', productionCost: 1250000, status: 'Completed', progress: 100, createdAt: '2026-04-01T10:00:00Z' },
      { id: 'BATCH-002', panelType: 'Poly 330W', wattCapacity: 330, quantity: 300, startDate: '2026-04-10', completionDate: '2026-04-28', teamAssigned: 'Team Beta', materialsUsed: 'Polycrystalline Cells, Glass, Aluminum Frame, EVA, Backsheet, Junction Box', productionCost: 1425000, status: 'Completed', progress: 100, createdAt: '2026-04-10T10:00:00Z' },
      { id: 'BATCH-003', panelType: 'Mono PERC 540W', wattCapacity: 540, quantity: 150, startDate: '2026-04-20', completionDate: '2026-05-08', teamAssigned: 'Team Alpha', materialsUsed: 'Monocrystalline Cells, Glass, Aluminum Frame, EVA, Backsheet, Junction Box', productionCost: 1687500, status: 'Completed', progress: 100, createdAt: '2026-04-20T10:00:00Z' },
      { id: 'BATCH-004', panelType: 'Bifacial 450W', wattCapacity: 450, quantity: 100, startDate: '2026-05-01', completionDate: null, teamAssigned: 'Team Gamma', materialsUsed: 'Monocrystalline Cells, Glass (double), Aluminum Frame, EVA, Junction Box', productionCost: 875000, status: 'In Production', progress: 65, createdAt: '2026-05-01T10:00:00Z' },
      { id: 'BATCH-005', panelType: 'Mono PERC 400W', wattCapacity: 400, quantity: 250, startDate: '2026-05-05', completionDate: null, teamAssigned: 'Team Beta', materialsUsed: 'Monocrystalline Cells, Glass, Aluminum Frame, EVA, Backsheet, Junction Box', productionCost: 0, status: 'Pending', progress: 0, createdAt: '2026-05-05T10:00:00Z' },
      { id: 'BATCH-006', panelType: 'HJT 500W', wattCapacity: 500, quantity: 80, startDate: '2026-05-08', completionDate: null, teamAssigned: 'Team Alpha', materialsUsed: 'HJT Cells, Glass, Aluminum Frame, EVA, Backsheet, Junction Box', productionCost: 560000, status: 'Quality Check', progress: 90, createdAt: '2026-05-08T10:00:00Z' },
    ];
    Store._set(Store.keys.production, production);
  },

  seedFinishedGoods() {
    const goods = [
      { id: 'FG-001', name: 'SunMax Mono PERC 400W', wattCapacity: 400, quantity: 180, readyToSell: 150, productionDate: '2026-04-15', warranty: '25 years', image: null, batchId: 'BATCH-001', createdAt: '2026-04-15T10:00:00Z' },
      { id: 'FG-002', name: 'SunMax Poly 330W', wattCapacity: 330, quantity: 280, readyToSell: 260, productionDate: '2026-04-28', warranty: '20 years', image: null, batchId: 'BATCH-002', createdAt: '2026-04-28T10:00:00Z' },
      { id: 'FG-003', name: 'SunMax Mono PERC 540W', wattCapacity: 540, quantity: 140, readyToSell: 140, productionDate: '2026-05-08', warranty: '25 years', image: null, batchId: 'BATCH-003', createdAt: '2026-05-08T10:00:00Z' },
    ];
    Store._set(Store.keys.finishedGoods, goods);
  },

  seedInstallations() {
    const installations = [
      { id: 'INST-001', customerName: 'Mahesh Industries', phone: '+91 99887 76655', address: '123 Industrial Area, Pune', installationDate: '2026-04-20', panelType: 'Mono PERC 400W', quantityInstalled: 50, installationTeam: 'Install Team A', inverterUsed: 'Grid-Tie 5kW x2', batteryUsed: 'Lithium 5kWh x2', totalCapacity: 20, warranty: '25 years panels, 10 years inverter', notes: 'Rooftop installation, flat roof', photos: null, status: 'Completed', createdAt: '2026-04-20T10:00:00Z' },
      { id: 'INST-002', customerName: 'Green Valley School', phone: '+91 88776 65544', address: '456 Education Lane, Mumbai', installationDate: '2026-05-01', panelType: 'Poly 330W', quantityInstalled: 80, installationTeam: 'Install Team B', inverterUsed: 'Grid-Tie 5kW x5', batteryUsed: 'Lithium 5kWh x4', totalCapacity: 26.4, warranty: '20 years panels, 10 years inverter', notes: 'Building rooftop, tilted structure', photos: null, status: 'Completed', createdAt: '2026-05-01T10:00:00Z' },
      { id: 'INST-003', customerName: 'Sunrise Hospital', phone: '+91 77665 54433', address: '789 Health Street, Bangalore', installationDate: '2026-05-10', panelType: 'Mono PERC 540W', quantityInstalled: 40, installationTeam: 'Install Team A', inverterUsed: 'Hybrid 10kW x2', batteryUsed: 'Lithium 5kWh x4', totalCapacity: 21.6, warranty: '25 years panels, 10 years inverter', notes: 'Requires backup power, critical facility', photos: null, status: 'In Progress', createdAt: '2026-05-10T10:00:00Z' },
    ];
    Store._set(Store.keys.installations, installations);
  },

  seedSales() {
    const sales = [
      { id: 'SALE-001', productId: 'FG-001', productName: 'SunMax Mono PERC 400W', quantity: 30, status: 'Sold', customerName: 'Mahesh Industries', saleDate: '2026-04-18', createdAt: '2026-04-18T10:00:00Z' },
      { id: 'SALE-002', productId: 'FG-002', productName: 'SunMax Poly 330W', quantity: 20, status: 'Reserved', customerName: 'Green Valley School', saleDate: '2026-04-25', createdAt: '2026-04-25T10:00:00Z' },
      { id: 'SALE-003', productId: 'FG-002', productName: 'SunMax Poly 330W', quantity: 80, status: 'Sold', customerName: 'Green Valley School', saleDate: '2026-04-30', createdAt: '2026-04-30T10:00:00Z' },
      { id: 'SALE-004', productId: 'FG-003', productName: 'SunMax Mono PERC 540W', quantity: 40, status: 'Reserved', customerName: 'Sunrise Hospital', saleDate: '2026-05-05', createdAt: '2026-05-05T10:00:00Z' },
    ];
    Store._set(Store.keys.sales, sales);
  },

  seedActivity() {
    const activities = [
      { id: 'ACT-001', action: 'create', entity: 'production', entityId: 'BATCH-006', description: 'New production batch BATCH-006 (HJT 500W) created', user: 'Amit Patel', timestamp: '2026-05-08T14:30:00Z' },
      { id: 'ACT-002', action: 'update', entity: 'production', entityId: 'BATCH-004', description: 'Batch BATCH-004 progress updated to 65%', user: 'Amit Patel', timestamp: '2026-05-08T12:00:00Z' },
      { id: 'ACT-003', action: 'create', entity: 'installations', entityId: 'INST-003', description: 'New installation for Sunrise Hospital started', user: 'Sneha Reddy', timestamp: '2026-05-07T09:00:00Z' },
      { id: 'ACT-004', action: 'update', entity: 'inventory', entityId: 'MAT-007', description: 'Junction Box stock running low (150 units)', user: 'Priya Sharma', timestamp: '2026-05-06T16:00:00Z' },
      { id: 'ACT-005', action: 'create', entity: 'production', entityId: 'BATCH-005', description: 'New production batch BATCH-005 (400W) created', user: 'Amit Patel', timestamp: '2026-05-05T10:00:00Z' },
      { id: 'ACT-006', action: 'update', entity: 'production', entityId: 'BATCH-003', description: 'Batch BATCH-003 completed — 150 panels added to inventory', user: 'Amit Patel', timestamp: '2026-05-04T17:00:00Z' },
      { id: 'ACT-007', action: 'create', entity: 'sales', entityId: 'SALE-004', description: 'Reserved 40 units of Mono PERC 540W for Sunrise Hospital', user: 'Sneha Reddy', timestamp: '2026-05-05T11:00:00Z' },
      { id: 'ACT-008', action: 'update', entity: 'inventory', entityId: 'MAT-012', description: 'Hybrid Inverter 10kW stock updated — low stock alert', user: 'Priya Sharma', timestamp: '2026-05-04T14:00:00Z' },
    ];
    Store._set(Store.keys.activity, activities);
  }
};

window.SeedData = SeedData;
