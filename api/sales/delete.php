<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Delete Sales Record API Endpoint
   Method: POST or DELETE
   Deletes sale and automatically returns allocated panels back to available stock
   ========================================================================== */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../db.php';

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);
if (!is_array($data)) {
    $data = $_POST;
}

$id = isset($data['id']) ? trim((string)$data['id']) : (isset($_GET['id']) ? trim((string)$_GET['id']) : '');
if (empty($id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Sale ID or code is required.']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT * FROM sales WHERE sale_code = :code OR id = :id LIMIT 1');
    $stmt->execute([':code' => $id, ':id' => is_numeric($id) ? (int)$id : 0]);
    $sale = $stmt->fetch();

    if (!$sale) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Sale record not found.']);
        exit;
    }

    $pdo->beginTransaction();

    // Revert stock on products table
    $qty = (int)$sale['quantity'];
    $productId = (int)$sale['product_id'];

    if ($sale['status'] === 'Reserved') {
        $revertStmt = $pdo->prepare('
            UPDATE products SET 
                ready_to_sell = ready_to_sell + :qty1,
                reserved_quantity = GREATEST(0, reserved_quantity - :qty2)
            WHERE id = :pid
        ');
        $revertStmt->execute([':qty1' => $qty, ':qty2' => $qty, ':pid' => $productId]);
    } elseif ($sale['status'] === 'Sold') {
        $revertStmt = $pdo->prepare('
            UPDATE products SET 
                ready_to_sell = ready_to_sell + :qty1,
                sold_quantity = GREATEST(0, sold_quantity - :qty2)
            WHERE id = :pid
        ');
        $revertStmt->execute([':qty1' => $qty, ':qty2' => $qty, ':pid' => $productId]);
    }

    // Recalculate product status
    $pdo->prepare("
        UPDATE products SET status = CASE 
            WHEN ready_to_sell <= 0 THEN 'out_of_stock' 
            WHEN ready_to_sell < 20 THEN 'low_stock' 
            ELSE 'in_stock' 
        END 
        WHERE id = :pid
    ")->execute([':pid' => $productId]);

    // Delete sale
    $delStmt = $pdo->prepare('DELETE FROM sales WHERE id = :id');
    $delStmt->execute([':id' => (int)$sale['id']]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => "Sale record {$sale['sale_code']} deleted and stock restored."
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to delete sale record.',
        'error'   => $e->getMessage()
    ]);
}
