<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Delete Supplier API Endpoint
   Method: POST or DELETE
   Deletes supplier from MySQL table suppliers
   ========================================================================== */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
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

$id = isset($data['id']) ? trim((string)$data['id']) : (isset($_GET['id']) ? trim((string)$_GET['id']) : '');
if (empty($id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Supplier ID or code is required.']);
    exit;
}

try {
    // Locate supplier
    $findStmt = $pdo->prepare('SELECT id, company FROM suppliers WHERE supplier_code = :code OR id = :id LIMIT 1');
    $findStmt->execute([':code' => $id, ':id' => is_numeric($id) ? (int)$id : 0]);
    $supplier = $findStmt->fetch();

    if (!$supplier) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Supplier record not found in database.']);
        exit;
    }

    $supplierId = (int)$supplier['id'];
    $company = $supplier['company'];

    // Delete supplier record (foreign key ON DELETE SET NULL handles references in purchased_raw_materials)
    $delStmt = $pdo->prepare('DELETE FROM suppliers WHERE id = :id');
    $delStmt->execute([':id' => $supplierId]);

    echo json_encode([
        'success' => true,
        'message' => "Supplier {$company} removed from database successfully."
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to delete supplier from database.',
        'error'   => $e->getMessage()
    ]);
}
