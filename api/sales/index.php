<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Sales Records API Endpoint
   Method: GET
   Returns: JSON list of all sales records and live stock summary from MySQL
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
    // 1. Fetch all sales records ordered by latest sale_date / ID
    $stmt = $pdo->query('
        SELECT 
            s.id, s.sale_code, s.product_id, s.product_code, s.product_name,
            s.customer_name, s.customer_phone, s.customer_email, s.customer_address,
            s.quantity, s.unit_price, s.total_amount, s.sale_date, s.status, s.notes, s.created_at,
            p.ready_to_sell AS product_ready_stock
        FROM sales s
        LEFT JOIN products p ON s.product_id = p.id
        ORDER BY s.id DESC
    ');
    $sales = $stmt->fetchAll();

    $data = array_map(function($s) {
        return [
            'id'              => $s['sale_code'],
            'db_id'           => (int)$s['id'],
            'sale_code'       => $s['sale_code'],
            'productId'       => $s['product_code'],
            'productDbId'     => (int)$s['product_id'],
            'productName'     => $s['product_name'],
            'customerName'    => $s['customer_name'],
            'customerPhone'   => $s['customer_phone'],
            'customerEmail'   => $s['customer_email'],
            'customerAddress' => $s['customer_address'],
            'quantity'        => (int)$s['quantity'],
            'unitPrice'       => (float)$s['unit_price'],
            'totalAmount'     => (float)$s['total_amount'],
            'saleDate'        => $s['sale_date'],
            'status'          => $s['status'],
            'notes'           => $s['notes'],
            'createdAt'       => $s['created_at']
        ];
    }, $sales);

    // 2. Compute dynamic stats from products & sales tables
    $prodStatsStmt = $pdo->query('
        SELECT 
            COALESCE(SUM(ready_to_sell), 0) AS total_ready_to_sell,
            COALESCE(SUM(total_produced), 0) AS total_panels,
            COUNT(*) AS total_products
        FROM products
        WHERE is_deleted = 0
    ');
    $prodStats = $prodStatsStmt->fetch();

    $salesStatsStmt = $pdo->query('
        SELECT 
            COALESCE(SUM(CASE WHEN status = "Reserved" THEN quantity ELSE 0 END), 0) AS reserved_units,
            COALESCE(SUM(CASE WHEN status = "Sold" THEN quantity ELSE 0 END), 0) AS sold_units,
            COALESCE(SUM(CASE WHEN status = "Sold" THEN total_amount ELSE 0 END), 0) AS total_revenue
        FROM sales
    ');
    $salesStats = $salesStatsStmt->fetch();

    echo json_encode([
        'success' => true,
        'count'   => count($data),
        'stats'   => [
            'readyToSell'   => (int)$prodStats['total_ready_to_sell'],
            'reservedUnits' => (int)$salesStats['reserved_units'],
            'soldUnits'     => (int)$salesStats['sold_units'],
            'totalRevenue'  => (float)$salesStats['total_revenue'],
            'totalProducts' => (int)$prodStats['total_products']
        ],
        'data'    => $data
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to retrieve sales records from database.',
        'error'   => $e->getMessage()
    ]);
}
