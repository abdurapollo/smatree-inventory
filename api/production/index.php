<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Production Batches API Endpoint
   Method: GET
   Returns: JSON list of all batches and live production stats from MySQL
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
    // 1. Fetch all production batches
    $statusFilter = isset($_GET['status']) ? trim($_GET['status']) : '';
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';

    $sql = '
        SELECT 
            pb.id, pb.batch_code, pb.product_id, pb.panel_type, pb.watt_capacity,
            pb.quantity, pb.team_assigned, pb.start_date, pb.completion_date,
            pb.status, pb.progress, pb.production_cost, pb.materials_used, pb.notes,
            pb.created_at, pb.updated_at,
            p.product_code, p.name AS product_name
        FROM production_batches pb
        LEFT JOIN products p ON pb.product_id = p.id
    ';

    $where = [];
    $params = [];

    if ($statusFilter !== '') {
        $where[] = 'pb.status = :status';
        $params[':status'] = $statusFilter;
    }

    if ($search !== '') {
        $where[] = '(pb.batch_code LIKE :search OR pb.panel_type LIKE :search OR pb.team_assigned LIKE :search)';
        $params[':search'] = '%' . $search . '%';
    }

    if (!empty($where)) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $sql .= ' ORDER BY pb.id DESC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $batches = $stmt->fetchAll();

    $data = array_map(function($b) {
        return [
            'id'             => $b['batch_code'],
            'db_id'          => (int)$b['id'],
            'batchCode'      => $b['batch_code'],
            'batch_code'     => $b['batch_code'],
            'productId'      => $b['product_id'] ? (int)$b['product_id'] : null,
            'productCode'    => $b['product_code'],
            'productName'    => $b['product_name'],
            'panelType'      => $b['panel_type'],
            'panel_type'     => $b['panel_type'],
            'wattCapacity'   => (int)$b['watt_capacity'],
            'watt_capacity'  => (int)$b['watt_capacity'],
            'quantity'       => (int)$b['quantity'],
            'teamAssigned'   => $b['team_assigned'],
            'team_assigned'  => $b['team_assigned'],
            'startDate'      => $b['start_date'],
            'start_date'     => $b['start_date'],
            'completionDate' => $b['completion_date'],
            'completion_date'=> $b['completion_date'],
            'status'         => $b['status'],
            'progress'       => (int)$b['progress'],
            'productionCost' => (float)$b['production_cost'],
            'production_cost'=> (float)$b['production_cost'],
            'materialsUsed'  => $b['materials_used'],
            'materials_used' => $b['materials_used'],
            'notes'          => $b['notes'],
            'createdAt'      => $b['created_at'],
            'updatedAt'      => $b['updated_at']
        ];
    }, $batches);

    // 2. Compute aggregate production stats
    $statsStmt = $pdo->query('
        SELECT 
            COUNT(*) AS total_batches,
            COALESCE(SUM(CASE WHEN status = "In Production" THEN 1 ELSE 0 END), 0) AS in_progress,
            COALESCE(SUM(CASE WHEN status = "Completed" THEN 1 ELSE 0 END), 0) AS completed,
            COALESCE(SUM(CASE WHEN status = "Quality Check" THEN 1 ELSE 0 END), 0) AS quality_check,
            COALESCE(SUM(CASE WHEN status = "Pending" THEN 1 ELSE 0 END), 0) AS pending,
            COALESCE(SUM(CASE WHEN status = "Completed" THEN quantity ELSE 0 END), 0) AS total_panels,
            COALESCE(SUM(CASE WHEN status = "Completed" AND MONTH(completion_date) = MONTH(CURRENT_DATE()) AND YEAR(completion_date) = YEAR(CURRENT_DATE()) THEN quantity ELSE 0 END), 0) AS monthly_production
        FROM production_batches
    ');
    $statsRow = $statsStmt->fetch();

    echo json_encode([
        'success' => true,
        'count'   => count($data),
        'stats'   => [
            'totalBatches'      => (int)$statsRow['total_batches'],
            'inProgress'        => (int)$statsRow['in_progress'],
            'completed'         => (int)$statsRow['completed'],
            'qualityCheck'      => (int)$statsRow['quality_check'],
            'pending'           => (int)$statsRow['pending'],
            'totalPanels'       => (int)$statsRow['total_panels'],
            'monthlyProduction' => (int)$statsRow['monthly_production']
        ],
        'data'    => $data
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to retrieve production batches.',
        'error'   => $e->getMessage()
    ]);
}
