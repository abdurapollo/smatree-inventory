<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Check Session API Endpoint
   Method: GET
   Returns authenticated user details or 401 if session invalid/expired.
   ========================================================================== */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use GET.']);
    exit;
}

require_once __DIR__ . '/../auth_middleware.php';

// Validates token against database & checks status
$sessionUser = AuthMiddleware::authenticate();

echo json_encode([
    'success' => true,
    'user' => [
        'id'           => $sessionUser['user_code'],
        'db_id'        => (int)$sessionUser['user_id'],
        'user_code'    => $sessionUser['user_code'],
        'name'         => $sessionUser['name'],
        'display_name' => $sessionUser['display_name'],
        'email'        => $sessionUser['email'],
        'role'         => $sessionUser['role'],
        'role_label'   => $sessionUser['role_label'],
        'avatar'       => $sessionUser['avatar']
    ]
]);

