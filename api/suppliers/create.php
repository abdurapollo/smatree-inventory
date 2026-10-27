<?php
/* ==========================================================================
   SMATREE SOLAR INVENTORY — Add Supplier API Endpoint
   Method: POST
   Inserts new verified supplier into MySQL table suppliers
   Industry-standard validation, XSS sanitization, and SQL injection prevention
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

// Parse raw JSON or POST data
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);
if (!is_array($data)) {
    $data = $_POST;
}

// Security: Sanitize & normalize fields
$name      = isset($data['name']) ? trim(strip_tags((string)$data['name'])) : '';
$company   = isset($data['company']) ? trim(strip_tags((string)$data['company'])) : '';
$phone     = isset($data['phone']) ? trim(strip_tags((string)$data['phone'])) : '';
$email     = isset($data['email']) ? trim(strip_tags(strtolower((string)$data['email']))) : '';
$gst       = isset($data['gst']) ? strtoupper(trim(strip_tags((string)$data['gst']))) : '';
$materials = isset($data['materials']) ? trim(strip_tags((string)$data['materials'])) : '';
$address   = isset($data['address']) ? trim(strip_tags((string)$data['address'])) : '';

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

// 3. Phone Number Validation (ITU E.164 compliant: 10-15 digits)
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

// 4. Email Validation (RFC 5322)
if ($email === '') {
    $errors['email'] = 'Email address is required.';
} elseif (mb_strlen($email) > 150) {
    $errors['email'] = 'Email address cannot exceed 150 characters.';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^[a-zA-Z0-9.!#$%&\'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/', $email)) {
    $errors['email'] = 'Please enter a valid email address (e.g. contact@company.com).';
}

// 5. GSTIN Validation (Optional, but strictly verified if provided)
if ($gst !== '') {
    if (strlen($gst) !== 15) {
        $errors['gst'] = 'GST number must be exactly 15 characters (e.g. 27AADCS1234F1ZP).';
    } elseif (!preg_match('/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/', $gst)) {
        $errors['gst'] = 'Invalid GSTIN format. Follows 2-digit state code + 10-char PAN + 3-char registration pattern.';
    }
}

// 6. Materials Supplied Validation (Optional)
if ($materials !== '') {
    if (mb_strlen($materials) > 500) {
        $errors['materials'] = 'Materials list cannot exceed 500 characters.';
    } else {
        // Clean and normalize comma-separated values
        $tags = array_map('trim', explode(',', $materials));
        $tags = array_filter($tags, function($t) { return $t !== ''; });
        $materials = implode(', ', array_unique($tags));
    }
}

// 7. Address Validation (Optional)
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

try {
    // Check for duplicate company name
    $dupStmt = $pdo->prepare('SELECT id FROM suppliers WHERE LOWER(company) = LOWER(:company) LIMIT 1');
    $dupStmt->execute([':company' => $company]);
    if ($dupStmt->fetch()) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'A supplier with this company name already exists.',
            'errors'  => ['company' => 'A supplier with this company name already exists.']
        ]);
        exit;
    }

    // Auto-generate next unique supplier_code (e.g. SUP-006)
    $stmtMax = $pdo->query("SELECT supplier_code FROM suppliers WHERE supplier_code REGEXP '^SUP-[0-9]+' ORDER BY id DESC LIMIT 1");
    $lastCode = $stmtMax->fetchColumn();

    $nextNum = 1;
    if ($lastCode && preg_match('/SUP-(\d+)/', $lastCode, $m)) {
        $nextNum = (int)$m[1] + 1;
    } else {
        $cntStmt = $pdo->query('SELECT COUNT(*) FROM suppliers');
        $nextNum = (int)$cntStmt->fetchColumn() + 1;
    }
    $supplierCode = sprintf('SUP-%03d', $nextNum);

    // Double-check uniqueness
    $uniqStmt = $pdo->prepare('SELECT id FROM suppliers WHERE supplier_code = :code');
    $uniqStmt->execute([':code' => $supplierCode]);
    if ($uniqStmt->fetch()) {
        $supplierCode = 'SUP-' . strtoupper(substr(uniqid(), -4));
    }

    // Insert with prepared statement
    $insertSql = 'INSERT INTO suppliers (supplier_code, name, company, phone, email, gst, address, materials, status)
                  VALUES (:code, :name, :company, :phone, :email, :gst, :address, :materials, "active")';
    $stmt = $pdo->prepare($insertSql);
    $stmt->execute([
        ':code'      => $supplierCode,
        ':name'      => $name,
        ':company'   => $company,
        ':phone'     => $phone,
        ':email'     => $email,
        ':gst'       => $gst !== '' ? $gst : null,
        ':address'   => $address !== '' ? $address : null,
        ':materials' => $materials !== '' ? $materials : null,
    ]);

    $newId = (int)$pdo->lastInsertId();

    $newSupplier = [
        'id'            => $supplierCode,
        'db_id'         => $newId,
        'supplier_code' => $supplierCode,
        'name'          => $name,
        'company'       => $company,
        'phone'         => $phone,
        'email'         => $email,
        'gst'           => $gst,
        'address'       => $address,
        'materials'     => $materials,
        'status'        => 'active',
        'createdAt'     => date('Y-m-d H:i:s')
    ];

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => "Supplier {$company} added successfully.",
        'data'    => $newSupplier
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to create supplier in database.',
        'error'   => $e->getMessage()
    ]);
}
