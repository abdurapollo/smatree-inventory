<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Mark Notifications Read API
   Method: POST
   Updates notification read status directly in MySQL database
   ========================================================================== */

if (!headers_sent()) {
    header('Content-Type: application/json; charset=UTF-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'POST') !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.']);
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

$id = isset($data['id']) ? trim((string)$data['id']) : (isset($data['notif_code']) ? trim((string)$data['notif_code']) : (isset($_GET['id']) ? trim((string)$_GET['id']) : ''));
$markAll = !empty($data['mark_all']) || !empty($data['markAll']) || (isset($_GET['mark_all']) && $_GET['mark_all'] == '1');

try {
    if ($markAll) {
        $stmt = $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
        $stmt->execute();
        $updatedCount = $stmt->rowCount();

        echo json_encode([
            'success' => true,
            'message' => "All notifications marked as read in database ({$updatedCount} updated).",
            'updated' => $updatedCount
        ]);
        exit;
    }

    if (empty($id)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Notification ID / Code is required.']);
        exit;
    }

    // Direct update by notif_code or primary key id
    if (is_numeric($id) && (int)$id > 0) {
        $stmt = $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE id = :id OR notif_code = :code');
        $stmt->execute([':id' => (int)$id, ':code' => (string)$id]);
    } else {
        $stmt = $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE notif_code = :code');
        $stmt->execute([':code' => (string)$id]);
    }

    $updated = $stmt->rowCount();

    echo json_encode([
        'success' => true,
        'message' => 'Notification marked as read in database.',
        'id'      => $id,
        'updated' => $updated
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database update error: ' . $e->getMessage()
    ]);
}
