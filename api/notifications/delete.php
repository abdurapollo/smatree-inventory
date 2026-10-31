<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Dismiss Notifications API
   Method: POST or DELETE
   Deletes notification records directly from MySQL database
   ========================================================================== */

if (!headers_sent()) {
    header('Content-Type: application/json; charset=UTF-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../auth_middleware.php';

// Authenticate session
$sessionUser = AuthMiddleware::authenticate();
$userId = (int)$sessionUser['user_id'];

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);
if (!is_array($data)) {
    $data = $_POST;
}

$id = isset($data['id']) ? trim((string)$data['id']) : (isset($_GET['id']) ? trim((string)$_GET['id']) : '');
$clearAll = !empty($data['clear_all']) || !empty($data['clearAll']) || (isset($_GET['clear_all']) && $_GET['clear_all'] == '1');

try {
    if ($clearAll) {
        $stmt = $pdo->prepare('DELETE FROM notifications');
        $stmt->execute();
        $deletedCount = $stmt->rowCount();

        echo json_encode([
            'success' => true,
            'message' => "All notifications dismissed from database ({$deletedCount} deleted)."
        ]);
        exit;
    }

    if (empty($id)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Notification ID / Code is required.']);
        exit;
    }

    if (is_numeric($id) && (int)$id > 0) {
        $stmt = $pdo->prepare('DELETE FROM notifications WHERE id = :id OR notif_code = :code');
        $stmt->execute([':id' => (int)$id, ':code' => (string)$id]);
    } else {
        $stmt = $pdo->prepare('DELETE FROM notifications WHERE notif_code = :code');
        $stmt->execute([':code' => (string)$id]);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Notification dismissed from database.',
        'id'      => $id
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database delete error: ' . $e->getMessage()
    ]);
}
