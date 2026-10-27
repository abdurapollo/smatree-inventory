<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Delete Purchased Raw Material API
   Method: POST or DELETE
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

$id = isset($data['id']) ? trim($data['id']) : (isset($_GET['id']) ? trim($_GET['id']) : '');
if (empty($id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Material ID / Code is required.']);
    exit;
}

try {
    $stmt = $pdo->prepare('DELETE FROM purchased_raw_materials WHERE material_code = :code OR id = :id');
    $stmt->execute([':code' => $id, ':id' => is_numeric($id) ? (int)$id : 0]);

    if ($stmt->rowCount() > 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Material record removed from database successfully.'
        ]);
    } else {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Material record not found in database.'
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to delete material record from database.',
        'error'   => $e->getMessage()
    ]);
}
