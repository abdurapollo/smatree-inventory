<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Update Sales Record API Endpoint
   Method: POST, PUT
   Handles full sale record updates (Customer, Product, Quantity, Pricing)
   as well as quick status updates (Mark Sold, Cancel), with atomic inventory
   stock adjustments in MySQL `products` table.
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

$id = isset($data['id']) ? trim((string)$data['id']) : (isset($data['sale_code']) ? trim((string)$data['sale_code']) : (isset($_GET['id']) ? trim((string)$_GET['id']) : ''));
if (empty($id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Sale ID or sale_code is required.']);
    exit;
}

try {
    // 1. Locate existing sale record
    $stmt = $pdo->prepare('SELECT * FROM sales WHERE sale_code = :code OR id = :id LIMIT 1');
    $stmt->execute([
        ':code' => $id,
        ':id'   => is_numeric($id) ? (int)$id : 0
    ]);
    $sale = $stmt->fetch();

    if (!$sale) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => "Sale record '{$id}' was not found."]);
        exit;
    }

    $saleId       = (int)$sale['id'];
    $saleCode     = $sale['sale_code'];
    $oldProductId = (int)$sale['product_id'];
    $oldQty       = (int)$sale['quantity'];
    $oldStatus    = $sale['status'];

    // Check if this is a quick status change ONLY
    $isQuickStatusUpdate = isset($data['status']) && !isset($data['customerName']) && !isset($data['customer_name']) && !isset($data['productId']) && !isset($data['quantity']);

    if ($isQuickStatusUpdate) {
        $newStatus = trim((string)$data['status']);
        if (!in_array($newStatus, ['Reserved', 'Sold', 'Cancelled'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Valid status is required (Reserved, Sold, or Cancelled).']);
            exit;
        }

        if ($oldStatus === $newStatus) {
            echo json_encode(['success' => true, 'message' => 'Status is already ' . $newStatus . '.', 'data' => $sale]);
            exit;
        }

        $pdo->beginTransaction();

        // Adjust inventory based on transition
        if ($oldStatus === 'Reserved' && $newStatus === 'Sold') {
            $stockStmt = $pdo->prepare('
                UPDATE products SET 
                    reserved_quantity = GREATEST(0, reserved_quantity - :qty1),
                    sold_quantity = sold_quantity + :qty2
                WHERE id = :pid
            ');
            $stockStmt->execute([':qty1' => $oldQty, ':qty2' => $oldQty, ':pid' => $oldProductId]);
        } elseif ($newStatus === 'Cancelled') {
            if ($oldStatus === 'Reserved') {
                $stockStmt = $pdo->prepare('
                    UPDATE products SET 
                        ready_to_sell = ready_to_sell + :qty1,
                        reserved_quantity = GREATEST(0, reserved_quantity - :qty2)
                    WHERE id = :pid
                ');
                $stockStmt->execute([':qty1' => $oldQty, ':qty2' => $oldQty, ':pid' => $oldProductId]);
            } elseif ($oldStatus === 'Sold') {
                $stockStmt = $pdo->prepare('
                    UPDATE products SET 
                        ready_to_sell = ready_to_sell + :qty1,
                        sold_quantity = GREATEST(0, sold_quantity - :qty2)
                    WHERE id = :pid
                ');
                $stockStmt->execute([':qty1' => $oldQty, ':qty2' => $oldQty, ':pid' => $oldProductId]);
            }
        } elseif ($oldStatus === 'Cancelled') {
            // Re-activating a cancelled order: verify available stock first
            $chkStmt = $pdo->prepare('SELECT ready_to_sell, name FROM products WHERE id = :pid');
            $chkStmt->execute([':pid' => $oldProductId]);
            $chkProd = $chkStmt->fetch();
            if (!$chkProd || (int)$chkProd['ready_to_sell'] < $oldQty) {
                $pdo->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Cannot reactivate sale: insufficient stock available.']);
                exit;
            }

            if ($newStatus === 'Reserved') {
                $stockStmt = $pdo->prepare('
                    UPDATE products SET 
                        ready_to_sell = ready_to_sell - :qty1,
                        reserved_quantity = reserved_quantity + :qty2
                    WHERE id = :pid
                ');
                $stockStmt->execute([':qty1' => $oldQty, ':qty2' => $oldQty, ':pid' => $oldProductId]);
            } elseif ($newStatus === 'Sold') {
                $stockStmt = $pdo->prepare('
                    UPDATE products SET 
                        ready_to_sell = ready_to_sell - :qty1,
                        sold_quantity = sold_quantity + :qty2
                    WHERE id = :pid
                ');
                $stockStmt->execute([':qty1' => $oldQty, ':qty2' => $oldQty, ':pid' => $oldProductId]);
            }
        }

        // Recalculate product status
        $pdo->prepare("
            UPDATE products SET status = CASE 
                WHEN ready_to_sell <= 0 THEN 'out_of_stock' 
                WHEN ready_to_sell < 20 THEN 'low_stock' 
                ELSE 'in_stock' 
            END 
            WHERE id = :pid
        ")->execute([':pid' => $oldProductId]);

        // Update sales status
        $pdo->prepare('UPDATE sales SET status = :status WHERE id = :id')->execute([
            ':status' => $newStatus,
            ':id'     => $saleId
        ]);

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => "Sale record {$saleCode} status updated to {$newStatus}.",
            'data'    => [
                'id'       => $saleCode,
                'status'   => $newStatus
            ]
        ]);
        exit;
    }

    // Full Form Update
    $customerName    = isset($data['customerName']) ? trim(strip_tags((string)$data['customerName'])) : (isset($data['customer_name']) ? trim(strip_tags((string)$data['customer_name'])) : $sale['customer_name']);
    $customerPhone   = isset($data['customerPhone']) ? trim(strip_tags((string)$data['customerPhone'])) : (isset($data['customer_phone']) ? trim(strip_tags((string)$data['customer_phone'])) : $sale['customer_phone']);
    $customerEmail   = isset($data['customerEmail']) ? trim(strip_tags(strtolower((string)$data['customerEmail']))) : (isset($data['customer_email']) ? trim(strip_tags(strtolower((string)$data['customer_email']))) : $sale['customer_email']);
    $productIdKey    = isset($data['productId']) ? trim((string)$data['productId']) : (isset($data['product_id']) ? trim((string)$data['product_id']) : $sale['product_code']);
    $newQty          = isset($data['quantity']) && is_numeric($data['quantity']) ? (int)$data['quantity'] : (int)$sale['quantity'];
    $saleDate        = isset($data['saleDate']) && !empty($data['saleDate']) ? trim((string)$data['saleDate']) : (isset($data['sale_date']) ? trim((string)$data['sale_date']) : $sale['sale_date']);
    $newStatus       = isset($data['status']) ? trim((string)$data['status']) : $sale['status'];
    $notes           = isset($data['notes']) ? trim(strip_tags((string)$data['notes'])) : $sale['notes'];
    $customPrice     = isset($data['unitPrice']) && is_numeric($data['unitPrice']) ? (float)$data['unitPrice'] : (float)$sale['unit_price'];

    // Validation
    $errors = [];
    if (empty($customerName) || mb_strlen($customerName) < 2) {
        $errors['customer'] = 'Customer name is required (minimum 2 characters).';
    }
    if ($newQty <= 0) {
        $errors['quantity'] = 'Quantity must be at least 1 unit.';
    }
    if (!empty($customerEmail) && !filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'Invalid email address format.';
    }
    if (!in_array($newStatus, ['Reserved', 'Sold', 'Cancelled'])) {
        $newStatus = 'Reserved';
    }

    // Find Target Product
    $prodStmt = $pdo->prepare('SELECT * FROM products WHERE product_code = :code OR id = :id LIMIT 1');
    $prodStmt->execute([
        ':code' => $productIdKey,
        ':id'   => is_numeric($productIdKey) ? (int)$productIdKey : 0
    ]);
    $newProduct = $prodStmt->fetch();

    if (!$newProduct) {
        $errors['product'] = 'Selected solar panel product was not found in catalog.';
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

    $newProductId = (int)$newProduct['id'];

    // Check inventory stock availability
    // Calculate effective available stock if updating quantity of the same product
    if ($newProductId === $oldProductId) {
        $effectiveAvailable = (int)$newProduct['ready_to_sell'];
        if ($oldStatus !== 'Cancelled') {
            $effectiveAvailable += $oldQty; // Credit back old allocation for the check
        }
        if ($newStatus !== 'Cancelled' && $newQty > $effectiveAvailable) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => "Insufficient stock for {$newProduct['name']}. Available: {$effectiveAvailable} units, Requested: {$newQty} units.",
                'errors'  => ['quantity' => "Only {$effectiveAvailable} units available in stock."]
            ]);
            exit;
        }
    } else {
        // Different product chosen: must have enough ready_to_sell
        $effectiveAvailable = (int)$newProduct['ready_to_sell'];
        if ($newStatus !== 'Cancelled' && $newQty > $effectiveAvailable) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => "Insufficient stock for {$newProduct['name']}. Available: {$effectiveAvailable} units, Requested: {$newQty} units.",
                'errors'  => ['quantity' => "Only {$effectiveAvailable} units available in stock."]
            ]);
            exit;
        }
    }

    // Begin atomic transaction to synchronize stock and update record
    $pdo->beginTransaction();

    // 1. Revert Old Stock Impact on old product
    if ($oldStatus === 'Reserved') {
        $revertStmt = $pdo->prepare('
            UPDATE products SET 
                ready_to_sell = ready_to_sell + :qty1,
                reserved_quantity = GREATEST(0, reserved_quantity - :qty2)
            WHERE id = :pid
        ');
        $revertStmt->execute([':qty1' => $oldQty, ':qty2' => $oldQty, ':pid' => $oldProductId]);
    } elseif ($oldStatus === 'Sold') {
        $revertStmt = $pdo->prepare('
            UPDATE products SET 
                ready_to_sell = ready_to_sell + :qty1,
                sold_quantity = GREATEST(0, sold_quantity - :qty2)
            WHERE id = :pid
        ');
        $revertStmt->execute([':qty1' => $oldQty, ':qty2' => $oldQty, ':pid' => $oldProductId]);
    }

    // 2. Apply New Stock Impact on new product
    if ($newStatus === 'Reserved') {
        $applyStmt = $pdo->prepare('
            UPDATE products SET 
                ready_to_sell = ready_to_sell - :qty1,
                reserved_quantity = reserved_quantity + :qty2
            WHERE id = :pid
        ');
        $applyStmt->execute([':qty1' => $newQty, ':qty2' => $newQty, ':pid' => $newProductId]);
    } elseif ($newStatus === 'Sold') {
        $applyStmt = $pdo->prepare('
            UPDATE products SET 
                ready_to_sell = ready_to_sell - :qty1,
                sold_quantity = sold_quantity + :qty2
            WHERE id = :pid
        ');
        $applyStmt->execute([':qty1' => $newQty, ':qty2' => $newQty, ':pid' => $newProductId]);
    }

    // 3. Update stock status on both products
    $pdo->prepare("
        UPDATE products SET status = CASE 
            WHEN ready_to_sell <= 0 THEN 'out_of_stock' 
            WHEN ready_to_sell < 20 THEN 'low_stock' 
            ELSE 'in_stock' 
        END 
        WHERE id IN (:p1, :p2)
    ")->execute([':p1' => $oldProductId, ':p2' => $newProductId]);

    // 4. Calculate total amount
    $unitPrice = $customPrice > 0 ? $customPrice : (float)$newProduct['price_per_unit'];
    $totalAmount = round($newQty * $unitPrice, 2);

    // 5. Update Sale record in MySQL
    $updateSql = 'UPDATE sales SET 
        product_id       = :pid,
        product_code     = :pcode,
        product_name     = :pname,
        customer_name    = :cname,
        customer_phone   = :cphone,
        customer_email   = :cemail,
        quantity         = :qty,
        unit_price       = :uprice,
        total_amount     = :total,
        sale_date        = :sdate,
        status           = :status,
        notes            = :notes
        WHERE id = :id';

    $updateStmt = $pdo->prepare($updateSql);
    $updateStmt->execute([
        ':pid'     => $newProductId,
        ':pcode'   => $newProduct['product_code'],
        ':pname'   => $newProduct['name'],
        ':cname'   => $customerName,
        ':cphone'  => $customerPhone ?: null,
        ':cemail'  => $customerEmail ?: null,
        ':qty'     => $newQty,
        ':uprice'  => $unitPrice,
        ':total'   => $totalAmount,
        ':sdate'   => $saleDate,
        ':status'  => $newStatus,
        ':notes'   => $notes ?: null,
        ':id'      => $saleId
    ]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => "Sale record {$saleCode} updated successfully and inventory stock synchronized.",
        'data'    => [
            'id'           => $saleCode,
            'db_id'        => $saleId,
            'sale_code'    => $saleCode,
            'productId'    => $newProduct['product_code'],
            'productDbId'  => $newProductId,
            'productName'  => $newProduct['name'],
            'customerName' => $customerName,
            'customerPhone'=> $customerPhone,
            'customerEmail'=> $customerEmail,
            'quantity'     => $newQty,
            'unitPrice'    => $unitPrice,
            'totalAmount'  => $totalAmount,
            'saleDate'     => $saleDate,
            'status'       => $newStatus,
            'notes'        => $notes
        ]
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update sale record in database.',
        'error'   => $e->getMessage()
    ]);
}
