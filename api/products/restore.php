<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Restore / Enable Soft Deleted Product API
   Method: POST
   Restores a soft-deleted solar panel product by setting is_deleted=0,
   deleted_at=NULL, and recalculating its active stock status.
   ========================================================================== */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.']);
    exit;
}

require_once __DIR__ . '/../db.php';

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);
if (!is_array($data)) {
    $data = $_POST;
}

$idKey = isset($data['id']) ? trim((string)$data['id']) : (isset($data['product_code']) ? trim((string)$data['product_code']) : (isset($data['db_id']) ? trim((string)$data['db_id']) : ''));

if (empty($idKey)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Product identifier (id or product_code) is required to restore/enable.'
    ]);
    exit;
}

try {
    // 1. Locate product
    $stmtFind = $pdo->prepare('SELECT id, product_code, name, ready_to_sell, is_deleted FROM products WHERE id = :id OR product_code = :code LIMIT 1');
    $stmtFind->execute([
        ':id'   => is_numeric($idKey) ? (int)$idKey : 0,
        ':code' => $idKey
    ]);
    $product = $stmtFind->fetch(PDO::FETCH_ASSOC);

    if (!$product) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => "Solar panel product with identifier '{$idKey}' was not found."
        ]);
        exit;
    }

    if ((int)$product['is_deleted'] === 0) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => "Product '{$product['name']}' ({$product['product_code']}) is already active and enabled.",
            'data'    => [
                'id'           => $product['product_code'],
                'db_id'        => (int)$product['id'],
                'is_deleted'   => 0,
                'isDeleted'    => false
            ]
        ]);
        exit;
    }

    // 2. Perform Restore / Enable
    $newStatus = (int)$product['ready_to_sell'] > 0 ? 'in_stock' : 'out_of_stock';
    $stmtRestore = $pdo->prepare('
        UPDATE products 
        SET is_deleted = 0, 
            deleted_at = NULL, 
            status = :status 
        WHERE id = :id
    ');
    $stmtRestore->execute([
        ':status' => $newStatus,
        ':id'     => (int)$product['id']
    ]);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => "Product '{$product['name']}' ({$product['product_code']}) has been successfully restored and re-enabled.",
        'data'    => [
            'id'           => $product['product_code'],
            'db_id'        => (int)$product['id'],
            'name'         => $product['name'],
            'status'       => $newStatus,
            'is_deleted'   => 0,
            'isDeleted'    => false
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to restore product in database.',
        'error'   => $e->getMessage()
    ]);
}
