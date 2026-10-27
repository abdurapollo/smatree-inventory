<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Dynamic Add Sales Record API Endpoint
   Method: POST
   Inserts sale record into MySQL table `sales` and updates `products` stock
   Uses atomic PDO transaction for bulletproof inventory integrity
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
$productIdKey  = isset($data['productId']) ? trim((string)$data['productId']) : (isset($data['product_id']) ? trim((string)$data['product_id']) : '');
$customerName  = isset($data['customerName']) ? trim(strip_tags((string)$data['customerName'])) : (isset($data['customer_name']) ? trim(strip_tags((string)$data['customer_name'])) : '');
$customerPhone = isset($data['customerPhone']) ? trim(strip_tags((string)$data['customerPhone'])) : (isset($data['customer_phone']) ? trim(strip_tags((string)$data['customer_phone'])) : '');
$customerEmail = isset($data['customerEmail']) ? trim(strip_tags(strtolower((string)$data['customerEmail']))) : (isset($data['customer_email']) ? trim(strip_tags(strtolower((string)$data['customer_email']))) : '');
$quantity      = isset($data['quantity']) && is_numeric($data['quantity']) ? (int)$data['quantity'] : 0;
$saleDate      = isset($data['saleDate']) && !empty($data['saleDate']) ? trim((string)$data['saleDate']) : (isset($data['sale_date']) ? trim((string)$data['sale_date']) : date('Y-m-d'));
$status        = isset($data['status']) ? trim((string)$data['status']) : 'Reserved';
$notes         = isset($data['notes']) ? trim(strip_tags((string)$data['notes'])) : '';
$customPrice   = isset($data['unitPrice']) && is_numeric($data['unitPrice']) ? (float)$data['unitPrice'] : null;

// Validation
$errors = [];
if (empty($productIdKey)) {
    $errors['product'] = 'Solar panel product selection is required.';
}
if (empty($customerName) || mb_strlen($customerName) < 2) {
    $errors['customer'] = 'Customer name is required (minimum 2 characters).';
}
if ($quantity <= 0) {
    $errors['quantity'] = 'Quantity must be greater than zero.';
}
if (!empty($customerEmail) && !filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Invalid customer email address format.';
}
if (!in_array($status, ['Reserved', 'Sold'])) {
    $status = 'Reserved';
}
if (!empty($saleDate) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $saleDate)) {
    $saleDate = date('Y-m-d');
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Validation failed. Please correct the form fields.',
        'errors'  => $errors
    ]);
    exit;
}

try {
    // 1. Fetch Product record & check stock availability
    $prodStmt = $pdo->prepare('SELECT * FROM products WHERE product_code = :code OR id = :id LIMIT 1');
    $prodStmt->execute([
        ':code' => $productIdKey,
        ':id'   => is_numeric($productIdKey) ? (int)$productIdKey : 0
    ]);
    $product = $prodStmt->fetch();

    if (!$product) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Selected solar panel product was not found in the database.',
            'errors'  => ['product' => 'Selected product does not exist.']
        ]);
        exit;
    }

    if ((int)$product['is_deleted'] === 1) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "Solar panel product '{$product['name']}' has been archived / soft-deleted and cannot be allocated for new sales. Please restore it first.",
            'errors'  => ['product' => 'Selected product is archived. Please restore it before recording a sale.']
        ]);
        exit;
    }

    $availableStock = (int)$product['ready_to_sell'];
    if ($availableStock < $quantity) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "Insufficient stock for {$product['name']}. Available: {$availableStock} units, Requested: {$quantity} units.",
            'errors'  => ['quantity' => "Only {$availableStock} units available in stock."]
        ]);
        exit;
    }

    // 2. Begin atomic transaction for data integrity
    $pdo->beginTransaction();

    // 3. Generate unique sale_code (e.g. SALE-005)
    $stmtMax = $pdo->query("SELECT sale_code FROM sales WHERE sale_code REGEXP '^SALE-[0-9]+' ORDER BY id DESC LIMIT 1");
    $lastCode = $stmtMax->fetchColumn();

    $nextNum = 1;
    if ($lastCode && preg_match('/SALE-(\d+)/', $lastCode, $m)) {
        $nextNum = (int)$m[1] + 1;
    } else {
        $cntStmt = $pdo->query('SELECT COUNT(*) FROM sales');
        $nextNum = (int)$cntStmt->fetchColumn() + 1;
    }
    $saleCode = sprintf('SALE-%03d', $nextNum);

    // Double-check uniqueness
    $uniqStmt = $pdo->prepare('SELECT id FROM sales WHERE sale_code = :code');
    $uniqStmt->execute([':code' => $saleCode]);
    if ($uniqStmt->fetch()) {
        $saleCode = 'SALE-' . strtoupper(substr(uniqid(), -4));
    }

    // 4. Calculate prices
    $unitPrice = $customPrice !== null && $customPrice > 0 ? $customPrice : (float)$product['price_per_unit'];
    $totalAmount = round($quantity * $unitPrice, 2);

    // 5. Insert into sales table
    $insertSql = 'INSERT INTO sales 
        (sale_code, product_id, product_code, product_name, customer_name, customer_phone, customer_email, quantity, unit_price, total_amount, sale_date, status, notes)
        VALUES 
        (:code, :pid, :pcode, :pname, :cname, :cphone, :cemail, :qty, :uprice, :total, :sdate, :status, :notes)';

    $insertStmt = $pdo->prepare($insertSql);
    $insertStmt->execute([
        ':code'   => $saleCode,
        ':pid'    => (int)$product['id'],
        ':pcode'  => $product['product_code'],
        ':pname'  => $product['name'],
        ':cname'  => $customerName,
        ':cphone' => $customerPhone ?: null,
        ':cemail' => $customerEmail ?: null,
        ':qty'    => $quantity,
        ':uprice' => $unitPrice,
        ':total'  => $totalAmount,
        ':sdate'  => $saleDate,
        ':status' => $status,
        ':notes'  => $notes ?: null
    ]);

    $newSaleDbId = (int)$pdo->lastInsertId();

    // 6. Update product stock dynamically
    if ($status === 'Reserved') {
        $updateStockSql = 'UPDATE products SET 
            ready_to_sell = ready_to_sell - :qty1,
            reserved_quantity = reserved_quantity + :qty2
            WHERE id = :pid';
    } else { // Sold
        $updateStockSql = 'UPDATE products SET 
            ready_to_sell = ready_to_sell - :qty1,
            sold_quantity = sold_quantity + :qty2
            WHERE id = :pid';
    }

    $stockStmt = $pdo->prepare($updateStockSql);
    $stockStmt->execute([
        ':qty1' => $quantity,
        ':qty2' => $quantity,
        ':pid'  => (int)$product['id']
    ]);

    // Recalculate product status
    $pdo->prepare("
        UPDATE products SET status = CASE 
            WHEN ready_to_sell <= 0 THEN 'out_of_stock' 
            WHEN ready_to_sell < 20 THEN 'low_stock' 
            ELSE 'in_stock' 
        END 
        WHERE id = :pid
    ")->execute([':pid' => (int)$product['id']]);

    // Commit atomic transaction
    $pdo->commit();

    $newSale = [
        'id'           => $saleCode,
        'db_id'        => $newSaleDbId,
        'sale_code'    => $saleCode,
        'productId'    => $product['product_code'],
        'productDbId'  => (int)$product['id'],
        'productName'  => $product['name'],
        'customerName' => $customerName,
        'customerPhone'=> $customerPhone,
        'customerEmail'=> $customerEmail,
        'quantity'     => $quantity,
        'unitPrice'    => $unitPrice,
        'totalAmount'  => $totalAmount,
        'saleDate'     => $saleDate,
        'status'       => $status,
        'notes'        => $notes,
        'createdAt'    => date('Y-m-d H:i:s')
    ];

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => "Sale record {$saleCode} created for {$customerName} successfully.",
        'data'    => $newSale
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to record sale in database.',
        'error'   => $e->getMessage()
    ]);
}
