<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Dashboard Live Telemetry Stats API
   Method: GET
   Returns: Real-time aggregated KPIs across Inventory, Production, Products,
            Sales, and Installations directly from MySQL
   ========================================================================== */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../db.php';

try {
    // 1. Raw Materials Stats
    $matStmt = $pdo->query('
        SELECT 
            COUNT(*) AS total_materials,
            COALESCE(SUM(total_value), 0) AS total_value,
            COALESCE(SUM(CASE WHEN quantity <= reorder_level THEN 1 ELSE 0 END), 0) AS low_stock_count,
            COUNT(DISTINCT category) AS category_count
        FROM purchased_raw_materials
    ');
    $matStats = $matStmt->fetch();

    // 2. Production Stats
    $prodStmt = $pdo->query('
        SELECT 
            COUNT(*) AS total_batches,
            COALESCE(SUM(CASE WHEN status = "In Production" THEN 1 ELSE 0 END), 0) AS in_progress,
            COALESCE(SUM(CASE WHEN status = "Completed" THEN 1 ELSE 0 END), 0) AS completed,
            COALESCE(SUM(CASE WHEN status = "Quality Check" THEN 1 ELSE 0 END), 0) AS quality_check,
            COALESCE(SUM(CASE WHEN status = "Pending" THEN 1 ELSE 0 END), 0) AS pending,
            COALESCE(SUM(CASE WHEN status = "Completed" THEN quantity ELSE 0 END), 0) AS total_panels,
            COALESCE(SUM(CASE WHEN status = "Completed" AND MONTH(completion_date) = MONTH(CURRENT_DATE()) AND YEAR(completion_date) = YEAR(CURRENT_DATE()) THEN quantity ELSE 0 END), 0) AS monthly_production
        FROM production_batches
    ');
    $prodStats = $prodStmt->fetch();

    // 3. Finished Goods / Solar Products Stats
    $fgStmt = $pdo->query('
        SELECT 
            COUNT(*) AS total_products,
            COALESCE(SUM(ready_to_sell), 0) AS ready_to_sell,
            COALESCE(SUM(total_produced), 0) AS total_produced,
            COALESCE(SUM(reserved_quantity), 0) AS reserved_quantity,
            COALESCE(SUM(sold_quantity), 0) AS sold_quantity,
            COALESCE(SUM(ready_to_sell * price_per_unit), 0) AS stock_value
        FROM products
        WHERE is_deleted = 0
    ');
    $fgStats = $fgStmt->fetch();

    // 4. Installations Stats
    $instStmt = $pdo->query('
        SELECT 
            COUNT(*) AS total_installations,
            COALESCE(SUM(total_capacity), 0) AS total_capacity,
            COALESCE(SUM(CASE WHEN status = "In Progress" THEN 1 ELSE 0 END), 0) AS active_projects,
            COALESCE(SUM(CASE WHEN status = "Completed" THEN 1 ELSE 0 END), 0) AS completed_projects,
            COALESCE(SUM(quantity_installed), 0) AS total_panels_installed
        FROM installations
    ');
    $instStats = $instStmt->fetch();

    // 5. Sales Stats
    $salesStmt = $pdo->query('
        SELECT 
            COUNT(*) AS total_orders,
            COALESCE(SUM(CASE WHEN status = "Sold" THEN quantity ELSE 0 END), 0) AS sold_units,
            COALESCE(SUM(CASE WHEN status = "Reserved" THEN quantity ELSE 0 END), 0) AS reserved_units,
            COALESCE(SUM(CASE WHEN status = "Sold" THEN total_amount ELSE 0 END), 0) AS total_revenue
        FROM sales
    ');
    $salesStats = $salesStmt->fetch();

    // 6. Priority Low-Stock Alerts
    $lowStockMaterialsStmt = $pdo->query('
        SELECT id, material_code, category, quantity, unit, reorder_level, warehouse_location
        FROM purchased_raw_materials
        WHERE quantity <= reorder_level
        ORDER BY (quantity / GREATEST(reorder_level, 1)) ASC
        LIMIT 5
    ');
    $lowStockMaterials = $lowStockMaterialsStmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => [
            'inventory' => [
                'totalMaterials' => (int)$matStats['total_materials'],
                'totalValue'     => (float)$matStats['total_value'],
                'lowStockCount'  => (int)$matStats['low_stock_count'],
                'categoryCount'  => (int)$matStats['category_count']
            ],
            'production' => [
                'totalBatches'      => (int)$prodStats['total_batches'],
                'inProgress'        => (int)$prodStats['in_progress'],
                'completed'         => (int)$prodStats['completed'],
                'qualityCheck'      => (int)$prodStats['quality_check'],
                'pending'           => (int)$prodStats['pending'],
                'totalPanels'       => (int)$prodStats['total_panels'],
                'monthlyProduction' => (int)$prodStats['monthly_production']
            ],
            'finishedGoods' => [
                'totalProducts'    => (int)$fgStats['total_products'],
                'readyToSell'      => (int)$fgStats['ready_to_sell'],
                'totalProduced'    => (int)$fgStats['total_produced'],
                'reservedQuantity' => (int)$fgStats['reserved_quantity'],
                'soldQuantity'     => (int)$fgStats['sold_quantity'],
                'stockValue'       => (float)$fgStats['stock_value']
            ],
            'installations' => [
                'totalInstallations'   => (int)$instStats['total_installations'],
                'totalCapacity'        => (float)$instStats['total_capacity'],
                'activeProjects'       => (int)$instStats['active_projects'],
                'completedProjects'    => (int)$instStats['completed_projects'],
                'totalPanelsInstalled' => (int)$instStats['total_panels_installed']
            ],
            'sales' => [
                'totalOrders'   => (int)$salesStats['total_orders'],
                'soldUnits'     => (int)$salesStats['sold_units'],
                'reservedUnits' => (int)$salesStats['reserved_units'],
                'totalRevenue'  => (float)$salesStats['total_revenue']
            ],
            'lowStockAlerts' => $lowStockMaterials
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load dashboard metrics.',
        'error'   => $e->getMessage()
    ]);
}
