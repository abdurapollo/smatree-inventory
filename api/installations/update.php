<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Update Installation API
   Method: POST / PUT
   Payload: JSON installation updates
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
    echo json_encode(['success' => false, 'message' => 'Installation ID or Code is required.']);
    exit;
}

try {
    $selectStmt = $pdo->prepare('
        SELECT * FROM installations 
        WHERE id = :id OR installation_code = :code LIMIT 1
    ');
    $selectStmt->execute([':id' => $idParam, ':code' => $idParam]);
    $inst = $selectStmt->fetch();

    if (!$inst) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => "Installation '{$idParam}' not found."]);
        exit;
    }

    $dbId     = (int)$inst['id'];
    $code     = $inst['installation_code'];

    $customerName      = trim($input['customerName'] ?? $input['customer_name'] ?? $inst['customer_name']);
    $phone             = trim($input['phone'] ?? $inst['phone']);
    $email             = array_key_exists('email', $input) ? trim($input['email']) : $inst['email'];
    $address           = trim($input['address'] ?? $inst['address']);
    $panelType         = trim($input['panelType'] ?? $input['panel_type'] ?? $inst['panel_type']);
    $quantityInstalled = isset($input['quantityInstalled']) || isset($input['quantity_installed'])
                         ? (int)($input['quantityInstalled'] ?? $input['quantity_installed'])
                         : (int)$inst['quantity_installed'];
    $totalCapacity     = isset($input['totalCapacity']) || isset($input['total_capacity'])
                         ? (float)($input['totalCapacity'] ?? $input['total_capacity'])
                         : (float)$inst['total_capacity'];
    $installationDate  = trim($input['installationDate'] ?? $input['installation_date'] ?? $inst['installation_date']);
    $teamAssigned      = trim($input['teamAssigned'] ?? $input['installationTeam'] ?? $input['team_assigned'] ?? $inst['team_assigned']);
    $inverterUsed      = array_key_exists('inverterUsed', $input) || array_key_exists('inverter_used', $input)
                         ? trim($input['inverterUsed'] ?? $input['inverter_used'] ?? '')
                         : $inst['inverter_used'];
    $batteryUsed       = array_key_exists('batteryUsed', $input) || array_key_exists('battery_used', $input)
                         ? trim($input['batteryUsed'] ?? $input['battery_used'] ?? '')
                         : $inst['battery_used'];
    $warranty          = array_key_exists('warranty', $input) ? trim($input['warranty']) : $inst['warranty'];
    $status            = trim($input['status'] ?? $inst['status']);
    $notes             = array_key_exists('notes', $input) ? trim($input['notes']) : $inst['notes'];
    $productId         = array_key_exists('productId', $input) || array_key_exists('product_id', $input)
                         ? (!empty($input['productId'] ?? $input['product_id']) ? (int)($input['productId'] ?? $input['product_id']) : null)
                         : ($inst['product_id'] ? (int)$inst['product_id'] : null);

    $updateStmt = $pdo->prepare('
        UPDATE installations SET
            customer_name      = :customer_name,
            phone              = :phone,
            email              = :email,
            address            = :address,
            panel_type         = :panel_type,
            product_id         = :product_id,
            quantity_installed = :quantity_installed,
            total_capacity     = :total_capacity,
            installation_date  = :installation_date,
            team_assigned      = :team_assigned,
            inverter_used      = :inverter_used,
            battery_used       = :battery_used,
            warranty           = :warranty,
            status             = :status,
            notes              = :notes,
            updated_at         = CURRENT_TIMESTAMP
        WHERE id = :id
    ');

    $updateStmt->execute([
        ':customer_name'      => $customerName,
        ':phone'              => $phone,
        ':email'              => $email ?: null,
        ':address'            => $address,
        ':panel_type'         => $panelType,
        ':product_id'         => $productId,
        ':quantity_installed' => $quantityInstalled,
        ':total_capacity'     => $totalCapacity,
        ':installation_date'  => $installationDate,
        ':team_assigned'      => $teamAssigned ?: null,
        ':inverter_used'      => $inverterUsed ?: null,
        ':battery_used'       => $batteryUsed ?: null,
        ':warranty'           => $warranty ?: null,
        ':status'             => $status,
        ':notes'              => $notes ?: null,
        ':id'                 => $dbId
    ]);

    echo json_encode([
        'success' => true,
        'message' => "Installation {$code} updated successfully.",
        'data'    => [
            'id'                => $code,
            'db_id'             => $dbId,
            'installationCode'  => $code,
            'customerName'      => $customerName,
            'phone'             => $phone,
            'email'             => $email,
            'address'           => $address,
            'panelType'         => $panelType,
            'quantityInstalled' => $quantityInstalled,
            'totalCapacity'     => $totalCapacity,
            'installationDate'  => $installationDate,
            'teamAssigned'      => $teamAssigned,
            'installationTeam'  => $teamAssigned,
            'inverterUsed'      => $inverterUsed,
            'batteryUsed'       => $batteryUsed,
            'warranty'          => $warranty,
            'status'            => $status,
            'notes'             => $notes
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update installation record.',
        'error'   => $e->getMessage()
    ]);
}
