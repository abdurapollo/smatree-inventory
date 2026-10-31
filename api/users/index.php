<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Users List API Endpoint
   Method: GET
   Returns all system users for Super Admin management (passwords omitted).
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

require_once __DIR__ . '/../db.php';

try {
    $stmt = $pdo->query('
        SELECT 
            id, 
            user_code, 
            name, 
            display_name, 
            email, 
            role, 
            role_label, 
            avatar, 
            status, 
            last_login, 
            created_at, 
            updated_at 
        FROM users 
        ORDER BY id ASC
    ');

    $rows = $stmt->fetchAll();

    $departmentMap = [
        'Admin' => 'Executive Operations',
        'Inventory Manager' => 'Supply Chain & Raw Materials',
        'Production Manager' => 'Manufacturing & Engineering',
        'Sales Manager' => 'Commercial Sales & Projects'
    ];

    $users = [];
    foreach ($rows as $r) {
        $users[] = [
            'id'           => $r['user_code'],
            'db_id'        => (int)$r['id'],
            'user_code'    => $r['user_code'],
            'name'         => $r['name'],
            'displayName'  => $r['display_name'],
            'display_name' => $r['display_name'],
            'email'        => $r['email'],
            'role'         => $r['role'],
            'roleLabel'    => $r['role_label'],
            'role_label'   => $r['role_label'],
            'department'   => isset($departmentMap[$r['role']]) ? $departmentMap[$r['role']] : 'Solar Factory Operations',
            'avatar'       => $r['avatar'],
            'status'       => $r['status'] ?: 'active',
            'last_login'   => $r['last_login'],
            'createdAt'    => $r['created_at'],
            'updatedAt'    => $r['updated_at']
        ];
    }

    echo json_encode([
        'success' => true,
        'count'   => count($users),
        'data'    => $users
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database query failed.',
        'error'   => $e->getMessage()
    ]);
}
