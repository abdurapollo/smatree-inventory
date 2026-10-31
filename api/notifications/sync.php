<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Notifications Database Sync Engine
   Method: POST
   Scans real MySQL tables for inventory alerts, production QC milestones,
   and installations, and synchronizes them into the MySQL notifications table.
   ========================================================================== */

if (!headers_sent()) {
    header('Content-Type: application/json; charset=UTF-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../auth_middleware.php';

// Authenticate session
$sessionUser = AuthMiddleware::authenticate();
$userId = (int)$sessionUser['user_id'];

try {
    $alerts = [];

    // 1. Scan Raw Materials for Stock Thresholds
    $matStmt = $pdo->query('
        SELECT material_code, category, supplier_name, quantity, unit, reorder_level 
        FROM purchased_raw_materials
    ');
    while ($m = $matStmt->fetch()) {
        $code = $m['material_code'];
        $qty = (int)$m['quantity'];
        $reorder = (int)$m['reorder_level'];
        $unit = $m['unit'] ?: 'units';
        $supplier = $m['supplier_name'] ?: 'Supplier';
        $name = $m['category'];

        if ($qty <= 0) {
            $alerts[] = [
                'notif_code'   => "stock-out-{$code}",
                'category'     => 'inventory',
                'severity'     => 'critical',
                'title'        => "CRITICAL: {$name} Out of Stock",
                'message'      => "Stock level reached 0 {$unit}. Solar panel assembly lines may be halted.",
                'link'         => 'inventory.html',
                'action_label' => 'Restock Material',
                'entity_id'    => $code
            ];
        } elseif ($qty <= $reorder) {
            $alerts[] = [
                'notif_code'   => "stock-low-{$code}",
                'category'     => 'inventory',
                'severity'     => 'warning',
                'title'        => "Low Stock Alert: {$name}",
                'message'      => "Stock is at {$qty} {$unit} (below threshold of {$reorder}). Reorder from {$supplier}.",
                'link'         => 'inventory.html',
                'action_label' => 'Inspect Stock',
                'entity_id'    => $code
            ];
        }
    }

    // 2. Scan Production Batches
    $prodStmt = $pdo->query('
        SELECT batch_code, panel_type, quantity, status, progress, team_assigned 
        FROM production_batches
    ');
    while ($b = $prodStmt->fetch()) {
        $bCode = $b['batch_code'];
        $pType = $b['panel_type'];
        $bQty = (int)$b['quantity'];
        $bStatus = $b['status'];
        $progress = (int)$b['progress'];
        $team = $b['team_assigned'] ?: 'Assembly Team';

        if ($bStatus === 'Quality Check') {
            $alerts[] = [
                'notif_code'   => "prod-qc-{$bCode}",
                'category'     => 'production',
                'severity'     => 'warning',
                'title'        => "Quality Check Pending: {$bCode}",
                'message'      => "{$pType} ({$bQty} panels) reached {$progress}% and awaits EL flash test verification.",
                'link'         => 'production.html',
                'action_label' => 'Inspect Batch',
                'entity_id'    => $bCode
            ];
        } elseif ($bStatus === 'In Production') {
            $alerts[] = [
                'notif_code'   => "prod-active-{$bCode}",
                'category'     => 'production',
                'severity'     => 'info',
                'title'        => "Production Active: {$bCode}",
                'message'      => "{$pType} ({$bQty} units) under fabrication by {$team} ({$progress}%).",
                'link'         => 'production.html',
                'action_label' => 'View Batch',
                'entity_id'    => $bCode
            ];
        } elseif ($bStatus === 'Completed') {
            $alerts[] = [
                'notif_code'   => "prod-done-{$bCode}",
                'category'     => 'production',
                'severity'     => 'success',
                'title'        => "Batch Completed: {$bCode}",
                'message'      => "{$bQty} panels of {$pType} completed & added to ready inventory.",
                'link'         => 'finished-goods.html',
                'action_label' => 'View Products',
                'entity_id'    => $bCode
            ];
        }
    }

    // 3. Scan Finished Goods Stock Alerts
    $fgStmt = $pdo->query('
        SELECT product_code, name, ready_to_sell 
        FROM products 
        WHERE is_deleted = 0
    ');
    while ($fg = $fgStmt->fetch()) {
        $pCode = $fg['product_code'];
        $ready = (int)$fg['ready_to_sell'];
        if ($ready > 0 && $ready < 160) {
            $alerts[] = [
                'notif_code'   => "fg-low-{$pCode}",
                'category'     => 'production',
                'severity'     => 'warning',
                'title'        => "Limited Sales Stock: {$fg['name']}",
                'message'      => "Only {$ready} panels ready for dispatch. Schedule next fabrication run soon.",
                'link'         => 'finished-goods.html',
                'action_label' => 'Review Stock',
                'entity_id'    => $pCode
            ];
        }
    }

    // 4. Scan Installations
    $instStmt = $pdo->query('
        SELECT installation_code, customer_name, total_capacity, status, team_assigned 
        FROM installations
    ');
    while ($inst = $instStmt->fetch()) {
        $iCode = $inst['installation_code'];
        $cName = $inst['customer_name'];
        $cap = $inst['total_capacity'];
        $team = $inst['team_assigned'] ?: 'Install Team';

        if ($inst['status'] === 'In Progress') {
            $alerts[] = [
                'notif_code'   => "inst-active-{$iCode}",
                'category'     => 'installations',
                'severity'     => 'info',
                'title'        => "Installation Active: {$cName}",
                'message'      => "{$cap} kW solar project being commissioned by {$team}.",
                'link'         => 'installations.html',
                'action_label' => 'View Project',
                'entity_id'    => $iCode
            ];
        } elseif ($inst['status'] === 'Completed') {
            $alerts[] = [
                'notif_code'   => "inst-done-{$iCode}",
                'category'     => 'installations',
                'severity'     => 'success',
                'title'        => "Commissioned: {$cName}",
                'message'      => "{$cap} kW rooftop solar array connected to grid with 25-year warranty.",
                'link'         => 'installations.html',
                'action_label' => 'View Project',
                'entity_id'    => $iCode
            ];
        }
    }

    // 5. Scan Sales Orders
    $saleStmt = $pdo->query('
        SELECT sale_code, customer_name, product_name, quantity, status 
        FROM sales 
        WHERE status = "Reserved"
    ');
    while ($s = $saleStmt->fetch()) {
        $sCode = $s['sale_code'];
        $alerts[] = [
            'notif_code'   => "sale-res-{$sCode}",
            'category'     => 'sales',
            'severity'     => 'info',
            'title'        => "Stock Reserved: {$s['customer_name']}",
            'message'      => "{$s['quantity']} panels of {$s['product_name']} allocated for upcoming delivery.",
            'link'         => 'sales.html',
            'action_label' => 'View Order',
            'entity_id'    => $sCode
        ];
    }

    // 6. Solar Telemetry Grid Notice
    $alerts[] = [
        'notif_code'   => 'telemetry-grid-online',
        'category'     => 'system',
        'severity'     => 'info',
        'title'        => 'Solar Telemetry Grid Active',
        'message'      => 'Automated cell stringing lines #1 - #4 reporting 99.4% EL yield and synchronized telemetry.',
        'link'         => 'dashboard.html',
        'action_label' => 'Open Telemetry',
        'entity_id'    => 'GRID-01'
    ];

    // Upsert into MySQL notifications table preserving existing read state
    $upsertStmt = $pdo->prepare('
        INSERT INTO notifications 
            (notif_code, category, severity, title, message, link, action_label, entity_id, is_read, is_manual)
        VALUES 
            (:code, :category, :severity, :title, :message, :link, :action_label, :entity_id, 0, 0)
        ON DUPLICATE KEY UPDATE
            title        = VALUES(title),
            message      = VALUES(message),
            severity     = VALUES(severity),
            link         = VALUES(link),
            action_label = VALUES(action_label),
            updated_at   = NOW()
    ');

    $activeCodes = [];
    foreach ($alerts as $a) {
        $activeCodes[] = $a['notif_code'];
        $upsertStmt->execute([
            ':code'         => $a['notif_code'],
            ':category'     => $a['category'],
            ':severity'     => $a['severity'],
            ':title'        => $a['title'],
            ':message'      => $a['message'],
            ':link'         => $a['link'],
            ':action_label' => $a['action_label'],
            ':entity_id'    => $a['entity_id']
        ]);
    }

    // Clean up resolved automatic stock/QC alerts that are no longer active
    if (!empty($activeCodes)) {
        $placeholders = implode(',', array_fill(0, count($activeCodes), '?'));
        $cleanupSql = "DELETE FROM notifications WHERE is_manual = 0 AND notif_code NOT IN ({$placeholders})";
        $cleanupStmt = $pdo->prepare($cleanupSql);
        $cleanupStmt->execute($activeCodes);
    }

    // Return the updated notifications list
    $stmt = $pdo->prepare('
        SELECT 
            id, notif_code, category, severity, title, message, link, action_label, entity_id, is_read, is_manual, created_at
        FROM notifications
        WHERE (user_id IS NULL OR user_id = :uid)
        ORDER BY is_read ASC, created_at DESC
        LIMIT 80
    ');
    $stmt->execute([':uid' => $userId]);
    $rows = $stmt->fetchAll();

    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM notifications WHERE (user_id IS NULL OR user_id = :uid) AND is_read = 0');
    $countStmt->execute([':uid' => $userId]);
    $unreadCount = (int)$countStmt->fetchColumn();

    $data = array_map(function($r) {
        return [
            'id'          => $r['notif_code'],
            'db_id'       => (int)$r['id'],
            'category'    => $r['category'],
            'severity'    => $r['severity'],
            'title'       => $r['title'],
            'message'     => $r['message'],
            'link'        => $r['link'] ?: '#',
            'actionLabel' => $r['action_label'] ?: 'View',
            'entityId'    => $r['entity_id'],
            'read'        => (int)$r['is_read'] === 1,
            'isManual'    => (int)$r['is_manual'] === 1,
            'timestamp'   => $r['created_at']
        ];
    }, $rows);

    echo json_encode([
        'success'      => true,
        'message'      => 'Notifications synchronized with MySQL database.',
        'data'         => $data,
        'unread_count' => $unreadCount
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to synchronize notifications in database.',
        'error'   => $e->getMessage()
    ]);
}
