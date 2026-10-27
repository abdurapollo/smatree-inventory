<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Purchased Raw Materials Listing API
   Method: GET
   Returns: JSON list of all raw materials from MySQL table purchased_raw_materials
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
    $sql = 'SELECT p.*, s.supplier_code 
            FROM purchased_raw_materials p 
            LEFT JOIN suppliers s ON p.supplier_id = s.id 
            ORDER BY p.id DESC';
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll();

    $descriptiveNames = [
        'MAT-001' => 'Monocrystalline Solar Cell 6x6',
        'MAT-002' => 'Polycrystalline Solar Cell 6x6',
        'MAT-003' => 'Tempered Solar Glass 3.2mm',
        'MAT-004' => 'Aluminum Frame Profile 40x35mm',
        'MAT-005' => 'EVA Encapsulant Film 0.5mm',
        'MAT-006' => 'TPT Backsheet White',
        'MAT-007' => 'IP67 Junction Box 3-Diode',
        'MAT-008' => 'Tinned Copper Ribbon 1.5x0.2mm',
        'MAT-009' => 'Grid-Tie Inverter 5kW',
        'MAT-010' => 'Lithium Battery 5kWh',
        'MAT-011' => 'Rooftop Mounting Rails 4.2m',
        'MAT-012' => 'Hybrid Inverter 10kW',
    ];

    // Map to frontend expected object structure
    $items = array_map(function($r) use ($descriptiveNames) {
        $code = $r['material_code'];
        $name = $descriptiveNames[$code] ?? (!empty($r['name']) ? $r['name'] : ($r['category'] . ($r['supplier_name'] ? ' (' . $r['supplier_name'] . ')' : '')));
        $qty = (int)$r['quantity'];
        $reorder = (int)$r['reorder_level'];
        $statusStr = 'In Stock';
        if ($qty <= 0) {
            $statusStr = 'Out of Stock';
        } elseif ($qty <= $reorder) {
            $statusStr = 'Low Stock';
        }

        return [
            'id'           => $code,
            'db_id'        => (int)$r['id'],
            'materialCode' => $code,
            'name'         => $name,
            'category'     => $r['category'],
            'supplier'     => $r['supplier_name'],
            'supplierId'   => $r['supplier_id'] ? (int)$r['supplier_id'] : null,
            'quantity'     => $qty,
            'unit'         => $r['unit'],
            'costPerUnit'  => (float)$r['cost_per_unit'],
            'totalValue'   => (float)$r['total_value'],
            'warehouse'    => $r['warehouse_location'],
            'purchaseDate' => $r['purchase_date'],
            'notes'        => $r['notes'],
            'image'        => $r['image'],
            'reorderLevel' => $reorder,
            'reorder_level'=> $reorder,
            'status'       => $statusStr,
            'createdAt'    => $r['created_at']
        ];
    }, $rows);

    echo json_encode([
        'success' => true,
        'count'   => count($items),
        'data'    => $items
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch raw materials from database',
        'error'   => $e->getMessage()
    ]);
}
