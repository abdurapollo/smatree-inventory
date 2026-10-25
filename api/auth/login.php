<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Database Login API Endpoint
   Method: POST
   Payload: { "email": "...", "password": "..." }
   ========================================================================== */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Preflight OPTIONS handling
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.']);
    exit;
}

require_once __DIR__ . '/../db.php';

// Parse raw JSON or standard POST body
$rawInput = file_get_contents('php://input');
$inputData = json_decode($rawInput, true);

$email = '';
$password = '';

if (is_array($inputData)) {
    $email = isset($inputData['email']) ? trim($inputData['email']) : '';
    $password = isset($inputData['password']) ? (string)$inputData['password'] : '';
} elseif (!empty($_POST)) {
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $password = isset($_POST['password']) ? (string)$_POST['password'] : '';
}

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Please provide both email and password.'
    ]);
    exit;
}

try {
    // Search user by email in database
    $stmt = $pdo->prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1');
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email or password.'
        ]);
        exit;
    }

    // Check account status
    if ($user['status'] !== 'active') {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Account is inactive or suspended. Please contact administrator.'
        ]);
        exit;
    }

    // Verify bcrypt hash or plaintext fallback
    $passwordMatches = password_verify($password, $user['password']) || ($password === $user['password']);

    if (!$passwordMatches) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email or password.'
        ]);
        exit;
    }

    // If password was stored plaintext, automatically upgrade to bcrypt hash
    if ($password === $user['password'] && !password_verify($password, $user['password'])) {
        $newHash = password_hash($password, PASSWORD_BCRYPT);
        $upgradeStmt = $pdo->prepare('UPDATE users SET password = :hash WHERE id = :id');
        $upgradeStmt->execute([':hash' => $newHash, ':id' => $user['id']]);
    }

    // Update last_login timestamp
    $updateStmt = $pdo->prepare('UPDATE users SET last_login = NOW() WHERE id = :id');
    $updateStmt->execute([':id' => $user['id']]);

    // Generate session token
    $token = bin2hex(random_bytes(24));

    // Response user profile
    $userData = [
        'id'           => $user['user_code'],
        'db_id'        => (int)$user['id'],
        'user_code'    => $user['user_code'],
        'name'         => $user['name'],
        'display_name' => $user['display_name'],
        'email'        => $user['email'],
        'role'         => $user['role'],
        'role_label'   => $user['role_label'],
        'avatar'       => $user['avatar']
    ];

    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'token'   => $token,
        'user'    => $userData
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database query error',
        'error'   => $e->getMessage()
    ]);
}
