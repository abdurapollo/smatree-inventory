<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Immutable Audit Logs API Endpoint
   Method: GET
   Returns: Recent server-side audit logs from MySQL
   ========================================================================== */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../auth_middleware.php';

// Requires authentication
$user = AuthMiddleware::authenticate();

$limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 20;

try {
    $stmt = $pdo->prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT :limit');
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $activities = array_map(function($r) {
        return [
            'id'          => 'ACT-' . str_pad((string)$r['id'], 4, '0', STR_PAD_LEFT),
            'action'      => $r['action'],
            'entity'      => $r['entity'],
            'entityId'    => $r['entity_id'],
            'description' => $r['description'],
            'user'        => $r['user_name'] ?? 'System',
            'timestamp'   => $r['created_at'],
            'ip'          => $r['ip_address']
        ];
    }, $rows);

    echo json_encode([
        'success' => true,
        'data'    => $activities
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

