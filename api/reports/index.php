<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Reports Data Generator API
   Method: GET
   Params: type (inventory|production|installations|sales), from, to
   Returns: Formatted report rows and summary KPIs from MySQL
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

$type = isset($_GET['type']) ? strtolower(trim($_GET['type'])) : 'inventory';
$from = isset($_GET['from']) ? trim($_GET['from']) : '2025-01-01';
$to   = isset($_GET['to']) ? trim($_GET['to']) : date('Y-m-d');

try {
    $rows = [];
    $summary = [];

    switch ($type) {
        case 'production':
            $stmt = $pdo->prepare('
                SELECT 
                    batch_code AS id, panel_type, watt_capacity, quantity,
                    team_assigned, start_date, completion_date, status, progress, production_cost
                FROM production_batches
                WHERE start_date BETWEEN :from AND :to
                ORDER BY start_date DESC
            ');
            $stmt->execute([':from' => $from, ':to' => $to]);
            $rows = $stmt->fetchAll();

            $sumStmt = $pdo->prepare('
                SELECT 
                    COUNT(*) AS count,
                    COALESCE(SUM(quantity), 0) AS total_qty,
                    COALESCE(SUM(production_cost), 0) AS total_cost
                FROM production_batches
                WHERE start_date BETWEEN :from AND :to
            ');
            $sumStmt->execute([':from' => $from, ':to' => $to]);
            $summary = $sumStmt->fetch();
            break;

        case 'installations':
            $stmt = $pdo->prepare('
                SELECT 
                    installation_code AS id, customer_name, phone, address,
                    panel_type, quantity_installed, total_capacity, installation_date,
                    team_assigned, status
                FROM installations
                WHERE installation_date BETWEEN :from AND :to
                ORDER BY installation_date DESC
            ');
            $stmt->execute([':from' => $from, ':to' => $to]);
            $rows = $stmt->fetchAll();

            $sumStmt = $pdo->prepare('
                SELECT 
                    COUNT(*) AS count,
                    COALESCE(SUM(quantity_installed), 0) AS total_panels,
                    COALESCE(SUM(total_capacity), 0) AS total_capacity
                FROM installations
                WHERE installation_date BETWEEN :from AND :to
            ');
            $sumStmt->execute([':from' => $from, ':to' => $to]);
            $summary = $sumStmt->fetch();
            break;

        case 'sales':
            $stmt = $pdo->prepare('
                SELECT 
                    sale_code AS id, product_code, product_name, customer_name,
                    quantity, unit_price, total_amount, sale_date, status
                FROM sales
                WHERE sale_date BETWEEN :from AND :to
                ORDER BY sale_date DESC
            ');
            $stmt->execute([':from' => $from, ':to' => $to]);
            $rows = $stmt->fetchAll();

            $sumStmt = $pdo->prepare('
                SELECT 
                    COUNT(*) AS count,
                    COALESCE(SUM(quantity), 0) AS total_qty,
                    COALESCE(SUM(total_amount), 0) AS total_revenue
                FROM sales
                WHERE sale_date BETWEEN :from AND :to
            ');
            $sumStmt->execute([':from' => $from, ':to' => $to]);
            $summary = $sumStmt->fetch();
            break;

        case 'inventory':
        default:
            $stmt = $pdo->prepare('
                SELECT 
                    material_code AS id, category, supplier_name AS supplier,
                    quantity, unit, cost_per_unit, total_value, warehouse_location AS warehouse,
                    purchase_date, status
                FROM purchased_raw_materials
                WHERE purchase_date BETWEEN :from AND :to
                ORDER BY purchase_date DESC
            ');
            $stmt->execute([':from' => $from, ':to' => $to]);
            $rows = $stmt->fetchAll();

            $sumStmt = $pdo->prepare('
                SELECT 
                    COUNT(*) AS count,
                    COALESCE(SUM(quantity), 0) AS total_qty,
                    COALESCE(SUM(total_value), 0) AS total_value
                FROM purchased_raw_materials
                WHERE purchase_date BETWEEN :from AND :to
            ');
            $sumStmt->execute([':from' => $from, ':to' => $to]);
            $summary = $sumStmt->fetch();
            break;
    }

    echo json_encode([
        'success' => true,
        'type'    => $type,
        'from'    => $from,
        'to'      => $to,
        'count'   => count($rows),
        'summary' => $summary,
        'data'    => $rows
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to generate report from database.',
        'error'   => $e->getMessage()
    ]);
}
