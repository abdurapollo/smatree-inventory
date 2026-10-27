<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Installations API Endpoint
   Method: GET
   Returns: JSON list of all installations and live statistics from MySQL
   ========================================================================== */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../db.php';

try {
    $statusFilter = isset($_GET['status']) ? trim($_GET['status']) : '';
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';

    $sql = '
        SELECT 
            inst.id, inst.installation_code, inst.customer_name, inst.phone, inst.email,
            inst.address, inst.panel_type, inst.product_id, inst.quantity_installed,
            inst.total_capacity, inst.installation_date, inst.team_assigned,
            inst.inverter_used, inst.battery_used, inst.warranty, inst.status,
            inst.notes, inst.photos, inst.created_at, inst.updated_at,
            p.product_code, p.name AS product_name
        FROM installations inst
        LEFT JOIN products p ON inst.product_id = p.id
    ';

    $where = [];
    $params = [];

    if ($statusFilter !== '') {
        $where[] = 'inst.status = :status';
        $params[':status'] = $statusFilter;
    }

    if ($search !== '') {
        $where[] = '(inst.installation_code LIKE :search OR inst.customer_name LIKE :search OR inst.address LIKE :search OR inst.panel_type LIKE :search OR inst.team_assigned LIKE :search)';
        $params[':search'] = '%' . $search . '%';
    }

    if (!empty($where)) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $sql .= ' ORDER BY inst.id DESC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $data = array_map(function($r) {
        return [
            'id'                => $r['installation_code'],
            'db_id'             => (int)$r['id'],
            'installationCode'  => $r['installation_code'],
            'installation_code' => $r['installation_code'],
            'customerName'      => $r['customer_name'],
            'customer_name'     => $r['customer_name'],
            'phone'             => $r['phone'],
            'email'             => $r['email'],
            'address'           => $r['address'],
            'panelType'         => $r['panel_type'],
            'panel_type'        => $r['panel_type'],
            'productId'         => $r['product_id'] ? (int)$r['product_id'] : null,
            'productCode'       => $r['product_code'],
            'productName'       => $r['product_name'],
            'quantityInstalled' => (int)$r['quantity_installed'],
            'quantity_installed'=> (int)$r['quantity_installed'],
            'totalCapacity'     => (float)$r['total_capacity'],
            'total_capacity'    => (float)$r['total_capacity'],
            'installationDate'  => $r['installation_date'],
            'installation_date' => $r['installation_date'],
            'teamAssigned'      => $r['team_assigned'],
            'team_assigned'     => $r['team_assigned'],
            'installationTeam'  => $r['team_assigned'],
            'inverterUsed'      => $r['inverter_used'],
            'inverter_used'     => $r['inverter_used'],
            'batteryUsed'       => $r['battery_used'],
            'battery_used'      => $r['battery_used'],
            'warranty'          => $r['warranty'],
            'status'            => $r['status'],
            'notes'             => $r['notes'],
            'photos'            => $r['photos'],
            'createdAt'         => $r['created_at'],
            'updatedAt'         => $r['updated_at']
        ];
    }, $rows);

    // Dynamic stats computation
    $statsStmt = $pdo->query('
        SELECT 
            COUNT(*) AS total_installations,
            COALESCE(SUM(total_capacity), 0) AS total_capacity,
            COALESCE(SUM(CASE WHEN status = "In Progress" THEN 1 ELSE 0 END), 0) AS active_projects,
            COALESCE(SUM(CASE WHEN status = "Completed" THEN 1 ELSE 0 END), 0) AS completed_projects,
            COALESCE(SUM(quantity_installed), 0) AS total_panels_installed
        FROM installations
    ');
    $stats = $statsStmt->fetch();

    echo json_encode([
        'success' => true,
        'count'   => count($data),
        'stats'   => [
            'totalInstallations'   => (int)$stats['total_installations'],
            'totalCapacity'        => (float)$stats['total_capacity'],
            'activeProjects'       => (int)$stats['active_projects'],
            'completedProjects'    => (int)$stats['completed_projects'],
            'totalPanelsInstalled' => (int)$stats['total_panels_installed']
        ],
        'data'    => $data
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to retrieve installations.',
        'error'   => $e->getMessage()
    ]);
}
