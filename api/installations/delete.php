<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Delete Installation API
   Method: POST / DELETE
   Payload: JSON with id/installation_code
   ========================================================================== */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'DELETE'])) {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed. Use POST or DELETE.']);
    exit;
}

require_once __DIR__ . '/../db.php';

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);

$idParam = $input['db_id'] ?? $input['id'] ?? $_GET['id'] ?? null;

if (!$idParam) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Installation ID or Code is required.']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT id, installation_code FROM installations WHERE id = :id OR installation_code = :code LIMIT 1');
    $stmt->execute([':id' => $idParam, ':code' => $idParam]);
    $inst = $stmt->fetch();

    if (!$inst) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => "Installation '{$idParam}' not found."]);
        exit;
    }

    $dbId = (int)$inst['id'];
    $code = $inst['installation_code'];

    $delStmt = $pdo->prepare('DELETE FROM installations WHERE id = :id');
    $delStmt->execute([':id' => $dbId]);

    echo json_encode([
        'success' => true,
        'message' => "Installation {$code} has been deleted."
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to delete installation.',
        'error'   => $e->getMessage()
    ]);
}
