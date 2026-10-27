<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Soft Delete Product API Endpoint
   Method: POST, DELETE
   Soft deletes a solar panel product by setting is_deleted=1, deleted_at=NOW(),
   and status='discontinued'. The record is preserved in the database and can
   be re-enabled / restored in the future.
   ========================================================================== */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'DELETE'])) {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST or DELETE.']);
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
        'message' => 'Product identifier (id or product_code) is required for soft delete.'
    ]);
    exit;
}

try {
    // 1. Locate existing product
    $stmtFind = $pdo->prepare('SELECT id, product_code, name, is_deleted FROM products WHERE id = :id OR product_code = :code LIMIT 1');
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

    $permanent = !empty($data['permanent']) || (isset($_GET['permanent']) && $_GET['permanent'] == '1');

    if ($permanent) {
        $stmtDel = $pdo->prepare('DELETE FROM products WHERE id = :id');
        $stmtDel->execute([':id' => (int)$product['id']]);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => "Product '{$product['name']}' ({$product['product_code']}) has been permanently deleted from database.",
            'data'    => [
                'id'           => $product['product_code'],
                'db_id'        => (int)$product['id'],
                'name'         => $product['name'],
                'permanent'    => true
            ]
        ]);
        exit;
    }

    if ((int)$product['is_deleted'] === 1) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => "Product '{$product['name']}' ({$product['product_code']}) is already soft deleted / archived.",
            'data'    => [
                'id'           => $product['product_code'],
                'db_id'        => (int)$product['id'],
                'is_deleted'   => 1,
                'isDeleted'    => true
            ]
        ]);
        exit;
    }

    // 2. Perform Soft Delete
    $stmtDel = $pdo->prepare('
        UPDATE products 
        SET is_deleted = 1, 
            deleted_at = NOW(), 
            status = "discontinued" 
        WHERE id = :id
    ');
    $stmtDel->execute([':id' => (int)$product['id']]);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => "Product '{$product['name']}' ({$product['product_code']}) has been soft deleted / archived. You can re-enable it at any time.",
        'data'    => [
            'id'           => $product['product_code'],
            'db_id'        => (int)$product['id'],
            'name'         => $product['name'],
            'is_deleted'   => 1,
            'isDeleted'    => true
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to soft delete product in database.',
        'error'   => $e->getMessage()
    ]);
}
