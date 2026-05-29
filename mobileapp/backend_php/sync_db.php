<?php
require_once 'config.php';

// Ensure the database is correct
$conn->select_db(DB_NAME);

$messages = [];

/**
 * Helper to check if a table exists
 */
function tableExists($conn, $table) {
    $result = $conn->query("SHOW TABLES LIKE '$table'");
    return $result->num_rows > 0;
}

/**
 * Helper to add a column if it doesn't exist
 */
function addColumnIfMissing($conn, $table, $column, $definition) {
    $result = $conn->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
    if ($result->num_rows == 0) {
        if ($conn->query("ALTER TABLE `$table` ADD COLUMN `$column` $definition")) {
            return "Added column '$column' to '$table'.";
        } else {
            return "Error adding '$column' to '$table': " . $conn->error;
        }
    }
    return "Column '$column' already exists in '$table'.";
}

/**
 * Helper to rename a column if it exists and the new name doesn't
 */
function renameColumnIfMissing($conn, $table, $oldName, $newName, $definition) {
    $resOld = $conn->query("SHOW COLUMNS FROM `$table` LIKE '$oldName'");
    $resNew = $conn->query("SHOW COLUMNS FROM `$table` LIKE '$newName'");
    if ($resOld->num_rows > 0 && $resNew->num_rows == 0) {
        if ($conn->query("ALTER TABLE `$table` CHANGE `$oldName` `$newName` $definition")) {
            return "Renamed column '$oldName' to '$newName' in '$table'.";
        } else {
            return "Error renaming '$oldName' to '$newName' in '$table': " . $conn->error;
        }
    }
    return null;
}

// 1. Users Table Updates
if (tableExists($conn, 'users')) {
    $ren = renameColumnIfMissing($conn, 'users', 'id', 'userID', "VARCHAR(50) NOT NULL");
    if ($ren) $messages[] = $ren;
    $ren = renameColumnIfMissing($conn, 'users', 'name', 'fullName', "VARCHAR(100) NOT NULL");
    if ($ren) $messages[] = $ren;

    $messages[] = addColumnIfMissing($conn, 'users', 'age', "INT DEFAULT NULL");
    $messages[] = addColumnIfMissing($conn, 'users', 'gender', "VARCHAR(50) DEFAULT NULL");
    $messages[] = addColumnIfMissing($conn, 'users', 'height', "DECIMAL(5,2) DEFAULT NULL");
    $messages[] = addColumnIfMissing($conn, 'users', 'currentWeight', "DECIMAL(5,2) DEFAULT NULL");
    $messages[] = addColumnIfMissing($conn, 'users', 'targetWeight', "DECIMAL(5,2) DEFAULT NULL");
    $messages[] = addColumnIfMissing($conn, 'users', 'activityLevel', "VARCHAR(100) DEFAULT NULL");
    $messages[] = addColumnIfMissing($conn, 'users', 'healthGoal', "VARCHAR(255) DEFAULT NULL");
} else {
    $sql = "CREATE TABLE users (
        userID VARCHAR(50) PRIMARY KEY,
        fullName VARCHAR(255),
        email VARCHAR(100) UNIQUE,
        password VARCHAR(255),
        age INT,
        gender VARCHAR(50),
        height DECIMAL(5,2),
        currentWeight DECIMAL(5,2),
        targetWeight DECIMAL(5,2),
        activityLevel VARCHAR(100),
        healthGoal VARCHAR(255)
    )";
    if ($conn->query($sql)) $messages[] = "Created table 'users'.";
}

// Determine PK of users
$userPK = 'userID';
$res = $conn->query("SHOW COLUMNS FROM users LIKE 'userID'");
if ($res->num_rows == 0) $userPK = 'id';

// 2. DietPlan Table
if (!tableExists($conn, 'DietPlan')) {
    $sql = "CREATE TABLE DietPlan (
        planID INT AUTO_INCREMENT PRIMARY KEY,
        userID VARCHAR(50),
        planName VARCHAR(255),
        dailyCalories INT,
        proteinGoal INT,
        carbGoal INT,
        fatGoal INT,
        startDate DATE,
        endDate DATE,
        planStatus VARCHAR(50),
        FOREIGN KEY (userID) REFERENCES users($userPK) ON DELETE CASCADE
    )";
    if ($conn->query($sql)) $messages[] = "Created table 'DietPlan'.";
} else {
    $messages[] = "Table 'DietPlan' checked.";
}

// 3. FoodLog Table
if (!tableExists($conn, 'FoodLog')) {
    $sql = "CREATE TABLE FoodLog (
        foodLogiD INT AUTO_INCREMENT PRIMARY KEY,
        userID VARCHAR(50),
        date DATE,
        mealName VARCHAR(255),
        calories INT,
        protein INT,
        carbs INT,
        fats INT,
        waterintake DECIMAL(5,2),
        FOREIGN KEY (userID) REFERENCES users($userPK) ON DELETE CASCADE
    )";
    if ($conn->query($sql)) $messages[] = "Created table 'FoodLog'.";
} else {
    $messages[] = "Table 'FoodLog' checked.";
}

// 4. MoodLog Table
if (!tableExists($conn, 'MoodLog')) {
    $sql = "CREATE TABLE MoodLog (
        moodLogiD INT AUTO_INCREMENT PRIMARY KEY,
        userID VARCHAR(50),
        date DATE,
        moodLevel INT,
        stressLevel INT,
        cravingLevel INT,
        sleepHours DECIMAL(4,2),
        motivationLevel INT,
        consistencyStatus VARCHAR(50),
        FOREIGN KEY (userID) REFERENCES users($userPK) ON DELETE CASCADE
    )";
    if ($conn->query($sql)) $messages[] = "Created table 'MoodLog'.";
} else {
    $messages[] = "Table 'MoodLog' checked.";
}

// 5. WearableData Table Updates
if (tableExists($conn, 'wearable_data')) {
    $ren = renameColumnIfMissing($conn, 'wearable_data', 'id', 'wearablelD', "INT AUTO_INCREMENT");
    if ($ren) $messages[] = $ren;
    $ren = renameColumnIfMissing($conn, 'wearable_data', 'user_id', 'userID', "VARCHAR(50)");
    if ($ren) $messages[] = $ren;
    $ren = renameColumnIfMissing($conn, 'wearable_data', 'wearable_date', 'date', "DATE");
    if ($ren) $messages[] = $ren;
    $ren = renameColumnIfMissing($conn, 'wearable_data', 'active_minutes', 'activityMinutes', "INT");
    if ($ren) $messages[] = $ren;
    $ren = renameColumnIfMissing($conn, 'wearable_data', 'heart_rate', 'heartRate', "INT");
    if ($ren) $messages[] = $ren;
    $messages[] = addColumnIfMissing($conn, 'wearable_data', 'sleepDuration', "DECIMAL(5,2) DEFAULT NULL");
    $messages[] = addColumnIfMissing($conn, 'wearable_data', 'caloriesBurned', "INT DEFAULT NULL");
} else if (!tableExists($conn, 'WearableData')) {
    $sql = "CREATE TABLE WearableData (
        wearablelD INT AUTO_INCREMENT PRIMARY KEY,
        userID VARCHAR(50),
        date DATE,
        steps INT,
        heartRate INT,
        sleepDuration DECIMAL(5,2),
        activityMinutes INT,
        caloriesBurned INT,
        FOREIGN KEY (userID) REFERENCES users($userPK) ON DELETE CASCADE
    )";
    if ($conn->query($sql)) $messages[] = "Created table 'WearableData'.";
}

// 6. ProgressTracking Table
if (!tableExists($conn, 'ProgressTracking')) {
    $sql = "CREATE TABLE ProgressTracking (
        progressID INT AUTO_INCREMENT PRIMARY KEY,
        userID VARCHAR(50),
        date DATE,
        weight DECIMAL(5,2),
        bodyMeasurement TEXT,
        progressNote TEXT,
        consistencyScore INT,
        FOREIGN KEY (userID) REFERENCES users($userPK) ON DELETE CASCADE
    )";
    if ($conn->query($sql)) $messages[] = "Created table 'ProgressTracking'.";
} else {
    $messages[] = "Table 'ProgressTracking' checked.";
}

// 7. PredictionResult Table
if (!tableExists($conn, 'PredictionResult')) {
    $sql = "CREATE TABLE PredictionResult (
        predictionID INT AUTO_INCREMENT PRIMARY KEY,
        userID VARCHAR(50),
        date DATE,
        riskLevel VARCHAR(50),
        successProbability DECIMAL(5,2),
        failureProbability DECIMAL(5,2),
        predictionStatus VARCHAR(50),
        reason TEXT,
        FOREIGN KEY (userID) REFERENCES users($userPK) ON DELETE CASCADE
    )";
    if ($conn->query($sql)) $messages[] = "Created table 'PredictionResult'.";
} else {
    $messages[] = "Table 'PredictionResult' checked.";
}

// 8. Recommendations Table
if (!tableExists($conn, 'Recommendations')) {
    $sql = "CREATE TABLE Recommendations (
        recommendationID INT AUTO_INCREMENT PRIMARY KEY,
        userID VARCHAR(50),
        predictionID INT,
        recommendationText TEXT,
        recommendationType VARCHAR(100),
        date DATE,
        FOREIGN KEY (userID) REFERENCES users($userPK) ON DELETE CASCADE,
        FOREIGN KEY (predictionID) REFERENCES PredictionResult(predictionID) ON DELETE CASCADE
    )";
    if ($conn->query($sql)) $messages[] = "Created table 'Recommendations'.";
} else {
    $messages[] = "Table 'Recommendations' checked.";
}

if (php_sapi_name() === 'cli') {
    echo implode("\n", $messages) . "\n";
} else {
    sendResponse(true, $messages, "Database synchronization complete.");
}

$conn->close();
?>


