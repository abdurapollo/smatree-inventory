<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Update Production Batch API
   Method: POST / PUT
   Payload: JSON batch updates
   Inventory Maintenance: Synchronizes Finished Goods stock atomically
   ========================================================================== */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT'])) {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed. Use POST or PUT.']);
    exit;
}

require_once __DIR__ . '/../db.php';

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON payload.']);
    exit;
}

$idParam = $input['db_id'] ?? $input['id'] ?? null;
if (!$idParam) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Batch ID or Batch Code is required.']);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. Fetch current batch
    $selectStmt = $pdo->prepare('
        SELECT * FROM production_batches 
        WHERE id = :id OR batch_code = :code LIMIT 1
    ');
    $selectStmt->execute([':id' => $idParam, ':code' => $idParam]);
    $batch = $selectStmt->fetch();

    if (!$batch) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => "Batch '{$idParam}' not found."]);
        exit;
    }

    $batchDbId     = (int)$batch['id'];
    $batchCode     = $batch['batch_code'];
    $oldStatus     = $batch['status'];
    $oldQty        = (int)$batch['quantity'];
    $oldProductId  = $batch['product_id'] ? (int)$batch['product_id'] : null;

    // 2. Extract updated fields
    $panelType    = trim($input['panelType'] ?? $input['panel_type'] ?? $batch['panel_type']);
    $wattCapacity = isset($input['wattCapacity']) || isset($input['watt_capacity']) 
                    ? (int)($input['wattCapacity'] ?? $input['watt_capacity']) 
                    : (int)$batch['watt_capacity'];
    $quantity     = isset($input['quantity']) ? (int)$input['quantity'] : $oldQty;
    $teamAssigned = trim($input['teamAssigned'] ?? $input['team_assigned'] ?? $batch['team_assigned']);
    $startDate    = trim($input['startDate'] ?? $input['start_date'] ?? $batch['start_date']);
    $completionDate = array_key_exists('completionDate', $input) || array_key_exists('completion_date', $input)
                    ? (!empty($input['completionDate'] ?? $input['completion_date']) ? trim($input['completionDate'] ?? $input['completion_date']) : null)
                    : $batch['completion_date'];
    $status       = trim($input['status'] ?? $batch['status']);
    $progress     = isset($input['progress']) ? (int)$input['progress'] : ($status === 'Completed' ? 100 : (int)$batch['progress']);
    $productionCost = isset($input['productionCost']) || isset($input['production_cost'])
                    ? (float)($input['productionCost'] ?? $input['production_cost'])
                    : (float)$batch['production_cost'];
    $materialsUsed  = array_key_exists('materialsUsed', $input) || array_key_exists('materials_used', $input)
                    ? trim($input['materialsUsed'] ?? $input['materials_used'] ?? '')
                    : $batch['materials_used'];
    $notes          = array_key_exists('notes', $input) ? trim($input['notes']) : $batch['notes'];
    $productId      = array_key_exists('productId', $input) || array_key_exists('product_id', $input)
                    ? (!empty($input['productId'] ?? $input['product_id']) ? (int)($input['productId'] ?? $input['product_id']) : null)
                    : $oldProductId;

    if ($status === 'Completed' && empty($completionDate)) {
        $completionDate = date('Y-m-d');
        $progress = 100;
    }

    // Try auto-matching product if not set
    if (!$productId) {
        $matchStmt = $pdo->prepare('
            SELECT id FROM products 
            WHERE is_deleted = 0 AND (watt_capacity = :w OR name LIKE :p) 
            ORDER BY (watt_capacity = :w2) DESC, id ASC LIMIT 1
        ');
        $matchStmt->execute([
            ':w' => $wattCapacity,
            ':p' => '%' . $panelType . '%',
            ':w2' => $wattCapacity
        ]);
        $matched = $matchStmt->fetchColumn();
        if ($matched) {
            $productId = (int)$matched;
        }
    }

    // 3. Update production_batches record
    $updateStmt = $pdo->prepare('
        UPDATE production_batches SET
            product_id      = :product_id,
            panel_type      = :panel_type,
            watt_capacity   = :watt_capacity,
            quantity        = :quantity,
            team_assigned   = :team_assigned,
            start_date      = :start_date,
            completion_date = :completion_date,
            status          = :status,
            progress        = :progress,
            production_cost = :production_cost,
            materials_used  = :materials_used,
            notes           = :notes,
            updated_at      = CURRENT_TIMESTAMP
        WHERE id = :id
    ');

    $updateStmt->execute([
        ':product_id'      => $productId,
        ':panel_type'      => $panelType,
        ':watt_capacity'   => $wattCapacity,
        ':quantity'        => $quantity,
        ':team_assigned'   => $teamAssigned,
        ':start_date'      => $startDate,
        ':completion_date' => $completionDate,
        ':status'          => $status,
        ':progress'        => $progress,
        ':production_cost' => $productionCost,
        ':materials_used'  => $materialsUsed,
        ':notes'           => $notes,
        ':id'              => $batchDbId
    ]);

    // 4. INVENTORY STOCK MAINTENANCE LOGIC:
    // Helper function to update a product's stock & status
    $adjustProductStock = function($pdo, $prodId, $deltaProduced, $deltaReady) {
        if (!$prodId) return;
        $stmt = $pdo->prepare('
            UPDATE products 
            SET total_produced = GREATEST(0, total_produced + :d_prod),
                ready_to_sell  = GREATEST(0, ready_to_sell + :d_ready),
                status = CASE 
                    WHEN status = "discontinued" THEN "discontinued"
                    WHEN (ready_to_sell + :d_ready2) > 10 THEN "in_stock"
                    WHEN (ready_to_sell + :d_ready3) > 0 THEN "low_stock"
                    ELSE "out_of_stock"
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        ');
        $stmt->execute([
            ':d_prod'   => $deltaProduced,
            ':d_ready'  => $deltaReady,
            ':d_ready2' => $deltaReady,
            ':d_ready3' => $deltaReady,
            ':id'       => $prodId
        ]);
    };

    if ($oldStatus !== 'Completed' && $status === 'Completed') {
        // Newly completed: add panels to stock
        $adjustProductStock($pdo, $productId, $quantity, $quantity);
    } elseif ($oldStatus === 'Completed' && $status !== 'Completed') {
        // Rollback completion: remove panels from stock
        $adjustProductStock($pdo, $oldProductId, -$oldQty, -$oldQty);
    } elseif ($oldStatus === 'Completed' && $status === 'Completed') {
        // Remained completed:
        if ($oldProductId === $productId) {
            $qtyDiff = $quantity - $oldQty;
            if ($qtyDiff !== 0) {
                $adjustProductStock($pdo, $productId, $qtyDiff, $qtyDiff);
            }
        } else {
            // Product switched: deduct from old, add to new
            $adjustProductStock($pdo, $oldProductId, -$oldQty, -$oldQty);
            $adjustProductStock($pdo, $productId, $quantity, $quantity);
        }
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => "Production batch {$batchCode} updated successfully.",
        'data'    => [
            'id'             => $batchCode,
            'db_id'          => $batchDbId,
            'batchCode'      => $batchCode,
            'productId'      => $productId,
            'panelType'      => $panelType,
            'wattCapacity'   => $wattCapacity,
            'quantity'       => $quantity,
            'teamAssigned'   => $teamAssigned,
            'startDate'      => $startDate,
            'completionDate' => $completionDate,
            'status'         => $status,
            'progress'       => $progress,
            'productionCost' => $productionCost,
            'materialsUsed'  => $materialsUsed,
            'notes'          => $notes
        ]
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update production batch.',
        'error'   => $e->getMessage()
    ]);
}
