<?php
require_once 'config.php';

$debug = [];

// 1. Check Connection
$debug['db_connection'] = [
    'host' => DB_HOST,
    'user' => DB_USER,
    'name' => DB_NAME,
    'connected' => $conn ? true : false,
    'error' => $conn->connect_error
];

// 2. Check Tables
$tables = ['users', 'wearable_data', 'daily_checkins', 'diet_profiles', 'user_preferences'];
$debug['tables'] = [];

foreach ($tables as $table) {
    $res = $conn->query("SHOW TABLES LIKE '$table'");
    $exists = ($res && $res->num_rows > 0);
    
    $columns = [];
    if ($exists) {
        $colRes = $conn->query("DESCRIBE $table");
        while ($col = $colRes->fetch_assoc()) {
            $columns[] = $col['Field'];
        }
    }
    
    $debug['tables'][$table] = [
        'exists' => $exists,
        'columns' => $columns
    ];
}

// 3. Check PHP info
$debug['php_info'] = [
    'version' => PHP_VERSION,
    'mysqli_enabled' => extension_loaded('mysqli'),
    'post_max_size' => ini_get('post_max_size'),
    'display_errors' => ini_get('display_errors')
];

sendResponse(true, $debug, "Debug info");
?>
