<?php
require_once 'config.php';
$test = [
    'status' => 'ok',
    'db' => $conn ? 'connected' : 'failed',
    'phone_column' => $conn->query("SHOW COLUMNS FROM users LIKE 'phone'")->num_rows > 0 ? 'exists' : 'missing'
];
sendResponse(true, $test, "Backend test results");
?>
