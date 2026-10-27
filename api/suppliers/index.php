<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Suppliers API Endpoint
   Method: GET
   Returns: JSON list of all active suppliers from MySQL database
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
    $stmt = $pdo->query('SELECT id, supplier_code, name, company, phone, email, gst, address, materials, status, created_at FROM suppliers ORDER BY id ASC');
    $suppliers = $stmt->fetchAll();

    // Format for frontend compatibility
    $data = array_map(function($s) {
        return [
            'id'             => $s['supplier_code'],
            'db_id'          => (int)$s['id'],
            'supplier_code'  => $s['supplier_code'],
            'name'           => $s['name'],
            'company'        => $s['company'],
            'phone'          => $s['phone'],
            'email'          => $s['email'],
            'gst'            => $s['gst'],
            'address'        => $s['address'],
            'materials'      => $s['materials'],
            'status'         => $s['status']
        ];
    }, $suppliers);

    echo json_encode([
        'success' => true,
        'count'   => count($data),
        'data'    => $data
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to retrieve suppliers from database',
        'error'   => $e->getMessage()
    ]);
}
