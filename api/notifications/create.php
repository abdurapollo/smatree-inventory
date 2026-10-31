<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Create Notification API
   Method: POST
   Inserts a new notification into MySQL table notifications
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

$title       = isset($data['title']) ? trim(strip_tags((string)$data['title'])) : 'System Notification';
$message     = isset($data['message']) ? trim(strip_tags((string)$data['message'])) : '';
$category    = isset($data['category']) ? trim((string)$data['category']) : 'system';
$severity    = isset($data['severity']) && in_array($data['severity'], ['info', 'warning', 'success', 'critical'], true) ? $data['severity'] : 'info';
$link        = isset($data['link']) ? trim((string)$data['link']) : '#';
$actionLabel = isset($data['actionLabel']) ? trim((string)$data['actionLabel']) : (isset($data['action_label']) ? trim((string)$data['action_label']) : 'View');
$entityId    = isset($data['entityId']) ? trim((string)$data['entityId']) : null;
$code        = isset($data['id']) ? trim((string)$data['id']) : ('manual-' . time() . '-' . mt_rand(100, 999));

if (empty($message)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Notification message is required.']);
    exit;
}

try {
    $stmt = $pdo->prepare('
        INSERT INTO notifications 
            (notif_code, user_id, category, severity, title, message, link, action_label, entity_id, is_read, is_manual)
        VALUES 
            (:code, :uid, :category, :severity, :title, :message, :link, :action_label, :entity_id, 0, 1)
        ON DUPLICATE KEY UPDATE
            title        = VALUES(title),
            message      = VALUES(message),
            severity     = VALUES(severity),
            link         = VALUES(link),
            action_label = VALUES(action_label),
            updated_at   = NOW()
    ');

    $stmt->execute([
        ':code'         => $code,
        ':uid'          => $userId,
        ':category'     => $category,
        ':severity'     => $severity,
        ':title'        => $title,
        ':message'      => $message,
        ':link'         => $link,
        ':action_label' => $actionLabel,
        ':entity_id'    => $entityId
    ]);

    $newId = (int)$pdo->lastInsertId();

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Notification created.',
        'data'    => [
            'id'          => $code,
            'db_id'       => $newId,
            'category'    => $category,
            'severity'    => $severity,
            'title'       => $title,
            'message'     => $message,
            'link'        => $link,
            'actionLabel' => $actionLabel,
            'entityId'    => $entityId,
            'read'        => false,
            'isManual'    => true,
            'timestamp'   => date('Y-m-d H:i:s')
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to create notification.',
        'error'   => $e->getMessage()
    ]);
}
