<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Create Installation API
   Method: POST
   Payload: JSON installation details
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
$input = json_decode($raw, true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON payload.']);
    exit;
}

$customerName      = trim($input['customerName'] ?? $input['customer_name'] ?? '');
$phone             = trim($input['phone'] ?? '');
$email             = trim($input['email'] ?? '');
$address           = trim($input['address'] ?? '');
$panelType         = trim($input['panelType'] ?? $input['panel_type'] ?? '');
$quantityInstalled = (int)($input['quantityInstalled'] ?? $input['quantity_installed'] ?? 1);
$totalCapacity     = (float)($input['totalCapacity'] ?? $input['total_capacity'] ?? 0.00);
$installationDate  = trim($input['installationDate'] ?? $input['installation_date'] ?? date('Y-m-d'));
$teamAssigned      = trim($input['teamAssigned'] ?? $input['installationTeam'] ?? $input['team_assigned'] ?? '');
$inverterUsed      = trim($input['inverterUsed'] ?? $input['inverter_used'] ?? '');
$batteryUsed       = trim($input['batteryUsed'] ?? $input['battery_used'] ?? '');
$warranty          = trim($input['warranty'] ?? '');
$status            = trim($input['status'] ?? 'In Progress');
$notes             = trim($input['notes'] ?? '');
$productId         = !empty($input['productId'] ?? $input['product_id'] ?? null) ? (int)($input['productId'] ?? $input['product_id']) : null;

// Validation
if (empty($customerName)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Customer Name is required.']);
    exit;
}

if (empty($phone)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Phone number is required.']);
    exit;
}

if (empty($address)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Installation address is required.']);
    exit;
}

if (empty($panelType)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Panel Type is required.']);
    exit;
}

if ($quantityInstalled <= 0) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Quantity installed must be at least 1.']);
    exit;
}

if ($totalCapacity <= 0) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Total capacity (kW) must be greater than 0.']);
    exit;
}

try {
    // 1. Generate unique installation code
    $stmtCode = $pdo->query('SELECT MAX(id) AS max_id FROM installations');
    $maxId = (int)$stmtCode->fetchColumn();
    $nextCode = 'INST-' . str_pad($maxId + 1, 3, '0', STR_PAD_LEFT);

    if (!empty($input['id']) && strpos($input['id'], 'INST-') === 0) {
        $checkStmt = $pdo->prepare('SELECT COUNT(*) FROM installations WHERE installation_code = :c');
        $checkStmt->execute([':c' => $input['id']]);
        if ($checkStmt->fetchColumn() == 0) {
            $nextCode = $input['id'];
        }
    }

    // 2. Insert into database
    $stmt = $pdo->prepare('
        INSERT INTO installations
        (installation_code, customer_name, phone, email, address, panel_type, product_id, quantity_installed, total_capacity, installation_date, team_assigned, inverter_used, battery_used, warranty, status, notes)
        VALUES
        (:code, :customer_name, :phone, :email, :address, :panel_type, :product_id, :quantity_installed, :total_capacity, :installation_date, :team_assigned, :inverter_used, :battery_used, :warranty, :status, :notes)
    ');

    $stmt->execute([
        ':code'               => $nextCode,
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
        ':notes'              => $notes ?: null
    ]);

    $newId = (int)$pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'message' => "Installation project {$nextCode} created successfully.",
        'data'    => [
            'id'                => $nextCode,
            'db_id'             => $newId,
            'installationCode'  => $nextCode,
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
        'message' => 'Failed to create installation record.',
        'error'   => $e->getMessage()
    ]);
}
