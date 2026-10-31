<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Enterprise Server-Side Auth & RBAC Middleware
   Enforces token validation, HttpOnly session handling, RBAC & audit logging.
   ========================================================================== */

require_once __DIR__ . '/db.php';

class AuthMiddleware {
    private static ?array $currentUser = null;

    // RBAC Permission Map (Server-Side Source of Truth)
    private static array $rolePermissions = [
        'Admin' => ['*'], // Master super admin access
        'Inventory Manager' => [
            'dashboard.view',
            'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete', 'inventory.export', 'inventory.adjust',
            'finishedGoods.view',
            'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete', 'suppliers.export',
            'reports.view', 'reports.export'
        ],
        'Production Manager' => [
            'dashboard.view',
            'inventory.view', // Read-only telemetry
            'production.view', 'production.create', 'production.edit', 'production.delete', 'production.export',
            'finishedGoods.view', 'finishedGoods.create', 'finishedGoods.edit', 'finishedGoods.delete', 'finishedGoods.export',
            'reports.view', 'reports.export'
        ],
        'Sales Manager' => [
            'dashboard.view',
            'finishedGoods.view', // Read-only for finished panels
            'installations.view', 'installations.create', 'installations.edit', 'installations.delete', 'installations.export',
            'sales.view', 'sales.create', 'sales.edit', 'sales.delete', 'sales.export',
            'reports.view', 'reports.export'
        ]
    ];

    /**
     * Extracts token from HttpOnly cookie or Authorization Bearer header
     */
    public static function getToken(): ?string {
        // 1. Check HTTP-Only Cookie
        if (!empty($_COOKIE['smatree_session_token'])) {
            return trim($_COOKIE['smatree_session_token']);
        }

        // 2. Check Authorization Bearer Header
        $headers = [];
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
        } else {
            foreach ($_SERVER as $key => $val) {
                if (substr($key, 0, 5) === 'HTTP_') {
                    $headerKey = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
                    $headers[$headerKey] = $val;
                }
            }
        }

        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
            return $matches[1];
        }

        // 3. Query string fallback for exports (secured with token)
        if (!empty($_GET['auth_token'])) {
            return trim($_GET['auth_token']);
        }

        return null;
    }

    /**
     * Authenticate incoming request. Exits with 401 if invalid.
     */
    public static function authenticate(): array {
        if (self::$currentUser !== null) {
            return self::$currentUser;
        }

        global $pdo;
        $token = self::getToken();

        if (empty($token)) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Authentication required. No valid session token provided.',
                'code' => 'AUTH_REQUIRED'
            ]);
            exit;
        }

        try {
            $stmt = $pdo->prepare('
                SELECT 
                    s.id AS session_id,
                    s.session_token,
                    s.expires_at,
                    u.id AS user_id,
                    u.user_code,
                    u.name,
                    u.display_name,
                    u.email,
                    u.role,
                    u.role_label,
                    u.avatar,
                    u.status
                FROM user_sessions s
                INNER JOIN users u ON s.user_id = u.id
                WHERE s.session_token = :token
                LIMIT 1
            ');
            $stmt->execute([':token' => $token]);
            $row = $stmt->fetch();

            if (!$row) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'message' => 'Session expired or invalid. Please sign in again.',
                    'code' => 'SESSION_INVALID'
                ]);
                exit;
            }

            // Check if account is active
            if ($row['status'] !== 'active') {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'message' => 'User account is inactive or suspended.',
                    'code' => 'ACCOUNT_SUSPENDED'
                ]);
                exit;
            }

            // Check expiration
            if (strtotime($row['expires_at']) < time()) {
                // Delete expired session
                $del = $pdo->prepare('DELETE FROM user_sessions WHERE id = :id');
                $del->execute([':id' => $row['session_id']]);

                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'message' => 'Session expired. Please sign in again.',
                    'code' => 'SESSION_EXPIRED'
                ]);
                exit;
            }

            // Update last activity sliding expiration (extend 8 hours if active)
            $update = $pdo->prepare('
                UPDATE user_sessions 
                SET last_activity = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL 8 HOUR) 
                WHERE id = :id
            ');
            $update->execute([':id' => $row['session_id']]);

            self::$currentUser = $row;
            return self::$currentUser;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Authentication service error.',
                'error' => $e->getMessage()
            ]);
            exit;
        }
    }

    /**
     * Check if authenticated user has specified permission
     */
    public static function checkPermission(string $permission): bool {
        $user = self::authenticate();
        $role = $user['role'];

        if (!isset(self::$rolePermissions[$role])) {
            return false;
        }

        $perms = self::$rolePermissions[$role];
        if (in_array('*', $perms, true)) {
            return true;
        }

        return in_array($permission, $perms, true);
    }

    /**
     * Enforce permission or exit 403 Forbidden
     */
    public static function requirePermission(string $permission): void {
        if (!self::checkPermission($permission)) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => "Access denied. Role does not have '{$permission}' permission.",
                'code' => 'FORBIDDEN'
            ]);
            exit;
        }
    }

    /**
     * Enforce role or exit 403 Forbidden
     */
    public static function requireRole(array $allowedRoles): void {
        $user = self::authenticate();
        if (!in_array($user['role'], $allowedRoles, true)) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Access denied. You do not have the required role to perform this action.',
                'code' => 'FORBIDDEN'
            ]);
            exit;
        }
    }

    /**
     * Issue session cookie & database session record
     */
    public static function createSession(int $userId): string {
        global $pdo;
        $token = bin2hex(random_bytes(32)); // Cryptographically secure 64-hex-char token
        $expiresAt = date('Y-m-d H:i:s', time() + (8 * 3600)); // 8 hours duration
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);

        // Delete any expired sessions for hygiene
        $pdo->query('DELETE FROM user_sessions WHERE expires_at < NOW()');

        $stmt = $pdo->prepare('
            INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
            VALUES (:user_id, :token, :ip, :ua, :expires)
        ');
        $stmt->execute([
            ':user_id' => $userId,
            ':token'   => $token,
            ':ip'      => $ip,
            ':ua'      => $ua,
            ':expires' => $expiresAt
        ]);

        // Set HttpOnly, Secure, SameSite=Lax cookie
        if (!headers_sent()) {
            $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? 80) == 443;
            setcookie('smatree_session_token', $token, [
                'expires'  => time() + (8 * 3600),
                'path'     => '/',
                'domain'   => '',
                'secure'   => $isHttps,
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
        }

        return $token;
    }

    /**
     * Destroy session on logout
     */
    public static function destroySession(): void {
        global $pdo;
        $token = self::getToken();
        if ($token) {
            $stmt = $pdo->prepare('DELETE FROM user_sessions WHERE session_token = :token');
            $stmt->execute([':token' => $token]);
        }

        // Clear cookie
        if (!headers_sent()) {
            setcookie('smatree_session_token', '', [
                'expires'  => time() - 3600,
                'path'     => '/',
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
        }

        self::$currentUser = null;
    }

    /**
     * Log an action to the immutable server-side audit trail
     */
    public static function logAudit(string $action, string $entity, ?string $entityId, string $description, $oldValues = null, $newValues = null): void {
        global $pdo;
        try {
            $user = self::$currentUser;
            $userId = $user ? (int)$user['user_id'] : null;
            $userName = $user ? ($user['name'] . ' (' . $user['role'] . ')') : 'System';
            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

            $oldJson = $oldValues !== null ? json_encode($oldValues, JSON_UNESCAPED_UNICODE) : null;
            $newJson = $newValues !== null ? json_encode($newValues, JSON_UNESCAPED_UNICODE) : null;

            $stmt = $pdo->prepare('
                INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, description, old_values, new_values, ip_address)
                VALUES (:user_id, :user_name, :action, :entity, :entity_id, :description, :old_val, :new_val, :ip)
            ');
            $stmt->execute([
                ':user_id'     => $userId,
                ':user_name'   => $userName,
                ':action'      => $action,
                ':entity'      => $entity,
                ':entity_id'   => $entityId,
                ':description' => $description,
                ':old_val'     => $oldJson,
                ':new_val'     => $newJson,
                ':ip'          => $ip
            ]);
        } catch (Exception $e) {
            // Error logging audit shouldn't crash the main query, but log error
            error_log('Audit log failure: ' . $e->getMessage());
        }
    }
}
