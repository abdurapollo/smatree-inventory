<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Notifications Listing API
   Method: GET
   Fetches operational notifications and unread alerts directly from MySQL
   ========================================================================== */

if (!headers_sent()) {
    header('Content-Type: application/json; charset=UTF-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use GET.']);
    exit;
}

require_once __DIR__ . '/../auth_middleware.php';

// Authenticate session
$sessionUser = AuthMiddleware::authenticate();
$userId = (int)$sessionUser['user_id'];

$category   = isset($_GET['category']) ? trim((string)$_GET['category']) : 'all';
$unreadOnly = !empty($_GET['unread_only']) && $_GET['unread_only'] !== '0';
$limit      = isset($_GET['limit']) && is_numeric($_GET['limit']) ? min(150, max(1, (int)$_GET['limit'])) : 80;

try {
    $where = ['(user_id IS NULL OR user_id = :uid)'];
    $params = [':uid' => $userId];

    if ($category !== 'all' && !empty($category)) {
        $where[] = 'category = :category';
        $params[':category'] = $category;
    }

    if ($unreadOnly) {
        $where[] = 'is_read = 0';
    }

    $whereClause = implode(' AND ', $where);

    // Fetch notifications: unread first, then latest created
    $sql = "
        SELECT 
            id,
            notif_code,
            user_id,
            category,
            severity,
            title,
            message,
            link,
            action_label,
            entity_id,
            is_read,
            is_manual,
            created_at,
            updated_at
        FROM notifications
        WHERE {$whereClause}
        ORDER BY is_read ASC, created_at DESC
        LIMIT :limit
    ";

    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    // Calculate total unread count
    $countStmt = $pdo->prepare('
        SELECT COUNT(*) AS unread_total 
        FROM notifications 
        WHERE (user_id IS NULL OR user_id = :uid) AND is_read = 0
    ');
    $countStmt->execute([':uid' => $userId]);
    $unreadCount = (int)$countStmt->fetchColumn();

    // Map to frontend expected notification model
    $data = array_map(function($r) {
        return [
            'id'          => $r['notif_code'],
            'db_id'       => (int)$r['id'],
            'category'    => $r['category'],
            'severity'    => $r['severity'],
            'title'       => $r['title'],
            'message'     => $r['message'],
            'link'        => $r['link'] ?: '#',
            'actionLabel' => $r['action_label'] ?: 'View',
            'entityId'    => $r['entity_id'],
            'read'        => (int)$r['is_read'] === 1,
            'isManual'    => (int)$r['is_manual'] === 1,
            'timestamp'   => $r['created_at']
        ];
    }, $rows);

    echo json_encode([
        'success'      => true,
        'data'         => $data,
        'unread_count' => $unreadCount
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error loading notifications.',
        'error'   => $e->getMessage()
    ]);
}
