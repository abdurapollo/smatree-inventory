<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Dynamic Add Purchased Raw Material API
   Method: POST
   Inserts purchased raw material into MySQL table purchased_raw_materials
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

// Parse raw JSON or POST data
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);
if (!is_array($data)) {
    $data = $_POST;
}

// Extract & Sanitize fields
$category          = isset($data['category']) ? trim(strip_tags((string)$data['category'])) : '';
$supplierName      = isset($data['supplier']) ? trim(strip_tags((string)$data['supplier'])) : (isset($data['supplier_name']) ? trim(strip_tags((string)$data['supplier_name'])) : '');
$quantity          = isset($data['quantity']) && is_numeric($data['quantity']) ? (int)$data['quantity'] : -1;
$unit              = isset($data['unit']) && !empty(trim($data['unit'])) ? trim(strip_tags((string)$data['unit'])) : 'Pieces';
$costPerUnit       = isset($data['costPerUnit']) && is_numeric($data['costPerUnit']) ? (float)$data['costPerUnit'] : (isset($data['cost_per_unit']) && is_numeric($data['cost_per_unit']) ? (float)$data['cost_per_unit'] : -1.0);
$warehouseLocation = isset($data['warehouse']) ? trim(strip_tags((string)$data['warehouse'])) : (isset($data['warehouse_location']) ? trim(strip_tags((string)$data['warehouse_location'])) : '');
$purchaseDate      = isset($data['purchaseDate']) && !empty($data['purchaseDate']) ? trim(strip_tags((string)$data['purchaseDate'])) : (isset($data['purchase_date']) ? trim(strip_tags((string)$data['purchase_date'])) : date('Y-m-d'));
$notes             = isset($data['notes']) ? trim(strip_tags((string)$data['notes'])) : '';
$image             = isset($data['image']) ? trim((string)$data['image']) : null;
$reorderLevel      = isset($data['reorderLevel']) && is_numeric($data['reorderLevel']) ? (int)$data['reorderLevel'] : (isset($data['reorder_level']) && is_numeric($data['reorder_level']) ? (int)$data['reorder_level'] : max(10, round(max(0, $quantity) * 0.2)));

// Validations
$errors = [];
if (empty($category) || mb_strlen($category) > 100) {
    $errors['category'] = 'Valid category is required (maximum 100 characters).';
}
if ($quantity < 0) {
    $errors['quantity'] = 'Quantity must be a valid non-negative integer.';
}
if ($costPerUnit < 0) {
    $errors['costPerUnit'] = 'Cost per unit must be a valid non-negative number.';
}
if (!empty($purchaseDate) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $purchaseDate)) {
    $errors['purchaseDate'] = 'Invalid purchase date format (YYYY-MM-DD expected).';
}
if (mb_strlen($warehouseLocation) > 150) {
    $errors['warehouse'] = 'Warehouse location cannot exceed 150 characters.';
}
if (mb_strlen($notes) > 1000) {
    $errors['notes'] = 'Notes cannot exceed 1000 characters.';
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Validation failed',
        'errors'  => $errors
    ]);
    exit;
}

try {
    // 1. Resolve Supplier ID if supplier company name was provided
    $supplierId = null;
    if (!empty($supplierName)) {
        $supStmt = $pdo->prepare('SELECT id, company FROM suppliers WHERE LOWER(company) = LOWER(:company) LIMIT 1');
        $supStmt->execute([':company' => $supplierName]);
        $supplierRow = $supStmt->fetch();
        if ($supplierRow) {
            $supplierId = (int)$supplierRow['id'];
            $supplierName = $supplierRow['company'];
        }
    }

    // 2. Auto-generate next unique material_code (e.g. MAT-013)
    $stmtMax = $pdo->query("SELECT material_code FROM purchased_raw_materials WHERE material_code REGEXP '^MAT-[0-9]+' ORDER BY id DESC LIMIT 1");
    $lastCode = $stmtMax->fetchColumn();

    $nextNum = 1;
    if ($lastCode && preg_match('/MAT-(\d+)/', $lastCode, $m)) {
        $nextNum = (int)$m[1] + 1;
    } else {
        $countStmt = $pdo->query('SELECT COUNT(*) FROM purchased_raw_materials');
        $nextNum = (int)$countStmt->fetchColumn() + 1;
    }
    $materialCode = sprintf('MAT-%03d', $nextNum);

    // Double check uniqueness
    $uniqStmt = $pdo->prepare('SELECT id FROM purchased_raw_materials WHERE material_code = :code');
    $uniqStmt->execute([':code' => $materialCode]);
    if ($uniqStmt->fetch()) {
        $materialCode = 'MAT-' . strtoupper(substr(uniqid(), -6));
    }

    // 3. Compute total value and stock status
    $totalValue = round($quantity * $costPerUnit, 2);
    $status = 'in_stock';
    if ($quantity <= 0) {
        $status = 'out_of_stock';
    } elseif ($quantity <= $reorderLevel) {
        $status = 'low_stock';
    }

    // 4. Insert into purchased_raw_materials
    $sql = 'INSERT INTO purchased_raw_materials 
            (material_code, category, supplier_id, supplier_name, quantity, unit, cost_per_unit, total_value, warehouse_location, purchase_date, notes, image, reorder_level, status)
            VALUES 
            (:code, :category, :sup_id, :sup_name, :qty, :unit, :cost, :total, :warehouse, :pdate, :notes, :image, :reorder, :status)';

    $insertStmt = $pdo->prepare($sql);
    $insertStmt->execute([
        ':code'      => $materialCode,
        ':category'  => $category,
        ':sup_id'    => $supplierId,
        ':sup_name'  => $supplierName,
        ':qty'       => $quantity,
        ':unit'      => $unit,
        ':cost'      => $costPerUnit,
        ':total'     => $totalValue,
        ':warehouse' => $warehouseLocation,
        ':pdate'     => $purchaseDate,
        ':notes'     => $notes,
        ':image'     => $image,
        ':reorder'   => $reorderLevel,
        ':status'    => $status
    ]);

    $insertedDbId = (int)$pdo->lastInsertId();

    $newMaterial = [
        'id'           => $materialCode,
        'db_id'        => $insertedDbId,
        'materialCode' => $materialCode,
        'name'         => $category . ($supplierName ? ' (' . $supplierName . ')' : ''),
        'category'     => $category,
        'supplier'     => $supplierName,
        'supplierId'   => $supplierId,
        'quantity'     => $quantity,
        'unit'         => $unit,
        'costPerUnit'  => $costPerUnit,
        'totalValue'   => $totalValue,
        'warehouse'    => $warehouseLocation,
        'purchaseDate' => $purchaseDate,
        'notes'        => $notes,
        'image'        => $image,
        'reorderLevel' => $reorderLevel,
        'status'       => $status === 'low_stock' ? 'Low Stock' : ($status === 'out_of_stock' ? 'Out of Stock' : 'In Stock'),
        'createdAt'    => date('Y-m-d H:i:s')
    ];

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Purchased raw material added into database successfully.',
        'data'    => $newMaterial
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to add purchased raw material to database.',
        'error'   => $e->getMessage()
    ]);
}
