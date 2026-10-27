<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Update Purchased Raw Material API
   Method: POST or PUT
   ========================================================================== */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
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

$id = isset($data['id']) ? trim($data['id']) : (isset($_GET['id']) ? trim($_GET['id']) : '');
if (empty($id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Material ID / Code is required.']);
    exit;
}

try {
    // Find record by material_code or id
    $findStmt = $pdo->prepare('SELECT * FROM purchased_raw_materials WHERE material_code = :code OR id = :id LIMIT 1');
    $findStmt->execute([':code' => $id, ':id' => is_numeric($id) ? (int)$id : 0]);
    $existing = $findStmt->fetch();

    if (!$existing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Material record not found.']);
        exit;
    }

    $category          = isset($data['category']) ? trim(strip_tags((string)$data['category'])) : $existing['category'];
    $supplierName      = isset($data['supplier']) ? trim(strip_tags((string)$data['supplier'])) : (isset($data['supplier_name']) ? trim(strip_tags((string)$data['supplier_name'])) : $existing['supplier_name']);
    $quantity          = isset($data['quantity']) && is_numeric($data['quantity']) ? (int)$data['quantity'] : (int)$existing['quantity'];
    $unit              = isset($data['unit']) ? trim(strip_tags((string)$data['unit'])) : $existing['unit'];
    $costPerUnit       = isset($data['costPerUnit']) && is_numeric($data['costPerUnit']) ? (float)$data['costPerUnit'] : (isset($data['cost_per_unit']) && is_numeric($data['cost_per_unit']) ? (float)$data['cost_per_unit'] : (float)$existing['cost_per_unit']);
    $warehouseLocation = isset($data['warehouse']) ? trim(strip_tags((string)$data['warehouse'])) : (isset($data['warehouse_location']) ? trim(strip_tags((string)$data['warehouse_location'])) : $existing['warehouse_location']);
    $purchaseDate      = isset($data['purchaseDate']) ? trim(strip_tags((string)$data['purchaseDate'])) : (isset($data['purchase_date']) ? trim(strip_tags((string)$data['purchase_date'])) : $existing['purchase_date']);
    $notes             = isset($data['notes']) ? trim(strip_tags((string)$data['notes'])) : $existing['notes'];
    $reorderLevel      = isset($data['reorderLevel']) && is_numeric($data['reorderLevel']) ? (int)$data['reorderLevel'] : (int)$existing['reorder_level'];
    $image             = isset($data['image']) ? trim((string)$data['image']) : $existing['image'];

    $errors = [];
    if (empty($category) || mb_strlen($category) > 100) {
        $errors['category'] = 'Valid category is required (maximum 100 characters).';
    }
    if ($quantity < 0) {
        $errors['quantity'] = 'Quantity must be non-negative.';
    }
    if ($costPerUnit < 0) {
        $errors['costPerUnit'] = 'Cost per unit must be non-negative.';
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

    // Resolve supplier id
    $supplierId = $existing['supplier_id'];
    if (!empty($supplierName)) {
        $supStmt = $pdo->prepare('SELECT id, company FROM suppliers WHERE LOWER(company) = LOWER(:company) LIMIT 1');
        $supStmt->execute([':company' => $supplierName]);
        $sRow = $supStmt->fetch();
        if ($sRow) {
            $supplierId = (int)$sRow['id'];
            $supplierName = $sRow['company'];
        }
    }

    $totalValue = round($quantity * $costPerUnit, 2);
    $status = 'in_stock';
    if ($quantity <= 0) {
        $status = 'out_of_stock';
    } elseif ($quantity <= $reorderLevel) {
        $status = 'low_stock';
    }

    $updateSql = 'UPDATE purchased_raw_materials SET 
                  category = :cat,
                  supplier_id = :sup_id,
                  supplier_name = :sup_name,
                  quantity = :qty,
                  unit = :unit,
                  cost_per_unit = :cost,
                  total_value = :total,
                  warehouse_location = :warehouse,
                  purchase_date = :pdate,
                  notes = :notes,
                  image = :image,
                  reorder_level = :reorder,
                  status = :status
                  WHERE id = :db_id';

    $updateStmt = $pdo->prepare($updateSql);
    $updateStmt->execute([
        ':cat'       => $category,
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
        ':status'    => $status,
        ':db_id'     => $existing['id']
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Material record updated successfully in database.',
        'data'    => [
            'id'           => $existing['material_code'],
            'db_id'        => (int)$existing['id'],
            'materialCode' => $existing['material_code'],
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
            'reorderLevel' => $reorderLevel,
            'reorder_level'=> $reorderLevel,
            'notes'        => $notes,
            'image'        => $image,
            'status'       => $status === 'low_stock' ? 'Low Stock' : ($status === 'out_of_stock' ? 'Out of Stock' : 'In Stock')
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update material record in database.',
        'error'   => $e->getMessage()
    ]);
}
