<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Create User API Endpoint
   Method: POST
   Super Admin privileged operation to provision new enterprise user accounts.
   Validates inputs, ensures unique email, hashes password with Bcrypt,
   assigns user_code (USR-XXX), and inserts into MySQL `users` table.
   ========================================================================== */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

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

// Parse raw JSON or POST body
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);
if (!is_array($data)) {
    $data = $_POST;
}

// Extract & sanitize fields
$name        = isset($data['name']) ? trim(strip_tags((string)$data['name'])) : '';
$displayName = isset($data['display_name']) ? trim(strip_tags((string)$data['display_name'])) : (isset($data['displayName']) ? trim(strip_tags((string)$data['displayName'])) : '');
$email       = isset($data['email']) ? trim(strip_tags(strtolower((string)$data['email']))) : '';
$password    = isset($data['password']) ? (string)$data['password'] : '';
$role        = isset($data['role']) ? trim(strip_tags((string)$data['role'])) : '';
$roleLabel   = isset($data['role_label']) ? trim(strip_tags((string)$data['role_label'])) : (isset($data['roleLabel']) ? trim(strip_tags((string)$data['roleLabel'])) : '');
$department  = isset($data['department']) ? trim(strip_tags((string)$data['department'])) : '';
$avatar      = isset($data['avatar']) ? trim((string)$data['avatar']) : null;
$status      = isset($data['status']) && in_array(strtolower($data['status']), ['active', 'inactive', 'suspended']) ? strtolower($data['status']) : 'active';

// Standard role metadata mappings
$validRoles = [
    'Admin' => [
        'defaultLabel' => 'Super Admin',
        'defaultDept'  => 'Executive Operations'
    ],
    'Inventory Manager' => [
        'defaultLabel' => 'Inventory Lead',
        'defaultDept'  => 'Supply Chain & Raw Materials'
    ],
    'Production Manager' => [
        'defaultLabel' => 'Plant Manager',
        'defaultDept'  => 'Manufacturing & Engineering'
    ],
    'Sales Manager' => [
        'defaultLabel' => 'Sales Director',
        'defaultDept'  => 'Commercial Sales & Projects'
    ]
];

$errors = [];

// 1. Full Name Validation
if ($name === '') {
    $errors['name'] = 'Full name is required.';
} elseif (mb_strlen($name) < 2 || mb_strlen($name) > 100) {
    $errors['name'] = 'Full name must be between 2 and 100 characters.';
} elseif (!preg_match('/^[\p{L}\s\.\'\-]+$/u', $name)) {
    $errors['name'] = 'Full name can only contain letters, spaces, dots, and hyphens.';
}

// 2. Email Validation
if ($email === '') {
    $errors['email'] = 'Corporate email address is required.';
} elseif (mb_strlen($email) > 150) {
    $errors['email'] = 'Email cannot exceed 150 characters.';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Please provide a valid email format (e.g. name@smatree.com).';
}

// 3. Password Validation
if ($password === '') {
    $errors['password'] = 'Password is required.';
} elseif (mb_strlen($password) < 4) {
    $errors['password'] = 'Password must be at least 4 characters long.';
} elseif (mb_strlen($password) > 100) {
    $errors['password'] = 'Password cannot exceed 100 characters.';
}

// 4. Role Validation
if ($role === '') {
    $errors['role'] = 'Please assign an enterprise role.';
} elseif (!isset($validRoles[$role])) {
    // Check case-insensitive match
    $matchedRole = null;
    foreach ($validRoles as $k => $v) {
        if (strcasecmp($k, $role) === 0) {
            $matchedRole = $k;
            break;
        }
    }
    if ($matchedRole) {
        $role = $matchedRole;
    } else {
        $errors['role'] = 'Invalid role specified. Must be Admin, Inventory Manager, Production Manager, or Sales Manager.';
    }
}

// Derive Display Name if not provided
if ($displayName === '' && $name !== '') {
    $parts = preg_split('/\s+/', $name);
    if (count($parts) >= 2) {
        $displayName = $parts[0] . ' ' . strtoupper(substr(end($parts), 0, 1)) . '.';
    } else {
        $displayName = $parts[0];
    }
}

// Set default Role Label if omitted
if ($roleLabel === '' && isset($validRoles[$role])) {
    $roleLabel = $validRoles[$role]['defaultLabel'];
}

// Set default Department if omitted
if ($department === '' && isset($validRoles[$role])) {
    $department = $validRoles[$role]['defaultDept'];
}

// Return validation errors if any
if (!empty($errors)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Please correct the validation errors.',
        'errors'  => $errors
    ]);
    exit;
}

try {
    // Check for duplicate email
    $dupStmt = $pdo->prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1');
    $dupStmt->execute([':email' => $email]);
    if ($dupStmt->fetch()) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'An account with this email address already exists.',
            'errors'  => ['email' => 'An account with this email address already exists.']
        ]);
        exit;
    }

    // Generate unique sequential user_code (e.g. USR-005)
    $stmtMax = $pdo->query("SELECT user_code FROM users WHERE user_code REGEXP '^USR-[0-9]+' ORDER BY id DESC LIMIT 1");
    $lastCode = $stmtMax->fetchColumn();

    $nextNum = 1;
    if ($lastCode && preg_match('/USR-(\d+)/', $lastCode, $m)) {
        $nextNum = (int)$m[1] + 1;
    } else {
        $cntStmt = $pdo->query('SELECT COUNT(*) FROM users');
        $nextNum = (int)$cntStmt->fetchColumn() + 1;
    }
    $userCode = sprintf('USR-%03d', $nextNum);

    // Double-check uniqueness of user_code
    $uniqStmt = $pdo->prepare('SELECT id FROM users WHERE user_code = :code');
    $uniqStmt->execute([':code' => $userCode]);
    if ($uniqStmt->fetch()) {
        $userCode = 'USR-' . sprintf('%03d', $nextNum + rand(10, 99));
    }

    // Securely hash password with Bcrypt
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

    // Insert user record into MySQL database
    $insertSql = 'INSERT INTO users (user_code, name, display_name, email, password, role, role_label, avatar, status, created_at, updated_at)
                  VALUES (:user_code, :name, :display_name, :email, :password, :role, :role_label, :avatar, :status, NOW(), NOW())';
    
    $insertStmt = $pdo->prepare($insertSql);
    $insertStmt->execute([
        ':user_code'    => $userCode,
        ':name'         => $name,
        ':display_name' => $displayName,
        ':email'        => $email,
        ':password'     => $hashedPassword,
        ':role'         => $role,
        ':role_label'   => $roleLabel,
        ':avatar'       => $avatar ?: null,
        ':status'       => $status
    ]);

    $newId = (int)$pdo->lastInsertId();

    $newUser = [
        'id'           => $userCode,
        'db_id'        => $newId,
        'user_code'    => $userCode,
        'name'         => $name,
        'displayName'  => $displayName,
        'display_name' => $displayName,
        'email'        => $email,
        'role'         => $role,
        'roleLabel'    => $roleLabel,
        'role_label'   => $roleLabel,
        'department'   => $department,
        'avatar'       => $avatar,
        'status'       => $status,
        'createdAt'    => date('Y-m-d H:i:s')
    ];

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => "User {$displayName} ({$roleLabel}) created successfully.",
        'data'    => $newUser
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to create user in database.',
        'error'   => $e->getMessage()
    ]);
}
