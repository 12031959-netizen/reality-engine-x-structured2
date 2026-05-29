<?php
require_once 'config.php';

$results = [];

// 1. Ensure users table has all columns
$users_columns = [
    "phone" => "ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT NULL AFTER name",
    "updated_at" => "ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
];

foreach ($users_columns as $col => $sql) {
    $check = $conn->query("SHOW COLUMNS FROM users LIKE '$col'");
    if ($check->num_rows == 0) {
        if ($conn->query($sql)) {
            $results[] = "Column $col added to users table";
        } else {
            $results[] = "Error adding $col to users: " . $conn->error;
        }
    } else {
        $results[] = "Column $col already exists in users table";
    }
}

// 2. Ensure wearable_data table exists
$sql = "CREATE TABLE IF NOT EXISTS wearable_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    wearable_date DATE NOT NULL,
    device VARCHAR(100),
    steps INT DEFAULT 0,
    heart_rate INT DEFAULT 0,
    active_minutes INT DEFAULT 0,
    recovery_score VARCHAR(50),
    source VARCHAR(50),
    apple_health_active VARCHAR(10) DEFAULT 'false',
    iphone_active VARCHAR(10) DEFAULT 'false',
    export_active VARCHAR(10) DEFAULT 'false',
    bluetooth_active VARCHAR(10) DEFAULT 'false',
    saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id),
    INDEX (wearable_date)
)";

if ($conn->query($sql)) {
    $results[] = "Table wearable_data ensured";
} else {
    $results[] = "Error creating wearable_data: " . $conn->error;
}

// 3. Ensure daily_checkins table exists
$sql = "CREATE TABLE IF NOT EXISTS daily_checkins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    check_in_date DATE NOT NULL,
    calories DOUBLE DEFAULT 0,
    protein DOUBLE DEFAULT 0,
    water DOUBLE DEFAULT 0,
    sleep DOUBLE DEFAULT 0,
    mood INT DEFAULT 5,
    stress INT DEFAULT 5,
    cravings INT DEFAULT 0,
    notes TEXT,
    saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY user_daily_checkin_unique (user_id, check_in_date),
    INDEX (check_in_date)
)";

if ($conn->query($sql)) {
    $results[] = "Table daily_checkins ensured";
} else {
    $results[] = "Error creating daily_checkins: " . $conn->error;
}

$duplicateCleanupSql = "
    DELETE older
    FROM daily_checkins older
    INNER JOIN daily_checkins newer
        ON older.user_id = newer.user_id
        AND older.check_in_date = newer.check_in_date
        AND older.id < newer.id
";
$conn->query($duplicateCleanupSql);

$indexCheck = $conn->query("
    SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'daily_checkins'
      AND NON_UNIQUE = 0
      AND INDEX_NAME IN ('user_daily_checkin_unique', 'user_id')
      AND COLUMN_NAME IN ('user_id', 'check_in_date')
");

if ($indexCheck) {
    $indexRow = $indexCheck->fetch_assoc();
    if ((int)$indexRow['count'] < 2) {
        if ($conn->query("ALTER TABLE daily_checkins ADD UNIQUE KEY user_daily_checkin_unique (user_id, check_in_date)")) {
            $results[] = "Daily check-in unique key ensured";
        } else {
            $results[] = "Could not add daily check-in unique key: " . $conn->error;
        }
    }
}

// 4. Ensure diet_profiles table exists
$sql = "CREATE TABLE IF NOT EXISTS diet_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    current_weight_kg DOUBLE,
    target_weight_kg DOUBLE,
    height_cm DOUBLE,
    activity_level VARCHAR(50),
    diet_goal VARCHAR(100),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (user_id)
)";

if ($conn->query($sql)) {
    $results[] = "Table diet_profiles ensured";
} else {
    $results[] = "Error creating diet_profiles: " . $conn->error;
}

// 5. Ensure user_preferences table exists
$sql = "CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    dark_mode BOOLEAN DEFAULT FALSE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    units_system VARCHAR(20) DEFAULT 'metric',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (user_id)
)";

if ($conn->query($sql)) {
    $results[] = "Table user_preferences ensured";
} else {
    $results[] = "Error creating user_preferences: " . $conn->error;
}

sendResponse(true, $results, "Database migration/check completed");
?>
