<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Create Production Batch API
   Method: POST
   Payload: JSON batch details
   Inventory Sync: When marked 'Completed', automatically adds to Finished Goods stock
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
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed. Use POST.']);
    exit;
}

require_once __DIR__ . '/../db.php';

$raw = file_get_contents('php://input');
$input = json_get_array($raw);

function json_get_array($raw) {
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

$panelType    = trim($input['panelType'] ?? $input['panel_type'] ?? '');
$wattCapacity = (int)($input['wattCapacity'] ?? $input['watt_capacity'] ?? 0);
$quantity     = (int)($input['quantity'] ?? 0);
$teamAssigned = trim($input['teamAssigned'] ?? $input['team_assigned'] ?? '');
$startDate    = trim($input['startDate'] ?? $input['start_date'] ?? date('Y-m-d'));
$completionDate = !empty($input['completionDate'] ?? $input['completion_date'] ?? null) ? trim($input['completionDate'] ?? $input['completion_date']) : null;
$status       = trim($input['status'] ?? 'Pending');
$progress     = isset($input['progress']) ? (int)$input['progress'] : ($status === 'Completed' ? 100 : 0);
$productionCost = (float)($input['productionCost'] ?? $input['production_cost'] ?? 0.00);
$materialsUsed  = trim($input['materialsUsed'] ?? $input['materials_used'] ?? '');
$notes          = trim($input['notes'] ?? '');
$productId      = !empty($input['productId'] ?? $input['product_id'] ?? null) ? (int)($input['productId'] ?? $input['product_id']) : null;

// Validation
$validStatuses = ['Pending', 'In Production', 'Quality Check', 'Completed'];
if (!in_array($status, $validStatuses)) {
    $status = 'Pending';
}

if (empty($panelType)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Panel Type is required.']);
    exit;
}

if ($wattCapacity <= 0) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Watt Capacity must be a positive integer.']);
    exit;
}

if ($quantity <= 0) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Quantity must be at least 1.']);
    exit;
}

if (empty($teamAssigned)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Team Assigned is required.']);
    exit;
}

if ($status === 'Completed' && empty($completionDate)) {
    $completionDate = date('Y-m-d');
    $progress = 100;
}

try {
    $pdo->beginTransaction();

    // 1. Generate unique BATCH code
    $stmtCode = $pdo->query('SELECT MAX(id) AS max_id FROM production_batches');
    $maxId = (int)$stmtCode->fetchColumn();
    $nextCode = 'BATCH-' . str_pad($maxId + 1, 3, '0', STR_PAD_LEFT);

    // If client supplied custom code that does not exist, use it
    if (!empty($input['id']) && strpos($input['id'], 'BATCH-') === 0) {
        $checkStmt = $pdo->prepare('SELECT COUNT(*) FROM production_batches WHERE batch_code = :c');
        $checkStmt->execute([':c' => $input['id']]);
        if ($checkStmt->fetchColumn() == 0) {
            $nextCode = $input['id'];
        }
    }

    // 2. Auto-match product if not explicitly passed
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

    // 3. Insert into production_batches
    $insertStmt = $pdo->prepare('
        INSERT INTO production_batches 
        (batch_code, product_id, panel_type, watt_capacity, quantity, team_assigned, start_date, completion_date, status, progress, production_cost, materials_used, notes)
        VALUES 
        (:batch_code, :product_id, :panel_type, :watt_capacity, :quantity, :team_assigned, :start_date, :completion_date, :status, :progress, :production_cost, :materials_used, :notes)
    ');

    $insertStmt->execute([
        ':batch_code'      => $nextCode,
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
        ':notes'           => $notes
    ]);

    $newBatchId = (int)$pdo->lastInsertId();

    // 4. ATOMIC INVENTORY SYNCHRONIZATION:
    // If the batch is completed on creation, increment Finished Goods stock
    if ($status === 'Completed' && $productId) {
        $updateStockStmt = $pdo->prepare('
            UPDATE products 
            SET total_produced = total_produced + :qty,
                ready_to_sell = ready_to_sell + :qty2,
                status = CASE 
                    WHEN status = "discontinued" THEN "discontinued"
                    WHEN (ready_to_sell + :qty3) > 10 THEN "in_stock"
                    WHEN (ready_to_sell + :qty4) > 0 THEN "low_stock"
                    ELSE "out_of_stock"
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :prod_id
        ');
        $updateStockStmt->execute([
            ':qty'     => $quantity,
            ':qty2'    => $quantity,
            ':qty3'    => $quantity,
            ':qty4'    => $quantity,
            ':prod_id' => $productId
        ]);
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => "Production batch {$nextCode} created successfully" . ($status === 'Completed' && $productId ? " and {$quantity} units added to inventory stock." : "."),
        'data'    => [
            'id'             => $nextCode,
            'db_id'          => $newBatchId,
            'batchCode'      => $nextCode,
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
        'message' => 'Failed to create production batch.',
        'error'   => $e->getMessage()
    ]);
}
