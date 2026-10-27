<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Delete Production Batch API
   Method: POST / DELETE
   Payload: JSON with id/batch_code
   Inventory Sync: If deleting a Completed batch, removes its stock from Finished Goods
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
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed. Use POST or DELETE.']);
    exit;
}

require_once __DIR__ . '/../db.php';

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);

$idParam = $input['db_id'] ?? $input['id'] ?? $_GET['id'] ?? null;

if (!$idParam) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Batch ID or Batch Code is required.']);
    exit;
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('SELECT * FROM production_batches WHERE id = :id OR batch_code = :code LIMIT 1');
    $stmt->execute([':id' => $idParam, ':code' => $idParam]);
    $batch = $stmt->fetch();

    if (!$batch) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => "Production batch '{$idParam}' not found."]);
        exit;
    }

    $batchDbId = (int)$batch['id'];
    $batchCode = $batch['batch_code'];
    $status    = $batch['status'];
    $qty       = (int)$batch['quantity'];
    $productId = $batch['product_id'] ? (int)$batch['product_id'] : null;

    // Rollback finished stock if batch was completed
    if ($status === 'Completed' && $productId) {
        $stockStmt = $pdo->prepare('
            UPDATE products 
            SET total_produced = GREATEST(0, total_produced - :qty),
                ready_to_sell  = GREATEST(0, ready_to_sell - :qty2),
                status = CASE 
                    WHEN status = "discontinued" THEN "discontinued"
                    WHEN (ready_to_sell - :qty3) > 10 THEN "in_stock"
                    WHEN (ready_to_sell - :qty4) > 0 THEN "low_stock"
                    ELSE "out_of_stock"
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :prod_id
        ');
        $stockStmt->execute([
            ':qty'     => $qty,
            ':qty2'    => $qty,
            ':qty3'    => $qty,
            ':qty4'    => $qty,
            ':prod_id' => $productId
        ]);
    }

    $delStmt = $pdo->prepare('DELETE FROM production_batches WHERE id = :id');
    $delStmt->execute([':id' => $batchDbId]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => "Production batch {$batchCode} has been permanently deleted."
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to delete production batch.',
        'error'   => $e->getMessage()
    ]);
}
