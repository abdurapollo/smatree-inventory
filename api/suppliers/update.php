<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Update Supplier API Endpoint
   Method: POST or PUT
   Updates supplier in MySQL table suppliers
   Industry-standard validation, XSS sanitization, and SQL injection prevention
   ========================================================================== */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../db.php';

// Parse raw JSON or POST data
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);
if (!is_array($data)) {
    $data = $_POST;
}

$id = isset($data['id']) ? trim((string)$data['id']) : (isset($_GET['id']) ? trim((string)$_GET['id']) : '');
if (empty($id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Supplier ID or code is required.']);
    exit;
}

try {
    // Check if supplier exists
    $findStmt = $pdo->prepare('SELECT * FROM suppliers WHERE supplier_code = :code OR id = :id LIMIT 1');
    $findStmt->execute([':code' => $id, ':id' => is_numeric($id) ? (int)$id : 0]);
    $existing = $findStmt->fetch();

    if (!$existing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Supplier record not found.']);
        exit;
    }

    // Security: Sanitize & normalize fields
    $name      = isset($data['name']) ? trim(strip_tags((string)$data['name'])) : $existing['name'];
    $company   = isset($data['company']) ? trim(strip_tags((string)$data['company'])) : $existing['company'];
    $phone     = isset($data['phone']) ? trim(strip_tags((string)$data['phone'])) : $existing['phone'];
    $email     = isset($data['email']) ? trim(strip_tags(strtolower((string)$data['email']))) : $existing['email'];
    $gst       = isset($data['gst']) ? strtoupper(trim(strip_tags((string)$data['gst']))) : ($existing['gst'] ?? '');
    $materials = isset($data['materials']) ? trim(strip_tags((string)$data['materials'])) : ($existing['materials'] ?? '');
    $address   = isset($data['address']) ? trim(strip_tags((string)$data['address'])) : ($existing['address'] ?? '');

    $errors = [];

    // 1. Contact Name Validation
    if ($name === '') {
        $errors['name'] = 'Contact person name is required.';
    } elseif (mb_strlen($name) < 2 || mb_strlen($name) > 100) {
        $errors['name'] = 'Contact person name must be between 2 and 100 characters.';
    } elseif (!preg_match('/^[\p{L}\s\.\'\-]+$/u', $name)) {
        $errors['name'] = 'Contact person name can only contain letters, spaces, dots, and hyphens.';
    }

    // 2. Company Name Validation
    if ($company === '') {
        $errors['company'] = 'Company name is required.';
    } elseif (mb_strlen($company) < 2 || mb_strlen($company) > 150) {
        $errors['company'] = 'Company name must be between 2 and 150 characters.';
    } elseif (!preg_match('/^[\p{L}\p{N}\s\.\,\'\-\&\/\(\)\#]+$/u', $company)) {
        $errors['company'] = 'Company name contains invalid characters.';
    }

    // 3. Phone Number Validation
    if ($phone === '') {
        $errors['phone'] = 'Phone number is required.';
    } else {
        $digitsOnly = preg_replace('/\D/', '', $phone);
        if (strlen($digitsOnly) < 10 || strlen($digitsOnly) > 15) {
            $errors['phone'] = 'Phone number must contain between 10 and 15 digits (e.g. +91 98765 43210).';
        } elseif (!preg_match('/^\+?[0-9\s\-()]{7,25}$/', $phone)) {
            $errors['phone'] = 'Invalid phone number format.';
        }
    }

    // 4. Email Validation
    if ($email === '') {
        $errors['email'] = 'Email address is required.';
    } elseif (mb_strlen($email) > 150) {
        $errors['email'] = 'Email address cannot exceed 150 characters.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^[a-zA-Z0-9.!#$%&\'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/', $email)) {
        $errors['email'] = 'Please enter a valid email address (e.g. contact@company.com).';
    }

    // 5. GSTIN Validation
    if ($gst !== '') {
        if (strlen($gst) !== 15) {
            $errors['gst'] = 'GST number must be exactly 15 characters (e.g. 27AADCS1234F1ZP).';
        } elseif (!preg_match('/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/', $gst)) {
            $errors['gst'] = 'Invalid GSTIN format. Follows 2-digit state code + 10-char PAN + 3-char registration pattern.';
        }
    }

    // 6. Materials Supplied Validation
    if ($materials !== '') {
        if (mb_strlen($materials) > 500) {
            $errors['materials'] = 'Materials list cannot exceed 500 characters.';
        } else {
            $tags = array_map('trim', explode(',', $materials));
            $tags = array_filter($tags, function($t) { return $t !== ''; });
            $materials = implode(', ', array_unique($tags));
        }
    }

    // 7. Address Validation
    if ($address !== '') {
        if (mb_strlen($address) < 5) {
            $errors['address'] = 'Address must be at least 5 characters if provided.';
        } elseif (mb_strlen($address) > 500) {
            $errors['address'] = 'Address cannot exceed 500 characters.';
        }
    }

    // If validation failed, respond with 400 Bad Request
    if (!empty($errors)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Form validation failed. Please correct the highlighted errors.',
            'errors'  => $errors
        ]);
        exit;
    }

    // Check duplicate company name excluding this record
    $dupStmt = $pdo->prepare('SELECT id FROM suppliers WHERE LOWER(company) = LOWER(:company) AND id != :current_id LIMIT 1');
    $dupStmt->execute([':company' => $company, ':current_id' => (int)$existing['id']]);
    if ($dupStmt->fetch()) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'Another supplier already uses this company name.',
            'errors'  => ['company' => 'Another supplier already uses this company name.']
        ]);
        exit;
    }

    // Update with prepared statement
    $updateSql = 'UPDATE suppliers SET
                  name = :name,
                  company = :company,
                  phone = :phone,
                  email = :email,
                  gst = :gst,
                  address = :address,
                  materials = :materials
                  WHERE id = :db_id';

    $updateStmt = $pdo->prepare($updateSql);
    $updateStmt->execute([
        ':name'      => $name,
        ':company'   => $company,
        ':phone'     => $phone,
        ':email'     => $email,
        ':gst'       => $gst !== '' ? $gst : null,
        ':address'   => $address !== '' ? $address : null,
        ':materials' => $materials !== '' ? $materials : null,
        ':db_id'     => (int)$existing['id']
    ]);

    // Also optionally update raw materials if supplier company name changed
    if ($existing['company'] !== $company) {
        $prmUpdate = $pdo->prepare('UPDATE purchased_raw_materials SET supplier_name = :new_company WHERE supplier_id = :sup_id');
        $prmUpdate->execute([':new_company' => $company, ':sup_id' => (int)$existing['id']]);
    }

    $updatedSupplier = [
        'id'            => $existing['supplier_code'],
        'db_id'         => (int)$existing['id'],
        'supplier_code' => $existing['supplier_code'],
        'name'          => $name,
        'company'       => $company,
        'phone'         => $phone,
        'email'         => $email,
        'gst'           => $gst,
        'address'       => $address,
        'materials'     => $materials,
        'status'        => $existing['status'],
        'updatedAt'     => date('Y-m-d H:i:s')
    ];

    echo json_encode([
        'success' => true,
        'message' => "Supplier {$company} updated successfully.",
        'data'    => $updatedSupplier
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update supplier in database.',
        'error'   => $e->getMessage()
    ]);
}
