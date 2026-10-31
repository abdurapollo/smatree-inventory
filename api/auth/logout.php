<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Logout API Endpoint
   Method: POST
   Destroys server-side session token and clears cookie.
   ========================================================================== */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../auth_middleware.php';

try {
    $token = AuthMiddleware::getToken();
    if ($token) {
        $stmt = $pdo->prepare('
            SELECT s.user_id, u.email, u.role 
            FROM user_sessions s
            INNER JOIN users u ON s.user_id = u.id
            WHERE s.session_token = :token
            LIMIT 1
        ');
        $stmt->execute([':token' => $token]);
        $sess = $stmt->fetch();
        if ($sess) {
            AuthMiddleware::logAudit('logout', 'auth', (string)$sess['user_id'], "User signed out: {$sess['email']} ({$sess['role']})");
        }
    }

    AuthMiddleware::destroySession();

    echo json_encode([
        'success' => true,
        'message' => 'Signed out successfully.'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error during logout: ' . $e->getMessage()
    ]);
}

