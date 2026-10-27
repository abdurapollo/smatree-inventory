<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Products (Solar Panels) API Endpoint
   Method: GET
   Supports query parameters:
     - filter: 'active' (default, is_deleted=0), 'archived' (is_deleted=1), 'all'
     - search: search query on name, code, cell_type, model_number
   Returns: JSON list of solar panels catalog with live stock counts and stats
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

$filter = isset($_GET['filter']) ? trim((string)$_GET['filter']) : 'active';
$search = isset($_GET['search']) ? trim((string)$_GET['search']) : '';

try {
    // 1. Calculate overall stats across active and archived
    $statsStmt = $pdo->query('
        SELECT 
            COUNT(CASE WHEN is_deleted = 0 THEN 1 END) AS total_active,
            COUNT(CASE WHEN is_deleted = 1 THEN 1 END) AS total_archived,
            COALESCE(SUM(CASE WHEN is_deleted = 0 THEN total_produced ELSE 0 END), 0) AS total_produced,
            COALESCE(SUM(CASE WHEN is_deleted = 0 THEN ready_to_sell ELSE 0 END), 0) AS ready_to_sell,
            COALESCE(SUM(CASE WHEN is_deleted = 0 THEN reserved_quantity ELSE 0 END), 0) AS reserved_quantity,
            COALESCE(SUM(CASE WHEN is_deleted = 0 THEN sold_quantity ELSE 0 END), 0) AS sold_quantity
        FROM products
    ');
    $summary = $statsStmt->fetch(PDO::FETCH_ASSOC);

    // 2. Build Query based on filter
    $sql = '
        SELECT 
            id, product_code, name, model_number, cell_type, watt_capacity, efficiency, 
            dimensions, weight_kg, price_per_unit, total_produced, ready_to_sell, 
            reserved_quantity, sold_quantity, warranty_years, status, is_deleted, deleted_at,
            image, notes, created_at, updated_at
        FROM products
        WHERE 1=1
    ';

    $params = [];

    if ($filter === 'active') {
        $sql .= ' AND is_deleted = 0';
    } elseif ($filter === 'archived' || $filter === 'deleted') {
        $sql .= ' AND is_deleted = 1';
    }
    // if $filter === 'all', no is_deleted constraint is added

    if (!empty($search)) {
        $sql .= ' AND (name LIKE :s1 OR product_code LIKE :s2 OR model_number LIKE :s3 OR cell_type LIKE :s4)';
        $searchParam = '%' . $search . '%';
        $params[':s1'] = $searchParam;
        $params[':s2'] = $searchParam;
        $params[':s3'] = $searchParam;
        $params[':s4'] = $searchParam;
    }

    $sql .= ' ORDER BY is_deleted ASC, id ASC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $data = array_map(function($p) {
        return [
            'id'               => $p['product_code'],
            'db_id'            => (int)$p['id'],
            'product_code'     => $p['product_code'],
            'name'             => $p['name'],
            'modelNumber'      => $p['model_number'],
            'cellType'         => $p['cell_type'],
            'wattCapacity'     => (int)$p['watt_capacity'],
            'efficiency'       => (float)$p['efficiency'],
            'dimensions'       => $p['dimensions'],
            'weightKg'         => (float)$p['weight_kg'],
            'pricePerUnit'     => (float)$p['price_per_unit'],
            'totalProduced'    => (int)$p['total_produced'],
            'quantity'         => (int)$p['total_produced'],
            'readyToSell'      => (int)$p['ready_to_sell'],
            'reservedQuantity' => (int)$p['reserved_quantity'],
            'soldQuantity'     => (int)$p['sold_quantity'],
            'warranty'         => $p['warranty_years'] ?: '25 Years',
            'status'           => $p['status'],
            'is_deleted'       => (int)$p['is_deleted'],
            'isDeleted'        => (int)$p['is_deleted'] === 1,
            'deletedAt'        => $p['deleted_at'],
            'image'            => $p['image'],
            'notes'            => $p['notes'],
            'createdAt'        => $p['created_at'],
            'updatedAt'        => $p['updated_at']
        ];
    }, $products);

    echo json_encode([
        'success' => true,
        'filter'  => $filter,
        'count'   => count($data),
        'stats'   => [
            'totalActive'      => (int)$summary['total_active'],
            'totalArchived'    => (int)$summary['total_archived'],
            'totalProduced'    => (int)$summary['total_produced'],
            'totalQuantity'    => (int)$summary['total_produced'],
            'readyToSell'      => (int)$summary['ready_to_sell'],
            'reservedQuantity' => (int)$summary['reserved_quantity'],
            'soldQuantity'     => (int)$summary['sold_quantity']
        ],
        'data'    => $data
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to retrieve products from database.',
        'error'   => $e->getMessage()
    ]);
}
