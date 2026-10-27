<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Add Solar Panel Product API Endpoint
   Method: POST
   Inserts new solar panel product into MySQL table `products`
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

$name          = isset($data['name']) ? trim(strip_tags((string)$data['name'])) : '';
$modelNumber   = isset($data['model']) ? trim(strip_tags((string)$data['model'])) : (isset($data['modelNumber']) ? trim(strip_tags((string)$data['modelNumber'])) : '');
$cellType      = isset($data['cellType']) ? trim(strip_tags((string)$data['cellType'])) : 'Mono PERC';
$wattCapacity  = isset($data['wattCapacity']) ? (int)$data['wattCapacity'] : 400;
$efficiency    = isset($data['efficiency']) ? (float)$data['efficiency'] : 21.0;
$dimensions    = isset($data['dimensions']) ? trim(strip_tags((string)$data['dimensions'])) : '2008 x 1002 x 35 mm';
$weightKg      = isset($data['weightKg']) ? (float)$data['weightKg'] : 22.0;
$pricePerUnit  = isset($data['pricePerUnit']) ? (float)$data['pricePerUnit'] : (isset($data['price']) ? (float)$data['price'] : 12500.00);
$quantity      = isset($data['quantity']) ? (int)$data['quantity'] : (isset($data['totalProduced']) ? (int)$data['totalProduced'] : 0);
$readyToSell   = isset($data['readyToSell']) ? (int)$data['readyToSell'] : $quantity;
$warranty      = isset($data['warranty']) ? trim(strip_tags((string)$data['warranty'])) : '25 Years';
$notes         = isset($data['notes']) ? trim(strip_tags((string)$data['notes'])) : '';
$image         = isset($data['image']) ? trim((string)$data['image']) : null;

// Validation
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
if ($quantity < 0) {
    $errors['quantity'] = 'Quantity cannot be negative.';
}
if ($readyToSell < 0) {
    $errors['readyToSell'] = 'Ready to sell quantity cannot be negative.';
}
if ($readyToSell > $quantity) {
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

try {
    // Generate next product code e.g. FG-006 or PROD-006
    $stmtMax = $pdo->query("SELECT product_code FROM products WHERE product_code REGEXP '^(FG|PROD)-[0-9]+' ORDER BY id DESC LIMIT 1");
    $lastCode = $stmtMax->fetchColumn();

    $nextNum = 1;
    if ($lastCode && preg_match('/(?:FG|PROD)-(\d+)/', $lastCode, $m)) {
        $nextNum = (int)$m[1] + 1;
    } else {
        $cntStmt = $pdo->query('SELECT COUNT(*) FROM products');
        $nextNum = (int)$cntStmt->fetchColumn() + 1;
    }
    $productCode = sprintf('FG-%03d', $nextNum);

    $sql = 'INSERT INTO products 
            (product_code, name, model_number, cell_type, watt_capacity, efficiency, dimensions, weight_kg, price_per_unit, total_produced, ready_to_sell, reserved_quantity, sold_quantity, warranty_years, status, is_deleted, deleted_at, image, notes)
            VALUES 
            (:code, :name, :model, :cell, :watt, :eff, :dim, :weight, :price, :produced, :ready, 0, 0, :warranty, :status, 0, NULL, :img, :notes)';

    $status = $readyToSell > 0 ? 'in_stock' : 'out_of_stock';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':code'      => $productCode,
        ':name'      => $name,
        ':model'     => $modelNumber ?: null,
        ':cell'      => $cellType,
        ':watt'      => $wattCapacity,
        ':eff'       => $efficiency,
        ':dim'       => $dimensions,
        ':weight'    => $weightKg,
        ':price'     => $pricePerUnit,
        ':produced'  => $quantity,
        ':ready'     => $readyToSell,
        ':warranty'  => $warranty,
        ':status'    => $status,
        ':img'       => $image,
        ':notes'     => $notes ?: null
    ]);

    $newId = (int)$pdo->lastInsertId();

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => "Solar panel product {$name} ({$productCode}) created successfully.",
        'data'    => [
            'id'           => $productCode,
            'db_id'        => $newId,
            'product_code' => $productCode,
            'name'         => $name,
            'modelNumber'  => $modelNumber,
            'cellType'     => $cellType,
            'wattCapacity' => $wattCapacity,
            'efficiency'   => $efficiency,
            'dimensions'   => $dimensions,
            'weightKg'     => $weightKg,
            'pricePerUnit' => $pricePerUnit,
            'totalProduced'=> $quantity,
            'quantity'     => $quantity,
            'readyToSell'  => $readyToSell,
            'reservedQuantity' => 0,
            'soldQuantity' => 0,
            'warranty'     => $warranty,
            'status'       => $status,
            'is_deleted'   => 0,
            'isDeleted'    => false,
            'deletedAt'    => null,
            'notes'        => $notes
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to create product in database.',
        'error'   => $e->getMessage()
    ]);
}
