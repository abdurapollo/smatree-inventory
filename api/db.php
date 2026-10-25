<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Database Connection (PDO)
   Connects to MySQL database: smatree_inventory
   ========================================================================== */

$dbHost = 'localhost';
$dbName = 'smatree_inventory';
$dbUser = 'root';
$dbPass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host={$dbHost};dbname={$dbName};charset={$charset}";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $dbUser, $dbPass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed. Please ensure MySQL is running in XAMPP.',
        'error'   => $e->getMessage()
    ]);
    exit;
}
