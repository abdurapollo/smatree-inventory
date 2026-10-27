<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Update Solar Panel Product API Endpoint
   Method: POST, PUT
   Updates existing solar panel product details, specifications & inventory in MySQL
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
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST or PUT.']);
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
        'message' => 'Product identifier (id or product_code) is required for update.'
    ]);
    exit;
}

try {
    // 1. Locate existing product
    $stmtFind = $pdo->prepare('SELECT * FROM products WHERE id = :id OR product_code = :code LIMIT 1');
    $stmtFind->execute([
        ':id'   => is_numeric($idKey) ? (int)$idKey : 0,
        ':code' => $idKey
    ]);
    $existing = $stmtFind->fetch(PDO::FETCH_ASSOC);

    if (!$existing) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => "Solar panel product with identifier '{$idKey}' was not found."
        ]);
        exit;
    }

    $prodId = (int)$existing['id'];
    $productCode = $existing['product_code'];

    // 2. Extract and sanitize update data (fallback to existing values)
    $name         = isset($data['name']) ? trim(strip_tags((string)$data['name'])) : $existing['name'];
    $modelNumber  = isset($data['model']) ? trim(strip_tags((string)$data['model'])) : (isset($data['modelNumber']) ? trim(strip_tags((string)$data['modelNumber'])) : $existing['model_number']);
    $cellType     = isset($data['cellType']) ? trim(strip_tags((string)$data['cellType'])) : (isset($data['cell_type']) ? trim(strip_tags((string)$data['cell_type'])) : $existing['cell_type']);
    $wattCapacity = isset($data['wattCapacity']) ? (int)$data['wattCapacity'] : (isset($data['watt_capacity']) ? (int)$data['watt_capacity'] : (int)$existing['watt_capacity']);
    $efficiency   = isset($data['efficiency']) ? (float)$data['efficiency'] : (float)$existing['efficiency'];
    $dimensions   = isset($data['dimensions']) ? trim(strip_tags((string)$data['dimensions'])) : $existing['dimensions'];
    $weightKg     = isset($data['weightKg']) ? (float)$data['weightKg'] : (isset($data['weight_kg']) ? (float)$data['weight_kg'] : (float)$existing['weight_kg']);
    $pricePerUnit = isset($data['pricePerUnit']) ? (float)$data['pricePerUnit'] : (isset($data['price_per_unit']) ? (float)$data['price_per_unit'] : (float)$existing['price_per_unit']);
    $totalProduced= isset($data['totalProduced']) ? (int)$data['totalProduced'] : (isset($data['quantity']) ? (int)$data['quantity'] : (int)$existing['total_produced']);
    $readyToSell  = isset($data['readyToSell']) ? (int)$data['readyToSell'] : (isset($data['ready_to_sell']) ? (int)$data['ready_to_sell'] : (int)$existing['ready_to_sell']);
    $warranty     = isset($data['warranty']) ? trim(strip_tags((string)$data['warranty'])) : (isset($data['warranty_years']) ? trim(strip_tags((string)$data['warranty_years'])) : $existing['warranty_years']);
    $notes        = isset($data['notes']) ? trim(strip_tags((string)$data['notes'])) : $existing['notes'];

    // 3. Validation
    $errors = [];
    if (empty($name) || mb_strlen($name) < 2) {
        $errors['name'] = 'Product / panel name is required (minimum 2 characters).';
    }
    if ($wattCapacity <= 0 || $wattCapacity > 2000) {
        $errors['wattCapacity'] = 'Watt capacity must be between 10W and 2000W.';
    }
    if ($pricePerUnit <= 0) {
        $errors['pricePerUnit'] = 'Valid unit selling price (₹) is required.';
    }
    if ($totalProduced < 0) {
        $errors['quantity'] = 'Total produced units cannot be negative.';
    }
    if ($readyToSell < 0) {
        $errors['readyToSell'] = 'Ready to sell units cannot be negative.';
    }
    if ($readyToSell > $totalProduced) {
        $errors['readyToSell'] = 'Ready to sell units cannot exceed total produced units.';
    }
    if ($efficiency < 0 || $efficiency > 100) {
        $errors['efficiency'] = 'Efficiency must be between 0% and 100%.';
    }

    if (!empty($errors)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Validation failed. Please correct the highlighted errors.',
            'errors'  => $errors
        ]);
        exit;
    }

    // Determine status
    $status = $existing['status'];
    if ((int)$existing['is_deleted'] === 1) {
        $status = 'discontinued';
    } else {
        $status = $readyToSell > 0 ? 'in_stock' : 'out_of_stock';
    }

    // 4. Perform Update
    $sqlUpdate = '
        UPDATE products SET
            name            = :name,
            model_number    = :model,
            cell_type       = :cell,
            watt_capacity   = :watt,
            efficiency      = :eff,
            dimensions      = :dim,
            weight_kg       = :weight,
            price_per_unit  = :price,
            total_produced  = :produced,
            ready_to_sell   = :ready,
            warranty_years  = :warranty,
            status          = :status,
            notes           = :notes
        WHERE id = :id
    ';

    $stmtUpd = $pdo->prepare($sqlUpdate);
    $stmtUpd->execute([
        ':name'     => $name,
        ':model'    => $modelNumber ?: null,
        ':cell'     => $cellType,
        ':watt'     => $wattCapacity,
        ':eff'      => $efficiency,
        ':dim'      => $dimensions,
        ':weight'   => $weightKg,
        ':price'    => $pricePerUnit,
        ':produced' => $totalProduced,
        ':ready'    => $readyToSell,
        ':warranty' => $warranty,
        ':status'   => $status,
        ':notes'    => $notes ?: null,
        ':id'       => $prodId
    ]);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => "Solar panel product {$name} ({$productCode}) updated successfully.",
        'data'    => [
            'id'               => $productCode,
            'db_id'            => $prodId,
            'product_code'     => $productCode,
            'name'             => $name,
            'modelNumber'      => $modelNumber,
            'cellType'         => $cellType,
            'wattCapacity'     => $wattCapacity,
            'efficiency'       => $efficiency,
            'dimensions'       => $dimensions,
            'weightKg'         => $weightKg,
            'pricePerUnit'     => $pricePerUnit,
            'totalProduced'    => $totalProduced,
            'quantity'         => $totalProduced,
            'readyToSell'      => $readyToSell,
            'reservedQuantity' => (int)$existing['reserved_quantity'],
            'soldQuantity'     => (int)$existing['sold_quantity'],
            'warranty'         => $warranty,
            'status'           => $status,
            'is_deleted'       => (int)$existing['is_deleted'],
            'isDeleted'        => (int)$existing['is_deleted'] === 1,
            'deletedAt'        => $existing['deleted_at'],
            'notes'            => $notes
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update product in database.',
        'error'   => $e->getMessage()
    ]);
}
